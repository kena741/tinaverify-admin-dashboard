"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
	BanknoteIcon,
	Building2Icon,
	CheckCircle2Icon,
	CreditCardIcon,
	PercentIcon,
	TrendingUpIcon,
	UsersIcon,
	XCircleIcon,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { SectionHeading } from "@/components/admin/section-heading";
import { StatCard } from "@/components/admin/stat-card";
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics";
import {
	defaultCustomDateRange,
	formatDateInputValue,
	formatRevenueAmount,
	parseAnalyticsCount,
	parseRevenueAmount,
	type DashboardAnalyticsPreset,
} from "@/lib/analytics";
import { getDateRangeLabel } from "@/lib/filter-labels";
import { cn } from "@/lib/utils";
import { useListAdminSubscriptionTransactionsQuery } from "@/services/subscription/subscriptionApi";
import { useListAllBusinessesQuery } from "@/services/branch-management/branchManagementApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const PRESET_OPTIONS: DashboardAnalyticsPreset[] = [
	"last_7_days",
	"last_30_days",
	"this_month",
	"custom",
];

function periodLabel(
	preset: DashboardAnalyticsPreset,
	customStart: string,
	customEnd: string,
): string {
	if (preset !== "custom") return getDateRangeLabel(preset);
	if (!customStart || !customEnd) return getDateRangeLabel("custom");
	try {
		const start = parseISO(`${customStart}T00:00:00`);
		const end = parseISO(`${customEnd}T00:00:00`);
		if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
			return getDateRangeLabel("custom");
		}
		return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
	} catch {
		return getDateRangeLabel("custom");
	}
}

function formatCount(value: number | string | null | undefined): string {
	const n = parseAnalyticsCount(value);
	return n.toLocaleString();
}

function displayOrDash(
	ready: boolean,
	value: string | null | undefined,
): string {
	if (!ready) return "—";
	if (value == null || value === "") return "—";
	return value;
}

/** Month key YYYY-MM from ISO-ish string. */
function monthKey(iso: string | null | undefined): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
	const defaultCustom = useMemo(() => defaultCustomDateRange(), []);
	const [preset, setPreset] = useState<DashboardAnalyticsPreset>("last_30_days");
	const [customStart, setCustomStart] = useState(defaultCustom.start);
	const [customEnd, setCustomEnd] = useState(defaultCustom.end);

	const todayMax = formatDateInputValue(new Date());

	const {
		summary,
		periodRevenue,
		totalVerifiedAmount,
		totalVerifiedTransactions,
		totalFailedTransactions,
		successRate,
		isLoading,
		error,
		refetch,
		isSystemAdmin,
		customRangeValid,
	} = useDashboardAnalytics({
		preset,
		customStart: preset === "custom" ? customStart : undefined,
		customEnd: preset === "custom" ? customEnd : undefined,
	});

	const { data: subscriptionRows, isLoading: subsLoading } =
		useListAdminSubscriptionTransactionsQuery(undefined, {
			skip: !isSystemAdmin,
		});
	const { data: businesses, isLoading: businessesLoading } =
		useListAllBusinessesQuery(undefined, { skip: !isSystemAdmin });

	const revenue = summary?.revenue;
	const periodLabelText = periodLabel(preset, customStart, customEnd);
	const hasSummary = Boolean(summary) && !error;
	const statsReady = hasSummary && !isLoading;

	const totalBusinesses = statsReady
		? formatCount(summary?.total_businesses)
		: null;
	const payingBusinesses = statsReady
		? formatCount(summary?.total_paying_businesses)
		: null;

	const revenueBars = useMemo(() => {
		if (!revenue) return [];
		return [
			{ label: "Daily", amount: parseRevenueAmount(revenue.daily) },
			{ label: "Weekly", amount: parseRevenueAmount(revenue.weekly) },
			{ label: "Monthly", amount: parseRevenueAmount(revenue.monthly) },
			{
				label: "All time",
				amount: parseRevenueAmount(revenue.all_time ?? 0),
			},
			{
				label: "Selected period",
				amount: parseRevenueAmount(revenue.custom),
			},
		];
	}, [revenue]);

	const comparisonSeries = useMemo(() => {
		const ownerIdByBusiness = new Map<string, string>();
		for (const b of businesses ?? []) {
			if (b.owner_id) ownerIdByBusiness.set(b.id, b.owner_id);
		}

		const byMonth = new Map<
			string,
			{ revenue: number; owners: Set<string> }
		>();

		for (const row of subscriptionRows ?? []) {
			const key = monthKey(row.started_at ?? row.created_at);
			if (!key) continue;
			const bucket = byMonth.get(key) ?? {
				revenue: 0,
				owners: new Set<string>(),
			};
			if (row.amount != null && Number.isFinite(row.amount) && row.amount > 0) {
				bucket.revenue += row.amount;
			}
			const ownerId = ownerIdByBusiness.get(row.business_id);
			if (ownerId) bucket.owners.add(ownerId);
			else bucket.owners.add(row.business_id);
			byMonth.set(key, bucket);
		}

		return Array.from(byMonth.entries())
			.map(([month, v]) => ({
				month,
				revenue: v.revenue,
				owners: v.owners.size,
			}))
			.sort((a, b) => a.month.localeCompare(b.month))
			.slice(-6);
	}, [subscriptionRows, businesses]);

	const chartLoading = isLoading || subsLoading || businessesLoading;

	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title="Dashboard"
				description="Platform-wide revenue, businesses, subscriptions, and verification metrics."
				actions={
					isSystemAdmin ? (
						<div className="flex flex-wrap items-end gap-3">
							<Select
								value={preset}
								onValueChange={(v) => {
									if (
										v === "last_7_days" ||
										v === "last_30_days" ||
										v === "this_month" ||
										v === "custom"
									) {
										setPreset(v);
									}
								}}
							>
								<SelectTrigger className="h-10 w-44 bg-background">
									<span className="flex flex-1 truncate text-left">
										{getDateRangeLabel(preset)}
									</span>
								</SelectTrigger>
								<SelectContent>
									{PRESET_OPTIONS.map((p) => (
										<SelectItem key={p} value={p}>
											{getDateRangeLabel(p)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{preset === "custom" ? (
								<>
									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="dashboard-start-date"
											className="text-xs font-medium text-muted-foreground"
										>
											Start date
										</label>
										<Input
											id="dashboard-start-date"
											type="date"
											value={customStart}
											max={customEnd || todayMax}
											onChange={(e) => setCustomStart(e.target.value)}
											className="h-10 w-40 bg-background"
										/>
									</div>
									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="dashboard-end-date"
											className="text-xs font-medium text-muted-foreground"
										>
											End date
										</label>
										<Input
											id="dashboard-end-date"
											type="date"
											value={customEnd}
											min={customStart}
											max={todayMax}
											onChange={(e) => setCustomEnd(e.target.value)}
											className="h-10 w-40 bg-background"
										/>
									</div>
								</>
							) : null}
						</div>
					) : null
				}
			/>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Analytics unavailable</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{error}</span>
						{isSystemAdmin && customRangeValid ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => refetch()}
							>
								Try again
							</Button>
						) : null}
					</AlertDescription>
				</Alert>
			) : null}

			<section className="flex flex-col gap-4">
				<SectionHeading
					title="Verification metrics"
					description={`Performance for ${periodLabelText}.`}
				/>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
					<StatCard
						label={`Revenue (${periodLabelText})`}
						value={
							statsReady ? formatRevenueAmount(periodRevenue) : displayOrDash(false, null)
						}
						icon={TrendingUpIcon}
						loading={isLoading}
					/>
					<StatCard
						label={`Verified amount (${periodLabelText})`}
						value={
							statsReady
								? formatRevenueAmount(totalVerifiedAmount)
								: displayOrDash(false, null)
						}
						icon={BanknoteIcon}
						loading={isLoading}
					/>
					<StatCard
						label="Verified transactions"
						value={
							statsReady
								? totalVerifiedTransactions.toLocaleString()
								: displayOrDash(false, null)
						}
						icon={CheckCircle2Icon}
						loading={isLoading}
					/>
					<StatCard
						label="Failed / fake transactions"
						value={
							statsReady
								? totalFailedTransactions.toLocaleString()
								: displayOrDash(false, null)
						}
						icon={XCircleIcon}
						loading={isLoading}
					/>
					<StatCard
						label="Verification success rate"
						value={statsReady ? `${successRate}%` : displayOrDash(false, null)}
						icon={PercentIcon}
						loading={isLoading}
					/>
				</div>
			</section>

			<section className="flex flex-col gap-4">
				<SectionHeading
					title="Business overview"
					description="Counts from analytics summary (not placeholder values)."
				/>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					<StatCard
						label="Total businesses"
						value={totalBusinesses}
						icon={Building2Icon}
						loading={isLoading}
					/>
					<StatCard
						label="Paying businesses"
						value={payingBusinesses}
						icon={UsersIcon}
						loading={isLoading}
					/>
					<StatCard
						label="Most subscribed plan"
						value={
							statsReady
								? summary?.top_plan?.plan_name
									? `${summary.top_plan.plan_name} (${formatCount(summary.top_plan.subscription_count)})`
									: "—"
								: null
						}
						icon={CreditCardIcon}
						loading={isLoading}
					/>
				</div>
			</section>

			<section className="flex flex-col gap-4">
				<SectionHeading
					title="Comparative analytics"
					description="Revenue windows vs businesses, and owners with revenue over recent months."
				/>
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
					<Card className="shadow-sm">
						<CardHeader>
							<p className="admin-section-title">Revenue by window</p>
							<p className="text-sm text-muted-foreground">
								Daily / weekly / monthly / all-time / selected period from API.
							</p>
						</CardHeader>
						<CardContent>
							{chartLoading && !hasSummary ? (
								<div className="flex flex-col gap-3">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton key={i} className="h-8 w-full" />
									))}
								</div>
							) : (
								<HorizontalBarChart
									items={revenueBars.map((b) => ({
										label: b.label,
										value: b.amount,
										display: formatRevenueAmount(b.amount),
									}))}
									emptyLabel="No revenue data for this range."
								/>
							)}
						</CardContent>
					</Card>

					<Card className="shadow-sm">
						<CardHeader>
							<p className="admin-section-title">Businesses comparison</p>
							<p className="text-sm text-muted-foreground">
								Registered businesses vs paying businesses.
							</p>
						</CardHeader>
						<CardContent>
							{chartLoading && !hasSummary ? (
								<div className="flex flex-col gap-3">
									<Skeleton className="h-8 w-full" />
									<Skeleton className="h-8 w-full" />
								</div>
							) : (
								<HorizontalBarChart
									items={[
										{
											label: "All businesses",
											value: parseAnalyticsCount(summary?.total_businesses),
											display: formatCount(summary?.total_businesses),
										},
										{
											label: "Paying businesses",
											value: parseAnalyticsCount(
												summary?.total_paying_businesses,
											),
											display: formatCount(summary?.total_paying_businesses),
										},
									]}
									emptyLabel="No business counts yet."
									accent="secondary"
								/>
							)}
						</CardContent>
					</Card>
				</div>

				<Card className="shadow-sm">
					<CardHeader>
						<p className="admin-section-title">
							Owners vs subscription revenue (by month)
						</p>
						<p className="text-sm text-muted-foreground">
							Unique owners with a subscription row and paid revenue in the last 6 months.
						</p>
					</CardHeader>
					<CardContent>
						{chartLoading && comparisonSeries.length === 0 ? (
							<div className="grid grid-cols-6 gap-3">
								{Array.from({ length: 6 }).map((_, i) => (
									<Skeleton key={i} className="h-40 w-full" />
								))}
							</div>
						) : (
							<DualColumnChart series={comparisonSeries} />
						)}
					</CardContent>
				</Card>
			</section>

			<Card className="shadow-sm">
				<CardHeader>
					<SectionHeading
						title={`Transactions (${periodLabelText})`}
						description="Verified and failed transaction counts for the selected period."
					/>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className="h-20 w-full" />
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<MetricTile
								label="Verified transactions"
								value={
									statsReady
										? totalVerifiedTransactions
										: "—"
								}
							/>
							<MetricTile
								label="Verified amount"
								value={
									statsReady
										? formatRevenueAmount(totalVerifiedAmount)
										: "—"
								}
								isText
							/>
							<MetricTile
								label="Failed / fake transactions"
								value={
									statsReady ? totalFailedTransactions : "—"
								}
							/>
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="shadow-sm">
				<CardHeader>
					<SectionHeading
						title="Revenue overview"
						description="Daily, weekly, monthly, all-time, and custom-period revenue."
					/>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-16 w-full" />
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
							<RevenueTile
								label="Daily"
								amount={
									statsReady ? parseRevenueAmount(revenue?.daily) : null
								}
							/>
							<RevenueTile
								label="Weekly"
								amount={
									statsReady ? parseRevenueAmount(revenue?.weekly) : null
								}
							/>
							<RevenueTile
								label="Monthly"
								amount={
									statsReady ? parseRevenueAmount(revenue?.monthly) : null
								}
							/>
							<RevenueTile
								label="All time"
								amount={
									statsReady
										? parseRevenueAmount(revenue?.all_time)
										: null
								}
							/>
							<RevenueTile
								label={`Custom (${periodLabelText})`}
								amount={
									statsReady ? parseRevenueAmount(revenue?.custom) : null
								}
							/>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function HorizontalBarChart({
	items,
	emptyLabel,
	accent = "primary",
}: {
	items: { label: string; value: number; display: string }[];
	emptyLabel: string;
	accent?: "primary" | "secondary";
}) {
	const max = Math.max(0, ...items.map((i) => i.value));
	if (items.length === 0 || max <= 0) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">
				{emptyLabel}
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{items.map((item) => {
				const pct = max > 0 ? Math.max(4, (item.value / max) * 100) : 0;
				return (
					<div key={item.label} className="flex flex-col gap-1">
						<div className="flex items-baseline justify-between gap-2 text-sm">
							<span className="text-muted-foreground">{item.label}</span>
							<span className="tabular-nums font-medium">{item.display}</span>
						</div>
						<div className="h-2.5 overflow-hidden rounded-full bg-muted">
							<div
								className={cn(
									"h-full rounded-full transition-all duration-300",
									accent === "primary" ? "bg-primary" : "bg-foreground/70",
								)}
								style={{ width: `${pct}%` }}
							/>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function DualColumnChart({
	series,
}: {
	series: { month: string; revenue: number; owners: number }[];
}) {
	if (series.length === 0) {
		return (
			<p className="py-10 text-center text-sm text-muted-foreground">
				No subscription activity to chart yet.
			</p>
		);
	}

	const maxRevenue = Math.max(1, ...series.map((s) => s.revenue));
	const maxOwners = Math.max(1, ...series.map((s) => s.owners));

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
				<span className="inline-flex items-center gap-1.5">
					<span className="size-2.5 rounded-sm bg-primary" aria-hidden />
					Subscription revenue
				</span>
				<span className="inline-flex items-center gap-1.5">
					<span className="size-2.5 rounded-sm bg-foreground/50" aria-hidden />
					Unique owners
				</span>
			</div>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
				{series.map((point) => {
					const revH = Math.max(6, (point.revenue / maxRevenue) * 100);
					const ownH = Math.max(6, (point.owners / maxOwners) * 100);
					let monthLabel = point.month;
					try {
						const [y, m] = point.month.split("-").map(Number);
						monthLabel = format(new Date(y, m - 1, 1), "MMM yy");
					} catch {
						/* keep key */
					}
					return (
						<div key={point.month} className="flex flex-col items-center gap-2">
							<div className="flex h-36 w-full items-end justify-center gap-1.5">
								<div
									className="w-4 rounded-t bg-primary transition-all duration-300"
									style={{ height: `${revH}%` }}
									title={formatRevenueAmount(point.revenue)}
								/>
								<div
									className="w-4 rounded-t bg-foreground/50 transition-all duration-300"
									style={{ height: `${ownH}%` }}
									title={`${point.owners} owners`}
								/>
							</div>
							<div className="text-center">
								<p className="text-xs font-medium">{monthLabel}</p>
								<p className="text-[11px] tabular-nums text-muted-foreground">
									{formatRevenueAmount(point.revenue)}
								</p>
								<p className="text-[11px] tabular-nums text-muted-foreground">
									{point.owners} owners
								</p>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function MetricTile({
	label,
	value,
	isText = false,
}: {
	label: string;
	value: number | string;
	isText?: boolean;
}) {
	return (
		<div className="rounded-lg border bg-muted/30 p-4">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p
				className={
					isText
						? "admin-stat-value mt-1 text-xl"
						: "admin-stat-value mt-1 text-3xl"
				}
			>
				{typeof value === "number" ? value.toLocaleString() : value}
			</p>
		</div>
	);
}

function RevenueTile({
	label,
	amount,
}: {
	label: string;
	amount: number | null;
}) {
	return (
		<div className="rounded-lg border bg-muted/30 p-4">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="admin-stat-value mt-1 text-xl">
				{amount == null ? "—" : formatRevenueAmount(amount)}
			</p>
		</div>
	);
}
