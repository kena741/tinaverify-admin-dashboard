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
	parseRevenueAmount,
	type DashboardAnalyticsPreset,
} from "@/lib/analytics";
import { getDateRangeLabel } from "@/lib/filter-labels";
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

	const revenue = summary?.revenue;
	const periodLabelText = periodLabel(preset, customStart, customEnd);

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
						value={isLoading ? null : formatRevenueAmount(periodRevenue)}
						icon={TrendingUpIcon}
						loading={isLoading}
					/>
					<StatCard
						label={`Verified amount (${periodLabelText})`}
						value={isLoading ? null : formatRevenueAmount(totalVerifiedAmount)}
						icon={BanknoteIcon}
						loading={isLoading}
					/>
					<StatCard
						label="Verified transactions"
						value={
							isLoading ? null : totalVerifiedTransactions.toLocaleString()
						}
						icon={CheckCircle2Icon}
						loading={isLoading}
					/>
					<StatCard
						label="Failed / fake transactions"
						value={
							isLoading ? null : totalFailedTransactions.toLocaleString()
						}
						icon={XCircleIcon}
						loading={isLoading}
					/>
					<StatCard
						label="Verification success rate"
						value={isLoading ? null : `${successRate}%`}
						icon={PercentIcon}
						loading={isLoading}
					/>
				</div>
			</section>

			<section className="flex flex-col gap-4">
				<SectionHeading
					title="Business overview"
					description="Active businesses and subscription distribution."
				/>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					<StatCard
						label="Total businesses"
						value={
							isLoading
								? null
								: (summary?.total_businesses ?? 0).toLocaleString()
						}
						icon={Building2Icon}
						loading={isLoading}
					/>
					<StatCard
						label="Paying businesses"
						value={
							isLoading
								? null
								: (summary?.total_paying_businesses ?? 0).toLocaleString()
						}
						icon={UsersIcon}
						loading={isLoading}
					/>
					<StatCard
						label="Most subscribed plan"
						value={
							isLoading
								? null
								: summary?.top_plan?.plan_name
									? `${summary.top_plan.plan_name} (${summary.top_plan.subscription_count})`
									: "—"
						}
						icon={CreditCardIcon}
						loading={isLoading}
					/>
				</div>
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
								value={totalVerifiedTransactions}
							/>
							<MetricTile
								label="Verified amount"
								value={formatRevenueAmount(totalVerifiedAmount)}
								isText
							/>
							<MetricTile
								label="Failed / fake transactions"
								value={totalFailedTransactions}
							/>
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="shadow-sm">
				<CardHeader>
					<SectionHeading
						title="Revenue overview"
						description="Daily, weekly, monthly, and custom-period revenue."
					/>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-16 w-full" />
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
							<RevenueTile
								label="Daily"
								amount={parseRevenueAmount(revenue?.daily)}
							/>
							<RevenueTile
								label="Weekly"
								amount={parseRevenueAmount(revenue?.weekly)}
							/>
							<RevenueTile
								label="Monthly"
								amount={parseRevenueAmount(revenue?.monthly)}
							/>
							<RevenueTile
								label={`Custom (${periodLabelText})`}
								amount={parseRevenueAmount(revenue?.custom)}
							/>
						</div>
					)}
				</CardContent>
			</Card>
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

function RevenueTile({ label, amount }: { label: string; amount: number }) {
	return (
		<div className="rounded-lg border bg-muted/30 p-4">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="admin-stat-value mt-1 text-xl">
				{formatRevenueAmount(amount)}
			</p>
		</div>
	);
}
