# Chrome Web Store permission justifications

## activeTab

Used only after the user presses Save snapshot so the extension can capture the currently visible web page.

## tabs

Used to identify the active tab, observe completed navigations for user-created automatic archive rules, and coordinate the upstream capture process.

## scripting

Injects the packaged SingleFile capture scripts into the page being saved. No remote script is fetched or executed.

## storage

Stores capture preferences and the locally verified licence record. Saved pages, search text, versions, rules, and annotations are stored locally in IndexedDB.

## offscreen

Provides the MV3 offscreen document required by the upstream capture core for Blob, compression, clipboard, and image operations that a service worker cannot perform.

## downloads

Exports a selected local snapshot as a portable HTML file and supports the retained SingleFile save/export path.

## contextMenus

Provides the retained SingleFile page-save, selection-save, and annotate commands in the page context menu.

## declarativeNetRequest

Supports the capture core's optional resource-request handling when page assets require safe request-header adjustments to be embedded.

## Host access: all sites

PageVault cannot know in advance which sites the user will choose to archive or which cross-origin resource hosts a page references. Host access lets the packaged capture engine read the chosen page and embed its images, fonts, styles, and frames. Automatic capture occurs only for hostnames the user explicitly adds as rules.
