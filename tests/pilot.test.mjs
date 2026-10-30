import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleApi } from '../worker/index.mjs';
import { authenticate, verifyAccessToken } from '../worker/auth.mjs';
import { CONSENT_VERSION, validateListing, expirePilotRequests } from '../worker/pilot.mjs';
let pair, jwk;
const issuer = 'https://estate-pilot-test.cloudflareaccess.com';
const authEnv = { ACCESS_ISSUER:issuer, ACCESS_AUD:'estate-test' };
const b64 = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
async function token(email, overrides = {}, header = {}) {
  const now = Math.floor(Date.now()/1000);
  const content = `${b64({ alg:'RS256', kid:'test', ...header })}.${b64({ iss:issuer, aud:['estate-test'], sub:email, email, iat:now, exp:now+3600, ...overrides })}`;
  return content + '.' + Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(content))).toString('base64url');
}
before(async () => {
  pair = await crypto.subtle.generateKey({ name:'RSASSA-PKCS1-v1_5', modulusLength:2048, publicExponent:new Uint8Array([1,0,1]), hash:'SHA-256' }, true, ['sign','verify']);
  jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid:'test' };
  await verifyAccessToken(await token('cache@example.test'), authEnv, async () => Response.json({ keys:[jwk] }));
});
function database() {
  const sql = new DatabaseSync(':memory:');
  for (const name of ['0001_initial.sql','0002_private_pilot.sql']) sql.exec(readFileSync(new URL('../migrations/'+name, import.meta.url),'utf8'));
  const adapter = query => { let args = []; return { bind(...values) { args = values; return this; }, async first() { return sql.prepare(query).get(...args) ?? null; }, async all() { return { results:sql.prepare(query).all(...args) }; }, async run() { return sql.prepare(query).run(...args); } }; };
  return { sql, env:{ ...authEnv, DEMO_MODE:'false', PILOT_ENABLED:'true', PRIVACY_CONTACT:'privacy@example.test', REQUEST_RETENTION_DAYS:'30', ADMIN_EMAILS:'admin@example.test', LANDLORD_EMAILS:'owner@example.test,other@example.test', DB:{ prepare:adapter, async batch(statements) { sql.exec('BEGIN'); try { const results = []; for (const item of statements) results.push(await item.run()); sql.exec('COMMIT'); return results; } catch (e) { sql.exec('ROLLBACK'); throw e; } } } } };
}
async function call(env, email, path = '', body, headers = {}) {
  return handleApi(new Request('https://estate.example/api/workspace'+path, { method:body ? 'POST' : 'GET', headers:{ 'Cf-Access-Jwt-Assertion':await token(email), ...(body ? { Origin:'https://estate.example', 'Content-Type':'application/json', 'X-Estate-Request':'1' } : {}), ...headers }, ...(body ? { body:JSON.stringify(body) } : {}) }), env);
}
const fixture = () => ({ title:'Original home description', city:'Fredericton', neighbourhood:'Downtown', bedrooms:2, bathrooms:1, rent:1500, availableFrom:'2027-01-01', description:'An original listing used only as a test fixture.', costs:Object.fromEntries(['heating','electricity','parking'].map(name => [name,{ included:false, estimated:false, amount:null }])), rightsConfirmed:true, rightsBasis:'Property owner; original text.' });
async function published(db) {
  assert.equal((await call(db.env,'owner@example.test','/listings',fixture())).status,201);
  const { id } = db.sql.prepare('SELECT id FROM listings').get();
  assert.equal((await call(db.env,'owner@example.test','/listing-status',{ id,status:'review' })).status,200);
  assert.equal((await call(db.env,'admin@example.test','/listing-status',{ id,status:'published',note:'Reviewed ownership and content permission; test fixture.' })).status,200);
  return id;
}
test('Access verification rejects forged, expired, wrong issuer/audience and unsigned tokens', async () => {
  const good = await token('renter@example.test');
  assert.equal((await verifyAccessToken(good,authEnv)).email,'renter@example.test');
  for (const invalid of [good.slice(0,-8)+'AAAAAAAA', await token('renter@example.test',{ exp:0 }), await token('renter@example.test',{ iss:'https://attacker.example' }), await token('renter@example.test',{ aud:['other-app'] }), await token('renter@example.test',{}, { alg:'none' }), await token('renter@example.test',{ iat:Math.floor(Date.now()/1000)+3600 })]) await assert.rejects(verifyAccessToken(invalid,authEnv), e => e.status === 401);
});
test('pilot fails closed without setup and rejects identity header spoofing', async () => {
  const db = database();
  try {
    assert.equal((await call({ ...db.env,DEMO_MODE:'true' },'admin@example.test')).status,503);
    assert.equal((await call({ ...db.env,PRIVACY_CONTACT:'' },'admin@example.test')).status,503);
    const res = await handleApi(new Request('https://estate.example/api/workspace',{ headers:{ 'Cf-Access-Authenticated-User-Email':'admin@example.test' } }),db.env);
    assert.equal(res.status,401);
    assert.equal(db.sql.prepare('SELECT count(*) AS n FROM accounts').get().n,0);
  } finally { db.sql.close(); }
});
test('listing validation requires reuse permission and preserves unknown costs', () => {
  const value = fixture(); assert.equal(validateListing(value).costs.heating.amount,null);
  assert.throws(() => validateListing({ ...value, rightsConfirmed:false }));
  assert.throws(() => validateListing({ ...value, province:'ON' }));
  assert.throws(() => validateListing({ ...value, costs:{} }));
  assert.throws(() => validateListing({ ...value, sourceUrl:'javascript:alert(1)' }));
  assert.throws(() => validateListing({ ...value, rent:-1 }));
});
test('publication is draft first, owner scoped and administrator reviewed', async () => {
  const db = database();
  try {
    assert.equal((await call(db.env,'renter@example.test','/listings',fixture())).status,403);
    assert.equal((await call(db.env,'owner@example.test','/listings',fixture())).status,201);
    const { id } = db.sql.prepare('SELECT id FROM listings').get();
    assert.equal(db.sql.prepare('SELECT status FROM listings').get().status,'draft');
    assert.equal((await call(db.env,'other@example.test','/listing-status',{ id,status:'review' })).status,404);
    assert.equal((await call(db.env,'owner@example.test','/listing-status',{ id,status:'published',note:'self approval' })).status,403);
    assert.equal((await call(db.env,'admin@example.test','/listing-status',{ id,status:'published',note:'skip review' })).status,409);
    assert.equal((await call(db.env,'owner@example.test','/listing-status',{ id,status:'review' })).status,200);
    assert.equal((await call(db.env,'admin@example.test','/listing-status',{ id,status:'published',note:'Reviewed rights and accuracy.' })).status,200);
    const publicRes = await handleApi(new Request('https://estate.example/api/listings'),db.env);
    const list = (await publicRes.json()).listings;
    assert.equal(list.length,1); assert.equal(list[0].rights_basis,undefined); assert.equal(list[0].owner_id,undefined);
    assert.equal((await handleApi(new Request('https://estate.example/api/listings?maxTotal=3000'),db.env)).status,200);
    assert.equal((await (await handleApi(new Request('https://estate.example/api/listings?maxTotal=3000'),db.env)).json()).listings.length,0);
  } finally { db.sql.close(); }
});
test('requests require current consent and are private; landlords cannot read reports or other landlords applications', async () => {
  const db = database();
  try {
    const listingId = await published(db);
    const body = { listingId,kind:'application',note:'I am interested in a viewing.',consent:true,consentVersion:CONSENT_VERSION };
    assert.equal((await call(db.env,'renter@example.test','/requests',{ ...body,consent:false })).status,400);
    assert.equal((await call(db.env,'renter@example.test','/requests',body)).status,201);
    assert.equal((await call(db.env,'renter@example.test','/requests',body)).status,409);
    assert.equal((await call(db.env,'renter@example.test','/requests',{ ...body,kind:'report',note:'Private moderation concern' })).status,201);
    const owner = await (await call(db.env,'owner@example.test')).json();
    assert.equal(owner.requests.length,1); assert.equal(owner.requests[0].requester_email,'renter@example.test');
    assert.equal((await (await call(db.env,'other@example.test')).json()).requests.length,0);
    assert.equal((await (await call(db.env,'stranger@example.test')).json()).requests.length,0);
    assert.equal((await (await call(db.env,'admin@example.test')).json()).requests.length,2);
    const requestId = owner.requests[0].id;
    assert.equal((await call(db.env,'other@example.test','/request-status',{ id:requestId,status:'declined' })).status,403);
    assert.equal((await call(db.env,'renter@example.test','/request-status',{ id:requestId,status:'withdrawn' })).status,200);
    assert.equal((await call(db.env,'owner@example.test','/request-status',{ id:requestId,status:'acknowledged' })).status,409);
  } finally { db.sql.close(); }
});
test('CSRF checks, throttling, import validation and tenancy access are enforced', async () => {
  const db = database();
  try {
    const listingId = await published(db);
    assert.equal((await call(db.env,'owner@example.test','/listings',fixture(),{ Origin:'https://attacker.example' })).status,403);
    assert.equal((await call(db.env,'owner@example.test','/listings',fixture(),{ 'X-Estate-Request':'' })).status,403);
    assert.equal((await call(db.env,'admin@example.test','/import',{ listings:[fixture(),{ ...fixture(),rightsConfirmed:false }] })).status,400);
    assert.equal(db.sql.prepare('SELECT count(*) AS n FROM listings').get().n,1);
    const body = { listingId,kind:'repair',note:'The tap is dripping.',consent:true,consentVersion:CONSENT_VERSION };
    assert.equal((await call(db.env,'renter@example.test','/requests',body)).status,403);
    assert.equal((await call(db.env,'admin@example.test','/tenancies',{ listingId,email:'renter@example.test',active:true,confirmed:true })).status,200);
    assert.equal((await call(db.env,'renter@example.test','/requests',body)).status,201);
    assert.equal((await call(db.env,'stranger@example.test','/requests',body)).status,403);
    const user = await authenticate(new Request('https://estate.example',{ headers:{ 'Cf-Access-Jwt-Assertion':await token('renter@example.test') } }),db.env);
    db.sql.prepare('INSERT OR REPLACE INTO write_limits(user_id,window,count) VALUES (?,?,30)').run(user.id,Math.floor(Date.now()/60000));
    const limited = await call(db.env,'renter@example.test','/requests',body);
    assert.equal(limited.status,429); assert.equal(limited.headers.get('Retry-After'),'60');
    assert.equal((await call(db.env,'renter@example.test')).status,200);
  } finally { db.sql.close(); }
});
test('retention removes old requests and account deletion removes only the signed-in profile', async () => {
  const db = database();
  try {
    const listingId = await published(db);
    const body = { listingId,kind:'application',note:'Please contact me.',consent:true,consentVersion:CONSENT_VERSION };
    assert.equal((await call(db.env,'renter@example.test','/requests',body)).status,201);
    assert.equal((await call(db.env,'stranger@example.test','/requests',body)).status,201);
    db.sql.prepare("UPDATE requests SET created_at='2020-01-01' WHERE user_id=(SELECT id FROM accounts WHERE email='stranger@example.test')").run();
    await expirePilotRequests(db.env);
    assert.equal(db.sql.prepare('SELECT count(*) AS n FROM requests').get().n,1);
    assert.equal((await call(db.env,'renter@example.test','/delete-account',{ email:'stranger@example.test' })).status,400);
    assert.equal((await call(db.env,'owner@example.test','/delete-account',{ email:'owner@example.test' })).status,409);
    assert.equal((await call(db.env,'renter@example.test','/delete-account',{ email:'renter@example.test' })).status,200);
    assert.equal(db.sql.prepare('SELECT count(*) AS n FROM requests').get().n,0);
    assert.equal(db.sql.prepare("SELECT count(*) AS n FROM accounts WHERE email='renter@example.test'").get().n,0);
    assert.equal(db.sql.prepare("SELECT count(*) AS n FROM accounts WHERE email='stranger@example.test'").get().n,1);
  } finally { db.sql.close(); }
});
