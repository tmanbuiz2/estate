PRAGMA foreign_keys = ON;

CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
  neighbourhood TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL DEFAULT 'NB' CHECK(province = 'NB'),
  country TEXT NOT NULL DEFAULT 'CA' CHECK(country = 'CA'),
  currency TEXT NOT NULL DEFAULT 'CAD' CHECK(currency = 'CAD'),
  bedrooms INTEGER NOT NULL CHECK(bedrooms BETWEEN 0 AND 9),
  bathrooms INTEGER NOT NULL CHECK(bathrooms BETWEEN 1 AND 9),
  rent INTEGER NOT NULL CHECK(rent > 0),
  costs TEXT NOT NULL CHECK(json_valid(costs)),
  features TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(features)),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','review','published','paused','rented')),
  confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
  available_from TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX listings_discovery ON listings(status, province, confirmed_at);
CREATE INDEX listings_owner ON listings(owner_id, status);

-- No identity documents, applications or payments are stored in phase one.
-- Authorization, retention and provider reviews precede those migrations.
CREATE TABLE rule_versions (
  id TEXT PRIMARY KEY,
  jurisdiction TEXT NOT NULL,
  subject TEXT NOT NULL,
  source_url TEXT NOT NULL,
  effective_from TEXT,
  effective_to TEXT,
  reviewed_at TEXT,
  review_status TEXT NOT NULL DEFAULT 'needs-legal-review'
    CHECK(review_status IN ('needs-legal-review','approved','superseded')),
  parameters TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(parameters))
);
