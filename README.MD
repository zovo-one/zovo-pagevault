# Zovo PageVault

PageVault is an AGPL-3.0-or-later fork built on the official SingleFile MV3 codebase. It preserves SingleFile's proven self-contained HTML capture engine and adds a local archive with per-site auto-capture rules, full-text search, immutable versions, visual comparison, and snapshot-bound annotations.

## Build

```sh
npm install
SUPABASE_ANON_KEY="<public Supabase anon key>" npm run build
npm run check
```

The production build intentionally fails without `SUPABASE_ANON_KEY`; paid activation sends the entered key and product identifier to the verification endpoint and grants only when the response contains `valid: true`. The build creates `dist/` and `zovo-pagevault-1.0.0.zip`.

All archive content is stored locally in the extension's IndexedDB database. See `docs/BASELINE-AND-PORT-COST.md` for the untouched upstream baseline and MV3 migration analysis.

## Upstream documentation

# SingleFile MV3

This is the new version of [SingleFile](https://www.getsinglefile.com) compatible with the Manifest V3.

## Manual install

Download the zip file
(https://github.com/gildas-lormeau/SingleFile-MV3/archive/master.zip) of the project
and install it manually by unzipping it somewhere on your disk and following
these instructions:

- Chrome:
  https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked
- Microsoft Edge:
  https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/extension-sideloading
