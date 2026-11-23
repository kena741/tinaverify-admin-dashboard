"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	ArrowUpDownIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	XIcon,
} from "lucide-react";

import { AdminCreateBusinessDialog } from "@/components/admin/admin-create-business-dialog";
import { AdminCreateUserDialog } from "@/components/admin/admin-create-user-dialog";
import { useListBusinessesQuery } from "@/services/branch-management/branchManagementApi";
import { useListSubscriptionPlansQuery } from "@/services/subscription-plan/subscriptionPlanApi";
import type { BusinessOutput } from "@/services/types";
import {
	getSubscriptionStatusFilterLabel,
	getSubscriptionStatusLabel,
	getSubscriptionTypeFilterLabel,
	PLAN_FILTER_ALL,
	type BusinessActiveFilter,
	type SubscriptionStatusFilter,
	type SubscriptionTypeFilter,
} from "@/lib/subscription-filters";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type SortKey = "business" | "owner" | "plan" | "status" | "credits" | "date";
type SortDir = "asc" | "desc";

const STATUS_SORT_RANK: Record<string, number> = {
	active: 5,
	pending: 4,
	insufficient_credits: 3,
	expired: 2,
	cancelled: 1,
};

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const TYPE_FILTER_ALL = "all" as const;
const ACTIVE_FILTER_ALL = "all" as const;

function isStatusFilter(v: string): v is SubscriptionStatusFilter {
	return (
		v === "all" ||
		v === "pending" ||
		v === "active" ||
		v === "expired" ||
		v === "cancelled" ||
		v === "insufficient_credits"
	);
}

function isTypeFilter(v: string): v is SubscriptionTypeFilter {
	return (
		v === "all" ||
		v === "standard" ||
		v === "free" ||
		v === "custom" ||
		v === "none"
	);
}

function isActiveFilter(v: string): v is BusinessActiveFilter {
	return v === "all" || v === "true" || v === "false";
}

function isPageSize(v: number): v is PageSize {
	return (PAGE_SIZE_OPTIONS as readonly number[]).includes(v);
}

function paramOrEmpty(v: string | null): string {
	return v?.trim() ?? "";
}

function parseOptionalNumber(raw: string): number | undefined {
	const t = raw.trim();
	if (!t) return undefined;
	const n = Number(t);
	return Number.isFinite(n) ? n : undefined;
}

function parseOptionalInt(raw: string): number | undefined {
	const n = parseOptionalNumber(raw);
	return n == null ? undefined : Math.trunc(n);
}

function isNumRangeInvalid(minRaw: string, maxRaw: string): boolean {
	const min = parseOptionalNumber(minRaw);
	const max = parseOptionalNumber(maxRaw);
	return min != null && max != null && min > max;
}

function isDateRangeInvalid(from: string, to: string): boolean {
	return Boolean(from && to && from > to);
}

function formatCreatedAt(iso: string | null | undefined): string {
	if (!iso) return "—";
	try {
		return format(new Date(iso), "MMM d, yyyy");
	} catch {
		return iso;
	}
}

function statusBadgeVariant(
	status: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
	const s = (status ?? "").toLowerCase();
	if (s === "active") return "default";
	if (s === "pending" || s === "upgraded" || s === "insufficient_credits")
		return "secondary";
	if (s === "expired" || s === "cancelled") return "destructive";
	return "outline";
}

function rowDateIso(row: BusinessOutput): string | null {
	return row.subscription_started_at ?? row.created_at ?? null;
}

function rowDateTimestamp(row: BusinessOutput): number {
	const iso = rowDateIso(row);
	if (!iso) return 0;
	const t = new Date(iso).getTime();
	return Number.isNaN(t) ? 0 : t;
}

function remainingCreditsSortValue(row: BusinessOutput): number {
	if (row.is_unlimited) return Number.POSITIVE_INFINITY;
	if (row.remaining_credits == null) return -1;
	return row.remaining_credits;
}

function compareBusinessRows(
	a: BusinessOutput,
	b: BusinessOutput,
	sortKey: SortKey,
	sortDir: SortDir,
): number {
	const dir = sortDir === "asc" ? 1 : -1;
	let cmp = 0;
	switch (sortKey) {
		case "business":
			cmp = (a.name || "").localeCompare(b.name || "");
			break;
		case "owner":
			cmp = (a.owner_name || "").localeCompare(b.owner_name || "");
			break;
		case "plan":
			cmp = (a.plan_name || "").localeCompare(b.plan_name || "");
			break;
		case "status":
			cmp =
				(STATUS_SORT_RANK[(a.subscription_status ?? "").toLowerCase()] ??
					-1) -
				(STATUS_SORT_RANK[(b.subscription_status ?? "").toLowerCase()] ??
					-1);
			break;
		case "credits":
			cmp = remainingCreditsSortValue(a) - remainingCreditsSortValue(b);
			break;
		case "date":
			cmp = rowDateTimestamp(a) - rowDateTimestamp(b);
			break;
		default:
			cmp = 0;
	}
	if (cmp !== 0) return cmp * dir;
	return (a.name || a.id).localeCompare(b.name || b.id);
}

function getErrorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"data" in error &&
		(error as { data?: { detail?: unknown } }).data?.detail
	) {
		const detail = (error as { data: { detail: unknown } }).data.detail;
		if (typeof detail === "string") return detail;
		if (Array.isArray(detail)) {
			const messages = detail
				.map((item) =>
					typeof item === "object" &&
					item !== null &&
					"msg" in item &&
					typeof item.msg === "string"
						? item.msg
						: null,
				)
				.filter(Boolean);
			if (messages.length > 0) return messages.join(", ");
		}
	}
	if (error instanceof Error) return error.message;
	return fallback;
}

function summarizePageStatuses(items: BusinessOutput[]) {
	let active = 0;
	let pending = 0;
	let expired = 0;
	let none = 0;
	let other = 0;
	for (const b of items) {
		const s = b.subscription_status?.toLowerCase();
		if (!s) none += 1;
		else if (s === "active") active += 1;
		else if (s === "pending") pending += 1;
		else if (s === "expired") expired += 1;
		else other += 1;
	}
	return { active, pending, expired, none, other };
}

export default function OwnersPage() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [ownerName, setOwnerName] = useState(() =>
		paramOrEmpty(searchParams.get("owner_name")),
	);
	const [businessName, setBusinessName] = useState(() =>
		paramOrEmpty(searchParams.get("business_name")),
	);
	const [phone, setPhone] = useState(() =>
		paramOrEmpty(searchParams.get("phone")),
	);
	const [planId, setPlanId] = useState(() => {
		const v = paramOrEmpty(searchParams.get("plan_id"));
		return v || PLAN_FILTER_ALL;
	});
	const [statusFilter, setStatusFilter] = useState<SubscriptionStatusFilter>(
		() => {
			const v = paramOrEmpty(searchParams.get("subscription_status"));
			return v && isStatusFilter(v) ? v : "all";
		},
	);
	const [typeFilter, setTypeFilter] = useState<SubscriptionTypeFilter>(() => {
		const v = paramOrEmpty(searchParams.get("subscription_type"));
		return v && isTypeFilter(v) ? v : TYPE_FILTER_ALL;
	});
	const [activeFilter, setActiveFilter] = useState<BusinessActiveFilter>(
		() => {
			const v = paramOrEmpty(searchParams.get("is_active"));
			return v && isActiveFilter(v) ? v : ACTIVE_FILTER_ALL;
		},
	);
	const [dateFrom, setDateFrom] = useState(() =>
		paramOrEmpty(searchParams.get("from_date")),
	);
	const [dateTo, setDateTo] = useState(() =>
		paramOrEmpty(searchParams.get("to_date")),
	);
	const [minAmount, setMinAmount] = useState(() =>
		paramOrEmpty(searchParams.get("min_amount")),
	);
	const [maxAmount, setMaxAmount] = useState(() =>
		paramOrEmpty(searchParams.get("max_amount")),
	);
	const [minCredits, setMinCredits] = useState(() =>
		paramOrEmpty(searchParams.get("min_credits")),
	);
	const [maxCredits, setMaxCredits] = useState(() =>
		paramOrEmpty(searchParams.get("max_credits")),
	);
	const [page, setPage] = useState(() => {
		const raw = Number(searchParams.get("page") ?? "1");
		return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
	});
	const [pageSize, setPageSize] = useState<PageSize>(() => {
		const raw = Number(searchParams.get("limit") ?? "20");
		return isPageSize(raw) ? raw : 20;
	});
	const [sortKey, setSortKey] = useState<SortKey>("date");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [createUserOpen, setCreateUserOpen] = useState(false);
	const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
	const [moreFiltersOpen, setMoreFiltersOpen] = useState(() =>
		Boolean(
			paramOrEmpty(searchParams.get("min_amount")) ||
				paramOrEmpty(searchParams.get("max_amount")) ||
				paramOrEmpty(searchParams.get("min_credits")) ||
				paramOrEmpty(searchParams.get("max_credits")) ||
				paramOrEmpty(searchParams.get("from_date")) ||
				paramOrEmpty(searchParams.get("to_date")) ||
				paramOrEmpty(searchParams.get("is_active")) ||
				paramOrEmpty(searchParams.get("subscription_type")),
		),
	);
	const ownerInputRef = useRef<HTMLInputElement>(null);

	const deferredOwnerName = useDeferredValue(ownerName);
	const deferredBusinessName = useDeferredValue(businessName);
	const deferredPhone = useDeferredValue(phone);

	const filterResetKey = useMemo(
		() =>
			[
				deferredOwnerName,
				deferredBusinessName,
				deferredPhone,
				planId,
				statusFilter,
				typeFilter,
				activeFilter,
				dateFrom,
				dateTo,
				minAmount,
				maxAmount,
				minCredits,
				maxCredits,
				pageSize,
			].join("\0"),
		[
			deferredOwnerName,
			deferredBusinessName,
			deferredPhone,
			planId,
			statusFilter,
			typeFilter,
			activeFilter,
			dateFrom,
			dateTo,
			minAmount,
			maxAmount,
			minCredits,
			maxCredits,
			pageSize,
		],
	);
	const [prevFilterResetKey, setPrevFilterResetKey] = useState(filterResetKey);
	if (prevFilterResetKey !== filterResetKey) {
		setPrevFilterResetKey(filterResetKey);
		setPage(1);
	}

	const filtersPending =
		ownerName.trim() !== deferredOwnerName.trim() ||
		businessName.trim() !== deferredBusinessName.trim() ||
		phone.trim() !== deferredPhone.trim();

	const businessOffset = (page - 1) * pageSize;
	const apiPlanId = planId === PLAN_FILTER_ALL ? undefined : planId;
	const apiStatus =
		statusFilter === "all" ? undefined : statusFilter;
	const apiType = typeFilter === TYPE_FILTER_ALL ? undefined : typeFilter;
	const apiActive =
		activeFilter === ACTIVE_FILTER_ALL
			? undefined
			: activeFilter === "true";
	const amountRangeInvalid = isNumRangeInvalid(minAmount, maxAmount);
	const creditsRangeInvalid = isNumRangeInvalid(minCredits, maxCredits);
	const dateRangeInvalid = isDateRangeInvalid(dateFrom, dateTo);
	const parsedMinAmount = amountRangeInvalid
		? undefined
		: parseOptionalNumber(minAmount);
	const parsedMaxAmount = amountRangeInvalid
		? undefined
		: parseOptionalNumber(maxAmount);
	const parsedMinCredits = creditsRangeInvalid
		? undefined
		: parseOptionalInt(minCredits);
	const parsedMaxCredits = creditsRangeInvalid
		? undefined
		: parseOptionalInt(maxCredits);
	const apiFromDate = dateRangeInvalid ? undefined : dateFrom || undefined;
	const apiToDate = dateRangeInvalid ? undefined : dateTo || undefined;

	const {
		data: businessPage,
		isLoading: businessesLoading,
		isFetching: businessesFetching,
		error,
		refetch,
	} = useListBusinessesQuery({
		offset: businessOffset,
		limit: pageSize,
		owner_name: deferredOwnerName.trim() || undefined,
		business_name: deferredBusinessName.trim() || undefined,
		phone: deferredPhone.trim() || undefined,
		plan_id: apiPlanId,
		subscription_status: apiStatus,
		subscription_type: apiType,
		is_active: apiActive,
		min_amount: parsedMinAmount,
		max_amount: parsedMaxAmount,
		min_credits: parsedMinCredits,
		max_credits: parsedMaxCredits,
		from_date: apiFromDate,
		to_date: apiToDate,
	});

	const businesses = businessPage?.items ?? [];
	const businessTotal = businessPage?.total_count ?? 0;
	const { data: plans } = useListSubscriptionPlansQuery();

	useEffect(() => {
		const params = new URLSearchParams();
		const o = deferredOwnerName.trim();
		const b = deferredBusinessName.trim();
		const p = deferredPhone.trim();
		if (o) params.set("owner_name", o);
		if (b) params.set("business_name", b);
		if (p) params.set("phone", p);
		if (apiPlanId) params.set("plan_id", apiPlanId);
		if (apiStatus) params.set("subscription_status", apiStatus);
		if (apiType) params.set("subscription_type", apiType);
		if (activeFilter !== ACTIVE_FILTER_ALL) {
			params.set("is_active", activeFilter);
		}
		if (parsedMinAmount != null) params.set("min_amount", String(parsedMinAmount));
		if (parsedMaxAmount != null) params.set("max_amount", String(parsedMaxAmount));
		if (parsedMinCredits != null) {
			params.set("min_credits", String(parsedMinCredits));
		}
		if (parsedMaxCredits != null) {
			params.set("max_credits", String(parsedMaxCredits));
		}
		if (apiFromDate) params.set("from_date", apiFromDate);
		if (apiToDate) params.set("to_date", apiToDate);
		if (pageSize !== 20) params.set("limit", String(pageSize));
		if (page > 1) params.set("page", String(page));
		const qs = params.toString();
		const next = qs ? `${pathname}?${qs}` : pathname;
		const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
		if (next !== current) router.replace(next, { scroll: false });
	}, [
		deferredOwnerName,
		deferredBusinessName,
		deferredPhone,
		apiPlanId,
		apiStatus,
		apiType,
		activeFilter,
		parsedMinAmount,
		parsedMaxAmount,
		parsedMinCredits,
		parsedMaxCredits,
		apiFromDate,
		apiToDate,
		page,
		pageSize,
		pathname,
		router,
		searchParams,
	]);

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT" ||
					target.isContentEditable)
			) {
				return;
			}
			e.preventDefault();
			ownerInputRef.current?.focus();
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const pageRows = useMemo(
		() =>
			businesses.toSorted((a, b) =>
				compareBusinessRows(a, b, sortKey, sortDir),
			),
		[businesses, sortKey, sortDir],
	);

	const totalPages = Math.max(1, Math.ceil(businessTotal / pageSize) || 1);
	const currentPage = Math.min(page, totalPages);
	if (page !== currentPage) setPage(currentPage);
	const rangeStart = businessTotal === 0 ? 0 : businessOffset + 1;
	const rangeEnd = Math.min(businessOffset + pageSize, businessTotal);

	const advancedFiltersActive =
		dateFrom !== "" ||
		dateTo !== "" ||
		minAmount.trim() !== "" ||
		maxAmount.trim() !== "" ||
		minCredits.trim() !== "" ||
		maxCredits.trim() !== "" ||
		typeFilter !== TYPE_FILTER_ALL ||
		activeFilter !== ACTIVE_FILTER_ALL;

	const filtersActive =
		ownerName.trim() !== "" ||
		businessName.trim() !== "" ||
		phone.trim() !== "" ||
		planId !== PLAN_FILTER_ALL ||
		statusFilter !== "all" ||
		advancedFiltersActive;

	const advancedFilterCount = [
		minAmount,
		maxAmount,
		minCredits,
		maxCredits,
		dateFrom,
		dateTo,
		typeFilter !== TYPE_FILTER_ALL ? "1" : "",
		activeFilter !== ACTIVE_FILTER_ALL ? "1" : "",
	].filter((v) => v.trim() !== "").length;

	useEffect(() => {
		if (advancedFiltersActive) setMoreFiltersOpen(true);
	}, [advancedFiltersActive]);

	function clearFilters() {
		setOwnerName("");
		setBusinessName("");
		setPhone("");
		setPlanId(PLAN_FILTER_ALL);
		setStatusFilter("all");
		setTypeFilter(TYPE_FILTER_ALL);
		setActiveFilter(ACTIVE_FILTER_ALL);
		setDateFrom("");
		setDateTo("");
		setMinAmount("");
		setMaxAmount("");
		setMinCredits("");
		setMaxCredits("");
		setMoreFiltersOpen(false);
		setPage(1);
	}

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir(
				key === "business" || key === "owner" || key === "plan" || key === "status"
					? "asc"
					: "desc",
			);
		}
	}

	const pageStats = useMemo(
		() => summarizePageStatuses(businesses),
		[businesses],
	);

	const listBusy = businessesLoading && !businessPage;
	const planLabel =
		planId === PLAN_FILTER_ALL
			? "All plans"
			: (plans?.find((p) => p.id === planId)?.name ?? "All plans");

	const activeChips: { key: string; label: string; clear: () => void }[] = [];
	if (ownerName.trim()) {
		activeChips.push({
			key: "owner_name",
			label: `Owner: ${ownerName.trim()}`,
			clear: () => setOwnerName(""),
		});
	}
	if (businessName.trim()) {
		activeChips.push({
			key: "business_name",
			label: `Business: ${businessName.trim()}`,
			clear: () => setBusinessName(""),
		});
	}
	if (phone.trim()) {
		activeChips.push({
			key: "phone",
			label: `Phone: ${phone.trim()}`,
			clear: () => setPhone(""),
		});
	}
	if (statusFilter !== "all") {
		activeChips.push({
			key: "status",
			label: getSubscriptionStatusFilterLabel(statusFilter),
			clear: () => setStatusFilter("all"),
		});
	}
	if (typeFilter !== TYPE_FILTER_ALL) {
		activeChips.push({
			key: "type",
			label: getSubscriptionTypeFilterLabel(typeFilter),
			clear: () => setTypeFilter(TYPE_FILTER_ALL),
		});
	}
	if (planId !== PLAN_FILTER_ALL) {
		activeChips.push({
			key: "plan",
			label: planLabel,
			clear: () => setPlanId(PLAN_FILTER_ALL),
		});
	}
	if (activeFilter !== ACTIVE_FILTER_ALL) {
		activeChips.push({
			key: "is_active",
			label: activeFilter === "true" ? "Active accounts" : "Inactive accounts",
			clear: () => setActiveFilter(ACTIVE_FILTER_ALL),
		});
	}
	if (minAmount.trim() || maxAmount.trim()) {
		const min = minAmount.trim();
		const max = maxAmount.trim();
		activeChips.push({
			key: "amount",
			label:
				min && max
					? `Amount ${min}–${max}`
					: min
						? `Amount ≥ ${min}`
						: `Amount ≤ ${max}`,
			clear: () => {
				setMinAmount("");
				setMaxAmount("");
			},
		});
	}
	if (minCredits.trim() || maxCredits.trim()) {
		const min = minCredits.trim();
		const max = maxCredits.trim();
		activeChips.push({
			key: "credits",
			label:
				min && max
					? `Credits ${min}–${max}`
					: min
						? `Credits ≥ ${min}`
						: `Credits ≤ ${max}`,
			clear: () => {
				setMinCredits("");
				setMaxCredits("");
			},
		});
	}
	if (dateFrom || dateTo) {
		activeChips.push({
			key: "created",
			label:
				dateFrom && dateTo
					? `Created ${dateFrom}–${dateTo}`
					: dateFrom
						? `Created ≥ ${dateFrom}`
						: `Created ≤ ${dateTo}`,
			clear: () => {
				setDateFrom("");
				setDateTo("");
			},
		});
	}

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-8">
			<header className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">
						Businesses
					</h1>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setCreateUserOpen(true)}
						>
							Create user
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={() => setCreateBusinessOpen(true)}
						>
							Create business
						</Button>
					</div>
				</div>

				{listBusy ? (
					<Skeleton className="h-4 w-72" />
				) : businessPage ? (
					<p className="font-mono text-xs tabular-nums text-muted-foreground">
						{businessTotal.toLocaleString()}{" "}
						{filtersActive ? "matching" : ""} businesses
						{" · "}
						{pageStats.active.toLocaleString()} active ·{" "}
						{pageStats.pending.toLocaleString()} pending ·{" "}
						{pageStats.expired.toLocaleString()} expired ·{" "}
						{pageStats.none.toLocaleString()} none
						<span className="text-muted-foreground/70"> (page)</span>
					</p>
				) : null}

				<AdminCreateUserDialog
					open={createUserOpen}
					onOpenChange={setCreateUserOpen}
				/>
				<AdminCreateBusinessDialog
					open={createBusinessOpen}
					onOpenChange={setCreateBusinessOpen}
				/>

				{error ? (
					<Alert variant="destructive">
						<AlertTitle>Can’t load businesses</AlertTitle>
						<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<span>{getErrorMessage(error, "Request failed.")}</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => void refetch()}
							>
								Try again
							</Button>
						</AlertDescription>
					</Alert>
				) : null}
			</header>

			<section aria-label="Business list" className="flex flex-col gap-3">
				<Card size="sm">
					<CardContent className="flex flex-col gap-3 pt-4">
						<div
							className="flex flex-col gap-3"
							aria-busy={filtersPending || businessesFetching}
						>
							<div className="flex flex-col gap-2 lg:flex-row lg:items-center">
								<div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
									<Input
										ref={ownerInputRef}
										id="biz-filter-owner-name"
										name="owner_name"
										type="search"
										autoComplete="off"
										spellCheck={false}
										placeholder="Owner…  /"
										aria-label="Filter by owner name"
										value={ownerName}
										onChange={(e) => setOwnerName(e.target.value)}
										className={cn("h-9", filtersPending && "opacity-80")}
									/>
									<Input
										id="biz-filter-phone"
										name="phone"
										type="tel"
										inputMode="tel"
										autoComplete="off"
										spellCheck={false}
										placeholder="Phone…"
										aria-label="Filter by phone"
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										className={cn("h-9", filtersPending && "opacity-80")}
									/>
									<Input
										id="biz-filter-business-name"
										name="business_name"
										type="search"
										autoComplete="off"
										spellCheck={false}
										placeholder="Business…"
										aria-label="Filter by business name"
										value={businessName}
										onChange={(e) => setBusinessName(e.target.value)}
										className={cn("h-9", filtersPending && "opacity-80")}
									/>
								</div>
								<div className="flex flex-wrap items-center gap-2 lg:shrink-0">
									<Select
										value={statusFilter}
										onValueChange={(v) => {
											if (v != null && isStatusFilter(v)) setStatusFilter(v);
										}}
									>
										<SelectTrigger
											aria-label="Subscription status"
											className="h-9 w-full min-w-36 sm:w-40"
										>
											<span className="flex flex-1 truncate text-left text-sm">
												{getSubscriptionStatusFilterLabel(statusFilter)}
											</span>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value="all">All statuses</SelectItem>
												<SelectItem value="active">Active</SelectItem>
												<SelectItem value="pending">Pending</SelectItem>
												<SelectItem value="expired">Expired</SelectItem>
												<SelectItem value="insufficient_credits">
													Insufficient credits
												</SelectItem>
												<SelectItem value="cancelled">Cancelled</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
									<Select
										value={planId}
										onValueChange={(v) => {
											if (v != null && v !== "") setPlanId(v);
										}}
									>
										<SelectTrigger
											aria-label="Plan"
											className="h-9 w-full min-w-32 sm:w-40"
										>
											<span className="flex flex-1 truncate text-left text-sm">
												{planLabel}
											</span>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value={PLAN_FILTER_ALL}>
													All plans
												</SelectItem>
												{(plans ?? [])
													.filter((p) => !p.is_archived)
													.map((p) => (
														<SelectItem key={p.id} value={p.id}>
															{p.name}
														</SelectItem>
													))}
											</SelectGroup>
										</SelectContent>
									</Select>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-9 gap-1.5"
										aria-expanded={moreFiltersOpen}
										aria-controls="biz-advanced-filters"
										onClick={() => setMoreFiltersOpen((open) => !open)}
									>
										Filters
										{advancedFilterCount > 0 ? (
											<span className="rounded-md bg-foreground px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-background">
												{advancedFilterCount}
											</span>
										) : (
											<ChevronDownIcon
												className={cn(
													"size-3.5 opacity-60 transition-transform duration-150 motion-reduce:transition-none",
													moreFiltersOpen && "rotate-180",
												)}
												aria-hidden
											/>
										)}
									</Button>
									{filtersActive ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-9"
											onClick={clearFilters}
										>
											Clear
										</Button>
									) : null}
									{filtersPending || businessesFetching ? (
										<span
											className="text-[11px] text-muted-foreground"
											aria-live="polite"
										>
											Updating…
										</span>
									) : null}
								</div>
							</div>

							{moreFiltersOpen ? (
								<div
									id="biz-advanced-filters"
									className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-3"
								>
									<FieldSelect
										label="Type"
										value={typeFilter}
										onChange={(v) => {
											if (isTypeFilter(v)) setTypeFilter(v);
										}}
										options={[
											{ value: "all", label: "All types" },
											{ value: "standard", label: "Standard" },
											{ value: "free", label: "Free" },
											{ value: "custom", label: "Custom" },
											{ value: "none", label: "No subscription" },
										]}
									/>
									<FieldSelect
										label="Account"
										value={activeFilter}
										onChange={(v) => {
											if (isActiveFilter(v)) setActiveFilter(v);
										}}
										options={[
											{ value: "all", label: "Any status" },
											{ value: "true", label: "Active" },
											{ value: "false", label: "Inactive" },
										]}
									/>
									<FilterRange
										label="Amount"
										minId="biz-filter-min-amount"
										maxId="biz-filter-max-amount"
										minName="min_amount"
										maxName="max_amount"
										minValue={minAmount}
										maxValue={maxAmount}
										onMinChange={setMinAmount}
										onMaxChange={setMaxAmount}
										inputMode="decimal"
										step="any"
										invalid={amountRangeInvalid}
									/>
									<FilterRange
										label="Credits"
										minId="biz-filter-min-credits"
										maxId="biz-filter-max-credits"
										minName="min_credits"
										maxName="max_credits"
										minValue={minCredits}
										maxValue={maxCredits}
										onMinChange={setMinCredits}
										onMaxChange={setMaxCredits}
										inputMode="numeric"
										step={1}
										invalid={creditsRangeInvalid}
									/>
									<FilterRange
										label="Created"
										minId="biz-filter-from"
										maxId="biz-filter-to"
										minName="from_date"
										maxName="to_date"
										minValue={dateFrom}
										maxValue={dateTo}
										onMinChange={setDateFrom}
										onMaxChange={setDateTo}
										type="date"
										minPlaceholder="From"
										maxPlaceholder="To"
										invalid={dateRangeInvalid}
									/>
								</div>
							) : null}

							{activeChips.length > 0 ? (
								<ul
									className="flex flex-wrap gap-1.5"
									aria-label="Active filters"
								>
									{activeChips.map((chip) => (
										<li key={chip.key}>
											<button
												type="button"
												onClick={chip.clear}
												className="inline-flex h-7 max-w-full items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												aria-label={`Remove filter ${chip.label}`}
											>
												<span className="min-w-0 truncate">{chip.label}</span>
												<XIcon
													className="size-3 shrink-0 opacity-50"
													aria-hidden
												/>
											</button>
										</li>
									))}
								</ul>
							) : null}
						</div>

						{listBusy ? (
							<div className="flex flex-col gap-2">
								{Array.from({ length: 6 }).map((_, i) => (
									<Skeleton key={i} className="h-12 w-full" />
								))}
							</div>
						) : pageRows.length === 0 ? (
							<div className="flex flex-col items-start gap-1 py-10">
								<p className="text-sm font-medium text-foreground">
									No businesses match
								</p>
								<p className="max-w-md text-pretty text-sm text-muted-foreground">
									{filtersActive
										? "Widen filters or clear them."
										: "No businesses yet."}
								</p>
								{filtersActive ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="mt-3"
										onClick={clearFilters}
									>
										Clear filters
									</Button>
								) : null}
							</div>
						) : (
							<div className="overflow-x-auto rounded-xl border border-border overscroll-x-contain">
								<Table>
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<SortableHead
												label="Business"
												column="business"
												sortKey={sortKey}
												sortDir={sortDir}
												onSort={toggleSort}
											/>
											<SortableHead
												label="Owner name"
												column="owner"
												sortKey={sortKey}
												sortDir={sortDir}
												onSort={toggleSort}
											/>
											<TableHead>Phone</TableHead>
											<SortableHead
												label="Subscription status"
												column="status"
												sortKey={sortKey}
												sortDir={sortDir}
												onSort={toggleSort}
											/>
											<SortableHead
												label="Plan"
												column="plan"
												sortKey={sortKey}
												sortDir={sortDir}
												onSort={toggleSort}
											/>
											<SortableHead
												label="Remaining credit"
												column="credits"
												sortKey={sortKey}
												sortDir={sortDir}
												onSort={toggleSort}
												align="right"
											/>
											<SortableHead
												label="Date"
												column="date"
												sortKey={sortKey}
												sortDir={sortDir}
												onSort={toggleSort}
											/>
											<TableHead className="w-8">
												<span className="sr-only">Open</span>
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{pageRows.map((row) => (
											<BusinessRow
												key={row.id}
												row={row}
												href={`/admin/business/${row.id}`}
											/>
										))}
									</TableBody>
								</Table>
							</div>
						)}

						{!listBusy && businessTotal > 0 ? (
							<div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
								<p className="font-mono text-xs tabular-nums text-muted-foreground">
									{rangeStart}–{rangeEnd} of {businessTotal.toLocaleString()}
								</p>
								<div className="flex flex-wrap items-center gap-2">
									<label
										htmlFor="biz-page-size"
										className="text-[11px] text-muted-foreground"
									>
										Per page
									</label>
									<Select
										value={String(pageSize)}
										onValueChange={(v) => {
											const next = Number(v);
											if (isPageSize(next)) {
												setPageSize(next);
												setPage(1);
											}
										}}
									>
										<SelectTrigger
											id="biz-page-size"
											className="h-8 w-18"
											size="sm"
										>
											<span>{pageSize}</span>
										</SelectTrigger>
										<SelectContent>
											{PAGE_SIZE_OPTIONS.map((n) => (
												<SelectItem key={n} value={String(n)}>
													{n}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={currentPage <= 1 || businessesFetching}
										onClick={() => setPage(Math.max(1, currentPage - 1))}
									>
										Previous
									</Button>
									<span className="font-mono text-xs tabular-nums text-muted-foreground">
										{currentPage}/{totalPages}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={
											currentPage >= totalPages || businessesFetching
										}
										onClick={() =>
											setPage(Math.min(totalPages, currentPage + 1))
										}
									>
										Next
									</Button>
								</div>
							</div>
						) : null}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}

function formatRemainingCredits(row: BusinessOutput): string {
	if (row.is_unlimited) return "Unlimited";
	if (row.remaining_credits == null) return "—";
	return row.remaining_credits.toLocaleString();
}

function BusinessRow({
	row,
	href,
}: {
	row: BusinessOutput;
	href: string;
}) {
	const router = useRouter();
	const ownerLabel = row.owner_name?.trim() || "Unknown owner";
	const status = row.subscription_status;

	return (
		<TableRow
			className="cursor-pointer motion-safe:transition-colors duration-150 hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			onClick={() => router.push(href)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					router.push(href);
				}
			}}
			tabIndex={0}
			role="link"
			aria-label={`Open ${row.name || "business"}`}
		>
			<TableCell>
				<span className="font-medium text-foreground">
					{row.name || "Untitled"}
				</span>
			</TableCell>
			<TableCell className="text-sm text-foreground">{ownerLabel}</TableCell>
			<TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
				{row.owner_phone?.trim() || "—"}
			</TableCell>
			<TableCell>
				{status ? (
					<Badge variant={statusBadgeVariant(status)}>
						{getSubscriptionStatusLabel(status)}
					</Badge>
				) : (
					<span className="text-sm text-muted-foreground">—</span>
				)}
			</TableCell>
			<TableCell className="text-sm text-muted-foreground">
				{row.plan_name?.trim() || "—"}
			</TableCell>
			<TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
				{formatRemainingCredits(row)}
			</TableCell>
			<TableCell className="whitespace-nowrap font-mono text-sm tabular-nums text-muted-foreground">
				{formatCreatedAt(rowDateIso(row))}
			</TableCell>
			<TableCell className="w-8 pr-3">
				<Link
					href={href}
					className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground/70 transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label={`Open ${row.name || "business"}`}
					onClick={(e) => e.stopPropagation()}
				>
					<ChevronRightIcon className="size-4" aria-hidden />
				</Link>
			</TableCell>
		</TableRow>
	);
}

function FieldSelect({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
}) {
	const selected = options.find((o) => o.value === value)?.label ?? value;
	return (
		<div className="flex flex-col gap-1.5">
			<p className="text-[11px] font-medium text-muted-foreground">{label}</p>
			<Select
				value={value}
				onValueChange={(v) => {
					if (v != null) onChange(v);
				}}
			>
				<SelectTrigger className="h-9 w-full" aria-label={label}>
					<span className="flex flex-1 truncate text-left text-sm">
						{selected}
					</span>
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{options.map((o) => (
							<SelectItem key={o.value} value={o.value}>
								{o.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}

function FilterRange({
	label,
	minId,
	maxId,
	minName,
	maxName,
	minValue,
	maxValue,
	onMinChange,
	onMaxChange,
	type = "number",
	inputMode,
	step,
	minPlaceholder = "Min",
	maxPlaceholder = "Max",
	invalid = false,
}: {
	label: string;
	minId: string;
	maxId: string;
	minName: string;
	maxName: string;
	minValue: string;
	maxValue: string;
	onMinChange: (value: string) => void;
	onMaxChange: (value: string) => void;
	type?: "number" | "date";
	inputMode?: "decimal" | "numeric";
	step?: number | "any";
	minPlaceholder?: string;
	maxPlaceholder?: string;
	invalid?: boolean;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<p className="text-[11px] font-medium text-muted-foreground">{label}</p>
			<div className="flex items-center gap-2">
				<Input
					id={minId}
					name={minName}
					type={type}
					inputMode={type === "number" ? inputMode : undefined}
					min={type === "number" ? 0 : undefined}
					max={type === "date" && maxValue ? maxValue : undefined}
					step={type === "number" ? step : undefined}
					placeholder={type === "number" ? `${minPlaceholder}…` : undefined}
					aria-label={`${label} ${minPlaceholder.toLowerCase()}`}
					aria-invalid={invalid || undefined}
					value={minValue}
					onChange={(e) => onMinChange(e.target.value)}
					className={cn(
						"h-9 min-w-0 flex-1",
						invalid && "border-destructive focus-visible:ring-destructive",
					)}
				/>
				<span className="shrink-0 text-xs text-muted-foreground" aria-hidden>
					–
				</span>
				<Input
					id={maxId}
					name={maxName}
					type={type}
					inputMode={type === "number" ? inputMode : undefined}
					min={
						type === "number"
							? 0
							: type === "date" && minValue
								? minValue
								: undefined
					}
					step={type === "number" ? step : undefined}
					placeholder={type === "number" ? `${maxPlaceholder}…` : undefined}
					aria-label={`${label} ${maxPlaceholder.toLowerCase()}`}
					aria-invalid={invalid || undefined}
					value={maxValue}
					onChange={(e) => onMaxChange(e.target.value)}
					className={cn(
						"h-9 min-w-0 flex-1",
						invalid && "border-destructive focus-visible:ring-destructive",
					)}
				/>
			</div>
			{invalid ? (
				<p className="text-[11px] text-destructive" role="alert">
					Min can’t be greater than max
				</p>
			) : null}
		</div>
	);
}

function SortableHead({
	label,
	column,
	sortKey,
	sortDir,
	onSort,
	align = "left",
}: {
	label: string;
	column: SortKey;
	sortKey: SortKey;
	sortDir: SortDir;
	onSort: (key: SortKey) => void;
	align?: "left" | "right";
}) {
	const active = sortKey === column;
	const Icon = !active
		? ArrowUpDownIcon
		: sortDir === "asc"
			? ArrowUpIcon
			: ArrowDownIcon;

	return (
		<TableHead className={align === "right" ? "text-right" : undefined}>
			<button
				type="button"
				className={cn(
					"inline-flex items-center gap-1 rounded-sm font-medium transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					align === "right" && "w-full justify-end",
					active ? "text-foreground" : "text-muted-foreground",
				)}
				onClick={() => onSort(column)}
				aria-label={`Sort by ${label}${active ? `, ${sortDir}ending` : ""}`}
			>
				{label}
				<Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
			</button>
		</TableHead>
	);
}
