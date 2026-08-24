import type {
	AdminSubscriptionOutput,
	BusinessOutput,
	SubscriptionStatus,
} from "@/services/types";

export const BUSINESS_FILTER_ALL = "all";
export const PLAN_FILTER_ALL = "all";

export type SubscriptionStatusFilter =
	| "all"
	| "pending"
	| "active"
	| "expired"
	| "cancelled"
	| "upgraded"
	| "insufficient_credits"
	| "unsubscribed";

export const SUBSCRIPTION_STATUS_FILTER_LABELS: Record<
	SubscriptionStatusFilter,
	string
> = {
	all: "All",
	pending: "Pending",
	active: "Active",
	expired: "Expired",
	cancelled: "Cancelled",
	upgraded: "Upgraded",
	insufficient_credits: "Insufficient credits",
	unsubscribed: "Unsubscribed",
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
	unsubscribed: "Unsubscribed",
	cancelled: "Cancelled",
	upgraded: "Upgraded",
	insufficient_credits: "Insufficient credits",
};

export function getSubscriptionStatusLabel(status: string): string {
	return SUBSCRIPTION_STATUS_LABELS[status.toLowerCase()] ?? status;
}

/** API accepts only these status query values (not `unsubscribed`). */
export function apiStatusForStatusFilter(
	filter: SubscriptionStatusFilter,
): SubscriptionStatus | undefined {
	if (filter === "all" || filter === "unsubscribed") return undefined;
	return filter;
}

/** Businesses with no subscription transaction (UI label: Unsubscribed). */
export function buildUnsubscribedBusinessRows(
	businesses: BusinessOutput[],
	subscriptionRows: AdminSubscriptionOutput[],
): AdminSubscriptionOutput[] {
	const withSubscription = latestSubscriptionByBusiness(subscriptionRows);
	return businesses
		.filter((b) => !withSubscription.has(b.id))
		.map((b) => ({
			id: b.id,
			business_id: b.id,
			status: "unsubscribed",
			credits_limit: 0,
			business: {
				id: b.id,
				name: b.name,
				tin_number: b.tin_number,
			},
		}));
}

/** One row per business: latest subscription (by started_at / created_at). */
export function buildLatestBusinessSubscriptionRows(
	subscriptionRows: AdminSubscriptionOutput[],
): AdminSubscriptionOutput[] {
	return Array.from(
		latestSubscriptionByBusiness(subscriptionRows).values(),
	).toSorted((a, b) =>
		(a.business?.name ?? a.business_id).localeCompare(
			b.business?.name ?? b.business_id,
		),
	);
}

const STATUS_PRIORITY: Record<string, number> = {
	active: 5,
	pending: 4,
	upgraded: 4,
	insufficient_credits: 3,
	expired: 2,
	cancelled: 1,
	unsubscribed: 0,
};

function subscriptionStatusPriority(status: string): number {
	return STATUS_PRIORITY[status.toLowerCase()] ?? -1;
}

/**
 * Collapse to one row per owner (prefer strongest status, then newest).
 * `ownerIdByBusinessId` maps business_id → owner_id; missing owners key as biz:id.
 */
export function collapseSubscriptionRowsByOwner(
	rows: AdminSubscriptionOutput[],
	ownerIdByBusinessId: Map<string, string>,
): AdminSubscriptionOutput[] {
	const byOwner = new Map<string, AdminSubscriptionOutput>();

	for (const row of rows) {
		const ownerKey =
			ownerIdByBusinessId.get(row.business_id) ?? `biz:${row.business_id}`;
		const existing = byOwner.get(ownerKey);
		if (!existing) {
			byOwner.set(ownerKey, row);
			continue;
		}
		const rankNew = subscriptionStatusPriority(row.status);
		const rankOld = subscriptionStatusPriority(existing.status);
		if (
			rankNew > rankOld ||
			(rankNew === rankOld &&
				subscriptionRowTimestamp(row) >= subscriptionRowTimestamp(existing))
		) {
			byOwner.set(ownerKey, row);
		}
	}

	return Array.from(byOwner.values()).toSorted((a, b) => {
		// Prefer real subscription rows over junk-named unsubscribed placeholders.
		const pr =
			subscriptionStatusPriority(b.status) -
			subscriptionStatusPriority(a.status);
		if (pr !== 0) return pr;
		return (a.business?.name ?? a.business_id).localeCompare(
			b.business?.name ?? b.business_id,
		);
	});
}

export function countUniqueBusinesses(rows: AdminSubscriptionOutput[]): number {
	return new Set(rows.map((r) => r.business_id)).size;
}

export function subscriptionRowTimestamp(row: AdminSubscriptionOutput): number {
	const raw = row.started_at ?? row.created_at;
	if (!raw) return 0;
	const t = new Date(raw).getTime();
	return Number.isNaN(t) ? 0 : t;
}

/** Latest subscription row per business (by started_at / created_at). */
export function latestSubscriptionByBusiness(
	rows: AdminSubscriptionOutput[],
): Map<string, AdminSubscriptionOutput> {
	const byBusiness = new Map<string, AdminSubscriptionOutput>();
	for (const row of rows) {
		const existing = byBusiness.get(row.business_id);
		if (!existing) {
			byBusiness.set(row.business_id, row);
			continue;
		}
		if (subscriptionRowTimestamp(row) >= subscriptionRowTimestamp(existing)) {
			byBusiness.set(row.business_id, row);
		}
	}
	return byBusiness;
}

export type BusinessSubscriptionStats = {
	active: number;
	pending: number;
	expired: number;
	other: number;
	noSubscription: number;
};

export type PlatformSubscriptionSummary = BusinessSubscriptionStats & {
	totalBusinesses: number;
	totalOwners: number;
};

/** Distinct owners among businesses (missing owner_id ignored). */
export function countUniqueOwners(businesses: BusinessOutput[]): number {
	const ids = new Set<string>();
	for (const b of businesses) {
		if (b.owner_id) ids.add(b.owner_id);
	}
	return ids.size;
}

/**
 * Count businesses by latest subscription status. `totalBusinesses` should be
 * the full business list length; `noSubscription` fills the gap for businesses
 * with no subscription transaction.
 *
 * These are business-level counts (not owners). An owner with 3 businesses can
 * contribute 3 to the totals.
 */
export function summarizeBusinessSubscriptionStats(
	rows: AdminSubscriptionOutput[],
	totalBusinesses: number,
): BusinessSubscriptionStats {
	const latest = latestSubscriptionByBusiness(rows);
	let active = 0;
	let pending = 0;
	let expired = 0;
	let other = 0;

	for (const row of latest.values()) {
		const s = row.status.toLowerCase();
		if (s === "active") active++;
		else if (s === "pending") pending++;
		else if (s === "expired") expired++;
		else other++;
	}

	const withSubscription = latest.size;
	const noSubscription = Math.max(0, totalBusinesses - withSubscription);

	return { active, pending, expired, other, noSubscription };
}

export function summarizePlatformSubscription(
	businesses: BusinessOutput[],
	subscriptionRows: AdminSubscriptionOutput[],
): PlatformSubscriptionSummary {
	const totalBusinesses = businesses.length;
	const stats = summarizeBusinessSubscriptionStats(
		subscriptionRows,
		totalBusinesses,
	);
	return {
		...stats,
		totalBusinesses,
		totalOwners: countUniqueOwners(businesses),
	};
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
