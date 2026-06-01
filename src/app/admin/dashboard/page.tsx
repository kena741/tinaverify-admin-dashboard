"use client";

import { useState } from "react";
import Link from "next/link";
import {
	Building2Icon,
	CheckCircle2Icon,
	CreditCardIcon,
	PercentIcon,
	ReceiptIcon,
	TrendingUpIcon,
	XCircleIcon,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { useDashboardAnalytics } from "@/hooks/use-dashboard-analytics";
import type { BuiltInAnalyticsPreset } from "@/lib/analytics";
import { getDateRangeLabel } from "@/lib/filter-labels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const PRESET_OPTIONS: BuiltInAnalyticsPreset[] = [
	"last_7_days",
	"last_30_days",
	"this_month",
];

function formatVolume(amount: number, currency: string | null) {
	const formatted = amount.toLocaleString(undefined, {
		maximumFractionDigits: 0,
	});
	return currency ? `${currency} ${formatted}` : formatted;
}

function statusBadgeVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	const s = status.toLowerCase();
	if (s === "failed" || s === "rejected") return "destructive";
	if (s === "verified" || s === "success" || s === "completed")
		return "default";
	return "secondary";
}

export default function DashboardPage() {
	const [preset, setPreset] = useState<BuiltInAnalyticsPreset>("last_30_days");
	const {
		analytics,
		activeBusinessCount,
		totalBusinessCount,
		isLoading,
		error,
		truncatedBusinessFetch,
	} = useDashboardAnalytics(preset);

	const recentTransactions = analytics.transactions.slice(0, 8);
	const maxBusinessVolume = Math.max(
		...analytics.byBusiness.map((b) => b.volume),
		0,
	);
	const maxStatusCount = Math.max(...analytics.byStatus.map((s) => s.count), 0);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Dashboard"
				description="Analytics for payment receipt verification across your businesses."
				actions={
					<Select
						value={preset}
						onValueChange={(v) => {
							if (
								v === "last_7_days" ||
								v === "last_30_days" ||
								v === "this_month"
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
				}
			/>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Analytics unavailable</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			{truncatedBusinessFetch ? (
				<Alert>
					<AlertDescription>
						Showing analytics for the first 25 businesses. Use the Business
						page to filter by a specific business.
					</AlertDescription>
				</Alert>
			) : null}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					label="Total verified transactions"
					value={
						isLoading ? null : analytics.successCount.toLocaleString()
					}
					icon={CreditCardIcon}
					loading={isLoading}
				/>
				<StatCard
					label="Verified amount"
					value={
						isLoading
							? null
							: formatVolume(analytics.verifiedAmount, analytics.currency)
					}
					icon={ReceiptIcon}
					loading={isLoading}
				/>
				<StatCard
					label="Success rate"
					value={isLoading ? null : `${analytics.successRate}%`}
					icon={PercentIcon}
					loading={isLoading}
				/>
				<StatCard
					label="Active businesses"
					value={
						isLoading
							? null
							: `${activeBusinessCount} / ${totalBusinessCount}`
					}
					icon={Building2Icon}
					loading={isLoading}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<TrendingUpIcon className="size-4 text-primary" />
							Volume by business
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{isLoading ? (
							<div className="flex flex-col gap-3">
								{Array.from({ length: 4 }).map((_, i) => (
									<Skeleton key={i} className="h-8 w-full" />
								))}
							</div>
						) : analytics.byBusiness.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No transactions in this period.
							</p>
						) : (
							analytics.byBusiness.slice(0, 6).map((item) => (
								<div key={item.businessId} className="flex flex-col gap-1.5">
									<div className="flex items-center justify-between gap-2 text-sm">
										<span className="truncate font-medium">
											{item.businessName}
										</span>
										<span className="shrink-0 tabular-nums text-muted-foreground">
											{formatVolume(item.volume, analytics.currency)}
										</span>
									</div>
									<div className="h-2 overflow-hidden rounded-full bg-muted">
										<div
											className="h-full rounded-full bg-primary transition-all"
											style={{
												width:
													maxBusinessVolume > 0
														? `${(item.volume / maxBusinessVolume) * 100}%`
														: "0%",
											}}
										/>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Status breakdown</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{isLoading ? (
							<div className="flex flex-col gap-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={i} className="h-8 w-full" />
								))}
							</div>
						) : analytics.byStatus.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No status data for this period.
							</p>
						) : (
							<>
								<div className="flex flex-wrap gap-3">
									<div className="flex items-center gap-2 text-sm">
										<CheckCircle2Icon className="size-4 text-primary" />
										<span className="text-muted-foreground">Verified</span>
										<span className="font-semibold tabular-nums">
											{analytics.successCount}
										</span>
									</div>
									<div className="flex items-center gap-2 text-sm">
										<XCircleIcon className="size-4 text-destructive" />
										<span className="text-muted-foreground">Failed</span>
										<span className="font-semibold tabular-nums">
											{analytics.failedCount}
										</span>
									</div>
									{analytics.pendingCount > 0 ? (
										<div className="flex items-center gap-2 text-sm">
											<span className="text-muted-foreground">Pending</span>
											<span className="font-semibold tabular-nums">
												{analytics.pendingCount}
											</span>
										</div>
									) : null}
								</div>
								<div className="flex flex-col gap-3">
									{analytics.byStatus.map((item) => (
										<div key={item.status} className="flex flex-col gap-1.5">
											<div className="flex items-center justify-between gap-2 text-sm">
												<span className="capitalize">{item.status}</span>
												<span className="tabular-nums text-muted-foreground">
													{item.count}
												</span>
											</div>
											<div className="h-2 overflow-hidden rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-chart-2 transition-all"
													style={{
														width:
															maxStatusCount > 0
																? `${(item.count / maxStatusCount) * 100}%`
																: "0%",
													}}
												/>
											</div>
										</div>
									))}
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4">
					<CardTitle className="text-base">Recent transactions</CardTitle>
					<Button variant="outline" size="sm" render={<Link href="/admin/transactions" />}>
						View all businesses
					</Button>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : recentTransactions.length === 0 ? (
						<p className="py-6 text-center text-sm text-muted-foreground">
							No transactions in this period.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Reference</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recentTransactions.map((t) => (
									<TableRow key={t.id}>
										<TableCell className="font-mono text-sm">
											{t.reference_number}
										</TableCell>
										<TableCell className="tabular-nums">
											{t.currency}{" "}
											{Number.parseFloat(t.amount).toLocaleString()}
										</TableCell>
										<TableCell>
											<Badge variant={statusBadgeVariant(t.status)}>
												{t.status}
											</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function StatCard({
	label,
	value,
	icon: Icon,
	loading,
}: {
	label: string;
	value: string | null;
	icon: React.ComponentType<{ className?: string }>;
	loading: boolean;
}) {
	return (
		<Card>
			<CardContent className="flex flex-row items-center gap-4 pt-6">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
					<Icon className="size-5 text-primary" aria-hidden />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm text-muted-foreground">{label}</p>
					{loading ? (
						<Skeleton className="mt-1 h-7 w-24" />
					) : (
						<p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
