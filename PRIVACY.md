# Privacy disclosure — Zovo PageVault

PageVault stores saved HTML snapshots, extracted search text, version metadata, automatic-capture rules, and annotations locally in the extension's IndexedDB database. These archive records are not uploaded by PageVault, are not used for advertising or analytics, and are not sold.

To create a complete saved page, the bundled SingleFile capture engine reads the page and may request its images, fonts, stylesheets, frames, and other page resources. Those requests go to the resource hosts referenced by the page. The resulting self-contained HTML is stored locally. Export happens only when the user chooses it.

Chrome storage holds capture preferences and a local licence verification record. When the user explicitly activates Pro, the extension sends only the entered licence key and the product identifier `pagevault` to `zgubxqomnbmxgbdhvwja.supabase.co/functions/v1/verify-extension-license`. Access is granted only after the server returns `valid: true`; the server's tier label is not used as the grant condition.

All executable code is packaged with the extension. It does not download or execute remote code.
