# Fundamental baseline and MV3 cost

Recorded 2026-08-31 before PageVault feature work.

## Untouched report-row clone

- Source: `gildas-lormeau/SingleFile` commit `d5beb49a0d2803888201960ba1eca4981a443d40`.
- `npm install && npm run build`: **PASS** on Node 20.17.0. Existing warnings: the current ESLint packages request Node 20.19+ and Rollup rewrites top-level `this` in the ZIP vendor module.
- Manifest: version 2, persistent background page, `browser_action`, legacy permission layout.
- Chrome 151 load attempt: **FAIL**. The unpacked extension did not appear in `chrome://extensions` and created no extension background target. This is the required step-zero finding, not a patched-around success.
- The original on-disk clone was preserved. Its tracked content was unavailable locally because 209 files were iCloud dataless placeholders, so the exact upstream repository was materialized in a temporary shallow clone for the reproducible check.

## Proven upstream MV3 basis

- Source: the maintainer's official `gildas-lormeau/SingleFile-MV3` sibling, commit `ec7763cef7f761bea77394ba55cbfe0e2d38a97f`.
- Build: **PASS** with the same non-fatal Node/Rollup warnings.
- Chrome for Testing load: **PASS**. The extension card rendered and `lib/single-file-extension-background.js` registered as an MV3 service worker.
- Decision: fork this official MV3 adaptation so the capture engine remains upstream-proven. Do not recreate SingleFile capture from DOM serialization.

## Port cost from the report-row clone

A direct tree comparison (excluding `.git`, dependencies, generated bundles, and archives) shows 52 migration entries: 37 changed files, 9 MV3-only entries, and 6 MV2-only entries. The meaningful work includes:

- persistent background page → service worker lifecycle and restart recovery;
- offscreen document plumbing for Blob, compression, and clipboard operations;
- `browser_action`/sidebar/web-accessible resources/permissions → MV3 equivalents;
- `scripting`, `sidePanel`, `offscreen`, and declarative network rules;
- service-worker-safe download, authentication, editor, and auto-save paths;
- bundled bootstrap scripts and a dedicated Chrome MV3 regression test.

Estimated independent port: **18–28 engineer-days plus 5–8 QA days** for a senior extension engineer, with the highest risk in service-worker suspension during large captures and offscreen Blob transfer. Using the maintainer's current MV3 sibling reduces PageVault's port adoption and regression allowance to **2–4 engineer-days**, while preserving the full proven capture core.

## Issue evidence used for product choices

- recurring save hangs/freezes on large or specific pages;
- cryptic UUID/Base64-like filenames that make archives hard to find;
- annotation workflows stuck on “Please wait”;
- CORS and browser constraints that make downloaded files an unreliable library.

PageVault therefore leaves capture mechanics upstream-owned and adds a local, searchable, versioned library with bounded per-site retention and annotations attached to an exact saved version.
