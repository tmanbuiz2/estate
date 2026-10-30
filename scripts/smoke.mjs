import assert from 'node:assert/strict';
const base = process.env.ESTATE_PREVIEW_URL || 'http://127.0.0.1:4173';
for (const [path, type] of [['/', 'text/html'], ['/app.mjs', 'javascript'], ['/shared/index.mjs', 'javascript'], ['/shared/demo.mjs', 'javascript'], ['/styles.css', 'text/css'], ['/art/townhouse.svg', 'image/svg+xml'], ['/art/bungalow.svg', 'image/svg+xml'], ['/art/apartment.svg', 'image/svg+xml']]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  assert.ok(response.headers.get('content-type').includes(type), path);
  assert.ok((await response.text()).length > 10, path);
  assert.ok(response.headers.get('content-security-policy').includes("script-src 'self'"));
}
const response = await fetch(base + '/api/listings?maxTotal=1500');
const data = await response.json();
assert.equal(data.demo, true);
assert.deepEqual(data.listings.map(l => l.id), ['demo-03']);
assert.equal((await fetch(base + '/api/applications', { method: 'POST' })).status, 405);
console.log('HTTP smoke check passed: HTML, modules, styles, illustrations, API filter and blocked submissions.');
