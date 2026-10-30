export type CostItem = { included?: boolean; amount?: number | null; estimated?: boolean };
export type Listing = {
  id: string; title: string; neighbourhood: string; city: string; province: string;
  country: string; currency: string; bedrooms: number; bathrooms: number; rent: number;
  status: string; demo: boolean; confirmedAt: string; availableFrom: string; art: string;
  costs: Record<string, CostItem>; features: string[]; description: string;
  verification: { identity: string; authorityToRent: string; propertySafety: string };
};
export type Filters = { query?: string; maxTotal?: string | number; bedrooms?: string | number; accessible?: boolean; pets?: boolean; sort?: string };
export function monthlyCost(listing: Listing): { confirmed: number; estimated: number; unknown: string[]; total: number | null };
export function filterListings(listings: Listing[], filters?: Filters): Listing[];
export function parseFilters(params: URLSearchParams): Filters;
export function validateViewing(date: string, slot: string, now?: Date): string | null;
export function readState(raw: string | null): { saved: string[]; comparisons: string[]; applications: object[]; viewings: object[]; repairs: object[] };
