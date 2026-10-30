PRAGMA foreign_keys = ON;
ALTER TABLE listings ADD COLUMN source_url TEXT NOT NULL DEFAULT '';
ALTER TABLE listings ADD COLUMN rights_basis TEXT NOT NULL DEFAULT '';
ALTER TABLE listings ADD COLUMN moderation_note TEXT NOT NULL DEFAULT '';

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  user_id TEXT NOT NULL REFERENCES accounts(id),
  kind TEXT NOT NULL CHECK(kind IN ('application','viewing','report','repair')),
  note TEXT NOT NULL CHECK(length(note) BETWEEN 1 AND 1000),
  preferred_date TEXT,
  preferred_slot TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','acknowledged','declined','withdrawn','resolved')),
  consent_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX requests_user ON requests(user_id, created_at);
CREATE INDEX requests_listing ON requests(listing_id, kind, created_at);
CREATE UNIQUE INDEX requests_pending ON requests(user_id, listing_id, kind) WHERE status IN ('submitted','acknowledged') AND kind IN ('application','viewing');
CREATE TABLE tenancies (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  tenant_id TEXT NOT NULL REFERENCES accounts(id),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(listing_id, tenant_id)
);
CREATE TABLE write_limits (
  user_id TEXT NOT NULL,
  window INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(user_id, window)
);
