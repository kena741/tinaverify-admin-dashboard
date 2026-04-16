"use client";

import { useMemo, useState } from "react";
import {
	ClipboardListIcon,
	Loader2Icon,
	ReceiptTextIcon,
	SearchIcon,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import {
	useListBusinessBranchesQuery,
	useListMyBusinessesQuery,
} from "../../../services/branch-management/branchManagementApi";
import {
	useLazyGetOrderQuery,
	useListOrderTransactionsSummaryQuery,
	useListTableOrdersQuery,
} from "../../../services/orders/ordersApi";
import { useListBranchTablesQuery } from "../../../services/tables/tablesApi";
import type { OrderResponse, OrderStatus } from "../../../services/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type SummaryFilterState = {
	startDate: string;
	endDate: string;
	includeBranchFilter: boolean;
	createdBy: string;
};

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

function formatDateTime(value: string): string {
	return new Date(value).toLocaleString();
}

function formatAmount(value: number): string {
	return value.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

function formatDateTimeLocalInput(date: Date): string {
	const offsetDate = new Date(
		date.getTime() - date.getTimezoneOffset() * 60000,
	);
	return offsetDate.toISOString().slice(0, 16);
}

function getStatusBadgeVariant(status: OrderStatus) {
	switch (status) {
		case "completed":
			return "default";
		case "cancelled":
			return "destructive";
		case "in_progress":
			return "secondary";
		case "pending":
		default:
			return "outline";
	}
}

function isMatchingLookup(
	orderId: string,
	lookupOrder?: OrderResponse,
): boolean {
	return Boolean(orderId && lookupOrder && orderId === lookupOrder.id);
}

export default function OrdersPage() {
	const { user, isBranchAdmin } = useAuth();

	const defaultEndDate = useMemo(() => new Date(), []);
	const defaultStartDate = useMemo(
		() => new Date(defaultEndDate.getTime() - 24 * 60 * 60 * 1000),
		[defaultEndDate],
	);

	const [businessId, setBusinessId] = useState("");
	const [branchId, setBranchId] = useState("");
	const [tableId, setTableId] = useState("");
	const [selectedOrderId, setSelectedOrderId] = useState("");
	const [lookupOrderId, setLookupOrderId] = useState("");
	const [lookupError, setLookupError] = useState<string | null>(null);
	const [summaryFilters, setSummaryFilters] = useState<SummaryFilterState>({
		startDate: formatDateTimeLocalInput(defaultStartDate),
		endDate: formatDateTimeLocalInput(defaultEndDate),
		includeBranchFilter: false,
		createdBy: "",
	});

	const { data: businesses = [], isLoading: businessesLoading } =
		useListMyBusinessesQuery();

	const {
		data: businessBranches = [],
		isLoading: branchesLoading,
		error: branchesError,
	} = useListBusinessBranchesQuery({ businessId }, { skip: !businessId });

	const resolvedBranchId = useMemo(() => {
		const available = new Set(businessBranches.map((branch) => branch.id));
		if (branchId && available.has(branchId)) return branchId;
		if (isBranchAdmin() && user?.branchId && available.has(user.branchId)) {
			return user.branchId;
		}
		if (businessBranches.length === 1) return businessBranches[0].id;
		return "";
	}, [branchId, businessBranches, isBranchAdmin, user?.branchId]);

	const {
		data: branchTables = [],
		isLoading: tablesLoading,
		error: tablesError,
	} = useListBranchTablesQuery(
		{ branchId: resolvedBranchId },
		{ skip: !resolvedBranchId },
	);

	const resolvedTableId = useMemo(() => {
		const available = new Set(branchTables.map((table) => table.id));
		if (tableId && available.has(tableId)) return tableId;
		if (branchTables.length === 1) return branchTables[0].id;
		return "";
	}, [branchTables, tableId]);

	const {
		data: tableOrders = [],
		isLoading: tableOrdersLoading,
		isFetching: tableOrdersFetching,
		error: tableOrdersError,
	} = useListTableOrdersQuery(
		{ tableId: resolvedTableId },
		{ skip: !resolvedTableId },
	);

	const [
		triggerGetOrder,
		{
			data: lookupOrder,
			isFetching: lookupFetching,
			error: lookupRequestError,
		},
	] = useLazyGetOrderQuery();

	const summaryQueryArgs = useMemo(() => {
		if (!businessId || !summaryFilters.startDate || !summaryFilters.endDate) {
			return null;
		}

		return {
			businessId,
			startDate: new Date(summaryFilters.startDate).toISOString(),
			endDate: new Date(summaryFilters.endDate).toISOString(),
			branchId: summaryFilters.includeBranchFilter
				? resolvedBranchId || null
				: null,
			createdBy: summaryFilters.createdBy.trim() || null,
		};
	}, [
		businessId,
		resolvedBranchId,
		summaryFilters.createdBy,
		summaryFilters.endDate,
		summaryFilters.includeBranchFilter,
		summaryFilters.startDate,
	]);

	const {
		data: transactionsSummary = [],
		isLoading: summaryLoading,
		isFetching: summaryFetching,
		error: summaryError,
	} = useListOrderTransactionsSummaryQuery(summaryQueryArgs!, {
		skip: !summaryQueryArgs,
	});

	const selectedBusiness = useMemo(
		() => businesses.find((business) => business.id === businessId) ?? null,
		[businessId, businesses],
	);

	const selectedBranch = useMemo(
		() =>
			businessBranches.find((branch) => branch.id === resolvedBranchId) ?? null,
		[businessBranches, resolvedBranchId],
	);

	const selectedTable = useMemo(
		() => branchTables.find((table) => table.id === resolvedTableId) ?? null,
		[branchTables, resolvedTableId],
	);

	const detailOrder = useMemo(() => {
		const fromList =
			tableOrders.find((order) => order.id === selectedOrderId) ?? null;
		if (fromList) return fromList;
		return isMatchingLookup(selectedOrderId, lookupOrder) ? lookupOrder : null;
	}, [lookupOrder, selectedOrderId, tableOrders]);

	const totalOrders = tableOrders.length;
	const activeOrders = tableOrders.filter((order) => !order.is_archived).length;
	const totalSummaryAmount = transactionsSummary.reduce(
		(sum, entry) => sum + entry.amount,
		0,
	);

	const handleOrderLookup = async (event: React.FormEvent) => {
		event.preventDefault();
		setLookupError(null);

		const orderId = lookupOrderId.trim();
		if (!orderId) {
			setLookupError("Enter an order ID to look up.");
			return;
		}

		try {
			const result = await triggerGetOrder({ orderId }).unwrap();
			setSelectedOrderId(result.id);
		} catch (error) {
			setLookupError(getErrorMessage(error, "Could not fetch the order."));
		}
	};

	return (
		<main className="flex flex-col gap-6">
			<header className="flex flex-col gap-3">
				<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
					Orders
				</h1>
				<p className="text-sm text-muted-foreground">
					Inspect a single order, list all orders for a table, and review order
					transaction summaries for a business.
				</p>
			</header>

			<section className="grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Table Orders</CardTitle>
						<CardDescription>
							Orders returned for the selected table.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold">{totalOrders}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Active Orders</CardTitle>
						<CardDescription>Orders not marked archived.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold">{activeOrders}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Summary Amount</CardTitle>
						<CardDescription>
							Transaction total for the current summary filter.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold">
							{formatAmount(totalSummaryAmount)} ETB
						</p>
					</CardContent>
				</Card>
			</section>

			<section className="w-full">
				<div className="flex flex-col gap-6">
					<Card>
						<CardHeader>
							<CardTitle>List Orders By Table</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-5">
							<FieldGroup className="grid gap-4 md:grid-cols-3">
								<Field>
									<FieldLabel htmlFor="orders-business-select">
										Business
									</FieldLabel>
									<Select
										value={businessId}
										onValueChange={(value) => {
											setBusinessId(value ?? "");
											setBranchId("");
											setTableId("");
											setSelectedOrderId("");
										}}
										disabled={businessesLoading}
									>
										<SelectTrigger
											id="orders-business-select"
											className="w-full"
										>
											<SelectValue placeholder="Select a business">
												{selectedBusiness?.name ?? ""}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{businesses.map((business) => (
													<SelectItem key={business.id} value={business.id}>
														{business.name}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>

								<Field>
									<FieldLabel htmlFor="orders-branch-select">Branch</FieldLabel>
									<Select
										value={resolvedBranchId}
										onValueChange={(value) => {
											setBranchId(value ?? "");
											setTableId("");
											setSelectedOrderId("");
										}}
										disabled={!businessId || branchesLoading}
									>
										<SelectTrigger id="orders-branch-select" className="w-full">
											<SelectValue placeholder="Select a branch">
												{selectedBranch?.name ?? ""}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{businessBranches.map((branch) => (
													<SelectItem key={branch.id} value={branch.id}>
														{branch.name}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>

								<Field>
									<FieldLabel htmlFor="orders-table-select">Table</FieldLabel>
									<Select
										value={resolvedTableId}
										onValueChange={(value) => {
											setTableId(value ?? "");
											setSelectedOrderId("");
										}}
										disabled={!resolvedBranchId || tablesLoading}
									>
										<SelectTrigger id="orders-table-select" className="w-full">
											<SelectValue placeholder="Select a table">
												{selectedTable?.name ?? ""}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{branchTables.map((table) => (
													<SelectItem key={table.id} value={table.id}>
														{table.name}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							</FieldGroup>

							{branchesError ? (
								<Alert variant="destructive">
									<AlertTitle>Could not load branches</AlertTitle>
									<AlertDescription>
										{getErrorMessage(
											branchesError,
											"Try selecting the business again.",
										)}
									</AlertDescription>
								</Alert>
							) : null}

							{tablesError ? (
								<Alert variant="destructive">
									<AlertTitle>Could not load tables</AlertTitle>
									<AlertDescription>
										{getErrorMessage(
											tablesError,
											"Could not load tables for the selected branch.",
										)}
									</AlertDescription>
								</Alert>
							) : null}

							{tableOrdersError ? (
								<Alert variant="destructive">
									<AlertTitle>Could not load table orders</AlertTitle>
									<AlertDescription>
										{getErrorMessage(
											tableOrdersError,
											"The order list request failed for the selected table.",
										)}
									</AlertDescription>
								</Alert>
							) : null}

							{!resolvedTableId ? (
								<Alert className="border-none">
									<AlertTitle>Select a table</AlertTitle>
									<AlertDescription>
										Choose a business, branch, and table to load orders.
									</AlertDescription>
								</Alert>
							) : tableOrdersLoading || tableOrdersFetching ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2Icon className="animate-spin" />
									Loading table orders...
								</div>
							) : tableOrders.length === 0 ? (
								<Alert className="border-none">
									<AlertTitle>No orders found</AlertTitle>
								</Alert>
							) : (
								<Table>
									<TableCaption>
										Click a row to inspect its order details.
									</TableCaption>
									<TableHeader>
										<TableRow>
											<TableHead>Order ID</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Items</TableHead>
											<TableHead>Created</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{tableOrders.map((order) => (
											<TableRow
												key={order.id}
												data-state={
													order.id === selectedOrderId ? "selected" : undefined
												}
												className="cursor-pointer"
												onClick={() => setSelectedOrderId(order.id)}
											>
												<TableCell className="font-mono">{order.id}</TableCell>
												<TableCell>
													<Badge variant={getStatusBadgeVariant(order.status)}>
														{order.status}
													</Badge>
												</TableCell>
												<TableCell>{order.items.length}</TableCell>
												<TableCell>
													{formatDateTime(order.created_at)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Transactions Summary</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-5">
							<FieldGroup className="grid gap-4 md:grid-cols-2">
								<Field>
									<FieldLabel htmlFor="summary-start-date">
										Start Date
									</FieldLabel>
									<Input
										id="summary-start-date"
										type="datetime-local"
										value={summaryFilters.startDate}
										onChange={(event) =>
											setSummaryFilters((current) => ({
												...current,
												startDate: event.target.value,
											}))
										}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="summary-end-date">End Date</FieldLabel>
									<Input
										id="summary-end-date"
										type="datetime-local"
										value={summaryFilters.endDate}
										onChange={(event) =>
											setSummaryFilters((current) => ({
												...current,
												endDate: event.target.value,
											}))
										}
									/>
								</Field>
							</FieldGroup>

							<FieldGroup className="grid gap-4 md:grid-cols-2">
								<Field orientation="horizontal">
									<Checkbox
										id="summary-use-branch"
										checked={summaryFilters.includeBranchFilter}
										onCheckedChange={(checked) =>
											setSummaryFilters((current) => ({
												...current,
												includeBranchFilter: checked === true,
											}))
										}
									/>
									<FieldContent>
										<FieldLabel htmlFor="summary-use-branch">
											Filter by selected branch
										</FieldLabel>
									</FieldContent>
								</Field>

								<Field>
									<FieldLabel htmlFor="summary-created-by">
										Created By
									</FieldLabel>
									<Input
										id="summary-created-by"
										value={summaryFilters.createdBy}
										onChange={(event) =>
											setSummaryFilters((current) => ({
												...current,
												createdBy: event.target.value,
											}))
										}
										placeholder="Optional user UUID"
										autoComplete="off"
									/>
								</Field>
							</FieldGroup>

							{summaryError ? (
								<Alert variant="destructive">
									<AlertTitle>Could not load summary</AlertTitle>
									<AlertDescription>
										{getErrorMessage(
											summaryError,
											"The transactions summary request failed.",
										)}
									</AlertDescription>
								</Alert>
							) : null}

							{!summaryQueryArgs ? (
								<Alert className="border-none">
									<AlertTitle>Select a business</AlertTitle>
									<AlertDescription>
										Choose a business and date range to load transaction
										summaries.
									</AlertDescription>
								</Alert>
							) : summaryLoading || summaryFetching ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2Icon className="animate-spin" />
									Loading transaction summary...
								</div>
							) : transactionsSummary.length === 0 ? (
								<Alert className="border-none">
									<AlertTitle>No summary rows found</AlertTitle>
									<AlertDescription>
										No transactions matched the selected filters.
									</AlertDescription>
								</Alert>
							) : (
								<Table>
									<TableCaption>
										Summary rows grouped by order and transaction.
									</TableCaption>
									<TableHeader>
										<TableRow>
											<TableHead>Order ID</TableHead>
											<TableHead>Transaction ID</TableHead>
											<TableHead className="text-right">Amount</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{transactionsSummary.map((entry) => (
											<TableRow
												key={`${entry.order_id}-${entry.transaction_id}`}
											>
												<TableCell className="font-mono">
													{entry.order_id}
												</TableCell>
												<TableCell className="font-mono">
													{entry.transaction_id}
												</TableCell>
												<TableCell className="text-right">
													{formatAmount(entry.amount)} ETB
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			</section>
		</main>
	);
}
