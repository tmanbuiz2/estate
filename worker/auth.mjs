// Cloudflare Access signs user application tokens. Never trust identity headers alone.
const keyCache = new Map();
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function accessIssuer(env) {
  const value = String(env.ACCESS_ISSUER || '').replace(/\/$/, '');
  return /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(value) ? value : null;
}
function decode(part) {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error('encoding');
  return Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
export async function verifyAccessToken(token, env, fetchKeys = fetch, now = Date.now()) {
  const issuer = accessIssuer(env);
  if (!issuer || !env.ACCESS_AUD) throw new HttpError(503, 'Sign-in is not configured.');
  try {
    if (typeof token !== 'string' || token.length > 16000) throw new Error('token');
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('parts');
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    const seconds = Math.floor(now / 1000);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('algorithm');
    if (claims.iss !== issuer || !Array.isArray(claims.aud) || !claims.aud.includes(env.ACCESS_AUD)) throw new Error('audience');
    if (!Number.isFinite(claims.exp) || claims.exp <= seconds || !Number.isFinite(claims.iat) || claims.iat > seconds + 30) throw new Error('expiry');
    if (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > seconds + 30)) throw new Error('not before');
    if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 256 || typeof claims.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)) throw new Error('identity');
    let cached = keyCache.get(issuer);
    if (!cached || cached.until < now) {
      const res = await fetchKeys(issuer + '/cdn-cgi/access/certs', { signal: AbortSignal.timeout(5000), redirect: 'error' });
      if (!res.ok) throw new HttpError(503, 'Sign-in verification is temporarily unavailable.');
      const { keys } = await res.json();
      if (!Array.isArray(keys)) throw new Error('keys');
      cached = { keys, until: now + 300000 };
      keyCache.set(issuer, cached);
    }
    const jwk = cached.keys.find(k => k.kid === header.kid && k.kty === 'RSA');
    if (!jwk) { keyCache.delete(issuer); throw new Error('key'); }
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts.slice(0, 2).join('.')))) throw new Error('signature');
    return claims;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'Sign in with your verified email to continue.');
  }
}
export async function authenticate(request, env) {
  const claims = await verifyAccessToken(request.headers.get('Cf-Access-Jwt-Assertion'), env);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(claims.iss + '|' + claims.sub));
  const id = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const email = claims.email.toLowerCase();
  const includes = value => String(value || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean).includes(email);
  return { id, email, role: includes(env.ADMIN_EMAILS) ? 'admin' : includes(env.LANDLORD_EMAILS) ? 'landlord' : 'renter' };
}
