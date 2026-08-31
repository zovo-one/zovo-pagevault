/* SPDX-License-Identifier: AGPL-3.0-or-later */
/* global chrome, document */

import { getLicense } from "./license.js";

const captureButton = document.querySelector("#captureButton");
const captureStatus = document.querySelector("#captureStatus");

captureButton.addEventListener("click", capture);
document.querySelector("#openVaultButton").addEventListener("click", () => send("zpv.openVault"));

await Promise.all([refreshStats(), refreshPlan()]);

async function capture() {
	captureButton.disabled = true;
	captureStatus.textContent = "Embedding page resources…";
	try {
		const result = await send("zpv.captureActive");
		captureStatus.textContent = `Saved version ${result.snapshot.version}.`;
		await refreshStats();
	} catch (error) {
		captureStatus.textContent = error?.message || "The page could not be saved.";
	} finally {
		captureButton.disabled = false;
	}
}

async function refreshStats() {
	const stats = await send("zpv.stats");
	document.querySelector("#pageCount").textContent = String(stats.pages);
	document.querySelector("#snapshotCount").textContent = String(stats.snapshots);
	document.querySelector("#storageSize").textContent = formatBytes(stats.bytes);
}

async function refreshPlan() {
	document.querySelector("#planBadge").textContent = await getLicense() ? "Pro" : "Free";
}

async function send(method, data = {}) {
	const response = await chrome.runtime.sendMessage({ method, ...data });
	if (response?.ok === false && response.error) {
		throw new Error(response.error);
	}
	return response;
}

function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
