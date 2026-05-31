import type { BranchOutput } from "@/services/types";

/** Internal value for "all branches" — never shown in the UI. */
export const BRANCH_FILTER_ALL = "all";

export function getBranchFilterLabel(
	branchId: string,
	branches: BranchOutput[] | undefined,
): string {
	if (branchId === BRANCH_FILTER_ALL) return "All branches";
	const branch = branches?.find((b) => b.id === branchId);
	if (!branch) return "All branches";
	return branch.is_head_quarter ? `${branch.name} (HQ)` : branch.name;
}

export function getBusinessFilterLabel(
	businessId: string,
	businesses: { id: string; name: string }[] | undefined,
): string {
	if (businessId === "all") return "All businesses";
	return businesses?.find((b) => b.id === businessId)?.name ?? "All businesses";
}

export const DATE_RANGE_LABELS = {
	today: "Today",
	last_7_days: "Last 7 days",
	last_30_days: "Last 30 days",
	this_month: "This month",
	custom: "Custom range",
} as const;

export type DateRangePresetKey = keyof typeof DATE_RANGE_LABELS;

export function getDateRangeLabel(preset: string): string {
	return DATE_RANGE_LABELS[preset as DateRangePresetKey] ?? preset;
}

export const STATUS_FILTER_LABELS: Record<string, string> = {
	all: "All statuses",
	verified: "Verified",
	failed: "Failed",
	pending: "Pending",
};

export function getStatusFilterLabel(status: string): string {
	return STATUS_FILTER_LABELS[status] ?? status;
}

export const BUSINESS_STATUS_LABELS: Record<string, string> = {
	all: "All statuses",
	active: "Active",
	inactive: "Inactive",
	archived: "Archived",
};

export function getBusinessStatusLabel(status: string): string {
	return BUSINESS_STATUS_LABELS[status] ?? status;
}
