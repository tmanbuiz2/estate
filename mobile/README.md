# Estate mobile prototype

Expo SDK 58 client for Android/iOS using Expo Router and the shared Estate domain logic. The base template's MIT licence is retained in LICENSE.

## Run

From this directory:

```sh
npm ci
npx expo start
```

Use a compatible Expo Go version or a development build. This directory installs independently of the web app. Metro watches `../packages` for shared domain source. No manually generated native projects are committed.

## Implemented

- Fictional listing discovery, neighbourhood search, monthly-budget filtering.
- Cost breakdown and session-only saved homes.
- Clear sample-data and privacy screens.

The web app's viewing, application and repair drafts are not yet implemented in this native client. There is no login, push notification registration, document upload or payment collection. No production API is connected.

## Validate

```sh
npm run lint
npm run typecheck
npx expo export --platform android --platform ios --output-dir dist
```

Exporting JavaScript/assets is not an APK/IPA build or a device test. EAS project association, app identifiers, artwork review and signing are required before a distributable build. `eas.json` intentionally has no project ID or submit credentials. An internal Android profile builds an APK; iOS distribution needs an appropriate Apple developer setup.
