"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
	ArrowDownIcon,
	ArrowUpDownIcon,
	ArrowUpIcon,
	SlidersHorizontalIcon,
	XIcon,
} from "lucide-react";
import type {
	CreditUsageSortBy,
	CreditUsageSortDir,
} from "@/services/analytics/analyticsApi";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Label,
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
	parseRevenueAmount,
	type DashboardAnalyticsPreset,
} from "@/lib/analytics";
import { getDateRangeLabel } from "@/lib/filter-labels";
import { PLAN_FILTER_ALL } from "@/lib/subscription-filters";
import { cn } from "@/lib/utils";
import {
	useGetCreditUsageQuery,
	useGetPayingShareQuery,
	useGetPaymentVolume30dQuery,
	useGetUserAcquisitionQuery,
} from "@/services/analytics/analyticsApi";
import { useListSubscriptionPlansQuery } from "@/services/subscription-plan/subscriptionPlanApi";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const PRESET_OPTIONS: DashboardAnalyticsPreset[] = [
	"all",
	"last_7_days",
	"last_30_days",
	"this_month",
	"custom",
];

const CREDIT_USAGE_LIMIT_OPTIONS = [5, 10, 20, 50, 100] as const;
type CreditUsageLimit = (typeof CREDIT_USAGE_LIMIT_OPTIONS)[number];

const CREDIT_USAGE_SORT_LABELS: Record<CreditUsageSortBy, string> = {
	business_name: "Business",
	credits_used: "Used",
	credits_limit: "Limit",
	available_credits: "Available",
	usage_percentage: "Usage",
};

function isCreditUsageLimit(v: string): v is `${CreditUsageLimit}` {
	return CREDIT_USAGE_LIMIT_OPTIONS.some((n) => String(n) === v);
}

function usageTone(pct: number): "critical" | "warn" | "ok" {
	if (pct >= 90) return "critical";
	if (pct >= 70) return "warn";
	return "ok";
}

function parseOptionalNumber(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const n = Number(trimmed);
	return Number.isFinite(n) ? n : null;
}

function isRangeInvalid(minRaw: string, maxRaw: string): boolean {
	const min = parseOptionalNumber(minRaw);
	const max = parseOptionalNumber(maxRaw);
	return min != null && max != null && min > max;
}

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

const acquisitionChartConfig = {
	newUsers: {
		label: "New users",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

const volumeChartConfig = {
	volume: {
		label: "Volume",
		color: "var(--chart-1)",
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

type ShareSlice = {
	segment: "paying" | "notPaying";
	count: number;
	fill: string;
};

type AcquisitionPoint = {
	key: string;
	label: string;
	newUsers: number;
};

type VolumePoint = {
	key: string;
	label: string;
	volume: number;
};

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

function formatVolumeBucketLabel(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return format(d, "MMM d");
}

export default function DashboardPage() {
	const router = useRouter();
	const [defaultCustom] = useState(defaultCustomDateRange);
	const [preset, setPreset] = useState<DashboardAnalyticsPreset>("all");
	const [customStart, setCustomStart] = useState(defaultCustom.start);
	const [customEnd, setCustomEnd] = useState(defaultCustom.end);
	const [creditLimit, setCreditLimit] = useState<CreditUsageLimit>(10);
	const [creditBusinessName, setCreditBusinessName] = useState("");
	const [creditPlanId, setCreditPlanId] = useState(PLAN_FILTER_ALL);
	const [creditMinUsage, setCreditMinUsage] = useState("");
	const [creditMaxUsage, setCreditMaxUsage] = useState("");
	const [creditMinUsed, setCreditMinUsed] = useState("");
	const [creditMaxUsed, setCreditMaxUsed] = useState("");
	const [creditMinLimit, setCreditMinLimit] = useState("");
	const [creditMaxLimit, setCreditMaxLimit] = useState("");
	const [creditFiltersOpen, setCreditFiltersOpen] = useState(false);
	const [creditSortBy, setCreditSortBy] =
		useState<CreditUsageSortBy>("usage_percentage");
	const [creditSortDir, setCreditSortDir] =
		useState<CreditUsageSortDir>("desc");
	const deferredCreditBusinessName = useDeferredValue(creditBusinessName);
	const todayMax = formatDateInputValue(new Date());

	const {
		summary,
		periodRevenue,
		periodRevenueApi,
		periodRevenueManual,
		totalVerifiedAmount,
		totalVerifiedTransactions,
		totalFailedTransactions,
		totalFakeTransactions,
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

	const { data: subscriptionPlans } = useListSubscriptionPlansQuery(
		undefined,
		{ skip: !isSystemAdmin },
	);

	const rangeReady =
		isSystemAdmin && customRangeValid && !!startDate && !!endDate;

	const {
		data: acquisition,
		isLoading: acquisitionLoading,
		isFetching: acquisitionFetching,
	} = useGetUserAcquisitionQuery({ startDate, endDate }, { skip: !rangeReady });

	const {
		data: paymentVolume,
		isLoading: volumeLoading,
		isFetching: volumeFetching,
	} = useGetPaymentVolume30dQuery(
		{ startDate, endDate },
		{ skip: !rangeReady },
	);

	const {
		data: payingShare,
		isLoading: shareLoading,
		isFetching: shareFetching,
	} = useGetPayingShareQuery(undefined, { skip: !isSystemAdmin });

	const creditUsageQuery = useMemo(() => {
		const minUsage = parseOptionalNumber(creditMinUsage);
		const maxUsage = parseOptionalNumber(creditMaxUsage);
		const minUsed = parseOptionalNumber(creditMinUsed);
		const maxUsed = parseOptionalNumber(creditMaxUsed);
		const minLimit = parseOptionalNumber(creditMinLimit);
		const maxLimit = parseOptionalNumber(creditMaxLimit);
		return {
			limit: creditLimit,
			business_name: deferredCreditBusinessName.trim() || null,
			plan_id: creditPlanId === PLAN_FILTER_ALL ? null : creditPlanId,
			min_usage_percentage: minUsage,
			max_usage_percentage: maxUsage,
			min_credits_used: minUsed,
			max_credits_used: maxUsed,
			min_credits_limit: minLimit,
			max_credits_limit: maxLimit,
			sort_by: creditSortBy,
			sort_dir: creditSortDir,
		};
	}, [
		creditLimit,
		deferredCreditBusinessName,
		creditPlanId,
		creditMinUsage,
		creditMaxUsage,
		creditMinUsed,
		creditMaxUsed,
		creditMinLimit,
		creditMaxLimit,
		creditSortBy,
		creditSortDir,
	]);

	function toggleCreditSort(column: CreditUsageSortBy) {
		if (creditSortBy === column) {
			setCreditSortDir((d) => (d === "asc" ? "desc" : "asc"));
			return;
		}
		setCreditSortBy(column);
		setCreditSortDir(column === "business_name" ? "asc" : "desc");
	}

	const creditUsageRangeInvalid =
		isRangeInvalid(creditMinUsage, creditMaxUsage) ||
		isRangeInvalid(creditMinUsed, creditMaxUsed) ||
		isRangeInvalid(creditMinLimit, creditMaxLimit);

	const creditAdvancedActive =
		Boolean(creditMinUsage.trim()) ||
		Boolean(creditMaxUsage.trim()) ||
		Boolean(creditMinUsed.trim()) ||
		Boolean(creditMaxUsed.trim()) ||
		Boolean(creditMinLimit.trim()) ||
		Boolean(creditMaxLimit.trim());

	const creditFiltersActive =
		Boolean(deferredCreditBusinessName.trim()) ||
		creditPlanId !== PLAN_FILTER_ALL ||
		creditAdvancedActive;

	const creditPlanLabel =
		creditPlanId === PLAN_FILTER_ALL
			? "All plans"
			: (subscriptionPlans?.find((p) => p.id === creditPlanId)?.name ??
				"Plan");

	const creditSortLabel = CREDIT_USAGE_SORT_LABELS[creditSortBy];

	const creditChips = useMemo(() => {
		const chips: { key: string; label: string; clear: () => void }[] = [];
		const name = deferredCreditBusinessName.trim();
		if (name) {
			chips.push({
				key: "business",
				label: `Business: ${name}`,
				clear: () => setCreditBusinessName(""),
			});
		}
		if (creditPlanId !== PLAN_FILTER_ALL) {
			chips.push({
				key: "plan",
				label: `Plan: ${creditPlanLabel}`,
				clear: () => setCreditPlanId(PLAN_FILTER_ALL),
			});
		}
		if (creditMinUsage.trim() || creditMaxUsage.trim()) {
			chips.push({
				key: "usage",
				label: `Usage %: ${creditMinUsage.trim() || "0"}–${creditMaxUsage.trim() || "∞"}`,
				clear: () => {
					setCreditMinUsage("");
					setCreditMaxUsage("");
				},
			});
		}
		if (creditMinUsed.trim() || creditMaxUsed.trim()) {
			chips.push({
				key: "used",
				label: `Used: ${creditMinUsed.trim() || "0"}–${creditMaxUsed.trim() || "∞"}`,
				clear: () => {
					setCreditMinUsed("");
					setCreditMaxUsed("");
				},
			});
		}
		if (creditMinLimit.trim() || creditMaxLimit.trim()) {
			chips.push({
				key: "limit",
				label: `Limit: ${creditMinLimit.trim() || "0"}–${creditMaxLimit.trim() || "∞"}`,
				clear: () => {
					setCreditMinLimit("");
					setCreditMaxLimit("");
				},
			});
		}
		return chips;
	}, [
		deferredCreditBusinessName,
		creditPlanId,
		creditPlanLabel,
		creditMinUsage,
		creditMaxUsage,
		creditMinUsed,
		creditMaxUsed,
		creditMinLimit,
		creditMaxLimit,
	]);

	const {
		data: creditUsage,
		isLoading: creditLoading,
		isFetching: creditFetching,
	} = useGetCreditUsageQuery(creditUsageQuery, {
		skip: !isSystemAdmin || creditUsageRangeInvalid,
	});

	function clearCreditFilters() {
		setCreditBusinessName("");
		setCreditPlanId(PLAN_FILTER_ALL);
		setCreditMinUsage("");
		setCreditMaxUsage("");
		setCreditMinUsed("");
		setCreditMaxUsed("");
		setCreditMinLimit("");
		setCreditMaxLimit("");
	}

	const periodLabelText = periodLabel(preset, customStart, customEnd);
	const hasSummary = Boolean(summary) && !error;
	const statsReady = hasSummary && !isLoading;
	const acquisitionBusy = acquisitionLoading || acquisitionFetching;
	const volumeBusy = volumeLoading || volumeFetching;
	const shareBusy = shareLoading || shareFetching;
	const creditBusy = creditLoading || creditFetching;

	const shareChartData = useMemo((): ShareSlice[] => {
		if (!payingShare) return [];
		const paying = parseAnalyticsCount(payingShare.total_paying_businesses);
		const notPaying = parseAnalyticsCount(
			payingShare.total_not_paying_businesses,
		);
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
	}, [payingShare]);

	const acquisitionSeries = useMemo((): AcquisitionPoint[] => {
		if (!acquisition?.buckets?.length) return [];
		const granularity = acquisition.granularity;
		return acquisition.buckets.map((b) => ({
			key: b.period_start,
			label: formatAcquisitionLabel(b.period_start, granularity),
			newUsers: b.new_users,
		}));
	}, [acquisition]);

	const volumeSeries = useMemo((): VolumePoint[] => {
		if (!paymentVolume?.buckets?.length) return [];
		return paymentVolume.buckets.map((b) => ({
			key: b.period_start,
			label: formatVolumeBucketLabel(b.period_start),
			volume: parseRevenueAmount(b.volume),
		}));
	}, [paymentVolume]);

	const acquisitionTotal = acquisition?.total_new_users ?? 0;
	const hasAcquisitionPlot = acquisitionSeries.some((p) => p.newUsers > 0);
	const hasVolumePlot = volumeSeries.some((p) => p.volume > 0);
	const volumeTotal = parseRevenueAmount(paymentVolume?.total_volume);

	const payShare = payingShare
		? Math.round(parseRevenueAmount(payingShare.paying_percentage))
		: statsReady && parseAnalyticsCount(summary?.total_businesses) > 0
			? Math.round(
					(parseAnalyticsCount(summary?.total_paying_businesses) /
						parseAnalyticsCount(summary?.total_businesses)) *
						100,
				)
			: null;

	const hasSharePlot = shareChartData.some((s) => s.count > 0);
	const creditRows = creditUsage?.businesses ?? [];

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
			<header className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<p className="admin-eyebrow">Platform close-out</p>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div className="min-w-0">
							<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
								Dashboard
							</h1>
							<p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
								Period revenue, verification quality, and who is paying from
								live platform data.
							</p>
						</div>
						{isSystemAdmin ? (
							<div>
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

			<section aria-labelledby="closeout-heading" className="admin-brand-band">
				<div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
					<div className="flex min-w-0 flex-1 flex-col gap-3">
						<p id="closeout-heading" className="admin-brand-band-label">
							Period revenue
						</p>
						{isLoading ? (
							<div className="flex flex-col gap-2">
								<Skeleton className="admin-brand-band-skeleton h-12 w-48" />
								<Skeleton className="admin-brand-band-skeleton h-4 w-32" />
							</div>
						) : statsReady ? (
							<div className="flex flex-col gap-1">
								<p className="font-mono text-[clamp(2rem,5vw,2.75rem)] leading-none font-semibold tracking-tight tabular-nums">
									{formatRevenueAmount(periodRevenue)}
								</p>
								<p className="admin-brand-band-muted">
									Collected subscription payments in the selected window
								</p>
								<p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm font-medium tabular-nums text-primary-foreground">
									API {formatRevenueAmount(periodRevenueApi)} · Manual{" "}
									{formatRevenueAmount(periodRevenueManual)}
								</p>
							</div>
						) : (
							<div className="flex flex-col gap-1">
								<p className="font-mono text-3xl font-semibold tracking-tight">
									—
								</p>
								<p className="admin-brand-band-muted">Waiting for analytics</p>
							</div>
						)}
					</div>

					<div className="admin-brand-band-divider" />

					<div className="grid flex-1 grid-cols-3 gap-x-6 gap-y-5">
						<LedgerStat
							label="Verified amount"
							loading={isLoading}
							value={
								statsReady ? formatRevenueAmount(totalVerifiedAmount) : null
							}
							hint={
								statsReady ? "Receipt volume, not subscriptions" : undefined
							}
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
								statsReady ? totalVerifiedTransactions.toLocaleString() : null
							}
							hint={statsReady ? "In selected period" : undefined}
						/>
						<LedgerStat
							label="Fake"
							loading={isLoading}
							value={statsReady ? totalFakeTransactions.toLocaleString() : null}
							hint={statsReady ? "In selected period" : undefined}
						/>
						<LedgerStat
							label="Failed"
							loading={isLoading}
							value={
								statsReady ? totalFailedTransactions.toLocaleString() : null
							}
							hint={statsReady ? "In selected period" : undefined}
						/>
					</div>
				</div>
			</section>

			<section
				aria-labelledby="footprint-heading"
				className="flex flex-col gap-3"
			>
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
						value={statsReady ? formatCount(summary?.total_businesses) : null}
					/>
					<FootprintCell
						label="Paying businesses"
						loading={isLoading}
						value={
							statsReady ? formatCount(summary?.total_paying_businesses) : null
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
							{acquisitionTotal.toLocaleString()} new ·{" "}
							{acquisition.granularity} buckets
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

			<section
				aria-labelledby="compare-heading"
				className="flex flex-col gap-3"
			>
				<div className="flex flex-col gap-0.5">
					<h2
						id="compare-heading"
						className="text-sm font-semibold tracking-tight text-foreground"
					>
						Compare
					</h2>
					<p className="text-sm text-muted-foreground">
						Payment volume, paying mix, and businesses closest to their credit
						limit.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
					<Card size="sm" className="lg:col-span-3">
						<CardHeader className="border-b">
							<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
								<div className="flex flex-col gap-1">
									<CardTitle>Payment volume</CardTitle>
									<CardDescription>
										Volume in ~5-day buckets for the selected window (defaults
										to the last 30 days on the API).
									</CardDescription>
								</div>
								{!volumeBusy && hasVolumePlot ? (
									<p className="font-mono text-sm font-semibold tabular-nums text-foreground">
										{formatRevenueAmount(volumeTotal)}
									</p>
								) : null}
							</div>
						</CardHeader>
						<CardContent className="pt-4">
							{volumeBusy && volumeSeries.length === 0 ? (
								<Skeleton className="h-65 w-full" />
							) : !hasVolumePlot ? (
								<ChartEmpty
									title="No payment volume"
									body="Successful payments in this window will show here."
								/>
							) : (
								<ChartContainer
									config={volumeChartConfig}
									className="aspect-auto h-65 w-full"
								>
									<BarChart
										accessibilityLayer
										data={volumeSeries}
										margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
									>
										<CartesianGrid vertical={false} />
										<XAxis
											dataKey="label"
											tickLine={false}
											axisLine={false}
											tickMargin={10}
											minTickGap={16}
											tick={{ fontSize: 11 }}
										/>
										<YAxis
											tickLine={false}
											axisLine={false}
											width={48}
											tick={{ fontSize: 11 }}
											tickFormatter={(v) =>
												Number(v).toLocaleString(undefined, {
													notation: "compact",
													maximumFractionDigits: 1,
												})
											}
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
										<Bar
											dataKey="volume"
											fill="var(--color-volume)"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
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
							{shareBusy && !payingShare ? (
								<Skeleton className="h-65 w-full" />
							) : !hasSharePlot ? (
								<ChartEmpty
									title="Nothing to plot"
									body="Business counts appear when paying-share analytics loads."
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
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div className="flex flex-col gap-1">
								<CardTitle>Top credit usage</CardTitle>
								<CardDescription>
									Active subscriptions ranked by credit pressure — spot who is
									closest to running out.
								</CardDescription>
							</div>
							{isSystemAdmin ? (
								<Field className="w-28 shrink-0 gap-1">
									<FieldLabel
										htmlFor="credit-usage-limit"
										className="text-[11px] text-muted-foreground"
									>
										Show top
									</FieldLabel>
									<Select
										value={String(creditLimit)}
										onValueChange={(v) => {
											if (v != null && isCreditUsageLimit(v)) {
												setCreditLimit(Number(v) as CreditUsageLimit);
											}
										}}
									>
										<SelectTrigger
											id="credit-usage-limit"
											className="h-9 bg-background"
										>
											<span className="flex flex-1 truncate text-left text-sm">
												{creditLimit}
											</span>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{CREDIT_USAGE_LIMIT_OPTIONS.map((n) => (
													<SelectItem key={n} value={String(n)}>
														{n}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							) : null}
						</div>

						{isSystemAdmin ? (
							<div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
								<div className="flex flex-col gap-2 lg:flex-row lg:items-end">
									<div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
										<div className="flex flex-col gap-1.5">
											<p className="text-[11px] font-medium text-muted-foreground">
												Business
											</p>
											<Input
												id="credit-filter-business"
												type="search"
												autoComplete="off"
												spellCheck={false}
												placeholder="Search business…"
												aria-label="Filter by business name"
												value={creditBusinessName}
												onChange={(e) =>
													setCreditBusinessName(e.target.value)
												}
												className={cn(
													"h-9",
													creditBusy && "opacity-80",
												)}
											/>
										</div>
										<div className="flex flex-col gap-1.5">
											<p className="text-[11px] font-medium text-muted-foreground">
												Plan
											</p>
											<Select
												value={creditPlanId}
												onValueChange={(v) => {
													if (v != null && v !== "") setCreditPlanId(v);
												}}
											>
												<SelectTrigger
													aria-label="Filter by plan"
													className="h-9 bg-background"
												>
													<span className="flex flex-1 truncate text-left text-sm">
														{creditPlanLabel}
													</span>
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														<SelectItem value={PLAN_FILTER_ALL}>
															All plans
														</SelectItem>
														{(subscriptionPlans ?? [])
															.filter((p) => !p.is_archived)
															.map((p) => (
																<SelectItem key={p.id} value={p.id}>
																	{p.name}
																</SelectItem>
															))}
													</SelectGroup>
												</SelectContent>
											</Select>
										</div>
									</div>
									<Button
										type="button"
										variant={
											creditFiltersOpen || creditAdvancedActive
												? "secondary"
												: "outline"
										}
										size="sm"
										className="h-9 shrink-0 gap-1.5"
										aria-expanded={creditFiltersOpen}
										aria-controls="credit-usage-filters"
										onClick={() => setCreditFiltersOpen((o) => !o)}
									>
										<SlidersHorizontalIcon className="size-4" aria-hidden />
										Advanced
										{creditAdvancedActive ? (
											<span className="rounded-full bg-foreground/10 px-1.5 text-[10px] font-semibold tabular-nums">
												On
											</span>
										) : null}
									</Button>
								</div>

								{creditFiltersOpen ? (
									<div
										id="credit-usage-filters"
										className="grid grid-cols-1 gap-2 sm:grid-cols-3"
									>
										<CreditFilterRange
											label="Usage %"
											minId="credit-min-usage"
											maxId="credit-max-usage"
											minValue={creditMinUsage}
											maxValue={creditMaxUsage}
											onMinChange={setCreditMinUsage}
											onMaxChange={setCreditMaxUsage}
											invalid={isRangeInvalid(
												creditMinUsage,
												creditMaxUsage,
											)}
										/>
										<CreditFilterRange
											label="Credits used"
											minId="credit-min-used"
											maxId="credit-max-used"
											minValue={creditMinUsed}
											maxValue={creditMaxUsed}
											onMinChange={setCreditMinUsed}
											onMaxChange={setCreditMaxUsed}
											invalid={isRangeInvalid(creditMinUsed, creditMaxUsed)}
										/>
										<CreditFilterRange
											label="Credits limit"
											minId="credit-min-limit"
											maxId="credit-max-limit"
											minValue={creditMinLimit}
											maxValue={creditMaxLimit}
											onMinChange={setCreditMinLimit}
											onMaxChange={setCreditMaxLimit}
											invalid={isRangeInvalid(
												creditMinLimit,
												creditMaxLimit,
											)}
										/>
									</div>
								) : null}

								{creditUsageRangeInvalid ? (
									<p className="text-[11px] text-destructive" role="alert">
										Fix min/max ranges before applying
									</p>
								) : null}

								{creditChips.length > 0 ? (
									<ul
										className="flex flex-wrap items-center gap-1.5"
										aria-label="Active credit usage filters"
									>
										{creditChips.map((chip) => (
											<li key={chip.key}>
												<button
													type="button"
													onClick={chip.clear}
													className="inline-flex h-7 max-w-full items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
													aria-label={`Remove filter ${chip.label}`}
												>
													<span className="min-w-0 truncate">
														{chip.label}
													</span>
													<XIcon
														className="size-3 shrink-0 opacity-50"
														aria-hidden
													/>
												</button>
											</li>
										))}
										<li>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-7 px-2 text-[11px]"
												onClick={clearCreditFilters}
											>
												Clear all
											</Button>
										</li>
									</ul>
								) : null}
							</div>
						) : null}
					</CardHeader>
					<CardContent className="pt-4">
						{creditBusy && creditRows.length === 0 ? (
							<div className="flex flex-col gap-2" aria-busy="true">
								<Skeleton className="h-11 w-full" />
								<Skeleton className="h-11 w-full" />
								<Skeleton className="h-11 w-full" />
								<Skeleton className="h-11 w-full" />
							</div>
						) : creditRows.length === 0 ? (
							<div className="flex flex-col items-start gap-3 py-10">
								<div className="flex flex-col gap-1">
									<p className="text-sm font-medium text-foreground">
										{creditFiltersActive
											? "No businesses match"
											: "No credit usage yet"}
									</p>
									<p className="max-w-md text-pretty text-sm text-muted-foreground">
										{creditFiltersActive
											? "Widen filters or clear them to see who is burning credits fastest."
											: "Businesses with active subscriptions and credit usage will list here."}
									</p>
								</div>
								{creditFiltersActive ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={clearCreditFilters}
									>
										Clear filters
									</Button>
								) : null}
							</div>
						) : (
							<div className="flex flex-col gap-3">
								<div
									className={cn(
										"overflow-x-auto rounded-md border border-border motion-safe:transition-opacity duration-150",
										creditFetching && "opacity-70",
									)}
									aria-busy={creditFetching || undefined}
								>
									<Table>
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead className="w-10 text-muted-foreground">
													<span className="sr-only">Rank</span>#
												</TableHead>
												<CreditSortableHead
													label="Business"
													column="business_name"
													sortBy={creditSortBy}
													sortDir={creditSortDir}
													onSort={toggleCreditSort}
												/>
												<CreditSortableHead
													label="Used"
													column="credits_used"
													sortBy={creditSortBy}
													sortDir={creditSortDir}
													onSort={toggleCreditSort}
													align="right"
												/>
												<CreditSortableHead
													label="Limit"
													column="credits_limit"
													sortBy={creditSortBy}
													sortDir={creditSortDir}
													onSort={toggleCreditSort}
													align="right"
												/>
												<CreditSortableHead
													label="Available"
													column="available_credits"
													sortBy={creditSortBy}
													sortDir={creditSortDir}
													onSort={toggleCreditSort}
													align="right"
												/>
												<CreditSortableHead
													label="Usage"
													column="usage_percentage"
													sortBy={creditSortBy}
													sortDir={creditSortDir}
													onSort={toggleCreditSort}
													align="right"
												/>
											</TableRow>
										</TableHeader>
										<TableBody>
											{creditRows.map((row, index) => {
												const tone = usageTone(row.usage_percentage);
												const pct = Math.min(
													100,
													Math.max(0, row.usage_percentage),
												);
												return (
													<TableRow
														key={row.business_id}
														className="cursor-pointer motion-safe:transition-colors duration-150 hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
														tabIndex={0}
														role="link"
														aria-label={`Open ${row.business_name || "business"}, ${Math.round(row.usage_percentage)}% used`}
														onClick={() =>
															router.push(
																`/admin/business/${row.business_id}`,
															)
														}
														onKeyDown={(e) => {
															if (e.key === "Enter" || e.key === " ") {
																e.preventDefault();
																router.push(
																	`/admin/business/${row.business_id}`,
																);
															}
														}}
													>
														<TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
															{index + 1}
														</TableCell>
														<TableCell className="font-medium text-foreground">
															{row.business_name || row.business_id}
														</TableCell>
														<TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
															{row.credits_used.toLocaleString()}
														</TableCell>
														<TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
															{row.credits_limit.toLocaleString()}
														</TableCell>
														<TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
															{row.available_credits.toLocaleString()}
														</TableCell>
														<TableCell className="text-right">
															<div className="flex items-center justify-end gap-2.5">
																<div
																	className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block"
																	aria-hidden
																>
																	<div
																		className={cn(
																			"h-full rounded-full motion-safe:transition-[width] duration-200",
																			tone === "critical" &&
																				"bg-destructive",
																			tone === "warn" &&
																				"bg-chart-3",
																			tone === "ok" &&
																				"bg-chart-1",
																		)}
																		style={{ width: `${pct}%` }}
																	/>
																</div>
																<Badge
																	variant={
																		tone === "critical"
																			? "destructive"
																			: tone === "warn"
																				? "secondary"
																				: "outline"
																	}
																>
																	{Math.round(row.usage_percentage)}%
																</Badge>
															</div>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
								<p className="font-mono text-[11px] tabular-nums text-muted-foreground">
									{creditRows.length.toLocaleString()} of top{" "}
									{creditLimit.toLocaleString()} · sorted by {creditSortLabel}{" "}
									{creditSortDir === "asc" ? "↑" : "↓"}
								</p>
							</div>
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
			<p className="admin-brand-band-label">{label}</p>
			{loading ? (
				<Skeleton className="admin-brand-band-skeleton h-7 w-24" />
			) : (
				<p className="font-mono text-lg leading-snug font-semibold tracking-tight tabular-nums">
					{value ?? "—"}
				</p>
			)}
			{hint && !loading ? (
				<p className="admin-brand-band-hint">{hint}</p>
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

function CreditSortableHead({
	label,
	column,
	sortBy,
	sortDir,
	onSort,
	align = "left",
}: {
	label: string;
	column: CreditUsageSortBy;
	sortBy: CreditUsageSortBy;
	sortDir: CreditUsageSortDir;
	onSort: (key: CreditUsageSortBy) => void;
	align?: "left" | "right";
}) {
	const active = sortBy === column;
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
				onClick={(e) => {
					e.stopPropagation();
					onSort(column);
				}}
				aria-label={`Sort by ${label}${active ? `, ${sortDir}ending` : ""}`}
			>
				{label}
				<Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
			</button>
		</TableHead>
	);
}

function CreditFilterRange({
	label,
	minId,
	maxId,
	minValue,
	maxValue,
	onMinChange,
	onMaxChange,
	invalid = false,
}: {
	label: string;
	minId: string;
	maxId: string;
	minValue: string;
	maxValue: string;
	onMinChange: (value: string) => void;
	onMaxChange: (value: string) => void;
	invalid?: boolean;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<p className="text-[11px] font-medium text-muted-foreground">{label}</p>
			<div className="flex items-center gap-2">
				<Input
					id={minId}
					type="number"
					inputMode="decimal"
					min={0}
					placeholder="Min…"
					aria-label={`${label} min`}
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
					type="number"
					inputMode="decimal"
					min={0}
					placeholder="Max…"
					aria-label={`${label} max`}
					aria-invalid={invalid || undefined}
					value={maxValue}
					onChange={(e) => onMaxChange(e.target.value)}
					className={cn(
						"h-9 min-w-0 flex-1",
						invalid && "border-destructive focus-visible:ring-destructive",
					)}
				/>
			</div>
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
