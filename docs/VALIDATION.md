# Validation record

## Web/API checks

- Version 0.2.0: 27 domain, API, Access-signature and actual SQLite schema/query tests pass. New tests cover forged/expired/wrong-audience tokens, spoofed identity headers, required configuration, role and ownership checks, draft/review publication, consent, private reports, duplicate applications, CSRF, atomic import validation, throttling, tenancy-linked repairs, retention and profile deletion.
- JavaScript syntax check: passed.
- Static build: passed.
- Local HTTP smoke check: HTML, client modules, styles, all three illustrations and API endpoints respond successfully. Total-budget filtering and blocked submissions checked over HTTP.
- Both SQL migrations apply successfully to an in-memory SQLite database; private-pilot integration tests run the real queries against that schema. D1-specific remote execution is not yet verified.
- Manual browser/assistive-technology review: not performed; browser automation was not available in this session.

## Mobile checks

- Expo SDK 58 scaffold uses versions resolved by `expo install`.
- TypeScript check: passed.
- Expo ESLint: passed.
- Clean-install CI initially found React DOM resolving to a newer patch than Expo's pinned React. React DOM is now explicitly SDK-aligned at 19.3.0; the lockfile was regenerated and CI rerun.
- Android and iOS release JavaScript/Hermes asset exports: passed locally. Local Windows Hermes initially could not write to the sandbox-provided temporary path; export succeeded after using a workspace-local temporary directory. This was not an APK/IPA build.
- No Android/iOS device test, signed APK/IPA, EAS build or TestFlight submission yet.

## Dependency audit finding

The initial SDK 58 dependency tree reports eight npm audit findings (three high, five low), stemming from transitive `zod` and `deepmerge` advisories. The reported aggregate high counts include Expo tooling parents; they are not eight independent vulnerabilities. Affected dependency uses and compatible fixes must be reviewed before a release. No blind `npm audit fix --force` downgrade or incompatible major override has been applied.

The independent web/Worker implementation has no third-party runtime dependencies. This does not make it exempt from security review.

## Release limits

This is a source prototype. Functional tests do not establish legal compliance, production security, accessibility conformance, availability of housing or approval by any regulator/platform.

Version 0.2.0 has not been deployed or tested against the user's live Cloudflare account in this session. Network access to that account was unavailable. The Access application, remote D1 database, cleanup cron, role configuration and live browser behaviour still need deployment verification. No third-party listing content or photos have been copied or represented as available homes.
