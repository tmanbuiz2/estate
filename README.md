# Estate Canada

A New Brunswick rental platform prototype by WianTribe. Original implementation; no RENTA source, assets or backend have been copied.

## What works today

- Responsive web discovery with six explicitly fictional homes and locally created illustrations.
- Search by neighbourhood, total monthly budget, bedrooms, step-free entry and pet policy.
- A breakdown of confirmed charges, estimates and included services; unknown costs never become zero.
- Saved homes, comparisons of up to three homes, application drafts, preferred viewing dates and repair notes in browser storage.
- Clear disclosure that nothing is sent, booked, verified or paid through the demo.
- Cloudflare Worker API, two D1 migrations, shared domain functions and automated checks. Optional private pilot workflows are described below.
- An Expo mobile client using the same domain logic and sample data (see `mobile/README.md`).

## Run the web app

Node.js 22 or newer is required. The web app and API tests need no third-party packages.

```sh
npm run dev
```

Visit http://127.0.0.1:4173. The server binds only to the local machine. Restart after source changes to rebuild.

```sh
npm test
npm run check
npm run build
```

With the local server running, `node scripts/smoke.mjs` checks the served assets and API over HTTP.

`dist/` is reproducible build output and is not committed. CI uploads it as a downloadable preview artifact.

## Architecture

| Directory | Responsibility |
| --- | --- |
| `web/` | Buildless, dependency-free web client; local prototype workflows |
| `mobile/` | Expo React Native starter for Android and iOS |
| `packages/domain/` | Shared cost calculation, filtering, validation and fictional inventory |
| `worker/` | Cloudflare Workers HTTP API and security headers |
| `migrations/` | D1 schema; listings start as drafts |
| `docs/` | Architecture, compliance research and implementation roadmap |

With `DEMO_MODE=true`, the web client uses fictional local inventory and browser-only drafts. With demo mode off, it loads published live inventory from the API and displays empty/error states without substituting samples. Authenticated submission workflows require the additional private-pilot configuration in `docs/PRIVATE-PILOT.md`. The Expo client still uses sample data.

## API

- `GET /api/health`: mode and write availability.
- `GET /api/config`: web mode, version, pilot readiness and privacy contact.
- `GET /api/listings`: public listings; optional `query`, `maxTotal`, `bedrooms`, `accessible`, `pets`, `sort` query parameters.
- `GET /api/listings/:id`: one published listing.
- `GET /api/workspace`: authenticated role-scoped workspace when the pilot is configured.
- `POST /api/workspace/{listings,listing-status,requests,request-status,import,tenancies,delete-account}`: authenticated, validated pilot changes with ownership/role checks.
- Other mutation routes return `405`. Uploads, payment collection and full screening applications are unavailable.

With demo mode off, the API requires a configured D1 binding named `DB`. It projects only public fields, only selects NB published listings reconfirmed within 14 days, and returns an error if the database is absent. Query results currently cap at 500; production pagination is a roadmap task.

## Cloudflare setup

Version **0.2.0** adds an authenticated private pilot workspace, moderated landlord listings, applications, viewing requests, tenancy-linked repairs, confidential reports and authorized JSON imports. See [the complete setup and current limitations](docs/PRIVATE-PILOT.md). Demo mode remains the default until the database, Access application, role allowlists, privacy contact and request retention period are configured. Payments, document uploads and notifications remain unavailable. The web client now loads live API inventory when demo mode is off; the mobile client remains a demo.

The deployment target is now `estate`, matching the existing `estate.atoyejet.workers.dev` Worker. Verify the account before deploying; the earlier repository configuration used the separate name `estate-canada`.

Install the pinned deployment tooling with `npm ci`. Run `npm run deploy:check` to build and validate the upload without publishing. After signing in to the intended Cloudflare account with `npx wrangler login`, run `npm run deploy` to publish the demo Worker and assets. These commands build the web client automatically. This deployment keeps fictional inventory and all live submissions disabled.

Use `npx wrangler dev` for Worker emulation. Before connecting real inventory:

1. Create the D1 database with `wrangler d1 create estate-canada`.
2. Add its actual binding under `d1_databases` in `wrangler.jsonc`, with `binding: "DB"`, `database_name`, `database_id` and `migrations_dir: "migrations"`.
3. Apply migrations locally, review the result, and then apply to the intended remote database. Never invent a database ID.
4. Keep `DEMO_MODE=true` until the launch gates are met. Turning it off changes the API only.
5. Set up access control, abuse protection, listing moderation and privacy operations before taking real submissions.

There are no automatic production deploy jobs or credentials in this repository.

## Privacy and safety boundaries

Use fictional information only. Browser storage is not an identity-document vault. No analytics, third-party image requests or externally hosted fonts are included in the web demo. A clear-data action removes local prototype records.

No verification claims, approved leases, legal notice delivery, credit reports, wallet balances or escrow services are implemented. The compliance register is research and planning, not legal certification. Read `docs/COMPLIANCE.md` before expanding the feature scope.
