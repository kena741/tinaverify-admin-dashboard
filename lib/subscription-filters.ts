import type { AdminSubscriptionOutput } from "@/services/types";

export const BUSINESS_FILTER_ALL = "all";
export const PLAN_FILTER_ALL = "all";

export type SubscriptionPaymentFilter = "all" | "active" | "paid" | "unpaid";

export const SUBSCRIPTION_PAYMENT_FILTER_LABELS: Record<
	SubscriptionPaymentFilter,
	string
> = {
	all: "All",
	active: "Active",
	paid: "Paid",
	unpaid: "Unpaid",
};

export function getSubscriptionPaymentFilterLabel(
	filter: SubscriptionPaymentFilter,
): string {
	return SUBSCRIPTION_PAYMENT_FILTER_LABELS[filter];
}

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
	pending: "Pending",
	active: "Active",
	expired: "Expired",
	cancelled: "Cancelled",
	insufficient_credits: "Insufficient credits",
};

export function getSubscriptionStatusLabel(status: string): string {
	return SUBSCRIPTION_STATUS_LABELS[status.toLowerCase()] ?? status;
}

export function isPaidSubscriptionStatus(status: string): boolean {
	return status.toLowerCase() === "active";
}

export function isUnpaidSubscriptionStatus(status: string): boolean {
	return !isPaidSubscriptionStatus(status);
}

export function matchesPaymentFilter(
	row: AdminSubscriptionOutput,
	filter: SubscriptionPaymentFilter,
): boolean {
	if (filter === "all") return true;
	if (filter === "active" || filter === "paid") {
		return isPaidSubscriptionStatus(row.status);
	}
	return isUnpaidSubscriptionStatus(row.status);
}

export function countUniqueBusinesses(rows: AdminSubscriptionOutput[]): number {
	return new Set(rows.map((r) => r.business_id)).size;
}
