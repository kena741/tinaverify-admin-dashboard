import assert from "node:assert/strict";
import test from "node:test";

import {
	paidSubscriptionAmount,
	sumPaidSubscriptionRevenueInRange,
} from "./analytics.ts";

const REF = "TX-12345";

test("rows without chapa reference are not revenue", () => {
	assert.equal(paidSubscriptionAmount({ amount: 500, status: "active" }), 0);
	assert.equal(paidSubscriptionAmount({ amount: 500, status: "active", chapa_transaction_reference: null }), 0);
	assert.equal(paidSubscriptionAmount({ amount: 500, status: "active", chapa_transaction_reference: "" }), 0);
});

test("pending and empty amounts are not revenue", () => {
	assert.equal(paidSubscriptionAmount({ amount: 500, status: "pending", chapa_transaction_reference: REF }), 0);
	assert.equal(paidSubscriptionAmount({ amount: 0, status: "active", chapa_transaction_reference: REF }), 0);
	assert.equal(paidSubscriptionAmount({ amount: null, status: "active", chapa_transaction_reference: REF }), 0);
});

test("paid rows with chapa ref count numeric and string amounts", () => {
	assert.equal(paidSubscriptionAmount({ amount: 525039.42, status: "active", chapa_transaction_reference: REF }), 525039.42);
	assert.equal(paidSubscriptionAmount({ amount: "77936.7", status: "expired", chapa_transaction_reference: REF }), 77936.7);
});

test("period total only sums rows with chapa reference", () => {
	const rows = [
		{ amount: 320, status: "active", started_at: "2026-05-10T12:00:00.000Z", chapa_transaction_reference: REF },
		{ amount: 1143582.85, status: "active", started_at: "2026-06-15T12:00:00.000Z", chapa_transaction_reference: REF },
		{ amount: 525039.42, status: "expired", started_at: "2026-07-20T12:00:00.000Z", chapa_transaction_reference: REF },
		{ amount: 77936.7, status: "active", started_at: "2026-08-02T12:00:00.000Z", chapa_transaction_reference: REF },
		{ amount: 99999, status: "pending", started_at: "2026-08-03T12:00:00.000Z", chapa_transaction_reference: REF },
		{ amount: 50, status: "active", started_at: "2025-01-01T12:00:00.000Z", chapa_transaction_reference: REF },
		{ amount: 9999, status: "active", started_at: "2026-07-01T12:00:00.000Z" },
	];
	const chartMonths = sumPaidSubscriptionRevenueInRange(
		rows,
		new Date("2026-05-01T00:00:00.000Z"),
		new Date("2026-08-14T23:59:59.999Z"),
	);
	assert.equal(chartMonths, 320 + 1143582.85 + 525039.42 + 77936.7);
	assert.equal(chartMonths, 1746878.97);

	const allTime = sumPaidSubscriptionRevenueInRange(
		rows,
		new Date(0),
		new Date("2026-08-14T23:59:59.999Z"),
	);
	assert.equal(allTime, chartMonths + 50);
	assert.equal(allTime, 1746928.97);
});
