import assert from "node:assert/strict";
import test from "node:test";

import {
	paidSubscriptionAmount,
	sumPaidSubscriptionRevenueInRange,
} from "./analytics.ts";

test("pending and empty amounts are not revenue", () => {
	assert.equal(paidSubscriptionAmount({ amount: 500, status: "pending" }), 0);
	assert.equal(paidSubscriptionAmount({ amount: 0, status: "active" }), 0);
	assert.equal(paidSubscriptionAmount({ amount: null, status: "active" }), 0);
});

test("active rows count numeric and string amounts", () => {
	assert.equal(paidSubscriptionAmount({ amount: 525039.42, status: "active" }), 525039.42);
	assert.equal(paidSubscriptionAmount({ amount: "77936.7", status: "expired" }), 77936.7);
});

test("period total matches the sum of paid monthly bars (user regression)", () => {
	const rows = [
		{ amount: 320, status: "active", started_at: "2026-05-10T12:00:00.000Z" },
		{ amount: 1143582.85, status: "active", started_at: "2026-06-15T12:00:00.000Z" },
		{ amount: 525039.42, status: "expired", started_at: "2026-07-20T12:00:00.000Z" },
		{ amount: 77936.7, status: "active", started_at: "2026-08-02T12:00:00.000Z" },
		{ amount: 99999, status: "pending", started_at: "2026-08-03T12:00:00.000Z" },
		{ amount: 50, status: "active", started_at: "2025-01-01T12:00:00.000Z" },
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
