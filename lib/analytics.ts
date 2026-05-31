import type { BusinessOutput, VerifiedTransactionOutput } from "@/services/types";

export type BuiltInAnalyticsPreset = "last_7_days" | "last_30_days" | "this_month";

export function isoRangeForAnalyticsPreset(preset: BuiltInAnalyticsPreset): {
	startDate: string;
	endDate: string;
} {
	const end = new Date();
	const start = new Date();

	switch (preset) {
		case "last_7_days":
			start.setDate(start.getDate() - 6);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			break;
		case "last_30_days":
			start.setDate(start.getDate() - 29);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			break;
		case "this_month":
			start.setDate(1);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			break;
	}

	return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function parseTransactionAmount(value: string): number {
	const n = Number.parseFloat(value);
	return Number.isFinite(n) ? n : 0;
}

export function isSuccessfulStatus(status: string): boolean {
	const s = status.toLowerCase();
	return s === "verified" || s === "success" || s === "completed";
}

export type DashboardAnalytics = {
	transactions: VerifiedTransactionOutput[];
	verifiedAmount: number;
	currency: string | null;
	successCount: number;
	failedCount: number;
	pendingCount: number;
	successRate: number;
	byBusiness: {
		businessId: string;
		businessName: string;
		count: number;
		volume: number;
	}[];
	byStatus: { status: string; count: number }[];
};

export function computeDashboardAnalytics(
	transactions: VerifiedTransactionOutput[],
	businesses: BusinessOutput[],
): DashboardAnalytics {
	const businessNameById = new Map(businesses.map((b) => [b.id, b.name]));

	let successCount = 0;
	let failedCount = 0;
	let pendingCount = 0;
	let verifiedAmount = 0;
	let currency: string | null = null;

	const volumeByBusiness = new Map<string, number>();
	const countByBusiness = new Map<string, number>();
	const countByStatus = new Map<string, number>();

	for (const t of transactions) {
		if (!currency && t.currency) currency = t.currency;

		const amount = parseTransactionAmount(t.amount);

		const statusKey = t.status.toLowerCase();
		countByStatus.set(statusKey, (countByStatus.get(statusKey) ?? 0) + 1);

		if (isSuccessfulStatus(t.status)) {
			successCount++;
			verifiedAmount += amount;
		} else if (statusKey === "failed" || statusKey === "rejected") failedCount++;
		else pendingCount++;

		volumeByBusiness.set(
			t.business_id,
			(volumeByBusiness.get(t.business_id) ?? 0) + amount,
		);
		countByBusiness.set(
			t.business_id,
			(countByBusiness.get(t.business_id) ?? 0) + 1,
		);
	}

	const byBusiness = [...volumeByBusiness.entries()]
		.map(([businessId, volume]) => ({
			businessId,
			businessName: businessNameById.get(businessId) ?? "Unknown business",
			count: countByBusiness.get(businessId) ?? 0,
			volume,
		}))
		.sort((a, b) => b.volume - a.volume);

	const byStatus = [...countByStatus.entries()]
		.map(([status, count]) => ({ status, count }))
		.sort((a, b) => b.count - a.count);

	const total = transactions.length;
	const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

	return {
		transactions,
		verifiedAmount,
		currency,
		successCount,
		failedCount,
		pendingCount,
		successRate,
		byBusiness,
		byStatus,
	};
}
