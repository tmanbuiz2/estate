import { authenticate, accessIssuer, HttpError } from './auth.mjs';
import { validateViewing } from '../packages/domain/index.mjs';
export const VERSION = '0.2.1';
export const CONSENT_VERSION = 'pilot-2026-10-30';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function pilotReady(env) {
  return env.DEMO_MODE === 'false' && env.PILOT_ENABLED === 'true' && Boolean(env.DB && accessIssuer(env) && env.ACCESS_AUD && emailPattern.test(env.PRIVACY_CONTACT || '')) && /^([1-9]|[1-8][0-9]|90)$/.test(String(env.REQUEST_RETENTION_DAYS || ''));
}
export async function expirePilotRequests(env) {
  if (!pilotReady(env)) return;
  const cutoff = new Date(Date.now() - Number(env.REQUEST_RETENTION_DAYS) * 86400000).toISOString();
  await env.DB.prepare('DELETE FROM requests WHERE julianday(created_at) < julianday(?)').bind(cutoff).run();
  await env.DB.prepare('DELETE FROM write_limits WHERE window < ?').bind(Math.floor(Date.now()/60000)-2).run();
}
const text = (value, max, label) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new HttpError(400, `Provide ${label} (up to ${max} characters).`);
  return value.trim();
};
const idValue = value => text(value, 100, 'a valid ID');
function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) throw new HttpError(400, `Invalid ${label}.`);
  return value;
}
function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, 'Choose a valid date.');
  const date = new Date(value + 'T12:00:00Z');
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new HttpError(400, 'Choose a valid date.');
  return value;
}
export function validateListing(body) {
  if (body.rightsConfirmed !== true) throw new HttpError(400, 'Confirm your authority to advertise and permission to reuse all listing content.');
  let source = '';
  if (body.sourceUrl) {
    try { const url = new URL(body.sourceUrl); if (url.protocol !== 'https:' || url.username || url.password) throw new Error(); source = url.href; } catch { throw new HttpError(400, 'Use an HTTPS source URL.'); }
    if (source.length > 1000) throw new HttpError(400, 'Source URL is too long.');
  }
  const costs = {};
  for (const name of ['heating', 'electricity', 'parking']) {
    const item = body.costs?.[name];
    if (!item || typeof item.included !== 'boolean' || typeof item.estimated !== 'boolean') throw new HttpError(400, `State whether ${name} is included, estimated or unknown.`);
    costs[name] = { included: item.included, estimated: item.estimated, amount: item.included ? 0 : item.amount === null ? null : integer(item.amount, 0, 100000, name) };
  }
  const features = body.features ?? [];
  if (!Array.isArray(features) || features.length > 2 || features.some(f => !['step-free','pets-considered'].includes(f))) throw new HttpError(400, 'Invalid features.');
  if (body.province && body.province !== 'NB') throw new HttpError(400, 'This pilot accepts New Brunswick properties only.');
  if ((body.country && body.country !== 'CA') || (body.currency && body.currency !== 'CAD')) throw new HttpError(400, 'Use Canadian properties and CAD pricing.');
  return { title: text(body.title, 160, 'a title'), neighbourhood: text(body.neighbourhood, 100, 'a neighbourhood'), city: text(body.city, 100, 'a city'), bedrooms: integer(body.bedrooms, 0, 9, 'bedroom count'), bathrooms: integer(body.bathrooms, 1, 9, 'bathroom count'), rent: integer(body.rent, 1, 100000, 'monthly rent'), costs, features: [...new Set(features)], description: text(body.description, 3000, 'a description'), availableFrom: dateValue(body.availableFrom), sourceUrl: source, rightsBasis: text(body.rightsBasis, 1000, 'your content permission or ownership basis') };
}
async function readBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Send application/json.');
  if (Number(request.headers.get('content-length')) > 65536) throw new HttpError(413, 'Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Provide a JSON body.');
  const chunks = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 65536) { await reader.cancel(); throw new HttpError(413, 'Request is too large.'); } chunks.push(value); }
  const buffer = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  try { const result = JSON.parse(new TextDecoder().decode(buffer)); if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error(); return result; } catch { throw new HttpError(400, 'Provide a JSON object.'); }
}
const rows = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;
const one = (db, sql, ...args) => db.prepare(sql).bind(...args).first();
const run = (db, sql, ...args) => db.prepare(sql).bind(...args).run();
function requireRole(user, ...roles) { if (!roles.includes(user.role)) throw new HttpError(403, 'This action requires an approved account role.'); }
function listingStatement(db, user, value) {
  return db.prepare('INSERT INTO listings (id, owner_id, title, neighbourhood, city, bedrooms, bathrooms, rent, costs, features, description, available_from, source_url, rights_basis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), user.id, value.title, value.neighbourhood, value.city, value.bedrooms, value.bathrooms, value.rent, JSON.stringify(value.costs), JSON.stringify(value.features), value.description, value.availableFrom, value.sourceUrl, value.rightsBasis);
}
export async function handlePilot(request, env, json) {
  try {
    if (!pilotReady(env)) throw new HttpError(503, 'The private pilot is not configured. Demo drafts are not submitted.');
    const user = await authenticate(request, env);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '');
    const mutation = request.method !== 'GET';
    if (mutation) {
      if (request.headers.get('Origin') !== url.origin || request.headers.get('X-Estate-Request') !== '1' || request.headers.get('Sec-Fetch-Site') === 'cross-site') throw new HttpError(403, 'Submit this request from the Estate website.');
      if (request.method !== 'POST') throw new HttpError(405, 'Use POST for changes.');
      const window = Math.floor(Date.now() / 60000);
      const limit = await one(env.DB, 'INSERT INTO write_limits(user_id, window) VALUES (?, ?) ON CONFLICT(user_id, window) DO UPDATE SET count = count + 1 RETURNING count', user.id, window);
      if (limit.count > 30) return json({ error: 'Too many changes. Try again in one minute.' }, 429, { 'Retry-After': '60' });
      await run(env.DB, 'DELETE FROM write_limits WHERE window < ?', window - 2);
    }
    await run(env.DB, 'INSERT INTO accounts(id, email) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET email=excluded.email', user.id, user.email);
    if (path === '/api/workspace' && request.method === 'GET') {
      const listings = user.role === 'admin' ? await rows(env.DB, 'SELECT * FROM listings ORDER BY created_at DESC LIMIT 200') : await rows(env.DB, 'SELECT * FROM listings WHERE owner_id = ? ORDER BY created_at DESC LIMIT 200', user.id);
      const requests = user.role === 'admin'
        ? await rows(env.DB, 'SELECT r.*, l.title, a.email AS requester_email FROM requests r JOIN listings l ON l.id=r.listing_id JOIN accounts a ON a.id=r.user_id ORDER BY r.created_at DESC LIMIT 200')
        : await rows(env.DB, "SELECT r.*, l.title, CASE WHEN l.owner_id=? AND r.kind!='report' THEN a.email ELSE NULL END AS requester_email FROM requests r JOIN listings l ON l.id=r.listing_id JOIN accounts a ON a.id=r.user_id WHERE r.user_id=? OR (l.owner_id=? AND r.kind!='report') ORDER BY r.created_at DESC LIMIT 200", user.id, user.id, user.id);
      const tenancies = await rows(env.DB, 'SELECT t.id, t.listing_id, l.title FROM tenancies t JOIN listings l ON l.id=t.listing_id WHERE t.tenant_id=? AND t.active=1', user.id);
      return json({ user, listings, requests, tenancies, consentVersion: CONSENT_VERSION, privacyContact: env.PRIVACY_CONTACT, retentionDays: Number(env.REQUEST_RETENTION_DAYS), paymentsEnabled: false, uploadsEnabled: false, limit: 200 });
    }
    const body = mutation ? await readBody(request) : {};
    if (path === '/api/workspace/delete-account' && mutation) {
      if (body.email !== user.email) throw new HttpError(400, 'Confirm your signed-in email to delete this profile.');
      if (await one(env.DB, 'SELECT id FROM listings WHERE owner_id=? LIMIT 1', user.id) || await one(env.DB, 'SELECT id FROM tenancies WHERE tenant_id=? AND active=1 LIMIT 1', user.id)) throw new HttpError(409, 'Contact the privacy operator to close linked listings or tenancies and arrange deletion.');
      await env.DB.batch([
        env.DB.prepare('DELETE FROM requests WHERE user_id=?').bind(user.id),
        env.DB.prepare('DELETE FROM tenancies WHERE tenant_id=? AND active=0').bind(user.id),
        env.DB.prepare('DELETE FROM accounts WHERE id=?').bind(user.id)
      ]);
      return json({ message: 'Your Estate profile and submitted requests have been deleted. Cloudflare identity and infrastructure logs are managed separately. Signing in again creates a new profile.' });
    }
    if (path === '/api/workspace/listings' && mutation) {
      requireRole(user, 'landlord','admin');
      const value = validateListing(body);
      await listingStatement(env.DB, user, value).run();
      return json({ message: 'Listing draft saved. Submit it for review before publication.' }, 201);
    }
    if (path === '/api/workspace/import' && mutation) {
      requireRole(user, 'admin');
      if (!Array.isArray(body.listings) || body.listings.length < 1 || body.listings.length > 20) throw new HttpError(400, 'Import between 1 and 20 authorized listings at a time.');
      const validated = body.listings.map(validateListing);
      await env.DB.batch(validated.map(value => listingStatement(env.DB, user, value)));
      return json({ message: `${validated.length} listing drafts imported. Each needs review before publication.` }, 201);
    }
    if (path === '/api/workspace/listing-status' && mutation) {
      requireRole(user, 'landlord','admin');
      const listing = await one(env.DB, 'SELECT * FROM listings WHERE id=?', idValue(body.id));
      if (!listing || (listing.owner_id !== user.id && user.role !== 'admin')) throw new HttpError(404, 'Listing not found.');
      if (!['review','published','paused','rented','confirm'].includes(body.status)) throw new HttpError(400, 'Invalid listing action.');
      if (body.status === 'published') {
        requireRole(user, 'admin');
        if (listing.status !== 'review' || !listing.rights_basis) throw new HttpError(409, 'Only a submitted listing with content permission can be published.');
        const note = text(body.note, 1000, 'your review record');
        await run(env.DB, "UPDATE listings SET status='published', moderation_note=?, confirmed_at=? WHERE id=? AND status='review'", note, new Date().toISOString(), listing.id);
      } else if (body.status === 'confirm') {
        if (listing.status !== 'published') throw new HttpError(409, 'Only published listings can be reconfirmed.');
        await run(env.DB, 'UPDATE listings SET confirmed_at=? WHERE id=?', new Date().toISOString(), listing.id);
      } else {
        if (body.status === 'review' && !['draft','paused'].includes(listing.status)) throw new HttpError(409, 'Only drafts or paused listings can be submitted for review.');
        await run(env.DB, 'UPDATE listings SET status=? WHERE id=?', body.status, listing.id);
      }
      return json({ message: 'Listing updated.' });
    }
    if (path === '/api/workspace/requests' && mutation) {
      if (!['application','viewing','report','repair'].includes(body.kind)) throw new HttpError(400, 'Choose a request type.');
      if (body.consent !== true || body.consentVersion !== CONSENT_VERSION) throw new HttpError(400, 'Read and accept the current request-sharing notice.');
      const listing = await one(env.DB, 'SELECT * FROM listings WHERE id=?', idValue(body.listingId));
      if (!listing) throw new HttpError(404, 'Listing not found.');
      if (body.kind === 'repair') {
        if (!await one(env.DB, 'SELECT id FROM tenancies WHERE listing_id=? AND tenant_id=? AND active=1', listing.id, user.id)) throw new HttpError(403, 'A confirmed tenancy link is required to send repair requests.');
      } else if (body.kind !== 'report' && (listing.status !== 'published' || !Number.isFinite(Date.parse(listing.confirmed_at)) || Date.parse(listing.confirmed_at) < Date.now() - 14 * 86400000)) throw new HttpError(409, 'This listing is no longer accepting requests.');
      const note = text(body.note, 1000, 'a short message');
      let date = null, slot = null;
      if (body.kind === 'viewing') { const error = validateViewing(body.date, body.slot); if (error) throw new HttpError(400, error); date = body.date; slot = body.slot; }
      if (['application','viewing'].includes(body.kind) && await one(env.DB, "SELECT id FROM requests WHERE listing_id=? AND user_id=? AND kind=? AND status IN ('submitted','acknowledged')", listing.id, user.id, body.kind)) throw new HttpError(409, 'You already have an active request of this type.');
      await run(env.DB, 'INSERT INTO requests(id, listing_id, user_id, kind, note, preferred_date, preferred_slot, consent_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', crypto.randomUUID(), listing.id, user.id, body.kind, note, date, slot, CONSENT_VERSION);
      return json({ message: body.kind === 'report' ? 'Report submitted for administrator review.' : 'Request submitted. Check your workspace for updates; no email notification or booking confirmation has been sent.' }, 201);
    }
    if (path === '/api/workspace/request-status' && mutation) {
      const item = await one(env.DB, 'SELECT r.*, l.owner_id FROM requests r JOIN listings l ON l.id=r.listing_id WHERE r.id=?', idValue(body.id));
      if (!item) throw new HttpError(404, 'Request not found.');
      const receiver = user.role === 'admin' || (item.owner_id === user.id && item.kind !== 'report');
      if (body.status === 'withdrawn') { if (item.user_id !== user.id) throw new HttpError(403, 'Only the sender can withdraw this request.'); }
      else if (!receiver) throw new HttpError(403, 'You cannot manage this request.');
      const allowed = item.kind === 'repair' || item.kind === 'report' ? ['acknowledged','resolved','withdrawn'] : ['acknowledged','declined','withdrawn'];
      if (!allowed.includes(body.status) || !['submitted','acknowledged'].includes(item.status)) throw new HttpError(409, 'Invalid request transition.');
      await run(env.DB, "UPDATE requests SET status=?, updated_at=datetime('now') WHERE id=?", body.status, item.id);
      return json({ message: 'Request updated. Acknowledgement does not confirm a booking or tenancy.' });
    }
    if (path === '/api/workspace/tenancies' && mutation) {
      requireRole(user, 'admin');
      if (body.confirmed !== true) throw new HttpError(400, 'Confirm that both parties authorized this tenancy link.');
      const listing = await one(env.DB, 'SELECT id FROM listings WHERE id=?', idValue(body.listingId));
      const tenant = await one(env.DB, 'SELECT id FROM accounts WHERE email=?', text(body.email, 254, 'the tenant email').toLowerCase());
      if (!listing || !tenant) throw new HttpError(404, 'Listing or signed-in tenant not found.');
      if (typeof body.active !== 'boolean') throw new HttpError(400, 'State whether this tenancy is active.');
      await run(env.DB, 'INSERT INTO tenancies(id, listing_id, tenant_id, active) VALUES (?, ?, ?, ?) ON CONFLICT(listing_id, tenant_id) DO UPDATE SET active=excluded.active', crypto.randomUUID(), listing.id, tenant.id, body.active ? 1 : 0);
      return json({ message: 'Tenancy link updated. This record does not create a lease.' });
    }
    throw new HttpError(404, 'Not found.');
  } catch (error) {
    return json({ error: error instanceof HttpError ? error.message : 'The workspace is temporarily unavailable. No success has been confirmed.' }, error instanceof HttpError ? error.status : 503);
  }
}
