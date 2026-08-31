/* SPDX-License-Identifier: AGPL-3.0-or-later */
/* global document, location, URL */

import { getLicense } from "./license.js";
import { inertArchivedHtml, summarizeTextDiff } from "./shared.js";
import { getSnapshot } from "./vault-db.js";

const params = new URL(location.href).searchParams;
const before = await getSnapshot(params.get("before"));
const after = await getSnapshot(params.get("after"));
const frames = document.querySelector("#diffFrames");

document.querySelector("#backButton").addEventListener("click", () => location.href = "vault.html");
document.querySelector("#modeButton").addEventListener("click", toggleOverlay);

if (!before || !after) {
	document.querySelector("#diffMeta").textContent = "One or both snapshots no longer exist.";
} else if (!(await getLicense())) {
	document.querySelector("#diffMeta").textContent = "Visual diff is a Pro tool. Activate from the library.";
	document.querySelector("#modeButton").disabled = true;
} else {
	render();
}

function render() {
	document.querySelector("#diffTitle").textContent = after.title;
	document.querySelector("#diffMeta").textContent = `${before.url} · version ${before.version} → ${after.version}`;
	document.querySelector("#beforeLabel").textContent = new Date(before.capturedAt).toLocaleString();
	document.querySelector("#afterLabel").textContent = new Date(after.capturedAt).toLocaleString();
	document.querySelector("#beforeFrame").srcdoc = inertArchivedHtml(before.content);
	document.querySelector("#afterFrame").srcdoc = inertArchivedHtml(after.content);
	const summary = summarizeTextDiff(before.searchText, after.searchText);
	const box = document.querySelector("#diffSummary");
	box.append(chip(`+${summary.addedCount} added terms`, "added"), chip(`−${summary.removedCount} removed terms`, "removed"));
	for (const word of summary.added.slice(0, 8)) box.append(chip(`+ ${word}`, "added"));
	for (const word of summary.removed.slice(0, 8)) box.append(chip(`− ${word}`, "removed"));
}

function toggleOverlay() {
	const overlay = frames.classList.toggle("overlay");
	document.querySelector("#modeButton").textContent = overlay ? "Show side by side" : "Overlay changes";
}

function chip(text, tone) { const node = document.createElement("span"); node.className = `diff-chip ${tone}`; node.textContent = text; return node; }
