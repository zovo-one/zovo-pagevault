/* SPDX-License-Identifier: AGPL-3.0-or-later */
/* global Blob, crypto, indexedDB, TextDecoder */

import { canonicalizeUrl, excerptFor, searchMatches, stripHtml, ZPV_NAMESPACE } from "./shared.js";

const DB_VERSION = 1;
const SNAPSHOTS = "snapshots";
const RULES = "rules";
const ANNOTATIONS = "annotations";

export async function openVault() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(ZPV_NAMESPACE, DB_VERSION);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		request.onupgradeneeded = () => upgrade(request.result);
	});
}

function upgrade(db) {
	if (!db.objectStoreNames.contains(SNAPSHOTS)) {
		const snapshots = db.createObjectStore(SNAPSHOTS, { keyPath: "id" });
		snapshots.createIndex("byUrl", "canonicalUrl", { unique: false });
		snapshots.createIndex("byCapturedAt", "capturedAt", { unique: false });
	}
	if (!db.objectStoreNames.contains(RULES)) {
		db.createObjectStore(RULES, { keyPath: "id" });
	}
	if (!db.objectStoreNames.contains(ANNOTATIONS)) {
		const annotations = db.createObjectStore(ANNOTATIONS, { keyPath: "id" });
		annotations.createIndex("bySnapshot", "snapshotId", { unique: false });
	}
}

export async function addSnapshot(pageData, source = "manual") {
	const content = normalizeContent(pageData.content);
	const canonicalUrl = canonicalizeUrl(pageData.url);
	const versions = await snapshotsForUrl(canonicalUrl);
	const snapshot = {
		id: crypto.randomUUID(),
		canonicalUrl,
		url: pageData.url || canonicalUrl,
		title: pageData.title || pageData.filename || canonicalUrl,
		filename: pageData.filename || "page.html",
		mimeType: pageData.mimeType || "text/html",
		capturedAt: Date.now(),
		version: Math.max(0, ...versions.map(item => Number(item.version) || 0)) + 1,
		source,
		content,
		searchText: stripHtml(content),
		bytes: new Blob([content]).size
	};
	await put(SNAPSHOTS, snapshot);
	return snapshot;
}

function normalizeContent(content) {
	if (typeof content === "string") {
		return content;
	}
	if (content instanceof Uint8Array || Array.isArray(content)) {
		return new TextDecoder().decode(new Uint8Array(content));
	}
	return String(content || "");
}

export async function listSnapshots() {
	const rows = await getAll(SNAPSHOTS);
	return rows.sort((a, b) => b.capturedAt - a.capturedAt);
}

export async function getSnapshot(id) {
	return get(SNAPSHOTS, id);
}

export async function snapshotsForUrl(canonicalUrl) {
	const db = await openVault();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(SNAPSHOTS, "readonly");
		const request = tx.objectStore(SNAPSHOTS).index("byUrl").getAll(canonicalUrl);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result.sort((a, b) => b.capturedAt - a.capturedAt));
		tx.oncomplete = () => db.close();
	});
}

export async function searchSnapshots(query) {
	const rows = await listSnapshots();
	return rows.filter(row => searchMatches(row, query)).map(row => ({
		...withoutContent(row),
		excerpt: excerptFor(row, query)
	}));
}

export async function deleteSnapshot(id) {
	const annotations = await annotationsForSnapshot(id);
	await Promise.all(annotations.map(annotation => remove(ANNOTATIONS, annotation.id)));
	await remove(SNAPSHOTS, id);
}

export async function pruneUrl(canonicalUrl, keep) {
	const rows = await snapshotsForUrl(canonicalUrl);
	const limit = Math.max(1, Math.min(100, Number(keep) || 1));
	await Promise.all(rows.slice(limit).map(row => deleteSnapshot(row.id)));
}

export async function getStats() {
	const rows = await listSnapshots();
	return {
		pages: new Set(rows.map(row => row.canonicalUrl)).size,
		snapshots: rows.length,
		bytes: rows.reduce((sum, row) => sum + (row.bytes || 0), 0)
	};
}

export async function listRules() {
	return getAll(RULES);
}

export async function putRule(rule) {
	const normalized = {
		id: rule.id || crypto.randomUUID(),
		hostname: String(rule.hostname || "").trim().toLowerCase().replace(/^\*\./, ""),
		keep: Math.max(1, Math.min(100, Number(rule.keep) || 5)),
		enabled: rule.enabled !== false,
		createdAt: Number(rule.createdAt) || Date.now()
	};
	if (!normalized.hostname) {
		throw new Error("A site hostname is required");
	}
	await put(RULES, normalized);
	return normalized;
}

export async function deleteRule(id) {
	return remove(RULES, id);
}

export async function addAnnotation(annotation) {
	const row = {
		id: annotation.id || crypto.randomUUID(),
		snapshotId: annotation.snapshotId,
		quote: String(annotation.quote || "").slice(0, 2000),
		note: String(annotation.note || "").slice(0, 5000),
		color: ["amber", "cyan", "violet"].includes(annotation.color) ? annotation.color : "amber",
		createdAt: Number(annotation.createdAt) || Date.now()
	};
	if (!row.snapshotId || (!row.quote && !row.note)) {
		throw new Error("An annotation needs a snapshot and note or selection");
	}
	await put(ANNOTATIONS, row);
	return row;
}

export async function annotationsForSnapshot(snapshotId) {
	const db = await openVault();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(ANNOTATIONS, "readonly");
		const request = tx.objectStore(ANNOTATIONS).index("bySnapshot").getAll(snapshotId);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result.sort((a, b) => a.createdAt - b.createdAt));
		tx.oncomplete = () => db.close();
	});
}

export async function deleteAnnotation(id) {
	return remove(ANNOTATIONS, id);
}

function withoutContent(snapshot) {
	const metadata = { ...snapshot };
	delete metadata.content;
	delete metadata.searchText;
	return metadata;
}

async function put(storeName, value) {
	return transact(storeName, "readwrite", store => store.put(value));
}

async function remove(storeName, key) {
	return transact(storeName, "readwrite", store => store.delete(key));
}

async function get(storeName, key) {
	return transact(storeName, "readonly", store => store.get(key));
}

async function getAll(storeName) {
	return transact(storeName, "readonly", store => store.getAll());
}

async function transact(storeName, mode, operation) {
	const db = await openVault();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(storeName, mode);
		const request = operation(tx.objectStore(storeName));
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		tx.oncomplete = () => db.close();
		tx.onerror = () => reject(tx.error);
	});
}
