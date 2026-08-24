"use client";

import { useState } from "react";

import { PageHeader } from "@/components/admin/page-header";
import { useListSubscriptionTransactionLogsQuery } from "@/services/subscription/subscriptionApi";
import type { TransactionLogStatus } from "@/services/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
	{ value: "all", label: "All statuses" },
	{ value: "success", label: "Success" },
	{ value: "pending", label: "Pending" },
	{ value: "failed", label: "Failed" },
	{ value: "canceled", label: "Canceled" },
] as const;

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

function formatWhen(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function formatAmount(amount: number | string, currency: string | null): string {
	const n = typeof amount === "number" ? amount : Number.parseFloat(amount);
	const value = Number.isFinite(n)
		? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
		: String(amount);
	return currency ? `${currency} ${value}` : value;
}

function statusBadgeVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	const s = status.toLowerCase();
	if (s === "success") return "default";
	if (s === "pending") return "secondary";
	if (s === "failed" || s === "canceled") return "destructive";
	return "outline";
}

export default function FinanceTransactionsPage() {
	const [offset, setOffset] = useState(0);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [receiptPreview, setReceiptPreview] = useState<{
		url: string;
		label: string;
	} | null>(null);

	const status =
		statusFilter === "all" ? null : (statusFilter as TransactionLogStatus);

	const { data, error, isLoading, isFetching, refetch } =
		useListSubscriptionTransactionLogsQuery({
			status,
			limit: PAGE_SIZE,
			offset,
		});

	const rows = data ?? [];
	const canPrev = offset > 0;
	const canNext = rows.length >= PAGE_SIZE;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Transactions"
				description="Chapa payment transaction logs for subscription checkouts."
			/>

			<div className="flex flex-wrap items-end gap-3">
				<Field className="w-48">
					<FieldLabel>Status</FieldLabel>
					<Select
						value={statusFilter}
						onValueChange={(value) => {
							if (!value) return;
							setStatusFilter(value);
							setOffset(0);
						}}
					>
						<SelectTrigger className="h-9">
							<SelectValue>
								{STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{STATUS_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>
			</div>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Couldn’t load transactions</AlertTitle>
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

			<Card>
				<CardContent className="pt-6">
					{isLoading ? (
						<div className="flex flex-col gap-2">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : rows.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No transaction logs for this filter.
						</p>
					) : (
						<div className="overflow-x-auto rounded-xl border border-border">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>When</TableHead>
										<TableHead>Name</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Method</TableHead>
										<TableHead>Phone</TableHead>
										<TableHead>Tx ref</TableHead>
										<TableHead>Reference</TableHead>
										<TableHead>Receipt</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((row) => (
										<TableRow key={row.id}>
											<TableCell className="whitespace-nowrap text-sm text-muted-foreground">
												{formatWhen(row.created_at)}
											</TableCell>
											<TableCell className="max-w-40 truncate font-medium">
												{row.name ?? "—"}
											</TableCell>
											<TableCell className="font-mono text-sm whitespace-nowrap tabular-nums">
												{formatAmount(row.amount, row.currency)}
											</TableCell>
											<TableCell>
												<Badge
													variant={statusBadgeVariant(row.status)}
													className="font-normal capitalize"
												>
													{row.status}
												</Badge>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{row.payment_method ?? "—"}
											</TableCell>
											<TableCell className="font-mono text-sm tabular-nums">
												{row.phone_number ?? "—"}
											</TableCell>
											<TableCell
												className="max-w-36 truncate font-mono text-xs"
												title={row.tx_ref}
											>
												{row.tx_ref}
											</TableCell>
											<TableCell
												className="max-w-36 truncate font-mono text-xs text-muted-foreground"
												title={row.reference ?? undefined}
											>
												{row.reference ?? "—"}
											</TableCell>
											<TableCell>
												{row.receipt_url ? (
													<button
														type="button"
														className="text-sm font-medium underline-offset-2 hover:underline"
														onClick={() => {
															const url = row.receipt_url;
															if (!url) return;
															setReceiptPreview({
																url,
																label: row.name ?? row.tx_ref,
															});
														}}
													>
														View
													</button>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}

					<div className="mt-4 flex items-center justify-between gap-3">
						<p className="text-xs text-muted-foreground">
							Showing {rows.length} transaction
							{rows.length === 1 ? "" : "s"}
							{offset > 0 ? ` · from ${offset + 1}` : ""}
							{isFetching ? " · refreshing…" : ""}
						</p>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!canPrev || isFetching}
								onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
							>
								Previous
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!canNext || isFetching}
								onClick={() => setOffset((o) => o + PAGE_SIZE)}
							>
								Next
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<Sheet
				open={receiptPreview !== null}
				onOpenChange={(open) => {
					if (!open) setReceiptPreview(null);
				}}
			>
				<SheetContent side="right" className="sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Receipt</SheetTitle>
						<SheetDescription>
							{receiptPreview?.label ?? "Payment receipt"}
						</SheetDescription>
					</SheetHeader>
					<div className="flex flex-col gap-3 px-4 pb-6">
						{receiptPreview ? (
							<>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={receiptPreview.url}
									alt={`Receipt for ${receiptPreview.label}`}
									className="max-h-[70vh] w-full rounded-md border border-border bg-muted object-contain"
									referrerPolicy="no-referrer"
								/>
								<a
									href={receiptPreview.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm font-medium underline-offset-2 hover:underline"
								>
									Open original
								</a>
							</>
						) : null}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
