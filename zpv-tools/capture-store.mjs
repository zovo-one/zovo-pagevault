#!/usr/bin/env node
/* SPDX-License-Identifier: AGPL-3.0-or-later */
/* global chrome, process, URL */
/* eslint-disable no-console */

import { chromium } from "playwright";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const out = path.join(root, "store-assets");
const executablePath = "/Users/mike/Library/Caches/ms-playwright/chromium-1237/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const profile = await mkdtemp("/tmp/zpv-store-");
const context = await chromium.launchPersistentContext(profile, {
	headless: true,
	executablePath,
	args: [`--disable-extensions-except=${path.join(root, "dist")}`, `--load-extension=${path.join(root, "dist")}`]
});

try {
	const worker = await waitForWorker(context);
	const extensionId = new URL(worker.url()).host;
	const library = await context.newPage();
	await library.setViewportSize({ width: 1280, height: 800 });
	await library.goto(`chrome-extension://${extensionId}/src/zpv/vault.html`);
	const ids = await seed(library);
	await library.reload();
	await library.waitForTimeout(450);
	await library.screenshot({ path: path.join(out, "screenshot-1-library.png") });

	const viewer = await context.newPage();
	await viewer.setViewportSize({ width: 1280, height: 800 });
	await viewer.goto(`chrome-extension://${extensionId}/src/zpv/viewer.html?id=${ids.after}`);
	await viewer.waitForTimeout(450);
	await viewer.screenshot({ path: path.join(out, "screenshot-2-annotations.png") });

	const diff = await context.newPage();
	await diff.setViewportSize({ width: 1280, height: 800 });
	await diff.goto(`chrome-extension://${extensionId}/src/zpv/diff.html?before=${ids.before}&after=${ids.after}`);
	await diff.waitForTimeout(450);
	await diff.screenshot({ path: path.join(out, "screenshot-3-visual-diff.png") });

	const promo = await context.newPage();
	await promo.goto(pathToFileURL(path.join(out, "promo.html")).href);
	await promo.setViewportSize({ width: 440, height: 280 });
	await promo.screenshot({ path: path.join(out, "promo-small-440x280.png") });
	await promo.setViewportSize({ width: 1400, height: 560 });
	await promo.screenshot({ path: path.join(out, "promo-marquee-1400x560.png") });
	console.log("Store screenshots and promo tiles captured.");
} finally {
	await context.close();
}

async function waitForWorker(context) {
	const existing = context.serviceWorkers().find(item => item.url().includes("single-file-extension-background"));
	if (existing) return existing;
	return context.waitForEvent("serviceworker", { predicate: item => item.url().includes("single-file-extension-background"), timeout: 10000 });
}

async function seed(page) {
	return page.evaluate(async content => {
		const db = await import(chrome.runtime.getURL("src/zpv/vault-db.js"));
		await chrome.storage.local.set({ pagevault_observatory_v1_license: { key: "ZOVO-A1B2-C3D4-E5F6-G7H8", valid: true, activatedAt: Date.now() } });
		const url = "https://fieldnotes.example/observatory-report";
		const before = await db.addSnapshot({ url, title: "Observatory field report", filename: "report.html", content: content.first }, "auto");
		const after = await db.addSnapshot({ url, title: "Observatory field report", filename: "report.html", content: content.second }, "auto");
		await db.addSnapshot({ url: "https://journal.example/archive-practice", title: "A practical guide to durable web archives", filename: "guide.html", content: content.guide }, "manual");
		await db.putRule({ hostname: "fieldnotes.example", keep: 6 });
		await db.addAnnotation({ snapshotId: after.id, quote: "The eastern reading changed from amber to violet.", note: "Compare this shift with the baseline captured last Tuesday.", color: "violet" });
		return { before: before.id, after: after.id };
	}, { first: firstEdition(), second: secondEdition(), guide: guidePage() });
}

function firstEdition() {
	return "<!doctype html><style>body{font:19px/1.6 system-ui;background:#fffaf0;color:#19363c;padding:64px}article{max-width:800px;margin:auto}h1{font:56px Georgia;color:#0d6d70}.signal{border-left:8px solid #e9a83d;padding:18px;background:#edf6f3}</style><article><h1>Observatory field report</h1><p class=signal>The eastern reading held steady at amber.</p><p>Baseline instrumentation remained within the expected range.</p></article>";
}

function secondEdition() {
	return "<!doctype html><style>body{font:19px/1.6 system-ui;background:#edf7f4;color:#19363c;padding:64px}article{max-width:800px;margin:auto}h1{font:56px Georgia;color:#7357a4}.signal{border-left:8px solid #7357a4;padding:18px;background:#fffaf0}aside{margin-top:24px;background:#0d6d70;color:white;padding:18px}</style><article><h1>Observatory field report</h1><p class=signal>The eastern reading changed from amber to violet.</p><p>Calibration notes now include the late-summer reference window.</p><aside>New field note: archive integrity confirmed.</aside></article>";
}

function guidePage() {
	return "<!doctype html><style>body{font:19px/1.6 system-ui;padding:64px}h1{font:52px Georgia;color:#0d6d70}</style><h1>A practical guide to durable web archives</h1><p>Capture complete pages, search the preserved text, and keep only the versions that matter.</p>";
}
