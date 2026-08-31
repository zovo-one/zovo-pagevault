import test from "node:test";
import assert from "node:assert/strict";
import { activateLicense } from "../src/zpv/license.js";

const key = "ZOVO-A1B2-C3D4-E5F6-G7H8";

test("valid:true grants regardless of the server tier label", async () => {
	let stored;
	const result = await activateLicense(key, {
		apiKey: "public-anon-test-value",
		fetchImpl: async () => ({ ok: true, json: async () => ({ valid: true, tier: "lifetime" }) }),
		write: async value => { stored = value; }
	});
	assert.equal(result.valid, true);
	assert.equal(stored.valid, true);
});

test("a shaped key never grants without server valid:true", async () => {
	let writes = 0;
	const result = await activateLicense(key, {
		apiKey: "public-anon-test-value",
		fetchImpl: async () => ({ ok: true, json: async () => ({ valid: false, tier: "pro" }) }),
		write: async () => { writes++; }
	});
	assert.equal(result.valid, false);
	assert.equal(writes, 0);
});
