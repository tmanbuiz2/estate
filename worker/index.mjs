import { filterListings, parseFilters } from '../packages/domain/index.mjs';
import { demoListings } from '../packages/domain/demo.mjs';

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
};
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { ...headers, ...extra } });

// Explicit projection: no owner contact details, internal notes or applicant data.
export function publicListing(row) {
  return {
    id: row.id, title: row.title, neighbourhood: row.neighbourhood, city: row.city, province: row.province,
    country: row.country, currency: row.currency, bedrooms: row.bedrooms, bathrooms: row.bathrooms,
    rent: row.rent, status: row.status, confirmedAt: row.confirmedAt ?? row.confirmed_at,
    availableFrom: row.availableFrom ?? row.available_from,
    costs: typeof row.costs === 'string' ? JSON.parse(row.costs) : row.costs,
    features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
    description: row.description, demo: Boolean(row.demo), art: row.art ?? 'townhouse',
    verification: { identity: 'not-checked', authorityToRent: 'not-checked', propertySafety: 'not-inspected' }
  };
}

export async function handleApi(request, env = {}) {
  const url = new URL(request.url);
  if (url.pathname === '/api/health' && request.method === 'GET') return json({ status: 'ok', mode: env.DEMO_MODE === 'true' ? 'demo' : 'read-only', writesEnabled: false });
  if (request.method !== 'GET') return json({ error: 'Live accounts, document uploads, payments and submissions are not enabled in this prototype.' }, 405, { Allow: 'GET' });
  if (!/^\/api\/listings(?:\/[^/]+)?$/.test(url.pathname)) return json({ error: 'Not found' }, 404);
  let filters;
  try { filters = parseFilters(url.searchParams); } catch (e) { return json({ error: e.message }, 400); }
  try {
    let inventory;
    if (env.DEMO_MODE === 'true') inventory = demoListings;
    else if (!env.DB) return json({ error: 'Listing database is not configured.' }, 503);
    else {
      const result = await env.DB.prepare("SELECT id, title, neighbourhood, city, province, country, currency, bedrooms, bathrooms, rent, status, confirmed_at, available_from, costs, features, description FROM listings WHERE status = 'published' AND province = 'NB' AND julianday(confirmed_at) >= julianday('now', '-14 days') ORDER BY confirmed_at DESC LIMIT 500").all();
      inventory = result.results.map(publicListing);
    }
    const id = url.pathname.split('/')[3];
    if (id) {
      const listing = inventory.find(l => l.id === id && l.status === 'published');
      return listing ? json({ listing, demo: env.DEMO_MODE === 'true' }) : json({ error: 'Listing not found' }, 404);
    }
    return json({ listings: filterListings(inventory, filters), demo: env.DEMO_MODE === 'true', limit: 500 });
  } catch {
    return json({ error: 'Listings are temporarily unavailable.' }, 503);
  }
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleApi(request, env);
    if (!env.ASSETS) return new Response('Static assets are not configured.', { status: 503 });
    const response = await env.ASSETS.fetch(request);
    const secured = new Response(response.body, response);
    secured.headers.set('X-Content-Type-Options', 'nosniff');
    secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    secured.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    return secured;
  }
};
