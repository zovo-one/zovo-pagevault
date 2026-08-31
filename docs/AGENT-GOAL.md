# Zovo PageVault build contract

Fork the official AGPL-3.0-or-later SingleFile MV3 codebase without replacing its capture engine. Ship a Chrome MV3 package whose primary interface is a private, local archive.

Acceptance anchors:

- auto-archive rules match a hostname on completed visits and prune to the configured version count;
- every stored snapshot contributes page text to full-text search;
- snapshots keep immutable version numbers and can be rendered side by side or as a visual difference overlay;
- annotations belong to one snapshot and highlight the anchored quote only on that rendered copy;
- the licence client validates only `ZOVO-XXXX-XXXX-XXXX-XXXX` shape and grants only for server `valid:true`;
- a production build fails without `SUPABASE_ANON_KEY`;
- the title is human-readable, the main UI uses the `pagevault_observatory` namespace, and the package retains all AGPL notices and complete source.
