import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeUrl, hostnameMatches, normalizeLicenseKey, searchMatches, stripHtml, summarizeTextDiff } from "../src/zpv/shared.js";

test("licence key validation is shape-only and normalizes case", () => {
	assert.equal(normalizeLicenseKey(" zovo-a1b2-C3D4-e5f6-G7H8 "), "ZOVO-A1B2-C3D4-E5F6-G7H8");
	assert.equal(normalizeLicenseKey("ZOVO-AAAA-BBBB-CCCC"), null);
	assert.equal(normalizeLicenseKey("ZOVO-AAAA-BBBB-CCCC-***!"), null);
});

test("canonical URLs preserve queries but ignore fragments", () => {
	assert.equal(canonicalizeUrl("https://example.com/a?q=1#part"), "https://example.com/a?q=1");
});

test("site rules match a domain and its subdomains only", () => {
	assert.equal(hostnameMatches("news.example.com", "*.example.com"), true);
	assert.equal(hostnameMatches("notexample.com", "example.com"), false);
});

test("full text search requires every query term", () => {
	const snapshot = { title: "Launch notes", url: "https://example.com", searchText: "The amber observatory is ready" };
	assert.equal(searchMatches(snapshot, "amber ready"), true);
	assert.equal(searchMatches(snapshot, "amber missing"), false);
});

test("HTML indexing excludes scripts and styles", () => {
	assert.equal(stripHtml("<style>secret</style><h1>Hello &amp; goodbye</h1><script>hidden()</script>"), "Hello & goodbye");
});

test("text diff reports added and removed terms", () => {
	const result = summarizeTextDiff("alpha beta", "beta gamma");
	assert.deepEqual(result.added, ["gamma"]);
	assert.deepEqual(result.removed, ["alpha"]);
});
