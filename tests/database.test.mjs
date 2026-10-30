import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleApi } from '../worker/index.mjs';

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8'));
  return db;
}
function insert(db, id, status = 'draft', confirmedAt = new Date().toISOString()) {
  db.prepare("INSERT INTO listings(id, owner_id, title, neighbourhood, city, bedrooms, bathrooms, rent, costs, description, status, confirmed_at, available_from) VALUES (?, 'owner', 'Test home', 'Test district', 'Fredericton', 2, 1, 1500, '{}', 'Fictional test fixture', ?, ?, '2027-01-01')").run(id, status, confirmedAt);
}
test('live API excludes draft, rented and expired listings using the actual migration/query', async () => {
  const db = database();
  try {
    insert(db, 'fresh', 'published');
    insert(db, 'stale', 'published', '2020-01-01T12:00:00Z');
    insert(db, 'private-draft');
    insert(db, 'rented', 'rented');
    const env = { DB: { prepare: sql => ({ all: async () => ({ results: db.prepare(sql).all() }) }) } };
    const res = await handleApi(new Request('https://estate.example/api/listings'), env);
    assert.equal(res.status, 200);
    const result = await res.json();
    assert.equal(result.demo, false);
    assert.deepEqual(result.listings.map(l => l.id), ['fresh']);
  } finally { db.close(); }
});
test('database constrains publication state, jurisdiction and structured fields', () => {
  const db = database();
  try {
    insert(db, 'draft');
    assert.throws(() => db.prepare("UPDATE listings SET status = 'approved-by-government'").run());
    assert.throws(() => db.prepare("UPDATE listings SET province = 'ON'").run());
    assert.throws(() => db.prepare("UPDATE listings SET costs = 'not-json'").run());
    assert.throws(() => db.prepare('UPDATE listings SET rent = -1').run());
  } finally { db.close(); }
});
