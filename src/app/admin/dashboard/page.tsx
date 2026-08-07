"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
	Area,
	AreaChart,
	Bar,
	CartesianGrid,
	Cell,
	ComposedChart,
	Label,
	Line,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";

import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics";
import {
	defaultCustomDateRange,
	formatDateInputValue,
	formatRevenueAmount,
	parseAnalyticsCount,
	type DashboardAnalyticsPreset,
} from "@/lib/analytics";
import { getDateRangeLabel } from "@/lib/filter-labels";
import { cn } from "@/lib/utils";
import { useGetUserAcquisitionQuery } from "@/services/analytics/analyticsApi";
import { useListAllBusinessesQuery } from "@/services/branch-management/branchManagementApi";
import { useListAdminSubscriptionTransactionsQuery } from "@/services/subscription/subscriptionApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const PRESET_OPTIONS: DashboardAnalyticsPreset[] = [
	"all",
	"last_7_days",
	"last_30_days",
	"this_month",
	"custom",
];

const revenueChartConfig = {
	revenue: {
		label: "Revenue",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

const shareChartConfig = {
	paying: {
		label: "Paying",
		color: "var(--chart-1)",
	},
	notPaying: {
		label: "Not paying",
		color: "var(--chart-3)",
	},
} satisfies ChartConfig;

const monthlyChartConfig = {
	revenue: {
		label: "Revenue",
		color: "var(--chart-1)",
	},
	owners: {
		label: "Owners",
		color: "var(--chart-4)",
	},
} satisfies ChartConfig;

const acquisitionChartConfig = {
	newUsers: {
		label: "New users",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

function isPreset(v: string): v is DashboardAnalyticsPreset {
	return (
		v === "last_7_days" ||
		v === "last_30_days" ||
		v === "this_month" ||
		v === "all" ||
		v === "custom"
	);
}

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
	return parseAnalyticsCount(value).toLocaleString();
}

function monthKey(iso: string | null | undefined): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function compactMoney(value: number): string {
	if (!Number.isFinite(value) || value === 0) return "0";
	if (Math.abs(value) >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(1)}M`;
	}
	if (Math.abs(value) >= 1_000) {
		return `${(value / 1_000).toFixed(1)}k`;
	}
	return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

type RevenueGranularity = "day" | "week" | "month";

type PeriodRevenuePoint = {
	key: string;
	label: string;
	revenue: number;
};

type ShareSlice = {
	segment: "paying" | "notPaying";
	count: number;
	fill: string;
};
type MonthPoint = {
	month: string;
	label: string;
	revenue: number;
	owners: number;
};

type AcquisitionPoint = {
	key: string;
	label: string;
	newUsers: number;
};

function startOfLocalDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfLocalWeek(d: Date): Date {
	const day = d.getDay();
	const offset = day === 0 ? -6 : 1 - day;
	return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
}

function startOfLocalMonth(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), 1);
}

function bucketStart(d: Date, granularity: RevenueGranularity): Date {
	if (granularity === "day") return startOfLocalDay(d);
	if (granularity === "week") return startOfLocalWeek(d);
	return startOfLocalMonth(d);
}

function bucketKey(d: Date, granularity: RevenueGranularity): string {
	const start = bucketStart(d, granularity);
	if (granularity === "month") {
		return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
	}
	return formatDateInputValue(start);
}

function bucketLabel(key: string, granularity: RevenueGranularity): string {
	if (granularity === "month") {
		const [y, m] = key.split("-").map(Number);
		return format(new Date(y, m - 1, 1), "MMM yy");
	}
	const d = parseISO(`${key}T00:00:00`);
	if (Number.isNaN(d.getTime())) return key;
	if (granularity === "week") return `W/c ${format(d, "MMM d")}`;
	return format(d, "MMM d");
}

function advanceBucket(d: Date, granularity: RevenueGranularity): Date {
	if (granularity === "day") {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
	}
	if (granularity === "week") {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
	}
	return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function revenueGranularityForSpan(spanDays: number): RevenueGranularity {
	if (spanDays <= 45) return "day";
	if (spanDays <= 180) return "week";
	return "month";
}

function formatAcquisitionLabel(
	iso: string,
	granularity: "day" | "week" | "month",
): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	if (granularity === "day") return format(d, "MMM d");
	if (granularity === "week") return `W/c ${format(d, "MMM d")}`;
	return format(d, "MMM yy");
}

export default function DashboardPage() {
	const [defaultCustom] = useState(defaultCustomDateRange);
	const [preset, setPreset] = useState<DashboardAnalyticsPreset>("all");
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
		startDate,
		endDate,
	} = useDashboardAnalytics({
		preset,
		customStart: preset === "custom" ? customStart : undefined,
		customEnd: preset === "custom" ? customEnd : undefined,
	});

	const {
		data: acquisition,
		isLoading: acquisitionLoading,
		isFetching: acquisitionFetching,
	} = useGetUserAcquisitionQuery(
		{ startDate, endDate },
		{ skip: !isSystemAdmin || !customRangeValid || !startDate || !endDate },
	);

	const { data: subscriptionRows, isLoading: subsLoading } =
		useListAdminSubscriptionTransactionsQuery(undefined, {
			skip: !isSystemAdmin,
		});
	const { data: businesses, isLoading: businessesLoading } =
		useListAllBusinessesQuery(undefined, { skip: !isSystemAdmin });

	const periodLabelText = periodLabel(preset, customStart, customEnd);
	const hasSummary = Boolean(summary) && !error;
	const statsReady = hasSummary && !isLoading;
	const chartsLoading = isLoading || subsLoading || businessesLoading;
	const acquisitionBusy = acquisitionLoading || acquisitionFetching;

	const { periodRevenueSeries, revenueBucketLabel } = useMemo(() => {
		const empty = {
			periodRevenueSeries: [] as PeriodRevenuePoint[],
			revenueBucketLabel: "day",
		};
		if (!startDate || !endDate) return empty;

		const rangeStart = new Date(startDate);
		const rangeEnd = new Date(endDate);
		if (
			Number.isNaN(rangeStart.getTime()) ||
			Number.isNaN(rangeEnd.getTime())
		) {
			return empty;
		}

		const spanDays = Math.max(
			1,
			(rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000,
		);
		const granularity = revenueGranularityForSpan(spanDays);
		const byKey = new Map<string, number>();

		for (const row of subscriptionRows ?? []) {
			const ts = row.started_at ?? row.created_at;
			if (!ts) continue;
			const t = new Date(ts);
			if (Number.isNaN(t.getTime()) || t < rangeStart || t > rangeEnd) {
				continue;
			}
			if (
				row.amount == null ||
				!Number.isFinite(row.amount) ||
				row.amount <= 0
			) {
				continue;
			}
			if (String(row.status ?? "").toLowerCase() === "pending") continue;

			const key = bucketKey(t, granularity);
			byKey.set(key, (byKey.get(key) ?? 0) + row.amount);
		}

		const cursor = bucketStart(rangeStart, granularity);
		const endBucket = bucketStart(rangeEnd, granularity);
		const estimatedBuckets =
			granularity === "day"
				? spanDays + 1
				: granularity === "week"
					? spanDays / 7 + 1
					: spanDays / 30 + 1;

		const points: PeriodRevenuePoint[] = [];
		// Long ranges: only non-empty buckets so we never plot 600 empty months.
		if (estimatedBuckets > 48) {
			for (const [key, amount] of byKey) {
				if (amount <= 0) continue;
				points.push({
					key,
					label: bucketLabel(key, granularity),
					revenue: amount,
				});
			}
			points.sort((a, b) => a.key.localeCompare(b.key));
		} else {
			let walk = cursor;
			while (walk.getTime() <= endBucket.getTime()) {
				const key = bucketKey(walk, granularity);
				points.push({
					key,
					label: bucketLabel(key, granularity),
					revenue: byKey.get(key) ?? 0,
				});
				walk = advanceBucket(walk, granularity);
			}
		}

		return {
			periodRevenueSeries: points,
			revenueBucketLabel:
				granularity === "day"
					? "day"
					: granularity === "week"
						? "week"
						: "month",
		};
	}, [subscriptionRows, startDate, endDate]);

	const shareChartData = useMemo((): ShareSlice[] => {
		if (!statsReady) return [];
		const registered = parseAnalyticsCount(summary?.total_businesses);
		const paying = parseAnalyticsCount(summary?.total_paying_businesses);
		const notPaying = Math.max(0, registered - paying);
		return [
			{
				segment: "paying",
				count: paying,
				fill: "var(--color-paying)",
			},
			{
				segment: "notPaying",
				count: notPaying,
				fill: "var(--color-notPaying)",
			},
		];
	}, [statsReady, summary?.total_businesses, summary?.total_paying_businesses]);

	const monthlySeries = useMemo((): MonthPoint[] => {
		const ownerByBiz = new Map<string, string>();
		for (const b of businesses ?? []) {
			if (b.owner_id) ownerByBiz.set(b.id, b.owner_id);
		}
		const byMonth = new Map<string, { revenue: number; owners: Set<string> }>();
		for (const row of subscriptionRows ?? []) {
			const key = monthKey(row.started_at ?? row.created_at);
			if (!key) continue;
			const bucket = byMonth.get(key) ?? {
				revenue: 0,
				owners: new Set<string>(),
			};
			if (
				row.amount != null &&
				Number.isFinite(row.amount) &&
				row.amount > 0 &&
				String(row.status ?? "").toLowerCase() !== "pending"
			) {
				bucket.revenue += row.amount;
			}
			bucket.owners.add(ownerByBiz.get(row.business_id) ?? row.business_id);
			byMonth.set(key, bucket);
		}
		return Array.from(byMonth.entries())
			.map(([month, v]) => {
				let label = month;
				try {
					const [y, m] = month.split("-").map(Number);
					label = format(new Date(y, m - 1, 1), "MMM yy");
				} catch {
					/* keep key */
				}
				return {
					month,
					label,
					revenue: v.revenue,
					owners: v.owners.size,
				};
			})
			.toSorted((a, b) => a.month.localeCompare(b.month))
			.slice(-6);
	}, [subscriptionRows, businesses]);

	const acquisitionSeries = useMemo((): AcquisitionPoint[] => {
		if (!acquisition?.buckets?.length) return [];
		const granularity = acquisition.granularity;
		return acquisition.buckets.map((b) => ({
			key: b.period_start,
			label: formatAcquisitionLabel(b.period_start, granularity),
			newUsers: b.new_users,
		}));
	}, [acquisition]);

	const acquisitionTotal = acquisition?.total_new_users ?? 0;
	const hasAcquisitionPlot = acquisitionSeries.some((p) => p.newUsers > 0);

	const payShare =
		statsReady && parseAnalyticsCount(summary?.total_businesses) > 0
			? Math.round(
					(parseAnalyticsCount(summary?.total_paying_businesses) /
						parseAnalyticsCount(summary?.total_businesses)) *
						100,
				)
			: null;

	const hasRevenuePlot =
		periodRevenueSeries.length > 0 &&
		periodRevenueSeries.some((r) => r.revenue > 0);
	const hasSharePlot = shareChartData.some((s) => s.count > 0);

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
			<header className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<p className="font-mono text-[11px] font-medium tracking-[0.14em] text-primary uppercase">
						Platform close-out
					</p>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div className="min-w-0">
							<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
								Dashboard
							</h1>
							<p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
								Period revenue, verification quality, and who is paying — from
								live platform data.
							</p>
						</div>
						{isSystemAdmin ? (
							<div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3 shadow-xs">
								<Field className="w-38 gap-1">
									<FieldLabel
										htmlFor="dashboard-range"
										className="text-[11px] text-muted-foreground"
									>
										Period
									</FieldLabel>
									<Select
										value={preset}
										onValueChange={(v) => {
											if (v != null && isPreset(v)) setPreset(v);
										}}
									>
										<SelectTrigger
											id="dashboard-range"
											className="h-9 bg-background"
										>
											<span className="flex flex-1 truncate text-left text-sm">
												{getDateRangeLabel(preset)}
											</span>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{PRESET_OPTIONS.map((p) => (
													<SelectItem key={p} value={p}>
														{getDateRangeLabel(p)}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								{preset === "custom" ? (
									<FieldGroup className="flex-row flex-wrap items-end gap-2">
										<Field className="w-38 gap-1">
											<FieldLabel
												htmlFor="dashboard-start-date"
												className="text-[11px] text-muted-foreground"
											>
												From
											</FieldLabel>
											<Input
												id="dashboard-start-date"
												type="date"
												value={customStart}
												max={customEnd || todayMax}
												onChange={(e) => setCustomStart(e.target.value)}
												className="h-9 bg-background"
											/>
										</Field>
										<Field className="w-38 gap-1">
											<FieldLabel
												htmlFor="dashboard-end-date"
												className="text-[11px] text-muted-foreground"
											>
												To
											</FieldLabel>
											<Input
												id="dashboard-end-date"
												type="date"
												value={customEnd}
												min={customStart}
												max={todayMax}
												onChange={(e) => setCustomEnd(e.target.value)}
												className="h-9 bg-background"
											/>
										</Field>
									</FieldGroup>
								) : null}
							</div>
						) : null}
					</div>
				</div>

				{error ? (
					<Alert variant="destructive">
						<AlertTitle>Can’t load close-out</AlertTitle>
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
			</header>

			<section
				aria-labelledby="closeout-heading"
				className="overflow-hidden rounded-2xl border border-primary/15 bg-primary text-primary-foreground shadow-md"
			>
				<div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
					<div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
						<div className="flex flex-col gap-2">
							<p
								id="closeout-heading"
								className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary-foreground/70 uppercase"
							>
								Period revenue
							</p>
							<p className="text-sm text-primary-foreground/80">
								{periodLabelText}
							</p>
						</div>
						{isLoading ? (
							<div className="flex flex-col gap-2">
								<Skeleton className="h-12 w-48 bg-primary-foreground/20" />
								<Skeleton className="h-4 w-32 bg-primary-foreground/15" />
							</div>
						) : statsReady ? (
							<div className="flex flex-col gap-1">
								<p className="font-mono text-[clamp(2rem,5vw,2.75rem)] leading-none font-semibold tracking-tight tabular-nums">
									{formatRevenueAmount(periodRevenue)}
								</p>
								<p className="text-sm text-primary-foreground/75">
									Collected subscription payments in the selected window
								</p>
							</div>
						) : (
							<div className="flex flex-col gap-1">
								<p className="font-mono text-3xl font-semibold tracking-tight">
									—
								</p>
								<p className="text-sm text-primary-foreground/75">
									Waiting for analytics
								</p>
							</div>
						)}
					</div>

					<div className="hidden w-px shrink-0 bg-primary-foreground/15 lg:block" />

					<div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-5">
						<LedgerStat
							label="Verified amount"
							loading={isLoading}
							value={
								statsReady ? formatRevenueAmount(totalVerifiedAmount) : null
							}
							hint={statsReady ? "In selected period" : undefined}
						/>
						<LedgerStat
							label="Success rate"
							loading={isLoading}
							value={statsReady ? `${successRate}%` : null}
							hint={
								statsReady
									? `${(
											totalVerifiedTransactions + totalFailedTransactions
										).toLocaleString()} checks in period`
									: undefined
							}
						/>
						<LedgerStat
							label="Verified txns"
							loading={isLoading}
							value={
								statsReady
									? totalVerifiedTransactions.toLocaleString()
									: null
							}
							hint={statsReady ? "In selected period" : undefined}
						/>
						<LedgerStat
							label="Failed / fake"
							loading={isLoading}
							value={
								statsReady
									? totalFailedTransactions.toLocaleString()
									: null
							}
							hint={statsReady ? "In selected period" : undefined}
						/>
					</div>
				</div>
			</section>

			<section aria-labelledby="footprint-heading" className="flex flex-col gap-3">
				<div className="flex items-baseline justify-between gap-3">
					<h2
						id="footprint-heading"
						className="text-sm font-semibold tracking-tight text-foreground"
					>
						Business footprint
					</h2>
					{payShare != null ? (
						<p className="font-mono text-xs text-muted-foreground tabular-nums">
							{payShare}% paying
						</p>
					) : null}
				</div>
				<div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-3">
					<FootprintCell
						label="Registered businesses"
						loading={isLoading}
						value={
							statsReady ? formatCount(summary?.total_businesses) : null
						}
					/>
					<FootprintCell
						label="Paying businesses"
						loading={isLoading}
						value={
							statsReady
								? formatCount(summary?.total_paying_businesses)
								: null
						}
						border
					/>
					<FootprintCell
						label="Most subscribed plan"
						loading={isLoading}
						value={
							statsReady
								? summary?.top_plan?.plan_name
									? summary.top_plan.plan_name
									: "—"
								: null
						}
						hint={
							statsReady && summary?.top_plan?.subscription_count != null
								? `${formatCount(summary.top_plan.subscription_count)} subs`
								: undefined
						}
						border
					/>
				</div>
			</section>

			<section
				aria-labelledby="acquisition-heading"
				className="flex flex-col gap-3"
			>
				<div className="flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
					<div className="flex flex-col gap-0.5">
						<h2
							id="acquisition-heading"
							className="text-sm font-semibold tracking-tight text-foreground"
						>
							User acquisition
						</h2>
						<p className="text-sm text-muted-foreground">
							New platform signups for {periodLabelText}. Bucket size follows
							the range length (day / week / month).
						</p>
					</div>
					{!acquisitionBusy && acquisition ? (
						<p className="font-mono text-xs text-muted-foreground tabular-nums">
							{acquisitionTotal.toLocaleString()} new · {acquisition.granularity}{" "}
							buckets
						</p>
					) : null}
				</div>

				<Card size="sm">
					<CardHeader className="border-b">
						<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
							<div className="flex flex-col gap-1">
								<CardTitle>New users over time</CardTitle>
								<CardDescription>
									Non-superuser accounts created in the selected period.
								</CardDescription>
							</div>
							{!acquisitionBusy && hasAcquisitionPlot ? (
								<p className="font-mono text-lg font-semibold tracking-tight tabular-nums text-foreground">
									{acquisitionTotal.toLocaleString()}
									<span className="ml-1.5 text-xs font-medium text-muted-foreground">
										total
									</span>
								</p>
							) : null}
						</div>
					</CardHeader>
					<CardContent className="pt-4">
						{acquisitionBusy && acquisitionSeries.length === 0 ? (
							<Skeleton className="h-70 w-full" />
						) : !hasAcquisitionPlot ? (
							<ChartEmpty
								title="No signups in this period"
								body="Try a wider range, or check All time to see historical acquisition."
							/>
						) : (
							<ChartContainer
								config={acquisitionChartConfig}
								className="aspect-auto h-70 w-full"
							>
								<AreaChart
									accessibilityLayer
									data={acquisitionSeries}
									margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
								>
									<defs>
										<linearGradient
											id="fillNewUsers"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="0%"
												stopColor="var(--color-newUsers)"
												stopOpacity={0.35}
											/>
											<stop
												offset="100%"
												stopColor="var(--color-newUsers)"
												stopOpacity={0.02}
											/>
										</linearGradient>
									</defs>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										tickMargin={10}
										minTickGap={24}
										tick={{ fontSize: 11 }}
									/>
									<YAxis
										allowDecimals={false}
										tickLine={false}
										axisLine={false}
										width={36}
										tick={{ fontSize: 11 }}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												labelKey="label"
												formatter={(value) =>
													`${Number(value ?? 0).toLocaleString()} users`
												}
											/>
										}
									/>
									<Area
										dataKey="newUsers"
										type="monotone"
										fill="url(#fillNewUsers)"
										stroke="var(--color-newUsers)"
										strokeWidth={2}
										dot={acquisitionSeries.length <= 14}
										activeDot={{ r: 4 }}
									/>
								</AreaChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>
			</section>

			<section aria-labelledby="compare-heading" className="flex flex-col gap-3">
				<div className="flex flex-col gap-0.5">
					<h2
						id="compare-heading"
						className="text-sm font-semibold tracking-tight text-foreground"
					>
						Compare
					</h2>
					<p className="text-sm text-muted-foreground">
						Revenue in the selected period, paying mix, and owners against
						subscription revenue by month.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
					<Card size="sm" className="lg:col-span-3">
						<CardHeader className="border-b">
							<CardTitle>Revenue over time</CardTitle>
							<CardDescription>
								Paid subscriptions in {periodLabelText}, by{" "}
								{revenueBucketLabel}. Total for this range:{" "}
								{statsReady
									? formatRevenueAmount(periodRevenue)
									: "—"}
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-4">
							{chartsLoading && periodRevenueSeries.length === 0 ? (
								<Skeleton className="h-65 w-full" />
							) : !hasRevenuePlot ? (
								<ChartEmpty
									title="Nothing to plot"
									body="No paid subscription revenue in this period yet."
								/>
							) : (
								<ChartContainer
									config={revenueChartConfig}
									className="aspect-auto h-70 w-full"
								>
									<AreaChart
										accessibilityLayer
										data={periodRevenueSeries}
										margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
									>
										<defs>
											<linearGradient
												id="fillPeriodRevenue"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="0%"
													stopColor="var(--color-revenue)"
													stopOpacity={0.35}
												/>
												<stop
													offset="100%"
													stopColor="var(--color-revenue)"
													stopOpacity={0.02}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid vertical={false} />
										<XAxis
											dataKey="label"
											tickLine={false}
											axisLine={false}
											tickMargin={10}
											minTickGap={24}
											tick={{ fontSize: 11 }}
										/>
										<YAxis
											tickLine={false}
											axisLine={false}
											width={48}
											tickFormatter={compactMoney}
											tick={{ fontSize: 11 }}
										/>
										<ChartTooltip
											content={
												<ChartTooltipContent
													labelKey="label"
													formatter={(value) =>
														formatRevenueAmount(Number(value ?? 0))
													}
												/>
											}
										/>
										<Area
											dataKey="revenue"
											type="monotone"
											fill="url(#fillPeriodRevenue)"
											stroke="var(--color-revenue)"
											strokeWidth={2}
											dot={periodRevenueSeries.length <= 14}
											activeDot={{ r: 4 }}
										/>
									</AreaChart>
								</ChartContainer>
							)}
						</CardContent>
					</Card>

					<Card size="sm" className="lg:col-span-2">
						<CardHeader className="border-b">
							<CardTitle>Paying share</CardTitle>
							<CardDescription>
								Registered businesses that are currently paying.
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-4">
							{chartsLoading && !hasSummary ? (
								<Skeleton className="h-65 w-full" />
							) : !hasSharePlot ? (
								<ChartEmpty
									title="Nothing to plot"
									body="Business counts appear when analytics loads."
								/>
							) : (
								<ChartContainer
									config={shareChartConfig}
									className="aspect-auto mx-auto h-65 w-full"
								>
									<PieChart>
										<ChartTooltip
											content={
												<ChartTooltipContent
													nameKey="segment"
													formatter={(value) =>
														Number(value ?? 0).toLocaleString()
													}
												/>
											}
										/>
										<Pie
											data={shareChartData}
											dataKey="count"
											nameKey="segment"
											innerRadius={58}
											outerRadius={88}
											strokeWidth={2}
										>
											{shareChartData.map((slice) => (
												<Cell key={slice.segment} fill={slice.fill} />
											))}
											<Label
												content={({ viewBox }) => {
													if (
														viewBox &&
														"cx" in viewBox &&
														"cy" in viewBox &&
														payShare != null
													) {
														return (
															<text
																x={viewBox.cx}
																y={viewBox.cy}
																textAnchor="middle"
																dominantBaseline="middle"
															>
																<tspan
																	x={viewBox.cx}
																	y={(viewBox.cy ?? 0) - 6}
																	className="fill-foreground font-mono text-2xl font-semibold"
																>
																	{payShare}%
																</tspan>
																<tspan
																	x={viewBox.cx}
																	y={(viewBox.cy ?? 0) + 16}
																	className="fill-muted-foreground text-xs"
																>
																	paying
																</tspan>
															</text>
														);
													}
													return null;
												}}
											/>
										</Pie>
										<ChartLegend
											content={<ChartLegendContent nameKey="segment" />}
										/>
									</PieChart>
								</ChartContainer>
							)}
						</CardContent>
					</Card>
				</div>

				<Card size="sm">
					<CardHeader className="border-b">
						<div className="flex flex-col gap-1">
							<CardTitle>Owners and revenue by month</CardTitle>
							<CardDescription>
								Bars are paid subscription revenue; the line is unique active
								owners. Last six months with activity.
							</CardDescription>
						</div>
					</CardHeader>
					<CardContent className="pt-5">
						{chartsLoading && monthlySeries.length === 0 ? (
							<Skeleton className="h-75 w-full" />
						) : monthlySeries.length === 0 ? (
							<ChartEmpty
								title="No monthly activity yet"
								body="When owners subscribe, each month will show how many paid and how much revenue they generated."
							/>
						) : (
							<ChartContainer
								config={monthlyChartConfig}
								className="aspect-auto h-80 w-full"
							>
								<ComposedChart
									accessibilityLayer
									data={monthlySeries}
									margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
								>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										tickMargin={10}
										tick={{ fontSize: 12 }}
									/>
									<YAxis
										yAxisId="revenue"
										tickLine={false}
										axisLine={false}
										width={48}
										tickFormatter={compactMoney}
										tick={{ fontSize: 11 }}
									/>
									<YAxis
										yAxisId="owners"
										orientation="right"
										tickLine={false}
										axisLine={false}
										width={36}
										tick={{ fontSize: 11 }}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												labelKey="label"
												formatter={(value, name) => {
													if (name === "revenue" || name === "Revenue") {
														return formatRevenueAmount(Number(value ?? 0));
													}
													return Number(value ?? 0).toLocaleString();
												}}
											/>
										}
									/>
									<ChartLegend content={<ChartLegendContent />} />
									<Bar
										yAxisId="revenue"
										dataKey="revenue"
										fill="var(--color-revenue)"
										radius={[6, 6, 0, 0]}
										maxBarSize={40}
									/>
									<Line
										yAxisId="owners"
										type="monotone"
										dataKey="owners"
										stroke="var(--color-owners)"
										strokeWidth={2}
										dot={{ r: 3, fill: "var(--color-owners)" }}
										activeDot={{ r: 5 }}
									/>
								</ComposedChart>
							</ChartContainer>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}

function LedgerStat({
	label,
	value,
	hint,
	loading,
}: {
	label: string;
	value: string | null;
	hint?: string;
	loading: boolean;
}) {
	return (
		<div className="flex flex-col gap-1">
			<p className="text-[11px] font-medium tracking-wide text-primary-foreground/65 uppercase">
				{label}
			</p>
			{loading ? (
				<Skeleton className="h-7 w-24 bg-primary-foreground/20" />
			) : (
				<p className="font-mono text-lg leading-snug font-semibold tracking-tight tabular-nums">
					{value ?? "—"}
				</p>
			)}
			{hint && !loading ? (
				<p className="text-xs text-primary-foreground/60">{hint}</p>
			) : null}
		</div>
	);
}

function FootprintCell({
	label,
	value,
	hint,
	loading,
	border = false,
}: {
	label: string;
	value: string | null;
	hint?: string;
	loading: boolean;
	border?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex flex-col gap-2 px-5 py-4",
				border && "border-border sm:border-l",
			)}
		>
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			{loading ? (
				<Skeleton className="h-8 w-20" />
			) : (
				<p className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-foreground">
					{value ?? "—"}
				</p>
			)}
			{hint && !loading ? (
				<p className="text-xs text-muted-foreground">{hint}</p>
			) : (
				<span className="h-4" aria-hidden />
			)}
		</div>
	);
}

function ChartEmpty({ title, body }: { title: string; body: string }) {
	return (
		<div className="flex flex-col items-start gap-1 py-10">
			<p className="text-sm font-medium text-foreground">{title}</p>
			<p className="max-w-md text-sm text-muted-foreground">{body}</p>
		</div>
	);
}
