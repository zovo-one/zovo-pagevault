/* SPDX-License-Identifier: AGPL-3.0-or-later */
/* global chrome, clearTimeout, document, location, setTimeout, URL, window */

import { activateLicense, deactivateLicense, getLicense } from "./license.js";

const grid = document.querySelector("#archiveGrid");
const searchInput = document.querySelector("#searchInput");
const captureButton = document.querySelector("#captureButton");
const captureStatus = document.querySelector("#captureStatus");
const licenseDialog = document.querySelector("#licenseDialog");
let snapshots = [];
let searchTimer;

captureButton.addEventListener("click", captureCurrent);
searchInput.addEventListener("input", scheduleSearch);
document.querySelector("#ruleForm").addEventListener("submit", addRule);
document.querySelector("#licenseButton").addEventListener("click", openLicense);
document.querySelector("#activateButton").addEventListener("click", activate);
document.querySelector("#deactivateButton").addEventListener("click", deactivate);
document.querySelector("#pricingButton").addEventListener("click", () => window.open("https://zovo.one/pricing", "_blank", "noopener"));

await refreshAll();

async function refreshAll() {
	await Promise.all([refreshArchive(), refreshStats(), refreshRules(), refreshPlan()]);
}

async function captureCurrent() {
	captureButton.disabled = true;
	captureStatus.textContent = "Embedding fonts, images, frames, and styles…";
	try {
		const result = await send("zpv.captureActive");
		captureStatus.textContent = `Saved “${result.snapshot.title}” as version ${result.snapshot.version}.`;
		await Promise.all([refreshArchive(), refreshStats()]);
	} catch (error) {
		captureStatus.textContent = error?.message || "Capture failed.";
	} finally {
		captureButton.disabled = false;
	}
}

async function refreshArchive() {
	snapshots = await send("zpv.snapshots");
	renderGrouped(snapshots);
}

function scheduleSearch() {
	clearTimeout(searchTimer);
	searchTimer = setTimeout(runSearch, 180);
}

async function runSearch() {
	const query = searchInput.value.trim();
	if (!query) {
		document.querySelector("#archiveTitle").textContent = "Latest archives";
		renderGrouped(snapshots);
		return;
	}
	document.querySelector("#archiveTitle").textContent = "Search results";
	const results = await send("zpv.search", { query });
	renderSearch(results);
}

function renderGrouped(rows) {
	grid.replaceChildren();
	const groups = new Map();
	for (const row of rows) {
		if (!groups.has(row.canonicalUrl)) groups.set(row.canonicalUrl, []);
		groups.get(row.canonicalUrl).push(row);
	}
	for (const versions of groups.values()) {
		grid.append(createCard(versions[0], versions));
	}
	document.querySelector("#resultCount").textContent = `${groups.size} saved ${groups.size === 1 ? "page" : "pages"}`;
	if (!groups.size) grid.append(emptyState("No snapshots yet", "Open a page, then use “Save current page” to begin your local archive."));
}

function renderSearch(rows) {
	grid.replaceChildren();
	for (const row of rows) grid.append(createCard(row, [row], row.excerpt));
	document.querySelector("#resultCount").textContent = `${rows.length} matching ${rows.length === 1 ? "snapshot" : "snapshots"}`;
	if (!rows.length) grid.append(emptyState("No matching text", "Try a title, phrase, domain, or a word that appeared inside the saved page."));
}

function createCard(latest, versions, excerpt = "") {
	const card = el("article", "archive-card");
	card.append(el("h3", "", latest.title), el("div", "url mono", latest.url));
	if (excerpt) card.append(el("p", "excerpt", excerpt));
	const meta = el("div", "card-meta");
	meta.append(el("span", "version-pill", `${versions.length} ${versions.length === 1 ? "version" : "versions"}`), el("span", "", formatDate(latest.capturedAt)), el("span", "", formatBytes(latest.bytes)));
	card.append(meta);
	const actions = el("div", "card-actions");
	actions.append(action("View", () => openPage("viewer.html", { id: latest.id })));
	if (versions.length > 1) actions.append(action("Visual diff", () => openPage("diff.html", { before: versions[1].id, after: versions[0].id })));
	actions.append(action("Delete", () => removeSnapshot(latest), "danger quiet"));
	card.append(actions);
	return card;
}

async function removeSnapshot(snapshot) {
	await send("zpv.snapshot.delete", { id: snapshot.id });
	captureStatus.textContent = `Deleted version ${snapshot.version} of “${snapshot.title}”.`;
	await Promise.all([refreshArchive(), refreshStats()]);
}

async function refreshStats() {
	const stats = await send("zpv.stats");
	document.querySelector("#pageCount").textContent = String(stats.pages);
	document.querySelector("#snapshotCount").textContent = String(stats.snapshots);
	document.querySelector("#storageSize").textContent = formatBytes(stats.bytes);
}

async function refreshRules() {
	const rules = await send("zpv.rules");
	const list = document.querySelector("#rulesList");
	list.replaceChildren();
	for (const rule of rules) {
		const row = el("div", "rule");
		row.append(el("strong", "mono", rule.hostname), el("span", "version-pill", `keep ${rule.keep}`));
		row.append(action("Remove", async () => { await send("zpv.rule.delete", { id: rule.id }); await refreshRules(); }, "danger quiet"));
		list.append(row);
	}
	if (!rules.length) list.append(emptyState("No automatic sites", "Add a hostname to capture it after each completed visit."));
}

async function addRule(event) {
	event.preventDefault();
	const hostname = document.querySelector("#ruleHostname").value;
	const keep = Number(document.querySelector("#ruleKeep").value);
	const result = await send("zpv.rule.put", { rule: { hostname, keep } });
	if (result.proRequired) {
		document.querySelector("#ruleStatus").textContent = "Free includes one site rule. Activate Pro for unlimited rules.";
		openLicense();
		return;
	}
	document.querySelector("#ruleForm").reset();
	document.querySelector("#ruleKeep").value = "5";
	document.querySelector("#ruleStatus").textContent = `Now capturing ${result.rule.hostname} on visit.`;
	await refreshRules();
}

async function refreshPlan() {
	const license = await getLicense();
	document.querySelector("#planLabel").textContent = license ? "Pro" : "Free";
	document.querySelector("#deactivateButton").classList.toggle("hidden", !license);
	document.querySelector("#activateButton").classList.toggle("hidden", Boolean(license));
	document.querySelector("#licenseKey").classList.toggle("hidden", Boolean(license));
}

function openLicense() {
	document.querySelector("#licenseStatus").textContent = "";
	licenseDialog.showModal();
}

async function activate() {
	const button = document.querySelector("#activateButton");
	button.disabled = true;
	const result = await activateLicense(document.querySelector("#licenseKey").value);
	document.querySelector("#licenseStatus").textContent = result.valid ? "Activated. Pro tools are ready." : licenseError(result.error);
	button.disabled = false;
	if (result.valid) await refreshPlan();
}

async function deactivate() {
	await deactivateLicense();
	document.querySelector("#licenseStatus").textContent = "Pro deactivated on this browser.";
	await refreshPlan();
}

function licenseError(error) {
	if (error === "shape") return "Use the format ZOVO-XXXX-XXXX-XXXX-XXXX.";
	if (error === "offline") return "Could not reach the licence server. Check your connection and try again.";
	if (error === "build-key-missing") return "This build cannot activate licences. Install the production package.";
	return "That key was not accepted.";
}

function openPage(page, params) {
	const url = new URL(page, location.href);
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
	location.href = url.href;
}

async function send(method, data = {}) {
	const response = await chrome.runtime.sendMessage({ method, ...data });
	if (response?.ok === false && response.error) throw new Error(response.error);
	return response;
}
function el(tag, className = "", text = "") { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function action(label, handler, className = "") { const button = el("button", className, label); button.type = "button"; button.addEventListener("click", handler); return button; }
function emptyState(title, detail) { const box = el("div", "empty"); box.append(el("strong", "", title), el("p", "", detail)); return box; }
function formatDate(value) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(value); }
function formatBytes(bytes) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; }
