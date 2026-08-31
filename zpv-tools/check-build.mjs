#!/usr/bin/env node
/* SPDX-License-Identifier: AGPL-3.0-or-later */
/* global process */
/* eslint-disable no-console */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve(process.argv[2] || "dist");
const required = [
	"manifest.json",
	"lib/single-file-extension-background.js",
	"src/zpv/lens.html",
	"src/zpv/vault.html",
	"src/zpv/viewer.html",
	"src/zpv/diff.html",
	"src/zpv/license.js",
	"src/zpv/assets/pagevault-128.png"
];
for (const file of required) await stat(path.join(dist, file));

const manifest = JSON.parse(await readFile(path.join(dist, "manifest.json"), "utf8"));
assert(manifest.manifest_version === 3, "manifest must be MV3");
assert(manifest.name === "Zovo PageVault", "product name mismatch");
assert(manifest.action?.default_popup === "src/zpv/lens.html", "popup is not wired");
assert(manifest.side_panel?.default_path === "src/zpv/vault.html", "library is not wired");

const license = await readFile(path.join(dist, "src/zpv/license.js"), "utf8");
assert(!license.includes("__PAGEVAULT_ANON_KEY__"), "licence build key was not injected");
assert(license.includes("verdict.valid !== true"), "licence must grant only on valid:true");
assert(!/tier\s*===\s*["']pro["']/.test(license), "tier-based Pro grant found");

const background = await readFile(path.join(dist, "lib/single-file-extension-background.js"), "utf8");
for (const anchor of ["zpv.captureActive", "zpv.search", "zpv.rule.put", "pagevault_observatory_v1"]) {
	assert(background.includes(anchor), `missing background anchor: ${anchor}`);
}
console.log("Build contract: PASS");

function assert(condition, message) {
	if (!condition) throw new Error(message);
}
