import type { BusinessOutput, VerifiedTransactionOutput } from "@/services/types";

export type BuiltInAnalyticsPreset = "last_7_days" | "last_30_days" | "this_month";

export type DashboardAnalyticsPreset = BuiltInAnalyticsPreset | "custom";

/** `YYYY-MM-DD` for `<input type="date">`. */
export function formatDateInputValue(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function defaultCustomDateRange(): { start: string; end: string } {
	const end = new Date();
	const start = new Date(end.getFullYear(), end.getMonth(), 1);
	return { start: formatDateInputValue(start), end: formatDateInputValue(end) };
}

/** Inclusive local calendar range → ISO datetimes for the API. */
export function isoRangeFromLocalDates(
	startDate: string,
	endDate: string,
): { startDate: string; endDate: string } | null {
	if (!startDate || !endDate) return null;
	const start = new Date(`${startDate}T00:00:00`);
	const end = new Date(`${endDate}T23:59:59.999`);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
	if (start > end) return null;
	return { startDate: start.toISOString(), endDate: end.toISOString() };
}

/** Parse API revenue amounts (string or number). */
export function parseRevenueAmount(
	value: string | number | null | undefined,
): number {
	if (value === null || value === undefined) return 0;
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	const n = Number.parseFloat(String(value).replace(/,/g, ""));
	return Number.isFinite(n) ? n : 0;
}

/** Coerce analytics count fields (API may return number or string). */
export function parseAnalyticsCount(
	value: number | string | null | undefined,
): number {
	if (value === null || value === undefined) return 0;
	if (typeof value === "number") return Number.isFinite(value) ? value : 0;
	const n = Number.parseInt(String(value).replace(/,/g, ""), 10);
	return Number.isFinite(n) ? n : 0;
}

export function formatRevenueAmount(amount: number, currency = "ETB"): string {
	const formatted = amount.toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
	return `${currency} ${formatted}`;
}

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
