CREATE TABLE IF NOT EXISTS publication_events (
  entity_id TEXT PRIMARY KEY REFERENCES entities(id),
  published_at TEXT NOT NULL
);
