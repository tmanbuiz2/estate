// Fictional inventory only. These are not real rental advertisements.
const make = (id, title, neighbourhood, bedrooms, rent, heating, parking, features, art) => ({
  id, title, neighbourhood, city: 'Fredericton', province: 'NB', country: 'CA', currency: 'CAD',
  bedrooms, bathrooms: bedrooms > 2 ? 2 : 1, rent, status: 'published', demo: true,
  confirmedAt: '2026-10-27T12:00:00Z', availableFrom: '2026-12-01', art,
  costs: { heating: { amount: heating, estimated: true }, electricity: { amount: 65, estimated: true }, parking: { amount: parking, estimated: false }, water: { included: true }, laundry: { included: true } },
  features, verification: { identity: 'sample', authorityToRent: 'not-checked', propertySafety: 'not-inspected' },
  description: 'A fictional home for exploring Estate. Photos are illustrations; pricing, availability and features are demonstration data. No landlord is receiving requests.'
});
export const demoListings = [
  make('demo-01', 'A bright place to begin', 'Downtown', 2, 1525, 100, 50, ['pets-considered', 'in-unit-laundry'], 'townhouse'),
  make('demo-02', 'Room for your next chapter', 'Northside', 3, 1950, 130, 0, ['pets-considered', 'step-free', 'in-unit-laundry'], 'bungalow'),
  make('demo-03', 'Simple living, close to campus', 'Hill area', 1, 1250, 75, 35, ['transit-nearby'], 'apartment'),
  make('demo-04', 'A quieter corner of the city', 'Southside', 2, 1650, 95, 0, ['step-free', 'transit-nearby'], 'bungalow'),
  make('demo-05', 'A little more room to settle', 'Northside', 3, 2100, 140, 0, ['pets-considered', 'in-unit-laundry'], 'townhouse'),
  make('demo-06', 'Your own space, made simple', 'Downtown', 1, 1375, 70, 0, ['step-free', 'transit-nearby'], 'apartment')
];
