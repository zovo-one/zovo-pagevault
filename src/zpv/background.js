/* SPDX-License-Identifier: AGPL-3.0-or-later */
/* global browser, URL */

import * as business from "../core/bg/business.js";
import { getLicense } from "./license.js";
import { hostnameMatches } from "./shared.js";
import {
	addSnapshot,
	deleteRule,
	deleteSnapshot,
	getStats,
	listRules,
	listSnapshots,
	pruneUrl,
	putRule,
	searchSnapshots
} from "./vault-db.js";

const recentAutoCaptures = new Map();
const AUTO_DEDUP_MS = 30_000;

browser.runtime.onMessage.addListener((message, sender) => {
	if (!message || typeof message.method !== "string" || !message.method.startsWith("zpv.")) {
		return undefined;
	}
	return onVaultMessage(message, sender).catch(error => ({
		ok: false,
		error: error?.message || "PageVault could not complete the request"
	}));
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && /^https?:/.test(tab.url || "")) {
		void maybeAutoCapture(tabId, tab);
	}
});

async function onVaultMessage(message) {
	switch (message.method) {
		case "zpv.captureActive":
			return captureActive("manual");
		case "zpv.stats":
			return getStats();
		case "zpv.snapshots":
			return listSnapshots();
		case "zpv.search":
			return searchSnapshots(message.query);
		case "zpv.snapshot.delete":
			await deleteSnapshot(message.id);
			return { ok: true };
		case "zpv.rules":
			return listRules();
		case "zpv.rule.put":
			return saveRule(message.rule);
		case "zpv.rule.delete":
			await deleteRule(message.id);
			return { ok: true };
		case "zpv.openVault":
			await browser.tabs.create({ url: browser.runtime.getURL("src/zpv/vault.html") });
			return { ok: true };
		default:
			throw new Error("Unknown PageVault request");
	}
}

async function captureActive(source) {
	const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
	if (!tab || !/^https?:/.test(tab.url || "")) {
		throw new Error("Open an http or https page before saving a snapshot");
	}
	return capture(tab, source);
}

async function capture(tab, source) {
	await setCaptureBadge(tab.id, "…");
	try {
		const pageData = await business.captureTab(tab, { compressContent: false });
		pageData.url ||= tab.url;
		pageData.title ||= tab.title;
		const snapshot = await addSnapshot(pageData, source);
		return { ok: true, snapshot: compact(snapshot) };
	} finally {
		await setCaptureBadge(tab.id, "");
	}
}

async function maybeAutoCapture(tabId, tab) {
	const url = new URL(tab.url);
	const rules = await listRules();
	const rule = rules.find(item => item.enabled && hostnameMatches(url.hostname, item.hostname));
	if (!rule) {
		return;
	}
	const key = `${tabId}:${tab.url}`;
	const lastCapture = recentAutoCaptures.get(key) || 0;
	if (Date.now() - lastCapture < AUTO_DEDUP_MS) {
		return;
	}
	recentAutoCaptures.set(key, Date.now());
	try {
		const result = await capture(tab, "auto");
		await pruneUrl(result.snapshot.canonicalUrl, rule.keep);
	} catch (error) {
		console.warn("[pagevault_observatory] auto-capture skipped", error); // eslint-disable-line no-console
	}
}

async function saveRule(rule) {
	const rules = await listRules();
	const updating = rules.some(item => item.id === rule?.id);
	if (!updating && rules.length >= 1 && !(await getLicense())) {
		return { ok: false, proRequired: true };
	}
	return { ok: true, rule: await putRule(rule || {}) };
}

async function setCaptureBadge(tabId, text) {
	try {
		await browser.action.setBadgeBackgroundColor({ color: "#F2B84B" });
		await browser.action.setBadgeText({ tabId, text });
	} catch {
		// The tab can disappear during capture.
	}
}

function compact(snapshot) {
	const metadata = { ...snapshot };
	delete metadata.content;
	delete metadata.searchText;
	return metadata;
}
