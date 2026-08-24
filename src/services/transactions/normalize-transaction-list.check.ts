import assert from "node:assert/strict";

import { normalizeTransactionList } from "./transactionsApi";

const sample = {
	id: "00000000-0000-0000-0000-000000000001",
	reference_number: "REF-1",
	business_id: "00000000-0000-0000-0000-000000000002",
	amount: "100",
	currency: "ETB",
	status: "verified",
};

assert.equal(normalizeTransactionList([sample]).length, 1);
assert.equal(
	normalizeTransactionList({ CBE: [sample], Awash: [sample] }).length,
	2,
);
assert.equal(normalizeTransactionList({ items: [sample] }).length, 1);
assert.equal(normalizeTransactionList({ unexpected: true }).length, 0);

console.log("normalizeTransactionList: ok");
