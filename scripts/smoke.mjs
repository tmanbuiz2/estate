import assert from 'node:assert/strict';
const base = process.env.ESTATE_PREVIEW_URL || 'http://127.0.0.1:4173';
for (const [path, type] of [['/', 'text/html'], ['/app.mjs', 'javascript'], ['/demo-app.mjs', 'javascript'], ['/live-app.mjs', 'javascript'], ['/workspace.html', 'text/html'], ['/workspace.mjs', 'javascript'], ['/shared/index.mjs', 'javascript'], ['/shared/demo.mjs', 'javascript'], ['/styles.css', 'text/css'], ['/art/townhouse.svg', 'image/svg+xml'], ['/art/bungalow.svg', 'image/svg+xml'], ['/art/apartment.svg', 'image/svg+xml']]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  assert.ok(response.headers.get('content-type').includes(type), path);
  assert.ok((await response.text()).length > 10, path);
  assert.ok(response.headers.get('content-security-policy').includes("script-src 'self'"));
}
const response = await fetch(base + '/api/listings?maxTotal=1500');
const data = await response.json();
const config = await (await fetch(base + '/api/config')).json();
assert.equal(data.demo, config.demo);
assert.equal(config.version, '0.2.0');
if (config.demo) assert.deepEqual(data.listings.map(l => l.id), ['demo-03']);
else assert.ok(data.listings.every(l => !l.demo));
assert.ok([302, 303, 307, 401, 503].includes((await fetch(base + '/api/workspace', { redirect: 'manual' })).status));
assert.equal((await fetch(base + '/api/applications', { method: 'POST' })).status, 405);
console.log('HTTP smoke check passed: HTML, modules, styles, illustrations, API filter and blocked submissions.');
