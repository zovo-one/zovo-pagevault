/* SPDX-License-Identifier: AGPL-3.0-or-later */
/* global Blob, document, location, NodeFilter, setTimeout, URL */

import { getLicense } from "./license.js";
import { inertArchivedHtml } from "./shared.js";
import { addAnnotation, annotationsForSnapshot, deleteAnnotation, getSnapshot, snapshotsForUrl } from "./vault-db.js";

const id = new URL(location.href).searchParams.get("id");
const frame = document.querySelector("#pageFrame");
const status = document.querySelector("#annotationStatus");
let snapshot;
let quote = "";
let color = "amber";

document.querySelector("#backButton").addEventListener("click", () => location.href = "vault.html");
document.querySelector("#selectionButton").addEventListener("click", readSelection);
document.querySelector("#addAnnotationButton").addEventListener("click", createAnnotation);
document.querySelector("#exportButton").addEventListener("click", exportHtml);
document.querySelector("#compareButton").addEventListener("click", comparePrevious);
for (const swatch of document.querySelectorAll(".swatch")) swatch.addEventListener("click", chooseColor);

await load();

async function load() {
	snapshot = await getSnapshot(id);
	if (!snapshot) {
		document.querySelector("#snapshotTitle").textContent = "Snapshot not found";
		return;
	}
	document.querySelector("#snapshotTitle").textContent = snapshot.title;
	document.querySelector("#snapshotMeta").textContent = `Version ${snapshot.version} · ${new Date(snapshot.capturedAt).toLocaleString()} · ${snapshot.url}`;
	frame.srcdoc = inertArchivedHtml(snapshot.content);
	frame.addEventListener("load", refreshAnnotations, { once: true });
}

function readSelection() {
	try {
		quote = frame.contentWindow.getSelection().toString().trim().slice(0, 2000);
		document.querySelector("#quotePreview").textContent = quote || "No text is selected inside the saved page.";
	} catch {
		status.textContent = "This saved page does not allow selection access.";
	}
}

function chooseColor(event) {
	color = event.currentTarget.dataset.color;
	for (const swatch of document.querySelectorAll(".swatch")) swatch.classList.toggle("active", swatch === event.currentTarget);
}

async function createAnnotation() {
	if (!(await getLicense())) {
		status.textContent = "Annotations are a Pro tool. Activate from the library to add one.";
		return;
	}
	const note = document.querySelector("#noteInput").value.trim();
	try {
		await addAnnotation({ snapshotId: id, quote, note, color });
		document.querySelector("#noteInput").value = "";
		quote = "";
		document.querySelector("#quotePreview").textContent = "Select text inside the saved page, then attach it here.";
		status.textContent = "Annotation added to this version.";
		await refreshAnnotations();
	} catch (error) {
		status.textContent = error.message;
	}
}

async function refreshAnnotations() {
	const annotations = await annotationsForSnapshot(id);
	const list = document.querySelector("#annotationList");
	list.replaceChildren();
	clearHighlights();
	for (const annotation of annotations) {
		const card = el("article", "annotation");
		card.dataset.color = annotation.color;
		if (annotation.quote) card.append(el("blockquote", "", `“${annotation.quote}”`));
		if (annotation.note) card.append(el("p", "", annotation.note));
		const remove = el("button", "danger quiet", "Remove");
		remove.addEventListener("click", async () => { await deleteAnnotation(annotation.id); await refreshAnnotations(); });
		card.append(remove);
		list.append(card);
		if (annotation.quote) highlightQuote(annotation.quote, annotation.color);
	}
	if (!annotations.length) list.append(el("p", "muted", "No annotations on this copy yet."));
}

function highlightQuote(text, tone) {
	const doc = frame.contentDocument;
	if (!doc?.body) return;
	const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
	let node;
	while ((node = walker.nextNode())) {
		const index = node.nodeValue.indexOf(text);
		if (index < 0 || node.parentElement?.closest("mark[data-pagevault-note]")) continue;
		const range = doc.createRange();
		range.setStart(node, index); range.setEnd(node, index + text.length);
		const mark = doc.createElement("mark");
		mark.dataset.pagevaultNote = tone;
		mark.style.background = tone === "cyan" ? "#66d9d1" : tone === "violet" ? "#c3a2ed" : "#f4ce63";
		range.surroundContents(mark);
		break;
	}
}

function clearHighlights() {
	const doc = frame.contentDocument;
	if (!doc) return;
	for (const mark of doc.querySelectorAll("mark[data-pagevault-note]")) mark.replaceWith(...mark.childNodes);
}

function exportHtml() {
	const url = URL.createObjectURL(new Blob([snapshot.content], { type: snapshot.mimeType }));
	const link = document.createElement("a");
	link.href = url; link.download = snapshot.filename; link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function comparePrevious() {
	const versions = await snapshotsForUrl(snapshot.canonicalUrl);
	const index = versions.findIndex(item => item.id === snapshot.id);
	const previous = versions[index + 1];
	if (!previous) { status.textContent = "This is the first saved version."; return; }
	location.href = `diff.html?before=${encodeURIComponent(previous.id)}&after=${encodeURIComponent(snapshot.id)}`;
}

function el(tag, className = "", text = "") { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
