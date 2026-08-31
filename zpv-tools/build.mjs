#!/usr/bin/env node
/* SPDX-License-Identifier: AGPL-3.0-or-later */
/* global process */
/* eslint-disable no-console */

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const apiKey = await readAnonKey(root);
if (!apiKey) {
	console.error("Build stopped: SUPABASE_ANON_KEY must be set in the environment or .env.");
	process.exit(2);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const entry of ["manifest.json", "LICENSE", "NOTICE", "PRIVACY.md", "README.MD", "_locales", "lib", "src"]) {
	await cp(path.join(root, entry), path.join(dist, entry), { recursive: true });
}

const licensePath = path.join(dist, "src/zpv/license.js");
const licenseSource = await readFile(licensePath, "utf8");
if (!licenseSource.includes("__PAGEVAULT_ANON_KEY__")) {
	throw new Error("Licence build placeholder is missing");
}
await writeFile(licensePath, licenseSource.replaceAll("__PAGEVAULT_ANON_KEY__", apiKey));

const archive = path.join(root, "zovo-pagevault-1.0.0.zip");
await rm(archive, { force: true });
const zipped = spawnSync("zip", ["-qr", archive, "."], { cwd: dist, stdio: "inherit" });
if (zipped.status !== 0) process.exit(zipped.status || 1);

console.log(`Built ${path.relative(root, dist)} and ${path.basename(archive)}.`);

async function readAnonKey(base) {
	if (process.env.SUPABASE_ANON_KEY?.trim()) return process.env.SUPABASE_ANON_KEY.trim();
	const envPath = path.join(base, ".env");
	if (!existsSync(envPath)) return "";
	const env = await readFile(envPath, "utf8");
	const match = env.match(/^SUPABASE_ANON_KEY\s*=\s*(.+)$/m);
	return match?.[1]?.trim().replace(/^['"]|['"]$/g, "") || "";
}
