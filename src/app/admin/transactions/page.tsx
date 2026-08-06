"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	ArrowUpDownIcon,
	Building2Icon,
	CheckCircle2Icon,
	ClockIcon,
	MinusCircleIcon,
	UsersIcon,
	XCircleIcon,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { useLazyGetUserByIdQuery } from "@/services/auth/authApi";
import { useListAllBusinessesQuery } from "@/services/branch-management/branchManagementApi";
import { useListAdminSubscriptionTransactionsQuery } from "@/services/subscription/subscriptionApi";
import { useListSubscriptionPlansQuery } from "@/services/subscription-plan/subscriptionPlanApi";
import type {
	AdminSubscriptionOutput,
	BusinessOutput,
	UserOutput,
} from "@/services/types";
import {
	buildLatestBusinessSubscriptionRows,
	buildUnsubscribedBusinessRows,
	collapseSubscriptionRowsByOwner,
	getSubscriptionPlanLabel,
	getSubscriptionStatusFilterLabel,
	getSubscriptionStatusLabel,
	PLAN_FILTER_ALL,
	summarizePlatformSubscription,
	subscriptionRowTimestamp,
	type PlatformSubscriptionSummary,
	type SubscriptionStatusFilter,
} from "@/lib/subscription-filters";
import { formatUserDisplayName } from "@/lib/userDisplay";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
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

const OWNER_FETCH_CONCURRENCY = 3;

const BIZ_COUNT_FILTER_ALL = "all";
type BizCountFilter = typeof BIZ_COUNT_FILTER_ALL | "1" | "2" | "3+";

type SortKey =
	| "businesses"
	| "plan"
	| "status"
	| "amount"
	| "credits"
	| "date";
type SortDir = "asc" | "desc";

const STATUS_SORT_RANK: Record<string, number> = {
	active: 5,
	pending: 4,
	insufficient_credits: 3,
	expired: 2,
	cancelled: 1,
	unsubscribed: 0,
};

function isStatusFilter(v: string): v is SubscriptionStatusFilter {
	return (
		v === "all" ||
		v === "pending" ||
		v === "active" ||
		v === "expired" ||
		v === "cancelled" ||
		v === "insufficient_credits" ||
		v === "unsubscribed"
	);
}

function formatSubscriptionDate(iso: string | null | undefined): string {
	if (!iso) return "—";
	try {
		return format(new Date(iso), "MMM d, yyyy");
	} catch {
		return iso;
	}
}

function dayStartMs(yyyyMmDd: string): number {
	const t = new Date(`${yyyyMmDd}T00:00:00`).getTime();
	return Number.isNaN(t) ? 0 : t;
}

function dayEndMs(yyyyMmDd: string): number {
	const t = new Date(`${yyyyMmDd}T23:59:59.999`).getTime();
	return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function ownerBusinessCount(
	row: AdminSubscriptionOutput,
	ownerIdByBusinessId: Map<string, string>,
	businessesByOwnerId: Map<string, BusinessOutput[]>,
): number {
	const ownerId = ownerIdByBusinessId.get(row.business_id);
	if (!ownerId) return 0;
	return businessesByOwnerId.get(ownerId)?.length ?? 0;
}

function compareOwnerRows(
	a: AdminSubscriptionOutput,
	b: AdminSubscriptionOutput,
	sortKey: SortKey,
	sortDir: SortDir,
	ownerIdByBusinessId: Map<string, string>,
	businessesByOwnerId: Map<string, BusinessOutput[]>,
): number {
	const dir = sortDir === "asc" ? 1 : -1;
	let cmp = 0;
	switch (sortKey) {
		case "businesses":
			cmp =
				ownerBusinessCount(a, ownerIdByBusinessId, businessesByOwnerId) -
				ownerBusinessCount(b, ownerIdByBusinessId, businessesByOwnerId);
			break;
		case "plan":
			cmp = getSubscriptionPlanLabel(a.plan).localeCompare(
				getSubscriptionPlanLabel(b.plan),
			);
			break;
		case "status":
			cmp =
				(STATUS_SORT_RANK[a.status.toLowerCase()] ?? -1) -
				(STATUS_SORT_RANK[b.status.toLowerCase()] ?? -1);
			break;
		case "amount":
			cmp = (a.amount ?? -1) - (b.amount ?? -1);
			break;
		case "credits":
			cmp = a.credits_limit - b.credits_limit;
			break;
		case "date":
			cmp = subscriptionRowTimestamp(a) - subscriptionRowTimestamp(b);
			break;
		default:
			cmp = 0;
	}
	if (cmp !== 0) return cmp * dir;
	return (a.business?.name ?? a.business_id).localeCompare(
		b.business?.name ?? b.business_id,
	);
}

function usePageOwnerUsers(ownerIds: string[]) {
	const [trigger] = useLazyGetUserByIdQuery();
	const [usersById, setUsersById] = useState<
		Record<string, UserOutput | null>
	>({});
	const cacheRef = useRef(usersById);
	cacheRef.current = usersById;

	const orderedKey = ownerIds.join(",");

	useEffect(() => {
		const ids = orderedKey.length > 0 ? orderedKey.split(",") : [];
		if (ids.length === 0) return;
		let cancelled = false;

		const missing = ids.filter((id) => !(id in cacheRef.current));
		if (missing.length === 0) return;

		async function loadOne(id: string) {
			try {
				const user = await trigger({ userId: id }, true).unwrap();
				if (!cancelled) {
					setUsersById((prev) =>
						id in prev ? prev : { ...prev, [id]: user },
					);
				}
			} catch {
				if (cancelled) return;
				try {
					await new Promise((r) => window.setTimeout(r, 250));
					const user = await trigger({ userId: id }, false).unwrap();
					if (!cancelled) {
						setUsersById((prev) =>
							id in prev ? prev : { ...prev, [id]: user },
						);
					}
				} catch {
					if (!cancelled) {
						setUsersById((prev) =>
							id in prev ? prev : { ...prev, [id]: null },
						);
					}
				}
			}
		}

		async function run() {
			let cursor = 0;
			async function worker() {
				while (cursor < missing.length && !cancelled) {
					const id = missing[cursor];
					cursor += 1;
					if (id) await loadOne(id);
				}
			}
			await Promise.all(
				Array.from({ length: OWNER_FETCH_CONCURRENCY }, () => worker()),
			);
		}

		void run();
		return () => {
			cancelled = true;
		};
	}, [orderedKey, trigger]);

	return usersById;
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

function statusBadgeVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	const s = status.toLowerCase();
	if (s === "active") return "default";
	if (s === "pending" || s === "insufficient_credits") return "secondary";
	if (s === "expired" || s === "cancelled" || s === "unsubscribed")
		return "destructive";
	return "outline";
}

function formatBusinessNames(list: BusinessOutput[], max = 2): string {
	if (list.length === 0) return "—";
	const names = list.map((b) => b.name || "Untitled").filter(Boolean);
	if (names.length <= max) return names.join(", ");
	return `${names.slice(0, max).join(", ")} +${names.length - max} more`;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export default function TransactionsPage() {
	const router = useRouter();
	const [planId, setPlanId] = useState(PLAN_FILTER_ALL);
	const [statusFilter, setStatusFilter] =
		useState<SubscriptionStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [bizCountFilter, setBizCountFilter] =
		useState<BizCountFilter>(BIZ_COUNT_FILTER_ALL);
	const [minAmount, setMinAmount] = useState("");
	const [sortKey, setSortKey] = useState<SortKey>("date");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	// ponytail: client slice only; server page params when list endpoint grows large
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<PageSize>(20);

	const { data: businesses, isLoading: businessesLoading } =
		useListAllBusinessesQuery();
	const { data: plans } = useListSubscriptionPlansQuery();

	const {
		data: statsTransactions,
		isLoading: statsLoading,
		isFetching,
		error,
		refetch,
	} = useListAdminSubscriptionTransactionsQuery();

	const ownerIdByBusinessId = useMemo(() => {
		const map = new Map<string, string>();
		for (const b of businesses ?? []) {
			if (b.owner_id) map.set(b.id, b.owner_id);
		}
		return map;
	}, [businesses]);

	const businessesByOwnerId = useMemo(() => {
		const map = new Map<string, BusinessOutput[]>();
		for (const b of businesses ?? []) {
			if (!b.owner_id) continue;
			const list = map.get(b.owner_id) ?? [];
			list.push(b);
			map.set(b.owner_id, list);
		}
		for (const list of map.values()) {
			list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
		}
		return map;
	}, [businesses]);

	const filteredRows = useMemo(() => {
		const allBusinesses = businesses ?? [];
		const transactions = statsTransactions ?? [];
		const withSubscription =
			buildLatestBusinessSubscriptionRows(transactions);
		const unsubscribed = buildUnsubscribedBusinessRows(
			allBusinesses,
			transactions,
		);

		let businessRows: AdminSubscriptionOutput[];

		if (statusFilter === "unsubscribed") {
			businessRows = planId === PLAN_FILTER_ALL ? unsubscribed : [];
		} else if (statusFilter === "all") {
			businessRows = [...withSubscription, ...unsubscribed];
			if (planId !== PLAN_FILTER_ALL) {
				businessRows = withSubscription.filter(
					(r) => r.plan_id === planId || r.plan?.id === planId,
				);
			}
		} else {
			businessRows = withSubscription.filter(
				(r) => r.status.toLowerCase() === statusFilter,
			);
			if (planId !== PLAN_FILTER_ALL) {
				businessRows = businessRows.filter(
					(r) => r.plan_id === planId || r.plan?.id === planId,
				);
			}
		}

		businessRows = businessRows.filter((r) =>
			ownerIdByBusinessId.has(r.business_id),
		);

		const q = searchTerm.trim().toLowerCase();
		if (q) {
			businessRows = businessRows.filter((row) => {
				const ownerId = ownerIdByBusinessId.get(row.business_id);
				const ownerBizNames = ownerId
					? (businessesByOwnerId.get(ownerId) ?? [])
							.map((b) => b.name)
							.join(" ")
					: "";
				const hay = [
					row.business?.name,
					row.business?.tin_number,
					row.plan?.name,
					row.status,
					row.chapa_transaction_reference,
					row.business_id,
					ownerBizNames,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();
				return hay.includes(q);
			});
		}

		let rows = collapseSubscriptionRowsByOwner(
			businessRows,
			ownerIdByBusinessId,
		);

		if (bizCountFilter !== BIZ_COUNT_FILTER_ALL) {
			rows = rows.filter((row) => {
				const n = ownerBusinessCount(
					row,
					ownerIdByBusinessId,
					businessesByOwnerId,
				);
				if (bizCountFilter === "1") return n === 1;
				if (bizCountFilter === "2") return n === 2;
				return n >= 3;
			});
		}

		const minAmt = minAmount.trim() === "" ? null : Number(minAmount);
		if (minAmt != null && Number.isFinite(minAmt)) {
			rows = rows.filter(
				(row) =>
					row.amount != null &&
					Number.isFinite(row.amount) &&
					row.amount >= minAmt,
			);
		}

		if (dateFrom) {
			const start = dayStartMs(dateFrom);
			rows = rows.filter(
				(row) => subscriptionRowTimestamp(row) >= start,
			);
		}
		if (dateTo) {
			const end = dayEndMs(dateTo);
			rows = rows.filter((row) => {
				const t = subscriptionRowTimestamp(row);
				return t > 0 && t <= end;
			});
		}

		return rows.toSorted((a, b) =>
			compareOwnerRows(
				a,
				b,
				sortKey,
				sortDir,
				ownerIdByBusinessId,
				businessesByOwnerId,
			),
		);
	}, [
		statusFilter,
		businesses,
		statsTransactions,
		planId,
		searchTerm,
		ownerIdByBusinessId,
		businessesByOwnerId,
		bizCountFilter,
		minAmount,
		dateFrom,
		dateTo,
		sortKey,
		sortDir,
	]);

	const totalItems = filteredRows.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
	const currentPage = Math.min(page, totalPages);
	const pageStart = (currentPage - 1) * pageSize;
	const pageRows = filteredRows.slice(pageStart, pageStart + pageSize);

	const pageOwnerIds = useMemo(() => {
		const ids: string[] = [];
		const seen = new Set<string>();
		for (const row of pageRows) {
			const ownerId = ownerIdByBusinessId.get(row.business_id);
			if (ownerId && !seen.has(ownerId)) {
				seen.add(ownerId);
				ids.push(ownerId);
			}
		}
		return ids;
	}, [pageRows, ownerIdByBusinessId]);

	const usersById = usePageOwnerUsers(pageOwnerIds);

	const filtersActive =
		planId !== PLAN_FILTER_ALL ||
		statusFilter !== "all" ||
		searchTerm.trim() !== "" ||
		dateFrom !== "" ||
		dateTo !== "" ||
		bizCountFilter !== BIZ_COUNT_FILTER_ALL ||
		minAmount.trim() !== "";

	function clearFilters() {
		setPlanId(PLAN_FILTER_ALL);
		setStatusFilter("all");
		setSearchTerm("");
		setDateFrom("");
		setDateTo("");
		setBizCountFilter(BIZ_COUNT_FILTER_ALL);
		setMinAmount("");
		setPage(1);
	}

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir(
				key === "plan" || key === "status" || key === "businesses"
					? "asc"
					: "desc",
			);
		}
		setPage(1);
	}

	useEffect(() => {
		setPage(1);
	}, [
		planId,
		statusFilter,
		searchTerm,
		pageSize,
		dateFrom,
		dateTo,
		bizCountFilter,
		minAmount,
	]);

	const summarySnapshot = useMemo((): PlatformSubscriptionSummary | null => {
		if (businessesLoading || statsLoading) return null;
		if (!businesses) return null;
		return summarizePlatformSubscription(
			businesses,
			statsTransactions ?? [],
		);
	}, [businessesLoading, statsLoading, businesses, statsTransactions]);

	const businessesBusy = businessesLoading && summarySnapshot === null;
	const statsBusy = statsLoading && summarySnapshot === null;
	const summaryBusy = businessesBusy || statsBusy;

	const planLabel =
		planId === PLAN_FILTER_ALL
			? "All plans"
			: (plans?.find((p) => p.id === planId)?.name ?? "All plans");

	const bizCountLabel =
		bizCountFilter === BIZ_COUNT_FILTER_ALL
			? "Any count"
			: bizCountFilter === "3+"
				? "3 or more"
				: bizCountFilter === "1"
					? "1 business"
					: "2 businesses";

	const listBusy =
		statusFilter === "unsubscribed"
			? businessesLoading || statsLoading
			: statsLoading || isFetching || businessesLoading;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Owners"
				description="Each row is an owner. Open a row to manage their businesses, staff, and subscriptions."
			/>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Failed to load owners</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(error, "Request failed.")}</span>
						<Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
				<SummaryCard
					label="Owners"
					value={
						summarySnapshot?.totalOwners != null
							? summarySnapshot.totalOwners.toLocaleString()
							: null
					}
					icon={UsersIcon}
					loading={businessesBusy}
					variant="total"
				/>
				<SummaryCard
					label="Businesses"
					value={
						summarySnapshot?.totalBusinesses != null
							? summarySnapshot.totalBusinesses.toLocaleString()
							: null
					}
					icon={Building2Icon}
					loading={businessesBusy}
					variant="total"
				/>
				<SummaryCard
					label="Active businesses"
					value={
						summarySnapshot?.active != null
							? summarySnapshot.active.toLocaleString()
							: null
					}
					icon={CheckCircle2Icon}
					loading={statsBusy}
					variant="active"
				/>
				<SummaryCard
					label="Pending businesses"
					value={
						summarySnapshot?.pending != null
							? summarySnapshot.pending.toLocaleString()
							: null
					}
					icon={XCircleIcon}
					loading={statsBusy}
					variant="pending"
				/>
				<SummaryCard
					label="Expired businesses"
					value={
						summarySnapshot?.expired != null
							? summarySnapshot.expired.toLocaleString()
							: null
					}
					icon={ClockIcon}
					loading={statsBusy}
					variant="expired"
				/>
				<SummaryCard
					label="Unsubscribed businesses"
					value={
						summarySnapshot?.noSubscription != null
							? summarySnapshot.noSubscription.toLocaleString()
							: null
					}
					icon={MinusCircleIcon}
					loading={summaryBusy}
					variant="none"
				/>
			</div>

			{summarySnapshot ? (
				<p className="text-xs text-muted-foreground">
					Status cards count businesses by each business’s latest
					subscription (not owners). Active + pending + expired + other
					statuses
					{summarySnapshot.other > 0
						? ` including ${summarySnapshot.other.toLocaleString()} other`
						: ""}{" "}
					+ unsubscribed = all businesses. The table below lists one row
					per owner.
				</p>
			) : null}

			<Card>
				<CardContent className="flex flex-col gap-4 pt-6">
					<div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
						<FilterField label="Search" className="min-w-48 flex-1 lg:min-w-64">
							<Input
								type="search"
								placeholder="Search business name, TIN, or plan…"
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
								}}
								className="h-10"
							/>
						</FilterField>

						<FilterField label="Subscription status" className="min-w-40 flex-1">
							<Select
								value={statusFilter}
								onValueChange={(v) => {
									if (v != null && isStatusFilter(v)) setStatusFilter(v);
								}}
							>
								<SelectTrigger className="h-10 w-full">
									<span className="flex flex-1 truncate text-left">
										{getSubscriptionStatusFilterLabel(statusFilter)}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="expired">Expired</SelectItem>
									<SelectItem value="cancelled">Cancelled</SelectItem>
									<SelectItem value="insufficient_credits">
										Insufficient credits
									</SelectItem>
									<SelectItem value="unsubscribed">Unsubscribed</SelectItem>
								</SelectContent>
							</Select>
						</FilterField>

						<FilterField label="Plan" className="min-w-48 flex-1">
							<Select
								value={planId}
								onValueChange={(v) => {
									if (v != null && v !== "") setPlanId(v);
								}}
							>
								<SelectTrigger className="h-10 w-full">
									<span className="flex flex-1 truncate text-left">{planLabel}</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={PLAN_FILTER_ALL}>All plans</SelectItem>
									{(plans ?? [])
										.filter((p) => !p.is_archived)
										.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</FilterField>

						<FilterField label="Businesses" className="min-w-36 flex-1">
							<Select
								value={bizCountFilter}
								onValueChange={(v) => {
									if (
										v === BIZ_COUNT_FILTER_ALL ||
										v === "1" ||
										v === "2" ||
										v === "3+"
									) {
										setBizCountFilter(v);
									}
								}}
							>
								<SelectTrigger className="h-10 w-full">
									<span className="flex flex-1 truncate text-left">
										{bizCountLabel}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={BIZ_COUNT_FILTER_ALL}>Any count</SelectItem>
									<SelectItem value="1">1 business</SelectItem>
									<SelectItem value="2">2 businesses</SelectItem>
									<SelectItem value="3+">3 or more</SelectItem>
								</SelectContent>
							</Select>
						</FilterField>

						<FilterField label="Min amount" className="min-w-28 flex-1">
							<Input
								type="number"
								inputMode="decimal"
								min={0}
								step="any"
								placeholder="Any"
								value={minAmount}
								onChange={(e) => setMinAmount(e.target.value)}
								className="h-10"
							/>
						</FilterField>

						<FilterField label="From" className="min-w-36 flex-1">
							<Input
								type="date"
								value={dateFrom}
								max={dateTo || undefined}
								onChange={(e) => setDateFrom(e.target.value)}
								className="h-10"
							/>
						</FilterField>

						<FilterField label="To" className="min-w-36 flex-1">
							<Input
								type="date"
								value={dateTo}
								min={dateFrom || undefined}
								onChange={(e) => setDateTo(e.target.value)}
								className="h-10"
							/>
						</FilterField>

						{filtersActive ? (
							<div className="flex items-end">
								<Button
									type="button"
									variant="outline"
									className="h-10"
									onClick={clearFilters}
								>
									Clear filters
								</Button>
							</div>
						) : null}
					</div>

					{listBusy ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 6 }).map((_, i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : filteredRows.length === 0 ? (
						<p className="py-10 text-center text-sm text-muted-foreground">
							No owners match your filters.
						</p>
					) : (
						<div className="overflow-x-auto rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Owner</TableHead>
										<SortableHead
											label="Businesses"
											column="businesses"
											sortKey={sortKey}
											sortDir={sortDir}
											onSort={toggleSort}
										/>
										<SortableHead
											label="Primary plan"
											column="plan"
											sortKey={sortKey}
											sortDir={sortDir}
											onSort={toggleSort}
										/>
										<SortableHead
											label="Status"
											column="status"
											sortKey={sortKey}
											sortDir={sortDir}
											onSort={toggleSort}
										/>
										<SortableHead
											label="Amount"
											column="amount"
											sortKey={sortKey}
											sortDir={sortDir}
											onSort={toggleSort}
											align="right"
										/>
										<SortableHead
											label="Credits"
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
									</TableRow>
								</TableHeader>
								<TableBody>
									{pageRows.map((row) => {
										const ownerId = ownerIdByBusinessId.get(row.business_id);
										const ownerBusinesses = ownerId
											? (businessesByOwnerId.get(ownerId) ?? [])
											: [];
										const ownerUser = ownerId
											? usersById[ownerId]
											: undefined;
										const ownerLoadState: "loading" | "ready" | "missing" =
											!ownerId
												? "missing"
												: ownerId in usersById
													? ownerUser
														? "ready"
														: "missing"
													: "loading";
										return (
											<OwnerRow
												key={ownerId ?? row.id}
												row={row}
												ownerId={ownerId}
												owner={ownerUser ?? null}
												ownerLoadState={ownerLoadState}
												ownerBusinesses={ownerBusinesses}
												onSelect={() =>
													router.push(`/admin/business/${row.business_id}`)
												}
											/>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}

					{!listBusy && totalItems > 0 ? (
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-xs text-muted-foreground">
								Showing {pageStart + 1}–
								{Math.min(pageStart + pageSize, totalItems)} of {totalItems}{" "}
								owner{totalItems === 1 ? "" : "s"}
								{statusFilter !== "all"
									? ` · ${getSubscriptionStatusFilterLabel(statusFilter)}`
									: ""}
								{` · sorted by ${sortKey} (${sortDir})`}
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-xs text-muted-foreground">Per page</span>
								<Select
									value={String(pageSize)}
									onValueChange={(v) => {
										const next = Number(v) as PageSize;
										if (PAGE_SIZE_OPTIONS.includes(next)) setPageSize(next);
									}}
								>
									<SelectTrigger className="h-8 w-18" size="sm">
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
									disabled={currentPage <= 1}
									onClick={() => setPage(Math.max(1, currentPage - 1))}
								>
									Previous
								</Button>
								<span className="text-xs tabular-nums text-muted-foreground">
									Page {currentPage} of {totalPages}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={currentPage >= totalPages}
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
		</div>
	);
}

function OwnerRow({
	row,
	ownerId,
	owner,
	ownerLoadState,
	ownerBusinesses,
	onSelect,
}: {
	row: AdminSubscriptionOutput;
	ownerId: string | undefined;
	owner: UserOutput | null;
	ownerLoadState: "loading" | "ready" | "missing";
	ownerBusinesses: BusinessOutput[];
	onSelect: () => void;
}) {
	const count = ownerBusinesses.length;
	const namesSummary = formatBusinessNames(ownerBusinesses);
	const ownerLabel = owner
		? formatUserDisplayName(owner)
		: namesSummary !== "—"
			? namesSummary
			: "owner";
	const dateLabel = formatSubscriptionDate(row.started_at ?? row.created_at);

	return (
		<TableRow
			className="cursor-pointer hover:bg-muted/50"
			onClick={onSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect();
				}
			}}
			tabIndex={0}
			role="button"
			aria-label={`Open ${ownerLabel}, ${count} business${count === 1 ? "" : "es"}`}
		>
			<TableCell>
				{!ownerId ? (
					<span className="text-muted-foreground">No owner linked</span>
				) : ownerLoadState === "loading" ? (
					<div className="flex flex-col gap-1">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-3 w-24" />
					</div>
				) : owner ? (
					<div className="flex flex-col gap-0.5">
						<span className="font-medium">{formatUserDisplayName(owner)}</span>
						{owner.phone_number ? (
							<span className="text-xs tabular-nums text-muted-foreground">
								{owner.phone_number}
							</span>
						) : null}
					</div>
				) : (
					<div className="flex flex-col gap-0.5">
						<span className="text-muted-foreground">Owner lookup failed</span>
						<span
							className="font-mono text-xs text-muted-foreground"
							title={ownerId}
						>
							{ownerId.slice(0, 8)}…
						</span>
					</div>
				)}
			</TableCell>
			<TableCell>
				<div className="flex max-w-64 flex-col gap-0.5">
					<span className="text-sm font-medium tabular-nums">
						{count > 0
							? `${count} business${count === 1 ? "" : "es"}`
							: "—"}
					</span>
					<span className="truncate text-xs text-muted-foreground" title={namesSummary}>
						{namesSummary}
					</span>
				</div>
			</TableCell>
			<TableCell>{getSubscriptionPlanLabel(row.plan)}</TableCell>
			<TableCell>
				<Badge variant={statusBadgeVariant(row.status)}>
					{getSubscriptionStatusLabel(row.status)}
				</Badge>
			</TableCell>
			<TableCell className="text-right tabular-nums">
				{row.amount === null || row.amount === undefined
					? "—"
					: Number.isFinite(row.amount)
						? row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
						: "—"}
			</TableCell>
			<TableCell className="text-right tabular-nums">
				{row.credits_limit.toLocaleString()}
			</TableCell>
			<TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
				{dateLabel}
			</TableCell>
		</TableRow>
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
					"inline-flex items-center gap-1 rounded-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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

function FilterField({
	label,
	className,
	children,
}: {
	label: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={`flex flex-col gap-2 ${className ?? ""}`}>
			<span className="text-sm font-medium">{label}</span>
			{children}
		</div>
	);
}

function SummaryCard({
	label,
	value,
	icon: Icon,
	loading,
	variant,
}: {
	label: string;
	value: string | null;
	icon: React.ComponentType<{ className?: string }>;
	loading: boolean;
	variant: "total" | "active" | "pending" | "expired" | "none";
}) {
	const iconClass =
		variant === "active"
			? "text-primary"
			: variant === "expired"
				? "text-destructive"
				: variant === "total"
					? "text-foreground"
					: variant === "none"
						? "text-muted-foreground"
						: "text-muted-foreground";
	const bgClass =
		variant === "active"
			? "bg-primary/10"
			: variant === "expired"
				? "bg-destructive/10"
				: "bg-muted";

	return (
		<Card>
			<CardContent className="flex flex-row items-center gap-4 pt-6">
				<div
					className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${bgClass}`}
				>
					<Icon className={`size-5 ${iconClass}`} aria-hidden />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm text-muted-foreground">{label}</p>
					{loading ? (
						<Skeleton className="mt-1 h-7 w-16" />
					) : (
						<p className="text-2xl font-semibold tabular-nums">{value}</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
