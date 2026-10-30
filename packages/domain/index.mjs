export function monthlyCost(listing) {
  let confirmed = listing.rent;
  let estimated = 0;
  const unknown = [];
  for (const [name, item] of Object.entries(listing.costs ?? {})) {
    if (item.included) continue;
    if (!Number.isFinite(item.amount)) { unknown.push(name); continue; }
    if (item.estimated) estimated += item.amount;
    else confirmed += item.amount;
  }
  return { confirmed, estimated, unknown, total: unknown.length ? null : confirmed + estimated };
}

export function filterListings(listings, filters = {}) {
  const text = String(filters.query ?? '').trim().toLowerCase();
  const max = Number(filters.maxTotal);
  const bedrooms = Number(filters.bedrooms);
  const result = listings.filter(l => {
    if (l.status !== 'published') return false;
    if (text && ![l.city, l.neighbourhood, l.title].join(' ').toLowerCase().includes(text)) return false;
    if (bedrooms > 0 && l.bedrooms < bedrooms) return false;
    if (filters.accessible && !l.features.includes('step-free')) return false;
    if (filters.pets && !l.features.includes('pets-considered')) return false;
    const cost = monthlyCost(l);
    if (max > 0 && (cost.total === null || cost.total > max)) return false;
    return true;
  });
  const price = l => monthlyCost(l).total ?? Infinity;
  return result.sort(filters.sort === 'price' ? (a, b) => price(a) - price(b) : (a, b) => b.confirmedAt.localeCompare(a.confirmedAt));
}

export function parseFilters(searchParams) {
  const maxTotal = searchParams.get('maxTotal') ?? '';
  const bedrooms = searchParams.get('bedrooms') ?? '';
  if (maxTotal && (!/^\d{1,7}$/.test(maxTotal) || Number(maxTotal) < 1)) throw new Error('Invalid monthly budget');
  if (bedrooms && !/^[0-9]$/.test(bedrooms)) throw new Error('Invalid bedroom count');
  const query = (searchParams.get('query') ?? '').trim();
  if (query.length > 100) throw new Error('Search is too long');
  return { query, maxTotal, bedrooms, accessible: searchParams.get('accessible') === 'true', pets: searchParams.get('pets') === 'true', sort: searchParams.get('sort') === 'price' ? 'price' : 'recent' };
}

export function readState(raw) {
  const empty = { saved: [], comparisons: [], applications: [], viewings: [], repairs: [] };
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') return empty;
    for (const key of Object.keys(empty)) if (Array.isArray(value[key])) empty[key] = value[key].slice(0, 100).filter(v => key === 'saved' || key === 'comparisons' ? typeof v === 'string' : v && typeof v.id === 'string' && typeof v.listingId === 'string');
    return empty;
  } catch { return empty; }
}

export function validateViewing(date, slot, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Choose a viewing date.';
  const day = new Date(date + 'T12:00:00Z');
  if (Number.isNaN(day.valueOf()) || day.toISOString().slice(0, 10) !== date) return 'Choose a valid date.';
  // Compare calendar days in the property timezone, not the device timezone.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Moncton', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (date <= today) return 'Choose a date after today.';
  if (!['09:00', '13:00', '17:00'].includes(slot)) return 'Choose a viewing time.';
  return null;
}
