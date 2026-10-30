import { monthlyCost, filterListings, readState, validateViewing } from './shared/index.mjs';
import { demoListings } from './shared/demo.mjs';

const main = document.querySelector('main');
const dialog = document.querySelector('#detail-dialog');
const dialogContent = document.querySelector('#dialog-content');
const storageKey = 'estate-demo-v1';
let state;
try { state = readState(localStorage.getItem(storageKey)); } catch { state = readState(null); }
let page = 'discover';
let filters = { query: '', maxTotal: '', bedrooms: '', sort: 'recent' };
const money = value => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(value);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const listingById = id => demoListings.find(l => l.id === id);
const shortName = id => listingById(id)?.title ?? 'Sample home';
let toastTimer;
function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4000);
}
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { toast('Browser storage is unavailable. Changes will last only for this visit.'); }
  document.querySelector('#saved-count').textContent = state.saved.length;
}
function openDialog(html) { dialogContent.innerHTML = html; if (!dialog.open) dialog.showModal(); }
function heading(eyebrow, title, description) { return `<div class="page-heading"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>`; }
function empty(title, message) { return `<div class="empty"><h3>${title}</h3><p>${message}</p><button class="primary" data-page="discover">Explore sample homes</button></div>`; }
function card(l) {
  const cost = monthlyCost(l);
  const saved = state.saved.includes(l.id);
  return `<article class="card"><div class="card-picture"><img src="/art/${l.art}.svg" alt="Illustration of a sample ${l.art}" loading="lazy"><span class="sample-tag">SAMPLE HOME � NOT A LIVE LISTING</span><button class="save-button ${saved ? 'saved' : ''}" data-save="${l.id}" aria-label="${saved ? 'Unsave' : 'Save'} ${esc(l.title)}" aria-pressed="${saved}">${saved ? '' : '?'}</button></div><div class="card-content"><p class="location">${esc(l.neighbourhood)} � Fredericton, NB</p><h3>${esc(l.title)}</h3><div class="specs"><span>${l.bedrooms} bedrooms</span><span>${l.bathrooms} bathroom${l.bathrooms > 1 ? 's' : ''}</span><span>Illustration</span></div><div class="price-row"><div class="price"><strong>${money(cost.total)}</strong><span> / month est.</span><small>${money(l.rent)} rent + ${money(cost.total - l.rent)} costs � CAD</small></div></div><div class="card-foot"><button class="secondary" data-detail="${l.id}">View home ?</button><label class="compare-label"><input type="checkbox" data-compare="${l.id}" ${state.comparisons.includes(l.id) ? 'checked' : ''}> Compare</label></div></div></article>`;
}
function comparisonBar() {
  return state.comparisons.length ? `<div class="comparison-bar"><span>${state.comparisons.length} of 3 homes selected for comparison</span><button class="small-button" data-action="compare">Compare costs</button><button class="text-button" data-action="clear-compare">Clear selection</button></div>` : '';
}
function discover() {
  const results = filterListings(demoListings, filters);
  return `<section class="hero"><div><div class="eyebrow">A fresh start in New Brunswick</div><h1>A better place<br>to <em>begin.</em></h1><p>Find a home that fits your life, with clearer costs and a simpler path from first look to move-in.</p></div><div class="hero-art"><img src="/art/townhouse.svg" alt="Illustration of a welcoming neighbourhood"><div class="art-caption"><strong>More clarity. Less guesswork.</strong><span>See rent and estimated monthly extras together.</span></div></div></section><section class="search-area" aria-label="Search homes"><form id="search-form" class="search-panel"><div class="field"><label for="query">Where would you like to live?</label><input id="query" name="query" type="search" maxlength="100" placeholder="Fredericton or neighbourhood" value="${esc(filters.query)}"></div><div class="field"><label for="maxTotal">Monthly total, up to</label><select name="maxTotal" id="maxTotal"><option value="">Any budget</option>${[1500,1750,2000,2250,2500].map(v => `<option value="${v}" ${String(filters.maxTotal) === String(v) ? 'selected' : ''}>${money(v)} CAD</option>`).join('')}</select></div><div class="field"><label for="bedrooms">Bedrooms</label><select name="bedrooms" id="bedrooms"><option value="">Any size</option>${[1,2,3].map(v => `<option value="${v}" ${String(filters.bedrooms) === String(v) ? 'selected' : ''}>${v}+ bedrooms</option>`).join('')}</select></div><button class="primary" type="submit">Find a home </button></form><div class="filter-row"><label><input type="checkbox" id="accessible" ${filters.accessible ? 'checked' : ''}> Step-free entry listed</label><label><input type="checkbox" id="pets" ${filters.pets ? 'checked' : ''}> Pets considered</label><span class="cost-explainer">Totals include clearly labelled utility estimates.</span><button class="text-button" data-action="reset-filters">Reset</button></div></section><section class="content-section"><div class="section-header"><div><h2>Somewhere to feel at home</h2><p id="result-summary" role="status">${results.length} sample homes � Fredericton � All prices in CAD</p></div><label><span class="sr-only">Sort homes</span><select id="sort" aria-label="Sort homes"><option value="recent" ${filters.sort === 'recent' ? 'selected' : ''}>Recently confirmed</option><option value="price" ${filters.sort === 'price' ? 'selected' : ''}>Lowest monthly total</option></select></label></div>${comparisonBar()}<div class="cards">${results.map(card).join('')}</div>${results.length ? '' : empty('A little adjustment may help.', 'Try a larger budget, fewer bedrooms, or a different neighbourhood.')}</section><section class="trust-strip"><div><div class="step-number">01 / UNDERSTAND THE COST</div><h3>The number behind the rent</h3><p>Parking, heating and electricity belong in the conversation. See what is included and what is estimated.</p></div><div><div class="step-number">02 / KNOW WHAT WAS CHECKED</div><h3>Clarity before confidence</h3><p>Identity, authority to rent and property safety are different checks. A label should never blur them together.</p></div><div><div class="step-number">03 / KEEP YOUR NEXT STEP CLEAR</div><h3>A calmer way to move forward</h3><p>Explore viewing requests, application drafts and repairs. This demo keeps everything on your device.</p></div></section>`;
}
function activity() {
  const entries = (items, kind) => items.length ? items.map(item => `<div class="entry"><strong>${esc(shortName(item.listingId))}</strong><p>${esc(kind === 'viewing' ? `${item.date} at ${item.slot} Atlantic time` : item.note || 'No additional details')}</p><span class="status">${kind === 'repair' ? esc(item.status) : 'Local draft � not sent'}</span>${kind === 'repair' && item.status !== 'Resolved' ? `<p><button class="text-button" data-resolve="${esc(item.id)}">Mark demo repair resolved</button></p>` : ''}</div>`).join('') : '<p>Nothing here yet. Explore a sample home to start.</p>';
  return `<section class="content-section">${heading('Your next steps', 'A little less to keep track of.', 'Your demonstration drafts live only in this browser. No landlord receives them, and no appointments are confirmed.')}<div class="activity-grid"><section class="panel"><h2>Viewing requests</h2>${entries(state.viewings, 'viewing')}</section><section class="panel"><h2>Application drafts</h2>${entries(state.applications, 'application')}</section><section class="panel"><h2>Repair notebook</h2><p>Try the workflow with fictional details. For a real emergency, contact emergency services or your landlord directly.</p><form id="repair-form" class="panel-form"><label>Sample home<select name="listingId">${demoListings.map(l => `<option value="${l.id}">${esc(l.title)}</option>`).join('')}</select></label><label>What needs attention?<textarea name="note" maxlength="500" required placeholder="Example: the kitchen tap is dripping. Use fictional details only."></textarea></label><button class="primary">Save demo repair</button></form></section><section class="panel"><h2>Repair history</h2>${entries(state.repairs, 'repair')}</section></div></section>`;
}
function landlord() {
  return `<section class="content-section">${heading('For independent landlords', 'Less admin.<br>More time for people.', 'A considered foundation for managing a few homes. Explore the workflow before live accounts and submissions are introduced.')}<div class="notice">Planning preview. This dashboard does not publish listings, screen applicants, collect rent or serve legal notices.</div><div class="activity-grid"><section class="panel"><h2>One place for the essentials</h2><ul><li>Draft a listing with itemized monthly costs.</li><li>Confirm availability and pause stale advertisements.</li><li>Offer viewing times and track applications.</li><li>Keep repairs and inspection records organized.</li></ul></section><section class="panel"><h2>Built around clear boundaries</h2><ul><li>Verification checks need evidence and review dates.</li><li>Private documents require consent and access controls.</li><li>Provincial forms and legal notice workflows need review.</li><li>Payments and screening stay disabled in this release.</li></ul><button class="secondary" data-action="landlord-checklist">Preview listing checklist ?</button></section></div></section>`;
}
function render() {
  main.innerHTML = page === 'discover' ? discover() : page === 'saved' ? `<section class="content-section">${heading('Your shortlist', 'Places worth another look.', 'Saved on this device. Come back to compare the full monthly cost.')} ${comparisonBar()}${state.saved.some(listingById) ? `<div class="cards">${state.saved.map(listingById).filter(Boolean).map(card).join('')}</div>` : empty('Your next chapter starts with a shortlist.', 'Tap the heart on a sample home to save it here.')}</section>` : page === 'activity' ? activity() : landlord();
  document.querySelectorAll('nav [data-page]').forEach(button => {
    button.classList.toggle('active', button.dataset.page === page);
    if (button.dataset.page === page) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  persist();
}
function detail(id) {
  const l = listingById(id); if (!l) return;
  const cost = monthlyCost(l);
  const costs = Object.entries(l.costs).map(([name, v]) => `<span>${esc(name[0].toUpperCase() + name.slice(1))}${v.estimated ? ' (estimate)' : ''}</span><span>${v.included ? 'Included' : Number.isFinite(v.amount) ? money(v.amount) : 'Not provided'}</span>`).join('');
  openDialog(`<img src="/art/${l.art}.svg" alt="Illustration of a fictional home"><div class="eyebrow">Fictional listing � ${esc(l.neighbourhood)}</div><h2 id="dialog-heading">${esc(l.title)}</h2><p>${l.bedrooms} bedrooms � ${l.bathrooms} bathroom${l.bathrooms > 1 ? 's' : ''} � Fredericton, NB</p><p>${esc(l.description)}</p><h3>Your monthly cost, explained</h3><div class="cost-grid"><span>Base rent</span><span>${money(l.rent)}</span>${costs}<strong>Estimated monthly total</strong><strong>${money(cost.total)} CAD</strong></div><p class="fine-print">Utility estimates are illustrative, not quotes or guarantees. Internet, moving costs, insurance and any other personal expenses are not included in this total.</p><h3>What has been checked?</h3><p>Identity: sample only. Authority to rent: not checked. Property safety: not inspected. No verification badge is awarded to this fictional home.</p><div class="dialog-actions"><button class="primary" data-viewing="${l.id}">Try a viewing request</button><button class="secondary" data-apply="${l.id}">Save an application draft</button><button class="text-button" data-report="${l.id}">Report listing</button></div>`);
}
function compare() {
  const homes = state.comparisons.map(listingById).filter(Boolean);
  const row = (title, values) => `<tr><th scope="row">${title}</th>${values.map(v => `<td>${v}</td>`).join('')}</tr>`;
  openDialog(`<h2 id="dialog-heading">Compare the whole picture.</h2><p>Sample costs only. Estimates are not guaranteed bills.</p><div class="table-scroll"><table><thead><tr><th scope="col">Monthly cost � CAD</th>${homes.map(l => `<th scope="col">${esc(l.title)}</th>`).join('')}</tr></thead><tbody>${row('Rent', homes.map(l => money(l.rent)))}${row('Heating � estimate', homes.map(l => money(l.costs.heating.amount)))}${row('Electricity � estimate', homes.map(l => money(l.costs.electricity.amount)))}${row('Parking', homes.map(l => money(l.costs.parking.amount)))}${row('Estimated total', homes.map(l => `<strong>${money(monthlyCost(l).total)}</strong>`))}${row('Bedrooms', homes.map(l => l.bedrooms))}</tbody></table></div>`);
}
function viewing(id) {
  const l = listingById(id); if (!l) return;
  openDialog(`<h2 id="dialog-heading">Picture your next visit.</h2><p>${esc(l.title)} � A local draft, not a booking.</p><form id="viewing-form" class="panel-form" data-id="${l.id}"><label>Preferred date<input name="date" type="date" required></label><label>Preferred time � Atlantic<select name="slot" required><option value="">Choose a time</option><option value="09:00">9:00am</option><option value="13:00">1:00pm</option><option value="17:00">5:00pm</option></select></label><div id="viewing-error" class="form-error" role="alert"></div><button class="primary">Save viewing draft</button></form><p class="fine-print">No contact information is collected. Nothing is sent to a landlord.</p>`);
}
function privacy() {
  openDialog(`<h2 id="dialog-heading">Your demo data, in your hands.</h2><p>This prototype stores saved home IDs, comparison selections, viewing drafts, application drafts and repair notes in this browser's local storage. Anyone with access to this browser may be able to view them.</p><p>No accounts, payment details or identity documents are collected. Please use fictional details. There are no third-party analytics, external fonts or remote listing images in this demo.</p><p>Clearing demo data removes these records from this browser. The live service will need reviewed privacy terms, retention rules, access controls and a privacy contact before collecting real applications.</p><button class="primary" data-action="clear-data">Clear my demo data</button>`);
}
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.page) { location.hash = button.dataset.page; return; }
  if (button.dataset.save) {
    const id = button.dataset.save;
    state.saved = state.saved.includes(id) ? state.saved.filter(v => v !== id) : [...state.saved, id];
    render(); toast(state.saved.includes(id) ? 'Home saved on this device.' : 'Home removed from saved homes.'); return;
  }
  if (button.dataset.detail) return detail(button.dataset.detail);
  if (button.dataset.viewing) return viewing(button.dataset.viewing);
  if (button.dataset.apply) {
    if (!state.applications.some(a => a.listingId === button.dataset.apply)) state.applications.push({ id: crypto.randomUUID(), listingId: button.dataset.apply, createdAt: new Date().toISOString(), note: 'Application draft. No documents collected; not submitted.' });
    persist(); dialog.close(); toast('Draft saved. View it in My activity.'); return;
  }
  if (button.dataset.resolve) { const item = state.repairs.find(r => r.id === button.dataset.resolve); if (item) item.status = 'Resolved'; render(); toast('Demo repair marked resolved.'); return; }
  if (button.dataset.report) return openDialog('<h2 id="dialog-heading">Report a listing</h2><p>This is a fictional listing. Live reporting and moderation are not connected yet. No report has been submitted.</p><p>A live service will need a monitored reporting channel, investigation records and an appeal process.</p>');
  if (button.id === 'privacy-button') return privacy();
  if (button.id === 'close-dialog') return dialog.close();
  if (button.id === 'clear-data' || button.dataset.action === 'clear-data') {
    if (!confirm('Remove all saved homes, drafts and repair notes from this browser?')) return;
    state = readState(null); persist(); if (dialog.open) dialog.close(); render(); toast('Demo data cleared.'); return;
  }
  if (button.dataset.action === 'compare') return compare();
  if (button.dataset.action === 'clear-compare') { state.comparisons = []; render(); return; }
  if (button.dataset.action === 'reset-filters') { filters = { query: '', maxTotal: '', bedrooms: '', sort: 'recent' }; render(); return; }
  if (button.dataset.action === 'landlord-checklist') openDialog('<h2 id="dialog-heading">A clearer listing starts here.</h2><ol><li>Confirm your authority to advertise the property.</li><li>Itemize rent, included utilities and any extra charges.</li><li>Describe accessibility features accurately.</li><li>Review advertising for discriminatory restrictions.</li><li>Confirm current availability and viewing arrangements.</li><li>Provide photos you have permission to use.</li></ol><p>Planning checklist only. This does not publish or legally approve a listing.</p>');
});
document.addEventListener('change', event => {
  const el = event.target;
  if (el.dataset.compare) {
    if (el.checked && state.comparisons.length >= 3) { el.checked = false; toast('Choose up to three homes to compare.'); return; }
    state.comparisons = el.checked ? [...new Set([...state.comparisons, el.dataset.compare])] : state.comparisons.filter(v => v !== el.dataset.compare);
    render(); return;
  }
  if (el.id === 'accessible' || el.id === 'pets') {
    // Keep text inputs when a quick filter is changed before submitting.
    const form = document.querySelector('#search-form');
    if (form) filters = { ...filters, ...Object.fromEntries(new FormData(form)) };
    filters[el.id] = el.checked; render(); return;
  }
  if (el.id === 'sort') { filters.sort = el.value; render(); }
});
document.addEventListener('submit', event => {
  const form = event.target;
  if (!['search-form', 'viewing-form', 'repair-form'].includes(form.id)) return;
  event.preventDefault(); const data = Object.fromEntries(new FormData(form));
  if (form.id === 'search-form') { filters = { ...filters, ...data }; render(); return; }
  if (form.id === 'viewing-form') {
    const error = validateViewing(data.date, data.slot);
    if (error) { document.querySelector('#viewing-error').textContent = error; return; }
    state.viewings.push({ id: crypto.randomUUID(), listingId: form.dataset.id, date: data.date, slot: data.slot });
    persist(); dialog.close(); toast('Viewing draft saved. Nothing has been booked.'); return;
  }
  if (form.id === 'repair-form') {
    const note = data.note.trim(); if (!note || !listingById(data.listingId)) return;
    state.repairs.push({ id: crypto.randomUUID(), listingId: data.listingId, note: note.slice(0, 500), status: 'Open' });
    render(); toast('Repair saved locally. No landlord has been notified.');
  }
});
function navigate() {
  page = ['discover', 'saved', 'activity', 'landlord'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'discover';
  render(); main.focus({ preventScroll: true });
}
window.addEventListener('hashchange', navigate);
navigate();
