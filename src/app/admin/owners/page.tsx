"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useDeferredValue, useMemo, useState } from "react";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	ArrowUpDownIcon,
	ChevronRightIcon,
} from "lucide-react";

import { AdminCreateBusinessDialog } from "@/components/admin/admin-create-business-dialog";
import { AdminCreateUserDialog } from "@/components/admin/admin-create-user-dialog";
import { useListBusinessesQuery } from "@/services/branch-management/branchManagementApi";
import { useListSubscriptionPlansQuery } from "@/services/subscription-plan/subscriptionPlanApi";
import type { BusinessOutput } from "@/services/types";
import {
	countUniqueOwners,
	getSubscriptionPlanLabel,
	getSubscriptionStatusFilterLabel,
	getSubscriptionStatusLabel,
	PLAN_FILTER_ALL,
	type PlatformSubscriptionSummary,
	type SubscriptionStatusFilter,
} from "@/lib/subscription-filters";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
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

type SortKey = "business" | "plan" | "status" | "date";
type SortDir = "asc" | "desc";

const STATUS_SORT_RANK: Record<string, number> = {
	active: 5,
	pending: 4,
	upgraded: 4,
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
		v === "upgraded" ||
		v === "insufficient_credits" ||
		v === "unsubscribed"
	);
}

function formatBusinessDate(iso: string | null | undefined): string {
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

function businessStatus(business: BusinessOutput): string {
	return business.subscription_status?.trim().toLowerCase() || "unsubscribed";
}

function businessTimestamp(business: BusinessOutput): number {
	const timestamp = new Date(business.created_at ?? "").getTime();
	return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareBusinesses(
	a: BusinessOutput,
	b: BusinessOutput,
	sortKey: SortKey,
	sortDir: SortDir,
): number {
	const dir = sortDir === "asc" ? 1 : -1;
	let cmp = 0;
	switch (sortKey) {
		case "business":
			cmp = a.name.localeCompare(b.name);
			break;
		case "plan":
			cmp = (a.plan_name ?? "").localeCompare(b.plan_name ?? "");
			break;
		case "status":
			cmp =
				(STATUS_SORT_RANK[businessStatus(a)] ?? -1) -
				(STATUS_SORT_RANK[businessStatus(b)] ?? -1);
			break;
		case "date":
			cmp = businessTimestamp(a) - businessTimestamp(b);
			break;
		default:
			cmp = 0;
	}
	if (cmp !== 0) return cmp * dir;
	return a.name.localeCompare(b.name);
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
	if (s === "pending" || s === "upgraded" || s === "insufficient_credits")
		return "secondary";
	if (s === "expired" || s === "cancelled" || s === "unsubscribed")
		return "destructive";
	return "outline";
}

function businessSearchHay(business: BusinessOutput): string {
	return [
		business.name,
		business.tin_number,
		business.id,
		business.owner_name,
		business.owner_phone,
		business.plan_name,
		business.subscription_status,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export default function OwnersPage() {
	const router = useRouter();
	const [planId, setPlanId] = useState(PLAN_FILTER_ALL);
	const [statusFilter, setStatusFilter] =
		useState<SubscriptionStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const deferredSearch = useDeferredValue(searchTerm);
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [sortKey, setSortKey] = useState<SortKey>("date");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	// ponytail: server page of businesses; Next/Prev only — no auto-walk
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<PageSize>(20);
	const [createUserOpen, setCreateUserOpen] = useState(false);
	const [createBusinessOpen, setCreateBusinessOpen] = useState(false);

	const filterResetKey = useMemo(
		() =>
			[
				planId,
				statusFilter,
				deferredSearch,
				pageSize,
				dateFrom,
				dateTo,
			].join("\0"),
		[planId, statusFilter, deferredSearch, pageSize, dateFrom, dateTo],
	);
	const [prevFilterResetKey, setPrevFilterResetKey] = useState(filterResetKey);
	if (prevFilterResetKey !== filterResetKey) {
		setPrevFilterResetKey(filterResetKey);
		setPage(1);
	}

	const businessOffset = (page - 1) * pageSize;
	const {
		data: businessPage,
		isLoading: businessesLoading,
		isFetching: businessesFetching,
		error: businessesError,
		refetch: refetchBusinesses,
	} = useListBusinessesQuery({
		offset: businessOffset,
		limit: pageSize,
	});
	const businesses = businessPage?.items;
	const businessTotal = businessPage?.total_count ?? 0;

	const { data: plans } = useListSubscriptionPlansQuery();

	const error = businessesError;
	function refetch() {
		void refetchBusinesses();
	}

	const pageRows = useMemo(() => {
		let rows = businesses ?? [];
		const selectedPlanName =
			plans?.find((plan) => plan.id === planId)?.name.toLowerCase();
		if (statusFilter !== "all") {
			rows = rows.filter((business) => businessStatus(business) === statusFilter);
		}
		if (selectedPlanName) {
			rows = rows.filter(
				(business) =>
					business.plan_name?.trim().toLowerCase() === selectedPlanName,
			);
		}

		const q = deferredSearch.trim().toLowerCase();
		if (q) {
			rows = rows.filter((business) => businessSearchHay(business).includes(q));
		}

		if (dateFrom) {
			const start = dayStartMs(dateFrom);
			rows = rows.filter((business) => {
				const timestamp = businessTimestamp(business);
				return Number.isFinite(timestamp) && timestamp >= start;
			});
		}
		if (dateTo) {
			const end = dayEndMs(dateTo);
			rows = rows.filter((business) => {
				const timestamp = businessTimestamp(business);
				return Number.isFinite(timestamp) && timestamp <= end;
			});
		}

		return rows.toSorted((a, b) =>
			compareBusinesses(a, b, sortKey, sortDir),
		);
	}, [
		statusFilter,
		businesses,
		planId,
		plans,
		deferredSearch,
		dateFrom,
		dateTo,
		sortKey,
		sortDir,
	]);

	const totalPages = Math.max(1, Math.ceil(businessTotal / pageSize) || 1);
	const currentPage = Math.min(page, totalPages);
	if (page !== currentPage) {
		setPage(currentPage);
	}
	const rangeStart = businessTotal === 0 ? 0 : businessOffset + 1;
	const rangeEnd = Math.min(businessOffset + pageSize, businessTotal);

	const searchPending =
		searchTerm.trim() !== deferredSearch.trim();
	const filtersActive =
		planId !== PLAN_FILTER_ALL ||
		statusFilter !== "all" ||
		searchTerm.trim() !== "" ||
		dateFrom !== "" ||
		dateTo !== "";

	function clearFilters() {
		setPlanId(PLAN_FILTER_ALL);
		setStatusFilter("all");
		setSearchTerm("");
		setDateFrom("");
		setDateTo("");
		setPage(1);
	}

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir(
				key === "business" || key === "plan" || key === "status"
					? "asc"
					: "desc",
			);
		}
		setPage(1);
	}

	const summarySnapshot = useMemo((): PlatformSubscriptionSummary | null => {
		if (businessPage == null) return null;
		const pageBusinesses = businesses ?? [];
		const stats = {
			active: 0,
			pending: 0,
			expired: 0,
			other: 0,
			noSubscription: 0,
		};
		for (const business of pageBusinesses) {
			const status = businessStatus(business);
			if (status === "active") stats.active++;
			else if (status === "pending") stats.pending++;
			else if (status === "expired") stats.expired++;
			else if (status === "unsubscribed") stats.noSubscription++;
			else stats.other++;
		}
		return {
			...stats,
			totalBusinesses: businessTotal,
			totalOwners: countUniqueOwners(pageBusinesses),
		};
	}, [businessPage, businesses, businessTotal]);

	const businessesBusy = businessesLoading && !businessPage;
	const summaryBusy = businessesBusy;

	const planLabel =
		planId === PLAN_FILTER_ALL
			? "All plans"
			: (plans?.find((plan) => plan.id === planId)?.name ?? "All plans");
	const listBusy = businessesLoading && !businessPage;

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
			<header className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<p className="admin-eyebrow">Operator roster</p>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div className="min-w-0">
							<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
								Owners
							</h1>
							<p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
								Browse businesses and open a row to manage its owner, staff, and
								subscription.
							</p>
						</div>
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
							{businessPage && !businessesBusy ? (
								<p className="font-mono text-xs tabular-nums text-muted-foreground">
									{pageRows.length.toLocaleString()} on page ·{" "}
									{businessTotal.toLocaleString()} businesses
								</p>
							) : null}
						</div>
					</div>
				</div>

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
								onClick={() => refetch()}
							>
								Try again
							</Button>
						</AlertDescription>
					</Alert>
				) : null}
			</header>

			{/* Business totals and status mix for the current page. */}
			<section
				aria-labelledby="owners-closeout-heading"
				className="admin-brand-band"
			>
				<div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
					<div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
						<div className="flex flex-col gap-2">
							<p
								id="owners-closeout-heading"
								className="admin-brand-band-label"
							>
								Platform businesses
							</p>
							<p className="admin-brand-band-muted">
								Businesses operating on Tina Verify
							</p>
						</div>
						{summaryBusy ? (
							<div className="flex flex-col gap-2">
								<Skeleton className="admin-brand-band-skeleton h-12 w-28" />
								<Skeleton className="admin-brand-band-skeleton h-4 w-40" />
							</div>
						) : (
							<div className="flex flex-col gap-1">
								<p className="font-mono text-[clamp(2rem,5vw,2.75rem)] leading-none font-semibold tracking-tight tabular-nums">
									{summarySnapshot?.totalBusinesses != null
										? summarySnapshot.totalBusinesses.toLocaleString()
										: "—"}
								</p>
							</div>
						)}
					</div>

					<div className="admin-brand-band-divider" />

					<div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-2">
						<OwnersLedgerStat
							label="Active"
							loading={summaryBusy}
							value={
								summarySnapshot
									? summarySnapshot.active.toLocaleString()
									: null
							}
						/>
						<OwnersLedgerStat
							label="Pending"
							loading={summaryBusy}
							value={
								summarySnapshot
									? summarySnapshot.pending.toLocaleString()
									: null
							}
						/>
						<OwnersLedgerStat
							label="Expired"
							loading={summaryBusy}
							value={
								summarySnapshot
									? summarySnapshot.expired.toLocaleString()
									: null
							}
						/>
						<OwnersLedgerStat
							label="Unsubscribed"
							loading={summaryBusy}
							value={
								summarySnapshot
									? summarySnapshot.noSubscription.toLocaleString()
									: null
							}
						/>
					</div>
				</div>
			</section>

			{summarySnapshot ? (
				<p className="text-xs leading-relaxed text-muted-foreground">
					Status counts are for businesses on this page only, based on the
					business list response.
					{summarySnapshot.other > 0
						? ` Includes ${summarySnapshot.other.toLocaleString()} other status.`
						: ""}
				</p>
			) : null}

			<section aria-labelledby="owners-list-heading" className="flex flex-col gap-3">
				<div className="flex flex-col gap-0.5">
					<h2
						id="owners-list-heading"
						className="text-sm font-semibold tracking-tight text-foreground"
					>
						Business list
					</h2>
					<p className="text-sm text-muted-foreground">
						Filter and sort businesses, then open a row to manage it.
					</p>
				</div>

				<Card size="sm">
					<CardHeader className="border-b">
						<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<CardTitle>Find businesses</CardTitle>
								<CardDescription>
									Search business name, TIN, owner name or phone, plan, and
									status. Filter by subscription status, plan, or creation date.
								</CardDescription>
							</div>
							{filtersActive ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={clearFilters}
								>
									Clear filters
								</Button>
							) : null}
						</div>
					</CardHeader>
					<CardContent className="flex flex-col gap-4 pt-4">
						<div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<Field className="gap-1 sm:col-span-2">
									<FieldLabel className="text-[11px] text-muted-foreground">
										Search
									</FieldLabel>
									<Input
										type="search"
										placeholder="Business, TIN, owner name or phone…"
										value={searchTerm}
										onChange={(e) => {
											setSearchTerm(e.target.value);
										}}
										className={cn(
											"h-9 bg-background",
											searchPending && "opacity-80",
										)}
										aria-busy={searchPending}
									/>
								</Field>

								<Field className="gap-1">
									<FieldLabel className="text-[11px] text-muted-foreground">
										Status
									</FieldLabel>
									<Select
										value={statusFilter}
										onValueChange={(v) => {
											if (v != null && isStatusFilter(v)) setStatusFilter(v);
										}}
									>
										<SelectTrigger className="h-9 w-full bg-background">
											<span className="flex flex-1 truncate text-left text-sm">
												{getSubscriptionStatusFilterLabel(statusFilter)}
											</span>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value="all">All</SelectItem>
												<SelectItem value="pending">Pending</SelectItem>
												<SelectItem value="active">Active</SelectItem>
												<SelectItem value="expired">Expired</SelectItem>
												<SelectItem value="cancelled">Cancelled</SelectItem>
												<SelectItem value="upgraded">Upgraded</SelectItem>
												<SelectItem value="insufficient_credits">
													Insufficient credits
												</SelectItem>
												<SelectItem value="unsubscribed">Unsubscribed</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>

								<Field className="gap-1">
									<FieldLabel className="text-[11px] text-muted-foreground">
										Plan
									</FieldLabel>
									<Select
										value={planId}
										onValueChange={(v) => {
											if (v != null && v !== "") setPlanId(v);
										}}
									>
										<SelectTrigger className="h-9 w-full bg-background">
											<span className="flex flex-1 truncate text-left text-sm">
												{planLabel}
											</span>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value={PLAN_FILTER_ALL}>All plans</SelectItem>
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
								</Field>
							</div>

							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<Field className="gap-1">
									<FieldLabel className="text-[11px] text-muted-foreground">
										From
									</FieldLabel>
									<Input
										type="date"
										value={dateFrom}
										max={dateTo || undefined}
										onChange={(e) => setDateFrom(e.target.value)}
										className="h-9 bg-background"
									/>
								</Field>

								<Field className="gap-1">
									<FieldLabel className="text-[11px] text-muted-foreground">
										To
									</FieldLabel>
									<Input
										type="date"
										value={dateTo}
										min={dateFrom || undefined}
										onChange={(e) => setDateTo(e.target.value)}
										className="h-9 bg-background"
									/>
								</Field>
							</div>
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
							<p className="max-w-md text-sm text-muted-foreground">
								Adjust the filters or clear them to see more businesses.
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
						<div className="overflow-x-auto rounded-xl border border-border">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>Owner</TableHead>
										<SortableHead
											label="Business"
											column="business"
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
											label="Status"
											column="status"
											sortKey={sortKey}
											sortDir={sortDir}
											onSort={toggleSort}
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
									{pageRows.map((business) => (
										<BusinessRow
											key={business.id}
											business={business}
											onSelect={() =>
												router.push(`/admin/business/${business.id}`)
											}
										/>
									))}
								</TableBody>
							</Table>
						</div>
					)}

					{!listBusy && businessTotal > 0 ? (
						<div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex flex-col gap-1">
								<p className="font-mono text-xs tabular-nums text-muted-foreground">
									Businesses {rangeStart}–{rangeEnd} of{" "}
									{businessTotal.toLocaleString()}
									{statusFilter !== "all"
										? ` · ${getSubscriptionStatusFilterLabel(statusFilter)}`
										: ""}
									{pageRows.length > 0
										? ` · ${pageRows.length} business${pageRows.length === 1 ? "" : "es"} shown`
										: ""}
								</p>
								{businessesFetching ? (
									<p className="text-[11px] text-muted-foreground">
										Loading page…
									</p>
								) : null}
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-[11px] text-muted-foreground">
									Per page
								</span>
								<Select
									value={String(pageSize)}
									onValueChange={(v) => {
										const next = Number(v) as PageSize;
										if (PAGE_SIZE_OPTIONS.includes(next)) {
											setPageSize(next);
											setPage(1);
										}
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

function BusinessRow({
	business,
	onSelect,
}: {
	business: BusinessOutput;
	onSelect: () => void;
}) {
	const status = businessStatus(business);
const ownerName = business.owner_name?.trim();
const ownerPhone = business.owner_phone?.trim();
return (
		<TableRow
			className="cursor-pointer motion-safe:transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none"
			onClick={onSelect}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect();
				}
			}}
			tabIndex={0}
			role="button"
			aria-label={`Open ${business.name}`}
		>
			<TableCell>
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-medium text-foreground">
						{ownerName || "Unknown owner"}
					</span>
					{ownerPhone ? (
						<span className="font-mono text-xs tabular-nums text-muted-foreground">
							{ownerPhone}
						</span>
					) : null}
				</div>
			</TableCell>
			<TableCell>
				<div className="flex max-w-72 flex-col gap-0.5">
					<span className="truncate text-sm font-medium text-foreground">
						{business.name || "Untitled"}
					</span>
					{business.tin_number ? (
						<span className="font-mono text-xs tabular-nums text-muted-foreground">
							TIN {business.tin_number}
						</span>
					) : null}
				</div>
			</TableCell>
			<TableCell className="text-sm text-muted-foreground">
				{getSubscriptionPlanLabel(null, business.plan_name)}
			</TableCell>
			<TableCell>
				<Badge variant={statusBadgeVariant(status)}>
					{getSubscriptionStatusLabel(status)}
				</Badge>
			</TableCell>
			<TableCell className="whitespace-nowrap font-mono text-sm tabular-nums text-muted-foreground">
				{formatBusinessDate(business.created_at)}
			</TableCell>
		</TableRow>
	);
}

function OwnersLedgerStat({
	label,
	value,
	loading,
}: {
	label: string;
	value: string | null;
	loading: boolean;
}) {
	return (
		<div className="flex flex-col gap-1">
			<p className="admin-brand-band-label">{label}</p>
			{loading ? (
				<Skeleton className="admin-brand-band-skeleton h-7 w-16" />
			) : (
				<p className="font-mono text-lg leading-snug font-semibold tracking-tight tabular-nums">
					{value ?? "—"}
				</p>
			)}
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
