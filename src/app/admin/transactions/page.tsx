"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { useListAllBusinessesQuery } from "@/services/branch-management/branchManagementApi";
import { useListAdminSubscriptionTransactionsQuery } from "@/services/subscription/subscriptionApi";
import { useListSubscriptionPlansQuery } from "@/services/subscription-plan/subscriptionPlanApi";
import type { AdminSubscriptionOutput } from "@/services/types";
import {
	apiStatusForStatusFilter,
	BUSINESS_FILTER_ALL,
	countUniqueBusinesses,
	getSubscriptionPlanLabel,
	getSubscriptionStatusFilterLabel,
	getSubscriptionStatusLabel,
	PLAN_FILTER_ALL,
	type SubscriptionStatusFilter,
} from "@/lib/subscription-filters";
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

function formatDateTime(value: string | null | undefined): string {
	if (!value) return "—";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "—";
	return format(d, "MMM d, yyyy HH:mm");
}

function formatAmount(amount: number | null | undefined): string {
	if (amount === null || amount === undefined) return "—";
	if (!Number.isFinite(amount)) return "—";
	return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function statusBadgeVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	const s = status.toLowerCase();
	if (s === "active") return "default";
	if (s === "pending" || s === "insufficient_credits") return "secondary";
	if (s === "expired" || s === "cancelled") return "destructive";
	return "outline";
}

export default function TransactionsPage() {
	const router = useRouter();
	const [businessId, setBusinessId] = useState(BUSINESS_FILTER_ALL);
	const [planId, setPlanId] = useState(PLAN_FILTER_ALL);
	const [statusFilter, setStatusFilter] =
		useState<SubscriptionStatusFilter>("all");
	const [searchTerm, setSearchTerm] = useState("");

	const { data: businesses } = useListAllBusinessesQuery();
	const { data: plans } = useListSubscriptionPlansQuery();

	const {
		data: transactions,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useListAdminSubscriptionTransactionsQuery({
		businessId: businessId === BUSINESS_FILTER_ALL ? null : businessId,
		planId: planId === PLAN_FILTER_ALL ? null : planId,
		status: apiStatusForStatusFilter(statusFilter),
	});

	const filteredRows = useMemo(() => {
		const q = searchTerm.trim().toLowerCase();
		const rows = transactions ?? [];

		if (!q) return rows;

		return rows.filter((row) => {
			const hay = [
				row.business?.name,
				row.business?.tin_number,
				row.plan?.name,
				row.status,
				row.chapa_transaction_reference,
				row.business_id,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return hay.includes(q);
		});
	}, [transactions, searchTerm]);

	const activeRows = useMemo(
		() => filteredRows.filter((r) => r.status.toLowerCase() === "active"),
		[filteredRows],
	);
	const pendingRows = useMemo(
		() => filteredRows.filter((r) => r.status.toLowerCase() === "pending"),
		[filteredRows],
	);

	const activeCustomerTotal = countUniqueBusinesses(activeRows);
	const pendingCustomerTotal = countUniqueBusinesses(pendingRows);

	const businessLabel =
		businessId === BUSINESS_FILTER_ALL
			? "All businesses"
			: (businesses?.find((b) => b.id === businessId)?.name ?? "All businesses");

	const planLabel =
		planId === PLAN_FILTER_ALL
			? "All plans"
			: (plans?.find((p) => p.id === planId)?.name ?? "All plans");

	const listBusy = isLoading || isFetching;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Business"
				description="All businesses and subscription status. Click a row to open the full business profile."
			/>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Failed to load transactions</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(error, "Request failed.")}</span>
						<Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<SummaryCard
					label="Active customers"
					value={listBusy ? null : activeCustomerTotal.toLocaleString()}
					icon={CheckCircle2Icon}
					loading={listBusy}
					variant="active"
				/>
				<SummaryCard
					label="Pending customers"
					value={listBusy ? null : pendingCustomerTotal.toLocaleString()}
					icon={XCircleIcon}
					loading={listBusy}
					variant="pending"
				/>
			</div>

			<Card>
				<CardContent className="flex flex-col gap-4 pt-6">
					<div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
						<FilterField label="Search" className="min-w-48 flex-1 lg:min-w-64">
							<Input
								type="search"
								placeholder="Search business, plan, or reference…"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="h-10"
							/>
						</FilterField>

						<FilterField label="Status" className="min-w-40 flex-1">
							<Select
								value={statusFilter}
								onValueChange={(v) => {
									if (
										v === "all" ||
										v === "pending" ||
										v === "active" ||
										v === "expired"
									) {
										setStatusFilter(v);
									}
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
								</SelectContent>
							</Select>
						</FilterField>

						<FilterField label="Subscription plan" className="min-w-48 flex-1">
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

						<FilterField label="Business" className="min-w-48 flex-1">
							<Select
								value={businessId}
								onValueChange={(v) => {
									if (v != null && v !== "") setBusinessId(v);
								}}
							>
								<SelectTrigger className="h-10 w-full">
									<span className="flex flex-1 truncate text-left">
										{businessLabel}
									</span>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={BUSINESS_FILTER_ALL}>All businesses</SelectItem>
									{(businesses ?? []).map((b) => (
										<SelectItem key={b.id} value={b.id}>
											{b.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</FilterField>
					</div>

					{listBusy ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 6 }).map((_, i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : filteredRows.length === 0 ? (
						<p className="py-10 text-center text-sm text-muted-foreground">
							No subscription transactions match your filters.
						</p>
					) : (
						<div className="overflow-x-auto rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Business</TableHead>
										<TableHead>Plan</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Amount</TableHead>
										<TableHead className="text-right">Credits</TableHead>
										<TableHead>Started</TableHead>
										<TableHead>Reference</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredRows.map((row) => (
										<SubscriptionRow
											key={row.id}
											row={row}
											onSelect={() =>
												router.push(`/admin/business/${row.business_id}`)
											}
										/>
									))}
								</TableBody>
							</Table>
						</div>
					)}

					{!listBusy && filteredRows.length > 0 ? (
						<p className="text-xs text-muted-foreground">
							Showing {filteredRows.length} transaction
							{filteredRows.length === 1 ? "" : "s"}
							{statusFilter !== "all"
								? ` · ${getSubscriptionStatusFilterLabel(statusFilter)}`
								: ""}
						</p>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}

function SubscriptionRow({
	row,
	onSelect,
}: {
	row: AdminSubscriptionOutput;
	onSelect: () => void;
}) {
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
			aria-label={`View details for ${row.business?.name ?? "business"}`}
		>
			<TableCell>
				<div className="flex flex-col gap-0.5">
					<span className="font-medium">{row.business?.name ?? "—"}</span>
					{row.business?.tin_number ? (
						<span className="text-xs text-muted-foreground">
							TIN {row.business.tin_number}
						</span>
					) : null}
				</div>
			</TableCell>
			<TableCell>
				{getSubscriptionPlanLabel(row.plan)}
			</TableCell>
			<TableCell>
				<Badge variant={statusBadgeVariant(row.status)}>
					{getSubscriptionStatusLabel(row.status)}
				</Badge>
			</TableCell>
			<TableCell className="text-right tabular-nums">
				{formatAmount(row.amount)}
			</TableCell>
			<TableCell className="text-right tabular-nums">
				{row.credits_limit.toLocaleString()}
			</TableCell>
			<TableCell className="whitespace-nowrap text-muted-foreground">
				{formatDateTime(row.started_at ?? row.created_at)}
			</TableCell>
			<TableCell className="max-w-40 truncate font-mono text-xs">
				{row.chapa_transaction_reference ?? "—"}
			</TableCell>
		</TableRow>
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
	variant: "active" | "pending";
}) {
	const iconClass =
		variant === "active" ? "text-primary" : "text-muted-foreground";
	const bgClass =
		variant === "active" ? "bg-primary/10" : "bg-muted";

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
