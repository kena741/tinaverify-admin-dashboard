"use client";

import { useMemo, useState } from "react";

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
import { Field, FieldLabel } from "@/components/ui/field";

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
			<div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:flex-wrap sm:items-end">
				<Field className="min-w-40 flex-1">
					<FieldLabel>Date range</FieldLabel>
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
						<SelectTrigger className="h-9 w-full sm:max-w-xs">
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
				</Field>
				<Field className="min-w-40 flex-1">
					<FieldLabel>Status</FieldLabel>
					<Select
						value={statusFilter}
						onValueChange={(v) => v && setStatusFilter(v)}
					>
						<SelectTrigger className="h-9 w-full sm:max-w-xs">
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
				</Field>
			</div>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Failed to load payments</AlertTitle>
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

			<div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-3">
				<div className="flex flex-col gap-1 px-5 py-4">
					<p className="text-xs font-medium text-muted-foreground">
						Transactions
					</p>
					{listBusy ? (
						<Skeleton className="mt-1 h-8 w-16" />
					) : (
						<p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
							{stats.total.toLocaleString()}
						</p>
					)}
				</div>
				<div className="flex flex-col gap-1 border-border px-5 py-4 sm:border-l">
					<p className="text-xs font-medium text-muted-foreground">
						Total amount
					</p>
					{listBusy ? (
						<Skeleton className="mt-1 h-8 w-28" />
					) : (
						<p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
							{stats.currency}{" "}
							{stats.volume.toLocaleString(undefined, {
								maximumFractionDigits: 0,
							})}
						</p>
					)}
				</div>
				<div className="flex flex-col gap-1 border-border px-5 py-4 sm:border-l">
					<p className="text-xs font-medium text-muted-foreground">
						Success rate
					</p>
					{listBusy ? (
						<Skeleton className="mt-1 h-8 w-16" />
					) : (
						<p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
							{stats.successRate}%
						</p>
					)}
				</div>
			</div>

			<section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
				<div className="border-b border-border px-5 py-3">
					<h2 className="text-base font-semibold tracking-tight">
						Verified payments
					</h2>
					<p className="mt-0.5 text-sm text-muted-foreground">
						{getDateRangeLabel(datePreset)}
						{statusFilter !== "all"
							? ` · ${getStatusFilterLabel(statusFilter)}`
							: ""}
					</p>
				</div>
				<div className="p-4 sm:p-5">
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
						<div className="overflow-x-auto rounded-lg border border-border">
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
				</div>
			</section>
		</div>
	);
}

function PaymentRow({ row }: { row: VerifiedTransactionOutput }) {
	return (
		<TableRow>
			<TableCell className="font-mono text-sm">{row.reference_number}</TableCell>
			<TableCell className="font-mono whitespace-nowrap tabular-nums">
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
						className="text-sm font-medium text-brand-ink hover:underline"
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
