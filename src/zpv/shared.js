/*
 * PageVault additions are Copyright 2026 Zovo contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/* global URL */

export const ZPV_NAMESPACE = "pagevault_observatory_v1";
export const ZPV_LICENSE_KEY = `${ZPV_NAMESPACE}_license`;
export const ZPV_KEY_SHAPE = /^ZOVO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function canonicalizeUrl(raw) {
	try {
		const url = new URL(raw);
		url.hash = "";
		return url.href;
	} catch {
		return String(raw || "");
	}
}

export function normalizeLicenseKey(raw) {
	if (typeof raw !== "string" || raw.length > 64) {
		return null;
	}
	const normalized = raw.trim().toUpperCase();
	return ZPV_KEY_SHAPE.test(normalized) ? normalized : null;
}

export function stripHtml(html) {
	return String(html || "")
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
		.replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;|&#160;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;|&#34;/gi, "\"")
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/\s+/g, " ")
		.trim();
}

export function inertArchivedHtml(html) {
	return String(html || "")
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, "")
		.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

export function hostnameMatches(hostname, pattern) {
	const host = String(hostname || "").toLowerCase();
	const clean = String(pattern || "").trim().toLowerCase().replace(/^\*\./, "");
	return Boolean(clean) && (host === clean || host.endsWith(`.${clean}`));
}

export function searchMatches(snapshot, query) {
	const terms = String(query || "").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
	if (!terms.length) {
		return true;
	}
	const haystack = `${snapshot.title || ""} ${snapshot.url || ""} ${snapshot.searchText || ""}`.toLocaleLowerCase();
	return terms.every(term => haystack.includes(term));
}

export function excerptFor(snapshot, query, radius = 92) {
	const text = String(snapshot.searchText || "");
	const firstTerm = String(query || "").trim().split(/\s+/)[0]?.toLocaleLowerCase();
	const index = firstTerm ? text.toLocaleLowerCase().indexOf(firstTerm) : -1;
	const start = Math.max(0, index < 0 ? 0 : index - radius);
	const end = Math.min(text.length, start + radius * 2);
	return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

export function summarizeTextDiff(beforeText, afterText) {
	const before = new Set(tokenize(beforeText));
	const after = new Set(tokenize(afterText));
	const added = [...after].filter(token => !before.has(token));
	const removed = [...before].filter(token => !after.has(token));
	return {
		addedCount: added.length,
		removedCount: removed.length,
		added: added.slice(0, 80),
		removed: removed.slice(0, 80)
	};
}

function tokenize(text) {
	return String(text || "").toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.slice(0, 20000) || [];
}

export function escapeHtml(value) {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&#39;");
}
