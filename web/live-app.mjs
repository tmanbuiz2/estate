import { monthlyCost, filterListings } from './shared/index.mjs';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const money = value => value === null ? 'Not fully provided' : new Intl.NumberFormat('en-CA', { style:'currency', currency:'CAD', maximumFractionDigits:0 }).format(value);
export async function startLive(config) {
  let inventory = [], filters = {}, error = '';
  let saved;
  try { const value = JSON.parse(localStorage.getItem('estate-live-saved') || '[]'); saved = Array.isArray(value) ? value.filter(v => typeof v === 'string').slice(0,100) : []; } catch { saved = []; }
  const main = document.querySelector('main');
  const dialog = document.querySelector('#detail-dialog');
  const content = document.querySelector('#dialog-content');
  document.querySelector('.demo-banner').textContent = `Estate ${config.version} � New Brunswick rental listings � ${config.pilotEnabled ? 'Private pilot' : 'Read-only listings'}`;
  document.querySelector('header').innerHTML = '<a class="brand" href="/">estate.</a><nav aria-label="Main navigation"><a href="#discover">Find a home</a><a href="#saved">Saved homes</a><a href="/workspace.html">My workspace / Sign in</a></nav><button class="secondary" id="live-privacy">Privacy</button>';
  document.querySelector('footer').innerHTML = `<a class="brand" href="/">estate.</a><p>By WianTribe � Version ${esc(config.version)}</p><button class="text-button" id="live-clear">Clear saved homes</button>`;
  const open = html => { content.innerHTML = html; if (!dialog.open) dialog.showModal(); };
  const link = (id, kind) => `/workspace.html?listing=${encodeURIComponent(id)}&kind=${kind}`;
  function card(l) {
    const cost = monthlyCost(l);
    return `<article class="card"><div class="card-picture"><img src="/art/${['townhouse','bungalow','apartment'].includes(l.art) ? l.art : 'townhouse'}.svg" alt="Illustration; not a photograph of this property"><span class="sample-tag">PROPERTY ILLUSTRATION</span></div><div class="card-content"><p class="location">${esc(l.neighbourhood)} � ${esc(l.city)}, NB</p><h3>${esc(l.title)}</h3><p>${l.bedrooms} bedrooms � ${l.bathrooms} bathrooms</p><div class="price"><strong>${money(cost.total)}</strong><span> / month${cost.estimated ? ' estimated' : ''}</span><small>${money(l.rent)} rent${cost.unknown.length ? ' � Extra costs need confirmation' : ' � Including listed extras'}</small></div><div class="card-foot"><button class="secondary" data-live-detail="${esc(l.id)}">View home</button><button class="text-button" data-live-save="${esc(l.id)}" aria-pressed="${saved.includes(l.id)}">${saved.includes(l.id) ? 'Unsave' : 'Save'}</button></div></div></article>`;
  }
  function render() {
    const results = filterListings(location.hash === '#saved' ? inventory.filter(l => saved.includes(l.id)) : inventory, filters);
    main.innerHTML = `<section class="content-section"><div class="page-heading"><div class="eyebrow">New Brunswick � CAD</div><h1>A better place to begin.</h1><p>Explore available homes, understand the monthly cost, and send a request through your workspace.</p></div><form id="live-search" class="search-panel"><div class="field"><label for="live-query">City or neighbourhood</label><input id="live-query" name="query" type="search" maxlength="100" value="${esc(filters.query || '')}"></div><div class="field"><label for="live-budget">Maximum monthly total</label><input id="live-budget" name="maxTotal" type="number" min="1" max="100000" value="${esc(filters.maxTotal || '')}" placeholder="Any budget"></div><div class="field"><label for="live-beds">Bedrooms, minimum</label><input id="live-beds" name="bedrooms" type="number" min="0" max="9" value="${esc(filters.bedrooms || '')}"></div><button class="primary">Search</button></form><p role="status">${error ? esc(error) : `${results.length} available homes${location.hash === '#saved' ? ' in your shortlist' : ''}. Availability expires after 14 days without reconfirmation. Showing up to 500 listings.`}</p>${!config.pilotEnabled ? '<div class="notice">Online requests are awaiting service setup. Listing information is available to browse.</div>' : ''}<div class="cards">${results.map(card).join('')}</div>${!error && !results.length ? '<div class="empty"><h2>No homes to show yet.</h2><p>New listings appear here after review. Try another search or return later.</p></div>' : ''}</section>`;
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.id === 'close-dialog') return dialog.close();
    if (button.id === 'live-clear') { saved = []; try { localStorage.removeItem('estate-live-saved'); } catch {} render(); }
    if (button.dataset.liveSave) {
      const id = button.dataset.liveSave; saved = saved.includes(id) ? saved.filter(v => v !== id) : [...saved,id].slice(-100);
      try { localStorage.setItem('estate-live-saved', JSON.stringify(saved)); } catch { error = 'Saving is unavailable in this browser. This shortlist lasts only for this visit.'; } render();
    }
    if (button.id === 'live-privacy') open(`<h2 id="dialog-heading">Your information</h2><p>Your shortlist stores only listing IDs in this browser. Clear it using the footer button. Signing in uses Cloudflare Access.</p><p>Requests store your verified email, your message and status. Application, viewing and repair messages are shared with the receiving landlord and administrators; reports are shared with administrators. Do not send identity documents, financial information or medical details.</p><p>Payments and document uploads are unavailable. Contact ${esc(config.privacyContact || 'the service operator before submitting personal information')} for access, correction, deletion or privacy questions.</p><p>We use Cloudflare to host this service. Technical request information may be processed by Cloudflare. The operator must provide the pilot privacy notice before collecting real requests.</p>`);
    if (button.dataset.liveDetail) {
      const l = inventory.find(item => item.id === button.dataset.liveDetail); if (!l) return;
      const cost = monthlyCost(l);
      open(`<h2 id="dialog-heading">${esc(l.title)}</h2><p>${esc(l.neighbourhood)} � ${esc(l.city)}, NB � ${l.bedrooms} bedrooms � ${l.bathrooms} bathrooms</p><p>${esc(l.description)}</p><h3>Monthly costs in CAD</h3><div class="cost-grid"><span>Rent</span><span>${money(l.rent)}</span>${Object.entries(l.costs).map(([name,item]) => `<span>${esc(name)}${item.estimated ? ' (estimate)' : ''}</span><span>${item.included ? 'Included' : money(item.amount ?? null)}</span>`).join('')}<strong>Monthly total</strong><strong>${money(cost.total)}</strong></div><p>Identity: not checked. Authority to rent: not independently verified. Property safety: not inspected. Publication review is not a verification badge. Estimates are not guaranteed bills.</p>${config.pilotEnabled ? `<div class="dialog-actions"><a class="primary" href="${link(l.id,'viewing')}">Request a viewing</a><a class="secondary" href="${link(l.id,'application')}">Start an application</a><a href="${link(l.id,'report')}">Report this listing</a></div>` : '<p>Requests are awaiting service setup.</p>'}`);
    }
  });
  document.addEventListener('submit', event => { if (event.target.id !== 'live-search') return; event.preventDefault(); filters = Object.fromEntries(new FormData(event.target)); render(); });
  window.addEventListener('hashchange', render);
  try {
    const response = await fetch('/api/listings'); if (!response.ok) throw new Error();
    const data = await response.json(); if (data.demo !== false || !Array.isArray(data.listings)) throw new Error(); inventory = data.listings;
  } catch { error = 'Listings could not be loaded. Please refresh later.'; }
  render();
}
