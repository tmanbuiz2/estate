# Estate 0.2.0: private pilot setup

This version implements a small, authenticated New Brunswick rental pilot. It does not turn on money movement, screening, document uploads, email notifications or legal notice delivery. Configuration defaults to the existing demonstration. Code changes do not enable the public service by themselves.

## Capabilities

- Cloudflare Access verified-email accounts, with RS256 signature, issuer, audience and expiry checks inside the Worker. No passwords are stored by Estate.
- Operator-approved landlord and administrator roles. Renters cannot promote themselves.
- Listing drafts, review submission, administrator publication, pausing, marking rented and availability reconfirmation. Publication expires from discovery after 14 days without reconfirmation.
- Live discovery uses the read-only public API. It never falls back to sample listings when live inventory is empty or unavailable. Unknown utility costs remain unknown and do not pass a total-budget filter.
- Applications consisting of a short introduction, preferred viewing requests, tenancy-linked repairs, administrator-only reports and status updates. An acknowledgement is not a booking or tenancy confirmation.
- A workspace displays requests and their updates; no email notification is sent. Receiving landlords see the sender's verified email for follow-up.
- Admin JSON imports for content the operator is authorized to reproduce. Imported records are drafts, carry source/permission metadata and still need publication review. No website scraper or image hotlinking is included. Illustrations remain explicitly labelled.
- Same-origin write checks, a 64 KiB request limit, server-side validation and an atomic database limit of 30 changes per account per minute. Configure edge throttling separately to protect login and infrastructure against broader abuse.
- A nightly request cleanup, a configurable request retention period of 1-90 days, and profile deletion for accounts without linked listings or active tenancies. Linked-account deletion is handled by the privacy operator. Profile deletion does not remove Cloudflare identity or infrastructure logs. Signing in again creates a fresh Estate profile.

Discovery currently returns at most 500 listings. Workspaces show at most 200 recent requests/listings. Mobile remains a demo client; these workflows are implemented in the web app.

## Connect the account hosting estate.atoyejet.workers.dev

Use the Cloudflare account that owns the existing `estate` Worker. The Wrangler project name is now `estate`, matching that deployment. Verify the account with `npx wrangler whoami` before remote commands. Do not create a second production Worker by using the older `estate-canada` name.

1. Pull this version and run `npm ci`, `npm run check`, `npm test` and `npm run build`.
2. Create a D1 database in the intended account: `npx wrangler d1 create estate-pilot`.
3. Add its returned identifier to `wrangler.jsonc`:

   ```jsonc
   "d1_databases": [{
     "binding": "DB",
     "database_name": "estate-pilot",
     "database_id": "THE_ACTUAL_RETURNED_DATABASE_ID",
     "migrations_dir": "migrations"
   }]
   ```

4. Apply both migrations: `npx wrangler d1 migrations apply estate-pilot --local`. After reviewing the target account/database, apply them remotely with `npx wrangler d1 migrations apply estate-pilot --remote`. Do not seed the live database with the six fictional homes.
5. In Cloudflare Zero Trust, create a self-hosted Access application using email one-time PIN or another verified identity provider. Allow only invited pilot participants. Protect `estate.atoyejet.workers.dev/workspace*` and `estate.atoyejet.workers.dev/api/workspace*` in the **same application**, so they share its audience. This covers the `/workspace.html` link and Static Assets' clean `/workspace` URL. Alternatively protect the whole Worker for a fully private pilot. Leave no alternate unprotected deployment serving sensitive endpoints; the Worker's own token validation also rejects requests without the expected audience.
6. Copy the application's audience tag and team issuer. Set the following variables in `wrangler.jsonc`, preserving any unrelated settings:

   ```jsonc
   "vars": {
     "DEMO_MODE": "false",
     "PILOT_ENABLED": "true",
     "ACCESS_ISSUER": "https://YOUR_TEAM.cloudflareaccess.com",
     "ACCESS_AUD": "YOUR_APPLICATION_AUDIENCE",
     "ADMIN_EMAILS": "YOUR_VERIFIED_ADMIN_EMAIL",
     "LANDLORD_EMAILS": "FIRST_APPROVED_LANDLORD_EMAIL,SECOND_APPROVED_EMAIL",
     "PRIVACY_CONTACT": "YOUR_MONITORED_PRIVACY_EMAIL",
     "REQUEST_RETENTION_DAYS": "30"
   }
   ```

   These are configuration placeholders, not working credentials. Keep the actual role allowlists in private deployment configuration; do not commit participants' email addresses to a public repository. Wrangler deploy uses its configuration variables; dashboard-only edits can be overwritten. There is no default administrator and no development authentication bypass.

7. Agree and communicate the pilot's purposes, short retention period, hosting/processor arrangements, privacy contact, request-handling process and landlord responsibilities before inviting participants. The short introduction form is not a full screening application. Do not collect identification, income documents, references, bank information or credit reports in messages. Review the business role and the compliance register before offering brokerage/property-management services.
8. Keep the nightly `0 4 * * *` UTC cron in the deployed configuration; confirm that it runs. The cleanup deletes request records older than the chosen period, including open requests. Profiles/listing content have a separate lifecycle and remain until removal is arranged. Agree infrastructure log/backup retention separately; application deletion cannot guarantee their erasure.
9. Run `npm run deploy` from the authenticated account. Check `/api/health`: expect version `0.2.0`, mode `private-pilot`, writes enabled, payments/uploads disabled. Check unauthenticated API access returns a login challenge or 401. Test with separate renter, landlord and admin identities; test the worker's alternate URLs as well.
10. Create the first original/authorized listing, submit it for review, record the review and publish it. Test discovery, request receipt, landlord status changes, confidential reports and deletion using fictional pilot data before inviting real applicants.

Account roles come from deployment configuration. Access policy admission and application roles are separate: admitting someone to the pilot does not make them a landlord or administrator.

## Authorized listing import

Administrators can paste this structure in the workspace. All properties below are fictional examples; replace them with authorized content, accurate costs and a documented permission basis. A website URL or attribution alone does not establish permission.

```json
{
  "listings": [{
    "title": "Example home - replace before importing",
    "neighbourhood": "Example neighbourhood",
    "city": "Fredericton",
    "province": "NB",
    "bedrooms": 2,
    "bathrooms": 1,
    "rent": 1500,
    "availableFrom": "2027-01-01",
    "description": "Original description supplied by the property owner.",
    "costs": {
      "heating": {"included": false, "estimated": false, "amount": null},
      "electricity": {"included": false, "estimated": false, "amount": null},
      "parking": {"included": true, "estimated": false, "amount": 0}
    },
    "features": ["pets-considered"],
    "sourceUrl": "https://example.com/authorized-feed/listing",
    "rightsBasis": "Replace with the permission holder, scope, date and licence or original authorship statement.",
    "rightsConfirmed": true
  }]
}
```

Use whole CAD dollars, not cents. A null extra cost means unknown. Up to 20 records are validated before one atomic import batch. A moderator still needs to review authority, content permission, accuracy, discriminatory restrictions and current availability. Reconfirm every 14 days or pause the listing. A source permission statement is an internal record, not a public verification badge.

Before building a feed connector, obtain the source's specific API/feed rights, attribution requirements, allowed fields, image rights, refresh cadence and deletion obligations. CREA/DDF content requires the applicable agreement; copying a public REALTOR.ca listing is not a substitute for a licensed feed. Other portals' permissions must be checked individually. This version does not import third-party photos.

## Still needed for the requested full service

- Payments: choose the business role and payment provider/merchant account, identify who receives money, and review rental deposit routing, refunds, chargebacks, tax and applicable payment requirements. This version has no checkout, wallet, escrow or rent/deposit transfer endpoints. Do not present a payment as available until the integration and settlement flows work.
- Documents: choose private object storage, allowed document purposes, access/audit controls, retention/deletion, malware scanning and processor agreements before accepting files. No upload endpoint is implemented here.
- Full applications/screening: define necessary data, meaningful consent, human review, newcomer alternatives and correction/appeal processes. No scoring, credit check or automatic eligibility decision is implemented.
- Production operations: legal/privacy review, retention verification, edge abuse controls, account recovery/provider policies, monitored reports/support, accessibility/French UI, broader browser/device QA, backup/recovery checks and the remaining roadmap items.
- Email/SMS: select and connect an authorized sending provider and delivery/webhook handling. Requests currently rely on the workspace; they do not notify a landlord in the background.

## Primary references checked for this change

- Cloudflare Access for Workers: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- Access application tokens: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/
- OPC landlord/tenant privacy: https://www.priv.gc.ca/en/privacy-topics/landlords-and-tenants/privacy-in-the-landlord-and-tenant-relationship/
- OPC meaningful consent: https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/collecting-personal-information-and-consent/consent/gl_omc_201805/
- Copyright Board FAQ: https://cb-cda.gc.ca/en/faq
- REALTOR.ca terms: https://www.realtor.ca/terms-of-use
- NB security deposit information: https://www.gnb.ca/en/topic/family-home-community/housing-property/deposits.html

Checked 2026-10-30. These references inform implementation; this document is not legal clearance or an exhaustive Canadian/NB compliance assessment.
