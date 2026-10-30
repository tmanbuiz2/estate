import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyCost, filterListings, parseFilters, readState, validateViewing } from '../packages/domain/index.mjs';
import { demoListings } from '../packages/domain/demo.mjs';

test('monthly total separates confirmed charges from estimates and included services', () => {
  assert.deepEqual(monthlyCost(demoListings[0]), { confirmed: 1575, estimated: 165, unknown: [], total: 1740 });
});
test('unknown utilities are not silently counted as zero', () => {
  const listing = { ...demoListings[0], costs: { heating: { amount: null }, water: { included: true } } };
  assert.equal(monthlyCost(listing).total, null);
  assert.deepEqual(monthlyCost(listing).unknown, ['heating']);
  assert.equal(filterListings([listing], { maxTotal: 2000 }).length, 0);
});
test('budget applies to total monthly cost, not base rent', () => {
  assert.equal(filterListings([demoListings[0]], { maxTotal: 1600 }).length, 0);
  assert.equal(filterListings([demoListings[0]], { maxTotal: 1750 }).length, 1);
});
test('draft and paused homes are never discoverable', () => {
  assert.equal(filterListings([{ ...demoListings[0], status: 'draft' }, { ...demoListings[1], status: 'paused' }]).length, 0);
});
test('combined bedroom, location and accessibility filters work', () => {
  assert.deepEqual(filterListings(demoListings, { query: 'northside', bedrooms: 3, accessible: true }).map(l => l.id), ['demo-02']);
});
test('price sort respects utility costs', () => {
  const homes = filterListings(demoListings, { sort: 'price' });
  assert.equal(homes[0].id, 'demo-03');
  assert.equal(homes.at(-1).id, 'demo-05');
});
test('API query validation rejects injection and invalid values', () => {
  for (const query of ['maxTotal=-100', 'maxTotal=NaN', 'bedrooms=1%20OR%201=1', 'maxTotal=999999999']) {
    assert.throws(() => parseFilters(new URLSearchParams(query)));
  }
  assert.throws(() => parseFilters(new URLSearchParams({ query: 'x'.repeat(101) })));
});
test('corrupt or wrong-shaped persisted state is safe to read', () => {
  assert.equal(readState('{broken').saved.length, 0);
  assert.deepEqual(readState('{"saved":[null,"demo-01",7],"repairs":[null]}').saved, ['demo-01']);
  assert.equal(readState('null').repairs.length, 0);
});
test('viewing dates require a real future day and supported slot', () => {
  const now = new Date('2026-10-27T12:00:00Z');
  assert.ok(validateViewing('2026-10-26', '09:00', now));
  assert.ok(validateViewing('2026-10-27', '09:00', now));
  assert.ok(validateViewing('2026-02-30', '09:00', now));
  assert.ok(validateViewing('2026-11-01', '23:00', now));
  assert.equal(validateViewing('2026-11-01', '17:00', now), null);
});
test('viewing validation uses Atlantic date at UTC midnight', () => {
  assert.equal(validateViewing('2026-10-28', '13:00', new Date('2026-10-28T01:00:00Z')), null);
});
