"use client";

import { useMemo, useState } from "react";
import {
	ChevronsUpDownIcon,
	CreditCardIcon,
	Loader2Icon,
	PercentIcon,
	ReceiptIcon,
} from "lucide-react";

import {
	useListAllBusinessesQuery,
	useListBusinessBranchesQuery,
} from "../../../services/branch-management/branchManagementApi";
import {
	useGetTransactionQuery,
	useListTransactionsByBranchQuery,
	useListTransactionsByBusinessQuery,
	useUpdateTransactionStatusMutation,
} from "../../../services/transactions/transactionsApi";
import type { BusinessOutput, VerifiedTransactionOutput } from "../../../services/types";
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
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
const BRANCH_ALL = "__all__";

type DatePreset = "today" | "last_7_days" | "last_30_days" | "this_month";

function isoRangeForPreset(preset: DatePreset): {
	startDate: string;
	endDate: string;
} {
	const end = new Date();
	const start = new Date();

	switch (preset) {
		case "today":
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			break;
		case "last_7_days":
			start.setDate(start.getDate() - 6);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			break;
		case "last_30_days":
			start.setDate(start.getDate() - 29);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			break;
		case "this_month":
			start.setDate(1);
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			break;
	}

	return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function normalizeStatusDraft(status: string): "verified" | "failed" {
	const s = status.toLowerCase();
	if (s === "verified" || s === "failed") return s;
	return "verified";
}

function parseAmount(value: string): number {
	const n = Number.parseFloat(value);
	return Number.isFinite(n) ? n : 0;
}

function statusBadgeVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	const s = status.toLowerCase();
	if (s === "failed" || s === "rejected") return "destructive";
	if (s === "verified" || s === "success" || s === "completed")
		return "default";
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

export default function TransactionsPage() {
	const [businessPopoverOpen, setBusinessPopoverOpen] = useState(false);
	const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
		null,
	);
	const [branchId, setBranchId] = useState<string>(BRANCH_ALL);
	const [datePreset, setDatePreset] = useState<DatePreset>("last_7_days");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const [detailTransactionId, setDetailTransactionId] = useState<string | null>(
		null,
	);
	const [statusDraft, setStatusDraft] = useState<"verified" | "failed">(
		"verified",
	);

	const { startDate, endDate } = useMemo(
		() => isoRangeForPreset(datePreset),
		[datePreset],
	);

	const {
		data: businesses,
		isLoading: businessesLoading,
		error: businessesError,
		refetch: refetchBusinesses,
	} = useListAllBusinessesQuery();

	const {
		data: branches,
		isLoading: branchesLoading,
		error: branchesError,
		refetch: refetchBranches,
	} = useListBusinessBranchesQuery(
		{ businessId: selectedBusinessId ?? "" },
		{ skip: !selectedBusinessId },
	);

	const useBranchEndpoint =
		selectedBusinessId !== null &&
		branchId !== BRANCH_ALL &&
		branchId.length > 0;

	const {
		data: transactionsByBusiness,
		isLoading: loadingBusinessTx,
		isFetching: fetchingBusinessTx,
		error: errorBusinessTx,
		refetch: refetchBusinessTx,
	} = useListTransactionsByBusinessQuery(
		{
			businessId: selectedBusinessId ?? "",
			startDate,
			endDate,
		},
		{ skip: !selectedBusinessId || useBranchEndpoint },
	);

	const {
		data: transactionsByBranch,
		isLoading: loadingBranchTx,
		isFetching: fetchingBranchTx,
		error: errorBranchTx,
		refetch: refetchBranchTx,
	} = useListTransactionsByBranchQuery(
		{
			businessId: selectedBusinessId ?? "",
			branchId,
			startDate,
			endDate,
		},
		{ skip: !selectedBusinessId || !useBranchEndpoint },
	);

	const rawTransactions = useMemo((): VerifiedTransactionOutput[] => {
		if (useBranchEndpoint && transactionsByBranch !== undefined) {
			return transactionsByBranch;
		}
		return transactionsByBusiness ?? [];
	}, [useBranchEndpoint, transactionsByBranch, transactionsByBusiness]);

	const listLoading =
		!!selectedBusinessId &&
		(useBranchEndpoint ? loadingBranchTx || fetchingBranchTx : loadingBusinessTx || fetchingBusinessTx);
	const listError = useBranchEndpoint ? errorBranchTx : errorBusinessTx;

	const filteredTransactions = useMemo(() => {
		const q = searchTerm.trim().toLowerCase();
		let rows = rawTransactions;
		if (statusFilter !== "all") {
			rows = rows.filter(
				(t) => t.status.toLowerCase() === statusFilter.toLowerCase(),
			);
		}
		if (!q) return rows;
		return rows.filter((t) => {
			const hay = [
				t.reference_number,
				t.amount,
				t.currency,
				t.status,
				t.sender_name,
				t.sender_account,
				t.receiver_name,
				t.receiver_account,
				t.receipt_url,
				t.id,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return hay.includes(q);
		});
	}, [rawTransactions, searchTerm, statusFilter]);

	const totalAmount = useMemo(
		() =>
			filteredTransactions.reduce((sum, t) => sum + parseAmount(t.amount), 0),
		[filteredTransactions],
	);

	const successCount = useMemo(
		() =>
			filteredTransactions.filter((t) => {
				const s = t.status.toLowerCase();
				return s === "verified" || s === "success" || s === "completed";
			}).length,
		[filteredTransactions],
	);

	const successRate =
		filteredTransactions.length > 0
			? Math.round((successCount / filteredTransactions.length) * 100)
			: 0;

	const selectedBusiness = useMemo(
		() => businesses?.find((b) => b.id === selectedBusinessId) ?? null,
		[businesses, selectedBusinessId],
	);

	const {
		data: detailTransaction,
		isLoading: detailLoading,
		error: detailError,
		refetch: refetchDetail,
	} = useGetTransactionQuery(
		{ transactionId: detailTransactionId ?? "" },
		{ skip: !detailTransactionId },
	);

	const [updateStatus, updateStatusState] = useUpdateTransactionStatusMutation();

	const refetchList = () => {
		if (useBranchEndpoint) void refetchBranchTx();
		else void refetchBusinessTx();
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
				<p className="text-sm text-muted-foreground">
					Select a business to load verified payment transactions. Optionally narrow
					by branch, date range, and status.
				</p>
			</div>

			{businessesError ? (
				<Alert variant="destructive">
					<AlertTitle>Failed to load businesses</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span className="wrap-break-word">
							{getErrorMessage(businessesError, "Request failed.")}
						</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => refetchBusinesses()}
						>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader className="flex flex-col gap-1">
					<CardTitle>Filters</CardTitle>
					<CardDescription>
						Choose a business (searchable), then optionally a branch and time
						range.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
						<div className="flex min-w-0 flex-1 flex-col gap-2">
							<span className="text-sm font-medium" id="business-filter-label">
								Business
							</span>
							<Popover
								open={businessPopoverOpen}
								onOpenChange={setBusinessPopoverOpen}
							>
								<PopoverTrigger
									render={
										<Button
											type="button"
											variant="outline"
											disabled={businessesLoading}
											className="h-10 w-full min-w-0 justify-between"
											aria-labelledby="business-filter-label"
										/>
									}
								>
									<span className="truncate text-left">
										{businessesLoading ? (
											<span className="text-muted-foreground">Loading…</span>
										) : selectedBusiness ? (
											selectedBusiness.name
										) : (
											<span className="text-muted-foreground">
												Select business…
											</span>
										)}
									</span>
									<ChevronsUpDownIcon data-icon="inline-end" aria-hidden />
								</PopoverTrigger>
								<PopoverContent
									className="w-(--anchor-width) min-w-72 p-0"
									align="start"
								>
									<Command>
										<CommandInput
											placeholder="Search by name or TIN…"
											aria-label="Search businesses"
										/>
										<CommandList>
											<CommandEmpty>No business found.</CommandEmpty>
											<CommandGroup heading="Businesses">
												{(businesses ?? []).map((b: BusinessOutput) => (
													<CommandItem
														key={b.id}
														value={`${b.name} ${b.tin_number} ${b.id}`}
														onSelect={() => {
															setSelectedBusinessId(b.id);
															setBranchId(BRANCH_ALL);
															setBusinessPopoverOpen(false);
														}}
														className="[&>svg:last-child]:hidden"
													>
														<span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
															<span className="truncate font-medium">{b.name}</span>
															<span className="truncate text-xs text-muted-foreground">
																TIN {b.tin_number}
															</span>
														</span>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</div>

						<div className="flex min-w-48 flex-1 flex-col gap-2">
							<span className="text-sm font-medium" id="branch-filter-label">
								Branch
							</span>
							<Select
								value={branchId}
								onValueChange={(v) => {
									if (v != null && v !== "") setBranchId(v);
								}}
								disabled={!selectedBusinessId || branchesLoading}
							>
								<SelectTrigger
									className="h-10 w-full"
									aria-labelledby="branch-filter-label"
								>
									<SelectValue placeholder="All branches" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={BRANCH_ALL}>All branches</SelectItem>
									{(branches ?? []).map((br) => (
										<SelectItem key={br.id} value={br.id}>
											{br.name}
											{br.is_head_quarter ? " (HQ)" : ""}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{branchesError ? (
								<p className="text-xs text-destructive">
									{getErrorMessage(branchesError, "Branches failed to load.")}{" "}
									<button
										type="button"
										className="underline underline-offset-2"
										onClick={() => refetchBranches()}
									>
										Retry
									</button>
								</p>
							) : null}
						</div>

						<div className="flex min-w-48 flex-1 flex-col gap-2">
							<span className="text-sm font-medium" id="date-filter-label">
								Date range
							</span>
							<Select
								value={datePreset}
								onValueChange={(v) => {
									if (v) setDatePreset(v as DatePreset);
								}}
							>
								<SelectTrigger
									className="h-10 w-full"
									aria-labelledby="date-filter-label"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="today">Today</SelectItem>
									<SelectItem value="last_7_days">Last 7 days</SelectItem>
									<SelectItem value="last_30_days">Last 30 days</SelectItem>
									<SelectItem value="this_month">This month</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex min-w-48 flex-1 flex-col gap-2">
							<span className="text-sm font-medium" id="status-filter-label">
								Status
							</span>
							<Select
								value={statusFilter}
								onValueChange={(v) => {
									if (v != null && v !== "") setStatusFilter(v);
								}}
							>
								<SelectTrigger
									className="h-10 w-full"
									aria-labelledby="status-filter-label"
								>
									<SelectValue placeholder="All statuses" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All statuses</SelectItem>
									<SelectItem value="verified">verified</SelectItem>
									<SelectItem value="failed">failed</SelectItem>
									<SelectItem value="pending">pending</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex min-w-0 flex-2 flex-col gap-2 lg:min-w-48">
							<span className="text-sm font-medium" id="search-label">
								Search results
							</span>
							<Input
								aria-labelledby="search-label"
								placeholder="Reference, amount, accounts…"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="h-10"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{selectedBusinessId && listError ? (
				<Alert variant="destructive">
					<AlertTitle>Failed to load transactions</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span className="wrap-break-word">
							{getErrorMessage(listError, "Request failed.")}
						</span>
						<Button type="button" variant="outline" size="sm" onClick={refetchList}>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<Card>
					<CardContent className="flex flex-row items-center gap-4 pt-6">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
							<CreditCardIcon className="text-muted-foreground" aria-hidden />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-sm text-muted-foreground">Transactions</p>
							<p className="text-2xl font-semibold tabular-nums">
								{selectedBusinessId ? filteredTransactions.length : "—"}
							</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex flex-row items-center gap-4 pt-6">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
							<ReceiptIcon className="text-muted-foreground" aria-hidden />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-sm text-muted-foreground">Total amount</p>
							<p className="text-2xl font-semibold tabular-nums truncate">
								{selectedBusinessId && filteredTransactions.length > 0
									? `${filteredTransactions[0]?.currency ?? ""} ${totalAmount.toLocaleString()}`.trim()
									: "—"}
							</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex flex-row items-center gap-4 pt-6">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
							<PercentIcon className="text-muted-foreground" aria-hidden />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-sm text-muted-foreground">Success rate</p>
							<p className="text-2xl font-semibold tabular-nums">
								{selectedBusinessId && filteredTransactions.length > 0
									? `${successRate}%`
									: "—"}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Results</CardTitle>
					<CardDescription>
						{selectedBusinessId
							? useBranchEndpoint
								? "Transactions for the selected branch and date range."
								: "Transactions for the whole business and date range."
							: "Select a business to load transactions."}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{!selectedBusinessId ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							Choose a business from the combobox above.
						</p>
					) : listLoading ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : (
						<div className="overflow-x-auto rounded-md border">
							<Table aria-label="Payment transactions">
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
									{filteredTransactions.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={8}
												className="py-10 text-center text-muted-foreground"
											>
												No transactions match your filters.
											</TableCell>
										</TableRow>
									) : (
										filteredTransactions.map((t) => (
											<TableRow
												key={t.id}
												className="cursor-pointer"
												onClick={() => {
													setDetailTransactionId(t.id);
													setStatusDraft(normalizeStatusDraft(t.status));
												}}
											>
												<TableCell className="font-mono text-sm">
													{t.reference_number}
												</TableCell>
												<TableCell>
													<span className="font-medium tabular-nums">
														{t.currency} {parseAmount(t.amount).toLocaleString()}
													</span>
												</TableCell>
												<TableCell>
													<Badge variant={statusBadgeVariant(t.status)}>
														{t.status}
													</Badge>
												</TableCell>
												<TableCell className="max-w-48 truncate text-sm">
													{t.sender_name ?? "—"}
												</TableCell>
												<TableCell className="max-w-44 font-mono text-xs">
													<span className="wrap-break-word">
														{t.sender_account ?? "—"}
													</span>
												</TableCell>
												<TableCell className="max-w-48 truncate text-sm">
													{t.receiver_name ?? "—"}
												</TableCell>
												<TableCell className="max-w-44 font-mono text-xs">
													<span className="wrap-break-word">
														{t.receiver_account ?? "—"}
													</span>
												</TableCell>
												<TableCell className="text-sm">
													{t.receipt_url ? (
														<a
															href={t.receipt_url}
															target="_blank"
															rel="noopener noreferrer"
															className="text-primary underline-offset-4 hover:underline"
															onClick={(e) => e.stopPropagation()}
														>
															Open receipt
														</a>
													) : (
														<span className="text-muted-foreground">—</span>
													)}
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<Sheet
				open={detailTransactionId !== null}
				onOpenChange={(open) => {
					if (!open) setDetailTransactionId(null);
				}}
			>
				<SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
					<SheetHeader className="border-b border-border pb-4">
						<SheetTitle>Transaction</SheetTitle>
						<SheetDescription>
							{detailTransactionId
								? `ID ${detailTransactionId}`
								: "Loading…"}
						</SheetDescription>
					</SheetHeader>

					{detailLoading ? (
						<div className="flex flex-col gap-3 p-4">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-24 w-full" />
						</div>
					) : detailError ? (
						<div className="flex flex-col gap-4 p-4">
							<Alert variant="destructive">
								<AlertTitle>Could not load transaction</AlertTitle>
								<AlertDescription className="flex flex-col gap-2">
									<span>{getErrorMessage(detailError, "Request failed.")}</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-fit"
										onClick={() => refetchDetail()}
									>
										Try again
									</Button>
								</AlertDescription>
							</Alert>
						</div>
					) : detailTransaction ? (
						<div className="flex flex-col gap-4 p-4">
							<div className="flex flex-col gap-2">
								<span className="text-xs font-medium text-muted-foreground">
									Status
								</span>
								<div className="flex flex-wrap items-center gap-2">
									<Badge
										variant={statusBadgeVariant(detailTransaction.status)}
										className="text-sm"
									>
										{detailTransaction.status}
									</Badge>
									{detailTransaction.error_message ? (
										<span className="text-sm text-destructive">
											{detailTransaction.error_message}
										</span>
									) : null}
								</div>
							</div>

							<Separator />

							<dl className="flex flex-col gap-3 text-sm">
								<div className="flex flex-col gap-0.5">
									<dt className="text-muted-foreground">Reference</dt>
									<dd className="font-mono">{detailTransaction.reference_number}</dd>
								</div>
								<div className="flex flex-col gap-0.5">
									<dt className="text-muted-foreground">Amount</dt>
									<dd className="font-semibold tabular-nums">
										{detailTransaction.currency}{" "}
										{parseAmount(detailTransaction.amount).toLocaleString()}
									</dd>
								</div>
								<div className="flex flex-col gap-0.5">
									<dt className="text-muted-foreground">Business ID</dt>
									<dd className="font-mono text-xs wrap-break-word">
										{detailTransaction.business_id}
									</dd>
								</div>
								{detailTransaction.bank_account_id ? (
									<div className="flex flex-col gap-0.5">
										<dt className="text-muted-foreground">Bank account</dt>
										<dd className="font-mono text-xs">
											{detailTransaction.bank_account_id}
										</dd>
									</div>
								) : null}
								<div className="grid gap-3 sm:grid-cols-2">
									<div className="flex flex-col gap-0.5">
										<dt className="text-muted-foreground">Sender</dt>
										<dd className="min-w-0 wrap-break-word">
											{detailTransaction.sender_name ?? "—"}
										</dd>
									</div>
									<div className="flex flex-col gap-0.5">
										<dt className="text-muted-foreground">Sender account</dt>
										<dd className="font-mono text-xs wrap-break-word">
											{detailTransaction.sender_account ?? "—"}
										</dd>
									</div>
									<div className="flex flex-col gap-0.5">
										<dt className="text-muted-foreground">Receiver</dt>
										<dd className="min-w-0 wrap-break-word">
											{detailTransaction.receiver_name ?? "—"}
										</dd>
									</div>
									<div className="flex flex-col gap-0.5">
										<dt className="text-muted-foreground">Receiver account</dt>
										<dd className="font-mono text-xs wrap-break-word">
											{detailTransaction.receiver_account ?? "—"}
										</dd>
									</div>
								</div>
								{detailTransaction.receipt_url ? (
									<div className="flex flex-col gap-0.5">
										<dt className="text-muted-foreground">Receipt</dt>
										<dd>
											<a
												href={detailTransaction.receipt_url}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary underline-offset-4 hover:underline"
											>
												Open receipt
											</a>
										</dd>
									</div>
								) : null}
							</dl>

							<Separator />

							<div className="flex flex-col gap-2">
								<span className="text-sm font-medium">Update status</span>
								<p className="text-xs text-muted-foreground">
									Patch transaction status (verified or failed) when you need to
									reconcile manually.
								</p>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
									<Select
										value={statusDraft}
										onValueChange={(v) => {
											if (v === "verified" || v === "failed") setStatusDraft(v);
										}}
									>
										<SelectTrigger
											className="sm:w-40"
											aria-label="New transaction status"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="verified">verified</SelectItem>
											<SelectItem value="failed">failed</SelectItem>
										</SelectContent>
									</Select>
									<Button
										type="button"
										size="sm"
										className="gap-1.5"
										disabled={
											updateStatusState.isLoading ||
											!detailTransactionId ||
											!detailTransaction ||
											statusDraft ===
												normalizeStatusDraft(detailTransaction.status)
										}
										onClick={async () => {
											if (!detailTransactionId) return;
											const updated = await updateStatus({
												transactionId: detailTransactionId,
												body: { status: statusDraft },
											}).unwrap();
											setStatusDraft(normalizeStatusDraft(updated.status));
										}}
									>
										{updateStatusState.isLoading ? (
											<>
												<Loader2Icon className="animate-spin" aria-hidden />
												Saving…
											</>
										) : (
											"Save status"
										)}
									</Button>
								</div>
							</div>
						</div>
					) : null}
				</SheetContent>
			</Sheet>
		</div>
	);
}
