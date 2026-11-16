-- Run this in Cloudflare D1 Console (or wrangler d1 execute).
CREATE TABLE IF NOT EXISTS progress (
  user_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
