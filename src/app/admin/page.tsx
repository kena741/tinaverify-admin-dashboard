"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	ArrowRightIcon,
	Building2Icon,
	CreditCardIcon,
	LayoutGridIcon,
	Loader2Icon,
	MapPinIcon,
	ShoppingBagIcon,
	TablePropertiesIcon,
	UsersIcon,
} from "lucide-react";

import {
	branchManagementApi,
	useListAllUserBranchesQuery,
} from "../../services/branch-management/branchManagementApi";
import { ordersApi } from "../../services/orders/ordersApi";
import { tablesApi } from "../../services/tables/tablesApi";
import type {
	EmployeeOutput,
	OrderTransactionSummaryResponse,
} from "../../services/types";
import { useAppDispatch } from "../../store/hooks";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month" | "year";

function getPeriodRange(period: Period): { start: string; end: string } {
	const end = new Date();
	const start = new Date();
	switch (period) {
		case "today":
			start.setHours(0, 0, 0, 0);
			break;
		case "week":
			start.setDate(end.getDate() - 6);
			start.setHours(0, 0, 0, 0);
			break;
		case "month":
			start.setMonth(end.getMonth() - 1);
			start.setHours(0, 0, 0, 0);
			break;
		case "year":
			start.setFullYear(end.getFullYear() - 1);
			start.setHours(0, 0, 0, 0);
			break;
	}
	return {
		start: start.toISOString(),
		end: end.toISOString(),
	};
}

function periodLabel(period: Period): string {
	switch (period) {
		case "today":
			return "Today";
		case "week":
			return "Last 7 days";
		case "month":
			return "Last 30 days";
		case "year":
			return "Last year";
	}
}

function formatAmount(value: number): string {
	return value.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
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

type RevenueByBusinessRow = {
	businessId: string;
	businessName: string;
	amount: number;
	txCount: number;
};

export default function AdminDashboard() {
	const dispatch = useAppDispatch();
	const [period, setPeriod] = useState<Period>("week");

	const {
		data: branchBundle,
		isLoading: branchesLoading,
		isError: branchesError,
		error: branchesQueryError,
	} = useListAllUserBranchesQuery();

	const businesses = useMemo(
		() => branchBundle?.myBusinesses ?? [],
		[branchBundle],
	);
	const branches = useMemo(() => branchBundle?.branches ?? [], [branchBundle]);

	const businessIdsKey = useMemo(
		() => businesses.map((b) => b.id).join(","),
		[businesses],
	);
	const branchIdsKey = useMemo(
		() => branches.map((b) => b.id).join(","),
		[branches],
	);

	const [employees, setEmployees] = useState<EmployeeOutput[]>([]);
	const [revenueRows, setRevenueRows] = useState<RevenueByBusinessRow[]>([]);
	const [totalTables, setTotalTables] = useState<number | null>(null);
	const [aggregatesLoading, setAggregatesLoading] = useState(false);
	const [aggregatesError, setAggregatesError] = useState<string | null>(null);

	useEffect(() => {
		if (businesses.length === 0) {
			setEmployees([]);
			setRevenueRows([]);
			setTotalTables(null);
			setAggregatesLoading(false);
			return;
		}

		let cancelled = false;
		const range = getPeriodRange(period);

		setAggregatesLoading(true);
		setAggregatesError(null);

		const run = async () => {
			try {
				const employeeResults = await Promise.allSettled(
					businesses.map((b) =>
						dispatch(
							branchManagementApi.endpoints.listBusinessEmployees.initiate({
								businessId: b.id,
							}),
						).unwrap(),
					),
				);

				const txResults = await Promise.allSettled(
					businesses.map((b) =>
						dispatch(
							ordersApi.endpoints.listOrderTransactionsSummary.initiate({
								businessId: b.id,
								startDate: range.start,
								endDate: range.end,
								branchId: null,
								createdByUserIds: [],
							}),
						).unwrap(),
					),
				);

				const tableResults =
					branches.length === 0
						? []
						: await Promise.allSettled(
								branches.map((br) =>
									dispatch(
										tablesApi.endpoints.listBranchTables.initiate({
											branchId: br.id,
										}),
									).unwrap(),
								),
							);

				if (cancelled) return;

				const mergedEmployees: EmployeeOutput[] = [];
				for (const r of employeeResults) {
					if (r.status === "fulfilled") mergedEmployees.push(...r.value);
				}

				const revenue: RevenueByBusinessRow[] = businesses.map((b, i) => {
					const r = txResults[i];
					let rows: OrderTransactionSummaryResponse[] = [];
					if (r.status === "fulfilled") rows = r.value;
					const amount = rows.reduce((sum, row) => sum + row.amount, 0);
					return {
						businessId: b.id,
						businessName: b.name,
						amount,
						txCount: rows.length,
					};
				});

				let tablesCount = 0;
				for (const r of tableResults) {
					if (r.status === "fulfilled") tablesCount += r.value.length;
				}

				setEmployees(mergedEmployees);
				setRevenueRows(revenue);
				setTotalTables(branches.length === 0 ? 0 : tablesCount);

				const failedEmp = employeeResults.filter(
					(r) => r.status === "rejected",
				);
				const failedTx = txResults.filter((r) => r.status === "rejected");
				const failedTbl = tableResults.filter((r) => r.status === "rejected");
				if (
					failedEmp.length > 0 ||
					failedTx.length > 0 ||
					failedTbl.length > 0
				) {
					setAggregatesError(
						"Some data could not be loaded. Totals may be incomplete.",
					);
				}
			} catch (e) {
				if (!cancelled) {
					setAggregatesError(
						e instanceof Error ? e.message : "Could not load dashboard data.",
					);
				}
			} finally {
				if (!cancelled) setAggregatesLoading(false);
			}
		};

		void run();
		return () => {
			cancelled = true;
		};
	}, [businessIdsKey, branchIdsKey, period, dispatch, businesses, branches]);

	const activeEmployees = useMemo(() => {
		const active = employees.filter((e) => e.is_active);
		return new Set(active.map((e) => e.user_id)).size;
	}, [employees]);

	const txTotals = useMemo(() => {
		const count = revenueRows.reduce((s, r) => s + r.txCount, 0);
		const amount = revenueRows.reduce((s, r) => s + r.amount, 0);
		return { count, amount };
	}, [revenueRows]);

	const maxBusinessAmount = useMemo(
		() => Math.max(1, ...revenueRows.map((r) => r.amount)),
		[revenueRows],
	);

	const businessNameById = useMemo(() => {
		const m = new Map<string, string>();
		for (const b of businesses) m.set(b.id, b.name);
		return m;
	}, [businesses]);

	const loadError = branchesError
		? getErrorMessage(
				branchesQueryError,
				"Could not load businesses and branches.",
			)
		: null;

	if (loadError) {
		return (
			<main className="flex flex-col gap-4">
				<Alert variant="destructive">
					<AlertTitle>Could not load dashboard</AlertTitle>
					<AlertDescription>{loadError}</AlertDescription>
				</Alert>
			</main>
		);
	}

  return (
		<main className="flex flex-col gap-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
						Dashboard
					</h1>
					<p className="text-sm text-muted-foreground">
						Overview of your businesses, branches, and activity.
					</p>
        </div>
				<Field className="w-full min-w-0 sm:max-w-xs">
					<FieldLabel htmlFor="dashboard-period">Period</FieldLabel>
					<Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
						<SelectTrigger id="dashboard-period" className="w-full">
							<SelectValue placeholder="Period" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="today">Today</SelectItem>
								<SelectItem value="week">Last 7 days</SelectItem>
								<SelectItem value="month">Last 30 days</SelectItem>
								<SelectItem value="year">Last year</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>
			</header>

			{aggregatesError ? (
				<Alert>
					<AlertTitle>Partial data</AlertTitle>
					<AlertDescription>{aggregatesError}</AlertDescription>
				</Alert>
			) : null}

			<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-base font-medium">Businesses</CardTitle>
						<Building2Icon
							className="text-muted-foreground"
							aria-hidden="true"
						/>
					</CardHeader>
					<CardContent>
						{branchesLoading || aggregatesLoading ? (
							<Skeleton className="h-9 w-16" />
						) : (
							<p className="text-3xl font-semibold tabular-nums">
								{businesses.length}
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-base font-medium">Branches</CardTitle>
						<MapPinIcon className="text-muted-foreground" aria-hidden="true" />
					</CardHeader>
					<CardContent>
						{branchesLoading || aggregatesLoading ? (
							<Skeleton className="h-9 w-16" />
						) : (
							<p className="text-3xl font-semibold tabular-nums">
								{branches.length}
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-base font-medium">Team</CardTitle>
						<UsersIcon className="text-muted-foreground" aria-hidden="true" />
					</CardHeader>
					<CardContent>
						{branchesLoading || aggregatesLoading ? (
							<Skeleton className="h-9 w-16" />
						) : (
							<p className="text-3xl font-semibold tabular-nums">
								{activeEmployees}
							</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-base font-medium">
							Transactions
						</CardTitle>
						<CreditCardIcon
							className="text-muted-foreground"
							aria-hidden="true"
						/>
					</CardHeader>
					<CardContent>
						{branchesLoading || aggregatesLoading ? (
							<div className="flex flex-col gap-2">
								<Skeleton className="h-9 w-24" />
								<Skeleton className="h-4 w-32" />
            </div>
						) : (
							<>
								<p className="text-3xl font-semibold tabular-nums">
									{txTotals.count.toLocaleString()}
								</p>
							</>
						)}
					</CardContent>
				</Card>
			</section>

			<section className="grid gap-4 lg:grid-cols-2">
				<Card className="min-w-0">
					<CardHeader>
						<CardTitle>Revenue by business</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{branchesLoading || aggregatesLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
          </div>
						) : revenueRows.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No transaction rows in this period.
							</p>
						) : (
							<div className="flex flex-col gap-4">
								{revenueRows.map((row) => (
									<div key={row.businessId} className="flex flex-col gap-2">
										<div className="flex items-center justify-between gap-2 text-sm">
											<span className="truncate font-medium">
												{row.businessName}
											</span>
											<span className="shrink-0 tabular-nums text-muted-foreground">
												ETB {formatAmount(row.amount)}
											</span>
                </div>
										<div
											className="h-2 w-full overflow-hidden rounded-full bg-muted"
											aria-hidden="true"
										>
											<div
												className="h-full rounded-full bg-primary transition-[width]"
												style={{
													width: `${(row.amount / maxBusinessAmount) * 100}%`,
												}}
                    />
                  </div>
										<p className="text-xs text-muted-foreground">
											{row.txCount.toLocaleString()} transactions
										</p>
                </div>
              ))}
            </div>
						)}
					</CardContent>
				</Card>

				<Card className="min-w-0">
					<CardHeader>
						<CardTitle>Tables</CardTitle>
					</CardHeader>
					<CardContent>
						{branchesLoading || aggregatesLoading ? (
							<Skeleton className="h-10 w-28" />
						) : totalTables === null ? (
							<p className="text-sm text-muted-foreground">—</p>
						) : (
							<p className="text-3xl font-semibold tabular-nums">
								{totalTables}
							</p>
						)}
					</CardContent>
				</Card>
			</section>

			<section className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<h2 className="text-lg font-semibold tracking-tight">Branches</h2>
					<p className="text-sm text-muted-foreground">
						Manage locations and open detail pages.
					</p>
              </div>
				<Card>
					<CardContent className="pt-6">
						{branchesLoading ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2Icon className="animate-spin" aria-hidden="true" />
								Loading branches…
            </div>
						) : branches.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No branches yet. Create a business and branch to get started.
							</p>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Branch</TableHead>
											<TableHead className="hidden sm:table-cell">
												Business
											</TableHead>
											<TableHead className="hidden md:table-cell">
												Status
											</TableHead>
											<TableHead className="text-end">
												<span className="sr-only">Actions</span>
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{branches.map((br) => (
											<TableRow key={br.id}>
												<TableCell className="font-medium">
													<Link
														href={`/admin/branches/${br.id}`}
														className="text-primary underline-offset-4 hover:underline"
													>
														{br.name}
													</Link>
												</TableCell>
												<TableCell className="hidden text-muted-foreground sm:table-cell">
													{businessNameById.get(br.business_id) ?? "—"}
												</TableCell>
												<TableCell className="hidden md:table-cell">
													<div className="flex flex-wrap gap-1">
														{br.is_archived ? (
															<Badge variant="outline">Archived</Badge>
														) : (
															<Badge>Active</Badge>
														)}
														{br.is_head_quarter ? (
															<Badge variant="secondary">HQ</Badge>
														) : null}
													</div>
												</TableCell>
												<TableCell className="text-end">
													<Link
														href={`/admin/branches/${br.id}`}
														className={cn(
															buttonVariants({ variant: "ghost", size: "sm" }),
															"gap-1",
														)}
													>
														Open
														<ArrowRightIcon
															data-icon="inline-end"
															aria-hidden="true"
														/>
													</Link>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
        </div>
						)}
					</CardContent>
				</Card>
			</section>
		</main>
	);
}
