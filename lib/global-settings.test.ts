import assert from "node:assert/strict";
import test from "node:test";

import {
	policiesFromApi,
	policiesToApi,
	generalUseToRows,
	rowsToGeneralUse,
	type PolicyDocument,
} from "./global-settings.ts";

test("policies round-trip through API object shape", () => {
	const docs: PolicyDocument[] = [
		{
			id: "policy_a",
			title: "Privacy",
			content: "We care.",
			updatedAt: "2026-01-01T00:00:00.000Z",
		},
	];
	const api = policiesToApi(docs);
	assert.deepEqual(api.policy_a, {
		title: "Privacy",
		content: "We care.",
		updatedAt: "2026-01-01T00:00:00.000Z",
	});
	assert.deepEqual(policiesFromApi(api), docs);
});

test("string policy values become documents", () => {
	const docs = policiesFromApi({ terms: "Be nice." });
	assert.equal(docs.length, 1);
	assert.equal(docs[0]?.id, "terms");
	assert.equal(docs[0]?.content, "Be nice.");
});

test("general_use rows round-trip scalars and JSON", () => {
	const rows = generalUseToRows({ app_name: "Zulu", flag: true, n: 2 });
	assert.deepEqual(rowsToGeneralUse(rows), {
		app_name: "Zulu",
		flag: true,
		n: 2,
	});
});
