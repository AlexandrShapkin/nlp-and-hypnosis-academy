-- Existing account remains an owner; only newly invited maintainers receive the restricted role.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'owner' CHECK(role IN ('owner', 'maintainer'));
CREATE TABLE IF NOT EXISTS maintainer_invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'invite' CHECK(kind IN ('invite', 'reset')),
  target_user_id TEXT REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS maintainer_invites_email ON maintainer_invitations(email);
