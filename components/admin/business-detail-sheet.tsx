"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format } from "date-fns";
import { ExternalLinkIcon } from "lucide-react";

import {
	useGetBusinessQuery,
	useListBusinessBranchesQuery,
	useListBusinessEmployeesQuery,
} from "@/services/branch-management/branchManagementApi";
import { useListBankAccountsQuery } from "@/services/bank-accounts/bankAccountsApi";
import {
	useGetActiveSubscriptionQuery,
	useGetSubscriptionUsageQuery,
	useListSubscriptionHistoryQuery,
} from "@/services/subscription/subscriptionApi";
import { useListSubscriptionPlansQuery } from "@/services/subscription-plan/subscriptionPlanApi";
import { useGetUserByIdQuery } from "@/services/auth/authApi";
import { useListRolesQuery } from "@/services/role/roleApi";
import type { AdminSubscriptionOutput, SubscriptionOutput } from "@/services/types";
import { formatUserDisplayName } from "@/lib/userDisplay";
import { getSubscriptionStatusLabel } from "@/lib/subscription-filters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return "—";
	try {
		return format(new Date(iso), "MMM d, yyyy HH:mm");
	} catch {
		return iso;
	}
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

type BusinessDetailSheetProps = {
	businessId: string | null;
	transaction?: AdminSubscriptionOutput | null;
	onOpenChange: (open: boolean) => void;
};

export function BusinessDetailSheet({
	businessId,
	transaction,
	onOpenChange,
}: BusinessDetailSheetProps) {
	const open = businessId !== null;
	const id = businessId ?? "";

	const {
		data: business,
		isLoading: businessLoading,
		error: businessError,
		refetch: refetchBusiness,
	} = useGetBusinessQuery({ businessId: id }, { skip: !businessId });

	const { data: owner } = useGetUserByIdQuery(
		{ userId: business?.owner_id ?? "" },
		{ skip: !business?.owner_id },
	);

	const { data: branches, isLoading: branchesLoading } =
		useListBusinessBranchesQuery({ businessId: id }, { skip: !businessId });

	const { data: employees, isLoading: employeesLoading } =
		useListBusinessEmployeesQuery({ businessId: id }, { skip: !businessId });

	const { data: roles } = useListRolesQuery(undefined, { skip: !businessId });

	const { data: bankAccounts, isLoading: bankAccountsLoading } =
		useListBankAccountsQuery({ businessId: id }, { skip: !businessId });

	const { data: plans } = useListSubscriptionPlansQuery(undefined, {
		skip: !businessId,
	});

	const { data: activeSubscription, isLoading: activeSubLoading } =
		useGetActiveSubscriptionQuery({ businessId: id }, { skip: !businessId });

	const { data: usage } = useGetSubscriptionUsageQuery(
		{ businessId: id },
		{ skip: !businessId },
	);

	const { data: history, isLoading: historyLoading } =
		useListSubscriptionHistoryQuery({ businessId: id }, { skip: !businessId });

	const planById = useMemo(
		() => new Map((plans ?? []).map((p) => [p.id, p] as const)),
		[plans],
	);

	const roleById = useMemo(
		() => new Map((roles ?? []).map((r) => [r.id, r] as const)),
		[roles],
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-5xl"
			>
				{businessLoading ? (
					<div className="flex flex-col gap-4 p-6">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-32 w-full" />
						<Skeleton className="h-48 w-full" />
					</div>
				) : businessError || !business ? (
					<div className="p-6">
						<SheetHeader>
							<SheetTitle>Business</SheetTitle>
						</SheetHeader>
						<Alert variant="destructive" className="mt-4">
							<AlertTitle>Failed to load business</AlertTitle>
							<AlertDescription className="flex flex-col gap-2">
								<span>{getErrorMessage(businessError, "Business not found.")}</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => refetchBusiness()}
								>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					</div>
				) : (
					<>
						<div className="shrink-0 border-b px-6 py-5">
							<SheetHeader className="gap-2 p-0 text-left">
								<SheetTitle className="text-xl">{business.name}</SheetTitle>
								<SheetDescription className="flex flex-wrap items-center gap-2">
									<span>TIN {business.tin_number}</span>
									{business.is_active ? (
										<Badge variant="secondary">Active</Badge>
									) : (
										<Badge variant="outline">Inactive</Badge>
									)}
									{business.is_archived ? (
										<Badge variant="outline">Archived</Badge>
									) : null}
								</SheetDescription>
							</SheetHeader>

							{transaction ? (
								<Card className="mt-4 border-primary/20 bg-primary/5">
									<CardContent className="grid gap-2 py-3 text-sm sm:grid-cols-2">
										<div>
											<span className="text-muted-foreground">Plan</span>
											<p className="font-medium">
												{transaction.plan?.name ?? "—"}
											</p>
										</div>
										<div>
											<span className="text-muted-foreground">Status</span>
											<p>
												<Badge variant="outline" className="mt-0.5">
													{getSubscriptionStatusLabel(transaction.status)}
												</Badge>
											</p>
										</div>
										<div>
											<span className="text-muted-foreground">Amount</span>
											<p className="font-medium tabular-nums">
												{transaction.amount != null
													? transaction.amount.toLocaleString()
													: "—"}
											</p>
										</div>
										<div>
											<span className="text-muted-foreground">Reference</span>
											<p className="truncate font-mono text-xs">
												{transaction.chapa_transaction_reference ?? "—"}
											</p>
										</div>
									</CardContent>
								</Card>
							) : null}

							<Button
								variant="outline"
								size="sm"
								className="mt-4 w-full sm:w-auto"
								render={<Link href={`/admin/business/${business.id}`} />}
							>
								<ExternalLinkIcon data-icon="inline-start" />
								Open full business profile
							</Button>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
							<Tabs defaultValue="overview" className="mt-4">
								<TabsList className="w-full justify-start">
									<TabsTrigger value="overview">Overview</TabsTrigger>
									<TabsTrigger value="branches">Branches</TabsTrigger>
									<TabsTrigger value="employees">Employees</TabsTrigger>
									<TabsTrigger value="bank-accounts">Bank accounts</TabsTrigger>
									<TabsTrigger value="subscription">Subscription</TabsTrigger>
								</TabsList>

								<TabsContent value="overview" className="mt-4">
									<Card>
										<CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
											<DetailField label="Name" value={business.name} />
											<DetailField label="TIN" value={business.tin_number} />
											<DetailField
												label="Owner"
												value={
													owner ? formatUserDisplayName(owner) : "—"
												}
											/>
											<DetailField
												label="Status"
												value={business.is_active ? "Active" : "Inactive"}
											/>
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent value="branches" className="mt-4">
									{branchesLoading ? (
										<LoadingRows />
									) : (
										<MiniTable
											headers={["Branch", "HQ", "Address"]}
											empty="No branches found."
											rows={(branches ?? []).map((b) => [
												b.name,
												b.is_head_quarter ? "Yes" : "No",
												b.address ?? "—",
											])}
										/>
									)}
								</TabsContent>

								<TabsContent value="employees" className="mt-4">
									{employeesLoading ? (
										<LoadingRows />
									) : (
										<MiniTable
											headers={["Employee", "Role", "Branch"]}
											empty="No employees found."
											rows={(employees ?? []).map((e) => [
												e.user?.username ??
													e.user?.phone_number ??
													e.user_id,
												roleById.get(e.role_id)?.name ?? "—",
												e.branch?.name ?? "—",
											])}
										/>
									)}
								</TabsContent>

								<TabsContent value="bank-accounts" className="mt-4">
									{bankAccountsLoading ? (
										<LoadingRows />
									) : (
										<MiniTable
											headers={["Bank", "Account", "Status"]}
											empty="No bank accounts linked."
											rows={(bankAccounts ?? []).map((a) => [
												a.bank_name,
												`${a.account_name} · ${a.account_number}`,
												a.is_archived ? "Archived" : "Active",
											])}
										/>
									)}
								</TabsContent>

								<TabsContent value="subscription" className="mt-4 flex flex-col gap-4">
									<Card>
										<CardContent className="flex flex-col gap-3 pt-6">
											<p className="text-sm font-medium">Current subscription</p>
											{activeSubLoading ? (
												<Skeleton className="h-8 w-full" />
											) : activeSubscription ? (
												<div className="flex flex-wrap items-center gap-2">
													<Badge variant="secondary">
														{activeSubscription.plan_id
															? (planById.get(activeSubscription.plan_id)?.name ??
																"Subscribed")
															: "Subscribed"}
													</Badge>
													<span className="text-sm text-muted-foreground">
														{getSubscriptionStatusLabel(activeSubscription.status)}
													</span>
												</div>
											) : (
												<p className="text-sm text-muted-foreground">
													No active subscription.
												</p>
											)}
											{usage ? (
												<>
													<Separator />
													<div className="grid grid-cols-3 gap-2 text-center text-sm">
														<div>
															<p className="text-muted-foreground">Used</p>
															<p className="font-semibold tabular-nums">
																{usage.credits_used}
															</p>
														</div>
														<div>
															<p className="text-muted-foreground">Remaining</p>
															<p className="font-semibold tabular-nums">
																{usage.remaining_credits}
															</p>
														</div>
														<div>
															<p className="text-muted-foreground">Limit</p>
															<p className="font-semibold tabular-nums">
																{usage.credits_limit}
															</p>
														</div>
													</div>
												</>
											) : null}
										</CardContent>
									</Card>

									<Card>
										<CardContent className="pt-6">
											<p className="mb-3 text-sm font-medium">History</p>
											{historyLoading ? (
												<LoadingRows />
											) : (
												<MiniTable
													headers={["Plan", "Status", "Started"]}
													empty="No subscription history."
													rows={(history ?? []).map((row: SubscriptionOutput) => [
														row.plan_id
															? (planById.get(row.plan_id)?.name ?? "—")
															: "—",
														getSubscriptionStatusLabel(row.status),
														formatDateTime(row.started_at),
													])}
												/>
											)}
										</CardContent>
									</Card>
								</TabsContent>
							</Tabs>
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}

function DetailField({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="font-medium">{value}</span>
		</div>
	);
}

function LoadingRows() {
	return (
		<div className="flex flex-col gap-2">
			{Array.from({ length: 4 }).map((_, i) => (
				<Skeleton key={i} className="h-10 w-full" />
			))}
		</div>
	);
}

function MiniTable({
	headers,
	rows,
	empty,
}: {
	headers: string[];
	rows: string[][];
	empty: string;
}) {
	if (rows.length === 0) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
		);
	}

	return (
		<div className="overflow-x-auto rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						{headers.map((h) => (
							<TableHead key={h}>{h}</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((cells, i) => (
						<TableRow key={i}>
							{cells.map((cell, j) => (
								<TableCell
									key={j}
									className={j === 0 ? "font-medium" : undefined}
								>
									{cell}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
