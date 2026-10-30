import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleApi, publicListing } from '../worker/index.mjs';
import { demoListings } from '../packages/domain/demo.mjs';
const request = (path, method = 'GET') => new Request('https://estate.example' + path, { method });

test('demo inventory is explicit and respects full cost budget', async () => {
  const res = await handleApi(request('/api/listings?maxTotal=1500'), { DEMO_MODE: 'true' });
  const data = await res.json();
  assert.equal(data.demo, true);
  assert.deepEqual(data.listings.map(l => l.id), ['demo-03']);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});
test('an unconfigured live database fails closed, never returns demo homes', async () => {
  const res = await handleApi(request('/api/listings'), {});
  assert.equal(res.status, 503);
  assert.equal((await res.json()).listings, undefined);
});
test('writes are blocked across API routes', async () => {
  for (const path of ['/api/listings','/api/applications','/api/payments','/api/uploads','/api/accounts']) {
    const res = await handleApi(request(path, 'POST'), { DEMO_MODE: 'true' });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('Allow'), 'GET');
  }
});
test('malformed queries return actionable 400 responses', async () => {
  const res = await handleApi(request('/api/listings?maxTotal=-1'), { DEMO_MODE: 'true' });
  assert.equal(res.status, 400);
});
test('missing records and unsupported routes return 404', async () => {
  assert.equal((await handleApi(request('/api/listings/not-real'), { DEMO_MODE: 'true' })).status, 404);
  assert.equal((await handleApi(request('/api/unknown'), {})).status, 404);
});
test('live public projection cannot leak owner or internal applicant data', () => {
  const result = publicListing({ ...demoListings[0], owner_email: 'private@example.test', owner_id: 'owner', internal_notes: 'private', applicants: ['sensitive'] });
  assert.equal(result.owner_email, undefined);
  assert.equal(result.owner_id, undefined);
  assert.equal(result.internal_notes, undefined);
  assert.equal(result.applicants, undefined);
  assert.equal(result.verification.authorityToRent, 'not-checked');
});
test('database errors do not leak implementation or credentials', async () => {
  const res = await handleApi(request('/api/listings'), { DB: { prepare() { throw new Error('private database details'); } } });
  assert.equal(res.status, 503);
  assert.doesNotMatch(await res.text(), /private database/);
});
test('static responses have restrictive security headers', async () => {
  const res = await worker.fetch(request('/'), { ASSETS: { fetch: async () => new Response('<html></html>') } });
  assert.match(res.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  assert.match(res.headers.get('Permissions-Policy'), /camera=\(\)/);
});
