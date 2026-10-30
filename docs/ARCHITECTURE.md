# Architecture and data boundaries

## First release: an honest working prototype

The repository started empty. The first slice makes discovery and the monthly-cost comparison usable without collecting real applicant documents or money. Web and mobile share pure domain functions rather than duplicating budget calculations. Web uses native browser modules; mobile uses React Native/Expo. Both can ultimately consume a versioned Workers API.

The provisional name is Estate. No domain or trademark availability has been established.

## Data flow in default demo mode

1. The web client loads fictional inventory bundled with the application.
2. Search, cost calculations and sorting run locally.
3. Hearts, comparisons and drafts use `estate-demo-v1` browser storage.
4. No prototype action is forwarded to a landlord or an application endpoint.
5. The Worker exposes an independent read-only sample API for integration work. When configured for live reads, it needs D1 and returns only published, recently confirmed NB inventory.

## Version 0.2.0 private pilot

`/api/config` chooses the demo module or the live web client. Live discovery uses `/api/listings`; it never substitutes bundled samples. `/workspace.html` connects to authenticated `/api/workspace` routes. Cloudflare Access tokens are verified inside the Worker, and configuration allowlists assign administrator/landlord roles. D1 stores minimal account, listing, request, consent-version and tenancy-link records. Landlords see requests for their own listings; confidential reports go to administrators. A nightly cron removes old requests using the configured retention period. `docs/PRIVATE-PILOT.md` documents configuration, data purposes, deployment checks and limitations. The default configuration keeps this pilot disabled.

## Planned live architecture

- Web and Expo clients use HTTPS API endpoints with the same validation contract.
- A reviewed authentication provider supplies verified identities; API authorization scopes every private record by actor and ownership.
- D1 holds users, consent events, listing state, application state and repair metadata only after corresponding authorization/retention designs are approved.
- Private object storage holds documents only after signed, scoped upload/download flows, malware handling, access logs, deletion schedules and processor review exist.
- A queue and scheduled Worker handle listing reconfirmation and opted-in messages. Marketing consent is distinct from service communications.
- Administration uses independently enforced server-side roles, MFA and audit trails. Hiding a sign-in link is not access control.

## Security decisions

- No secrets in the clients or source tree. Native environment variables prefixed `EXPO_PUBLIC_` are public.
- No credential or document routes are stubbed as success. Unsupported writes return an explicit error; private-pilot writes require verified identity, role/ownership checks, same-origin request headers and configured retention/privacy contact.
- API errors do not reveal database details. Public projections use an allowlist.
- Production inventory does not silently fall back to fictional inventory.
- No cross-origin browser API access is enabled by default. Add only reviewed explicit origins if the deployment needs it.
- Web uses a restrictive Content Security Policy and no third-party executable scripts.
- No tenant ranking by protected grounds and no automated approval/rejection in this release.
- Database records are drafts by default. The private-pilot publish action requires administrator review of a submitted listing with recorded content permission.

## Costs and estimates

Costs are integer Canadian dollars in this prototype, not payment amounts. Introduce integer cents and currency-safe payment handling before any financial ledger. Included expenses add no separate amount. Known extras and estimates remain separate. If an expense is unknown, `total` is null and a budget filter excludes the listing; the UI must explain incomplete totals when live inventory is connected.

## Verification design

Identity, authority to rent, property inspection, listing availability and document checks are separate facts. Record method, evidence access controls, reviewer, date, expiry and challenge path. No badge in the prototype implies an actual completed check.

## Jurisdiction design

Property jurisdiction, tenancy category, statutory exceptions and effective dates must be inputs to any future tenancy-rule engine. Do not reuse NB rent or notice calculations for another province. Imported listings require feed/content permission. A provincial flag is not a substitute for reviewing actual business conduct and licences.
