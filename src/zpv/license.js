/* SPDX-License-Identifier: AGPL-3.0-or-later */
/* global AbortController, chrome, clearTimeout, fetch, setTimeout */

import { normalizeLicenseKey, ZPV_LICENSE_KEY } from "./shared.js";

const VERIFY_URL = "https://zgubxqomnbmxgbdhvwja.supabase.co/functions/v1/verify-extension-license";
const BUILD_ANON_KEY = "__PAGEVAULT_ANON_KEY__";

export async function getLicense() {
	const stored = await chrome.storage.local.get(ZPV_LICENSE_KEY);
	const state = stored[ZPV_LICENSE_KEY];
	return state?.valid === true && normalizeLicenseKey(state.key) ? state : null;
}

export async function activateLicense(raw, dependencies = {}) {
	const key = normalizeLicenseKey(raw);
	if (!key) {
		return { valid: false, error: "shape" };
	}
	const fetchImpl = dependencies.fetchImpl || fetch;
	const apiKey = dependencies.apiKey || BUILD_ANON_KEY;
	const write = dependencies.write || writeLicense;
	if (!apiKey || apiKey.includes("PAGEVAULT_ANON_KEY")) {
		return { valid: false, error: "build-key-missing" };
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 9000);
	try {
		const response = await fetchImpl(VERIFY_URL, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"apikey": apiKey,
				"authorization": `Bearer ${apiKey}`
			},
			body: JSON.stringify({ license_key: key, extension: "pagevault" }),
			signal: controller.signal
		});
		if (!response.ok) {
			return { valid: false, error: "rejected" };
		}
		const verdict = await response.json().catch(() => null);
		if (!verdict || verdict.valid !== true) {
			return { valid: false, error: "rejected" };
		}
		await write({ key, valid: true, activatedAt: Date.now() });
		return { valid: true };
	} catch {
		return { valid: false, error: "offline" };
	} finally {
		clearTimeout(timer);
	}
}

async function writeLicense(state) {
	await chrome.storage.local.set({ [ZPV_LICENSE_KEY]: state });
}

export async function deactivateLicense() {
	await chrome.storage.local.remove(ZPV_LICENSE_KEY);
}
