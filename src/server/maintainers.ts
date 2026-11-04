import { createHash, randomBytes, randomUUID } from "node:crypto";
import { sqlite } from "@/db";
import { hashPassword, limit } from "./auth";
import { ApiError } from "./errors";
import { audit } from "./store";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

type Account = {
  id: string;
  email: string;
  role: "owner" | "maintainer";
  active: number;
  createdAt: string;
};

type Invitation = {
  id: string;
  email: string;
  expiresAt: number;
  createdAt: string;
  createdBy: string;
};

export function listMaintainers() {
  const members = sqlite
    .prepare(
      "SELECT id,email,role,active,created_at AS createdAt FROM users ORDER BY created_at,id",
    )
    .all() as Account[];
  const invitations = sqlite
    .prepare(
      "SELECT id,email,expires_at AS expiresAt,created_at AS createdAt,created_by AS createdBy FROM maintainer_invitations WHERE accepted_at IS NULL AND revoked_at IS NULL ORDER BY created_at DESC",
    )
    .all() as Invitation[];
  return { members, invitations };
}

export function inviteMaintainer(emailInput: string, actorId: string) {
  const email = emailInput.trim().toLowerCase();
  limit(`team-invite:${actorId}`, 20, 60 * 60 * 1000);
  const token = randomBytes(32).toString("hex");
  const id = randomUUID();
  const expiresAt = Date.now() + 48 * 60 * 60 * 1000;
  sqlite.transaction(() => {
    if (sqlite.prepare("SELECT id FROM users WHERE email=?").get(email))
      throw new ApiError(409, "ACCOUNT_EXISTS", "An account with this email already exists");
    sqlite
      .prepare(
        "UPDATE maintainer_invitations SET revoked_at=CURRENT_TIMESTAMP WHERE email=? AND accepted_at IS NULL AND revoked_at IS NULL",
      )
      .run(email);
    sqlite
      .prepare(
        "INSERT INTO maintainer_invitations(id,email,token_hash,expires_at,created_by) VALUES(?,?,?,?,?)",
      )
      .run(id, email, digest(token), expiresAt, actorId);
    audit("team.invite", id, actorId);
  })();
  // The cleartext token is returned only once, to the authenticated owner.
  return { id, email, token, expiresAt };
}

export function acceptMaintainerInvitation(
  token: string,
  password: string,
  clientKey: string,
) {
  limit(`invite-accept:${clientKey}`, 20, 15 * 60 * 1000);
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new ApiError(422, "INVALID_INVITATION", "Invitation is invalid or expired");
  return sqlite.transaction(() => {
    const invite = sqlite
      .prepare(
        "SELECT id,email FROM maintainer_invitations WHERE token_hash=? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>?",
      )
      .get(digest(token), Date.now()) as { id: string; email: string } | undefined;
    if (!invite)
      throw new ApiError(422, "INVALID_INVITATION", "Invitation is invalid or expired");
    if (sqlite.prepare("SELECT id FROM users WHERE email=?").get(invite.email))
      throw new ApiError(409, "ACCOUNT_EXISTS", "An account with this email already exists");
    const id = randomUUID();
    sqlite
      .prepare(
        "INSERT INTO users(id,email,password_hash,role,active) VALUES(?,?,?,'maintainer',1)",
      )
      .run(id, invite.email, hashPassword(password));
    sqlite
      .prepare(
        "UPDATE maintainer_invitations SET accepted_at=CURRENT_TIMESTAMP WHERE id=? AND accepted_at IS NULL",
      )
      .run(invite.id);
    audit("team.accept", id, id);
    return { email: invite.email };
  })();
}

export function setMaintainerActive(
  memberId: string,
  active: boolean,
  actorId: string,
) {
  if (memberId === actorId)
    throw new ApiError(403, "OWN_ACCOUNT", "You cannot disable your own account");
  return sqlite.transaction(() => {
    const member = sqlite
      .prepare("SELECT id,email,role,active FROM users WHERE id=?")
      .get(memberId) as
      | { id: string; email: string; role: string; active: number }
      | undefined;
    if (!member)
      throw new ApiError(404, "NOT_FOUND", "Maintainer not found");
    // Owner accounts are never disabled through the CMS, avoiding a lockout.
    if (member.role !== "maintainer")
      throw new ApiError(403, "OWNER_PROTECTED", "Owner accounts cannot be disabled");
    sqlite
      .prepare("UPDATE users SET active=? WHERE id=?")
      .run(active ? 1 : 0, memberId);
    if (!active)
      sqlite.prepare("DELETE FROM sessions WHERE user_id=?").run(memberId);
    audit(active ? "team.activate" : "team.deactivate", memberId, actorId);
    return { id: member.id, email: member.email, active };
  })();
}

export function revokeMaintainerInvitation(id: string, actorId: string) {
  const result = sqlite
    .prepare(
      "UPDATE maintainer_invitations SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND accepted_at IS NULL AND revoked_at IS NULL",
    )
    .run(id);
  if (!result.changes)
    throw new ApiError(404, "NOT_FOUND", "Invitation not found");
  audit("team.revoke", id, actorId);
  return { id };
}
