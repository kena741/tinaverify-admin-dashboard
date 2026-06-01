"use client";

import { useMemo, useState } from "react";
import { BanknoteIcon, CreditCardIcon, PercentIcon } from "lucide-react";

import { useListTransactionsByBusinessQuery } from "@/services/transactions/transactionsApi";
import type { VerifiedTransactionOutput } from "@/services/types";
import {
	isoRangeForAnalyticsPreset,
	type BuiltInAnalyticsPreset,
} from "@/lib/analytics";
import { isSuccessfulStatus } from "@/lib/analytics";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { getDateRangeLabel, getStatusFilterLabel } from "@/lib/filter-labels";

function parseAmount(value: string): number {
	const n = Number.parseFloat(value);
	return Number.isFinite(n) ? n : 0;
}

function statusBadgeVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	const s = status.toLowerCase();
	if (s === "failed" || s === "rejected") return "destructive";
	if (s === "verified" || s === "success" || s === "completed") return "default";
	if (s === "pending" || s === "processing") return "secondary";
	return "outline";
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
	}
	if (error instanceof Error) return error.message;
	return fallback;
}

type BusinessPaymentsTabProps = {
	businessId: string;
};

export function BusinessPaymentsTab({ businessId }: BusinessPaymentsTabProps) {
	const [datePreset, setDatePreset] = useState<BuiltInAnalyticsPreset>("last_30_days");
	const [statusFilter, setStatusFilter] = useState<string>("all");

	const { startDate, endDate } = useMemo(
		() => isoRangeForAnalyticsPreset(datePreset),
		[datePreset],
	);

	const {
		data: transactions,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useListTransactionsByBusinessQuery({
		businessId,
		startDate,
		endDate,
	});

	const filteredRows = useMemo(() => {
		let rows = transactions ?? [];
		if (statusFilter !== "all") {
			rows = rows.filter(
				(t) => t.status.toLowerCase() === statusFilter.toLowerCase(),
			);
		}
		return rows;
	}, [transactions, statusFilter]);

	const stats = useMemo(() => {
		const total = filteredRows.length;
		const volume = filteredRows.reduce((sum, t) => sum + parseAmount(t.amount), 0);
		const currency = filteredRows.find((t) => t.currency)?.currency ?? "ETB";
		const successCount = filteredRows.filter((t) =>
			isSuccessfulStatus(t.status),
		).length;
		const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
		return { total, volume, currency, successRate };
	}, [filteredRows]);

	const listBusy = isLoading || isFetching;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
				<div className="flex min-w-40 flex-1 flex-col gap-2">
					<span className="text-sm font-medium">Date range</span>
					<Select
						value={datePreset}
						onValueChange={(v) => {
							if (
								v === "last_7_days" ||
								v === "last_30_days" ||
								v === "this_month"
							) {
								setDatePreset(v);
							}
						}}
					>
						<SelectTrigger className="h-10 w-full sm:max-w-xs">
							<span className="flex flex-1 truncate text-left">
								{getDateRangeLabel(datePreset)}
							</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="last_7_days">Last 7 days</SelectItem>
							<SelectItem value="last_30_days">Last 30 days</SelectItem>
							<SelectItem value="this_month">This month</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex min-w-40 flex-1 flex-col gap-2">
					<span className="text-sm font-medium">Status</span>
					<Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
						<SelectTrigger className="h-10 w-full sm:max-w-xs">
							<span className="flex flex-1 truncate text-left">
								{getStatusFilterLabel(statusFilter)}
							</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All statuses</SelectItem>
							<SelectItem value="verified">Verified</SelectItem>
							<SelectItem value="failed">Failed</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Failed to load payments</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(error, "Request failed.")}</span>
						<Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard
					label="Transactions"
					value={listBusy ? null : stats.total.toLocaleString()}
					icon={CreditCardIcon}
					loading={listBusy}
				/>
				<StatCard
					label="Total amount"
					value={
						listBusy
							? null
							: `${stats.currency} ${stats.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
					}
					icon={BanknoteIcon}
					loading={listBusy}
				/>
				<StatCard
					label="Success rate"
					value={listBusy ? null : `${stats.successRate}%`}
					icon={PercentIcon}
					loading={listBusy}
				/>
			</div>

			<Card>
				<CardContent className="pt-6">
					{listBusy ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : filteredRows.length === 0 ? (
						<p className="py-10 text-center text-sm text-muted-foreground">
							No verified payments found for this period.
						</p>
					) : (
						<div className="overflow-x-auto rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Reference</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Sender name</TableHead>
										<TableHead>Sender bank account</TableHead>
										<TableHead>Receiving bank name</TableHead>
										<TableHead>Receiving bank account</TableHead>
										<TableHead>Receipt</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredRows.map((row) => (
										<PaymentRow key={row.id} row={row} />
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function PaymentRow({ row }: { row: VerifiedTransactionOutput }) {
	return (
		<TableRow>
			<TableCell className="font-mono text-sm">{row.reference_number}</TableCell>
			<TableCell className="whitespace-nowrap tabular-nums">
				{row.currency}{" "}
				{Number.parseFloat(row.amount).toLocaleString(undefined, {
					maximumFractionDigits: 0,
				})}
			</TableCell>
			<TableCell>
				<Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
			</TableCell>
			<TableCell className="max-w-40 truncate" title={row.sender_name ?? undefined}>
				{row.sender_name ?? "—"}
			</TableCell>
			<TableCell className="font-mono text-sm">{row.sender_account ?? "—"}</TableCell>
			<TableCell className="max-w-36 truncate" title={row.receiver_name ?? undefined}>
				{row.receiver_name ?? "—"}
			</TableCell>
			<TableCell className="font-mono text-sm">{row.receiver_account ?? "—"}</TableCell>
			<TableCell>
				{row.receipt_url ? (
					<a
						href={row.receipt_url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm font-medium text-primary hover:underline"
					>
						Open receipt
					</a>
				) : (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
		</TableRow>
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
