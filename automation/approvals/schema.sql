CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  event_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','denied','published')),
  notified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at TEXT,
  published_at TEXT,
  last_error TEXT
);
