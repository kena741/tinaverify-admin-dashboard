import type { AdminSubscriptionOutput, SubscriptionStatus } from "@/services/types";

export const BUSINESS_FILTER_ALL = "all";
export const PLAN_FILTER_ALL = "all";

export type SubscriptionStatusFilter = "all" | "pending" | "active" | "expired";

export const SUBSCRIPTION_STATUS_FILTER_LABELS: Record<
	SubscriptionStatusFilter,
	string
> = {
	all: "All",
	pending: "Pending",
	active: "Active",
	expired: "Expired",
};

export function getSubscriptionStatusFilterLabel(
	filter: SubscriptionStatusFilter,
): string {
	return SUBSCRIPTION_STATUS_FILTER_LABELS[filter];
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

export function apiStatusForStatusFilter(
	filter: SubscriptionStatusFilter,
): SubscriptionStatus | undefined {
	if (filter === "all") return undefined;
	return filter;
}

export function countUniqueBusinesses(rows: AdminSubscriptionOutput[]): number {
	return new Set(rows.map((r) => r.business_id)).size;
}

export const CUSTOM_SUBSCRIPTION_PLAN_LABEL = "Custom";

/** Display name for a subscription plan; empty/null plan is a custom subscription. */
export function getSubscriptionPlanLabel(
	plan?: { name?: string } | null,
	resolvedName?: string | null,
): string {
	const name = plan?.name?.trim() || resolvedName?.trim();
	return name || CUSTOM_SUBSCRIPTION_PLAN_LABEL;
}
