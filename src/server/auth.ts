import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sqlite } from "@/db";
import { ApiError } from "./errors";
import { audit } from "./store";
export const SESSION_COOKIE = "academy_session";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string) {
  try {
    const [salt, stored] = hash.split(":");
    const actual = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(stored, "hex");
    return (
      expected.length === actual.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export function bootstrap(email: string, password: string) {
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 14)
    throw new Error(
      "Use a valid email and a password of at least 14 characters",
    );
  if (sqlite.prepare("SELECT id FROM users LIMIT 1").get())
    throw new Error("Maintainer already exists; bootstrap is disabled");
  sqlite
    .prepare("INSERT INTO users(id,email,password_hash) VALUES(?,?,?)")
    .run(randomUUID(), email.toLowerCase(), hashPassword(password));
  audit("auth.bootstrap");
}
export function limit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const row = sqlite
    .prepare("SELECT count,reset_at FROM rate_limits WHERE key=?")
    .get(key) as { count: number; reset_at: number } | undefined;
  if (row && row.reset_at > now && row.count >= max)
    throw new ApiError(429, "RATE_LIMITED", "Please try again later");
  sqlite
    .prepare(
      "INSERT INTO rate_limits(key,count,reset_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,reset_at=excluded.reset_at",
    )
    .run(
      key,
      row && row.reset_at > now ? row.count + 1 : 1,
      row && row.reset_at > now ? row.reset_at : now + windowMs,
    );
}
export function login(email: string, password: string, ip: string) {
  limit(`login:${ip}`, 10, 15 * 60 * 1000);
  limit(`account:${email.toLowerCase()}`, 10, 15 * 60 * 1000);
  const user = sqlite
    .prepare("SELECT * FROM users WHERE email=? AND active=1")
    .get(email.toLowerCase()) as
    | { id: string; email: string; password_hash: string }
    | undefined;
  const fallback = "00000000000000000000000000000000:" + "0".repeat(128);
  if (!verifyPassword(password, user?.password_hash || fallback) || !user)
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  sqlite
    .prepare(
      "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)",
    )
    .run(randomUUID(), user.id, digest(token), expiresAt);
  audit("auth.login", user.id, user.id);
  return { token, expiresAt, user: { id: user.id, email: user.email } };
}
export function sessionFromToken(token?: string) {
  if (!token) return null;
  const row = sqlite
    .prepare(
      "SELECT u.id,u.email FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1",
    )
    .get(digest(token), Date.now()) as
    | { id: string; email: string }
    | undefined;
  return row || null;
}
export async function getSession() {
  return sessionFromToken((await cookies()).get(SESSION_COOKIE)?.value);
}
export async function requireAdmin() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  return user;
}
export function logout(token: string, userId?: string) {
  sqlite.prepare("DELETE FROM sessions WHERE token_hash=?").run(digest(token));
  audit("auth.logout", userId, userId);
}
