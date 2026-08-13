"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
	ArrowLeft,
	MessageSquare,
	Power,
	Trash2,
} from "lucide-react";
import { format } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import {
	useDeleteBusinessMutation,
	useGetBusinessQuery,
	useListAllBusinessesQuery,
	useListBusinessEmployeesQuery,
	useListBusinessBranchesQuery,
	useSetBusinessActiveMutation,
	useUpdateEmployeeRoleMutation,
} from "../../../../services/branch-management/branchManagementApi";
import { useListBankAccountsQuery } from "../../../../services/bank-accounts/bankAccountsApi";
import {
	useGetActiveSubscriptionQuery,
	useGetSubscriptionUsageQuery,
	useListSubscriptionHistoryQuery,
} from "../../../../services/subscription/subscriptionApi";
import { useListSubscriptionPlansQuery } from "../../../../services/subscription-plan/subscriptionPlanApi";
import type {
	BankAccountResponse,
	BranchOutput,
	BusinessOutput,
	EmployeeOutput,
	RoleOutput,
	SubscriptionOutput,
} from "../../../../services/types";
import { useListRolesQuery } from "../../../../services/role/roleApi";
import { useGetUserByIdQuery } from "../../../../services/auth/authApi";
import { BusinessPaymentsTab } from "@/components/admin/business-payments-tab";
import { BusinessReferralsTab } from "@/components/admin/business-referrals-tab";
import { SendBusinessSmsDialog } from "@/components/admin/send-business-sms-dialog";
import { cn } from "@/lib/utils";
import { getSubscriptionPlanLabel } from "@/lib/subscription-filters";
import { formatUserDisplayName } from "@/lib/userDisplay";


function roleLabel(role?: RoleOutput | null) {
	return role?.name ?? "—";
}

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

const DETAIL_TABS = [
	"overview",
	"employees",
	"branches",
	"bank-accounts",
	"payments",
	"referrals",
	"subscription",
] as const;

type DetailTab = (typeof DETAIL_TABS)[number];

function isDetailTab(value: string | null | undefined): value is DetailTab {
	return (
		typeof value === "string" &&
		(DETAIL_TABS as readonly string[]).includes(value)
	);
}

function businessDetailPath(businessId: string, tab: DetailTab): string {
	if (tab === "overview") return `/admin/business/${businessId}`;
	return `/admin/business/${businessId}?tab=${tab}`;
}

export default function BusinessDetailClient({
	params,
}: {
	params: { id: string };
}) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const businessId = params.id;
	const missingBusinessId = !businessId;
	const [sendSmsOpen, setSendSmsOpen] = useState(false);

	const tabParam = searchParams.get("tab");
	const activeTab: DetailTab = isDetailTab(tabParam) ? tabParam : "overview";

	function goToBusiness(nextBusinessId: string) {
		router.push(businessDetailPath(nextBusinessId, activeTab), {
			scroll: false,
		});
	}

	function onTabChange(next: DetailTab | string | number | null) {
		const tab = typeof next === "string" ? next : String(next ?? "");
		if (!isDetailTab(tab) || tab === activeTab) return;
		router.replace(businessDetailPath(businessId, tab), { scroll: false });
	}

	const {
		data: business,
		isLoading: businessLoading,
		isFetching: businessFetching,
		error: businessError,
		refetch: refetchBusiness,
	} = useGetBusinessQuery(
		{ businessId },
		{
			skip: missingBusinessId,
		},
	);

	const { data: user } = useGetUserByIdQuery({ userId: business?.owner_id ?? "" }, { skip: businessLoading || businessFetching || missingBusinessId });

	const { data: allBusinesses, isLoading: allBusinessesLoading } =
		useListAllBusinessesQuery(undefined, { skip: missingBusinessId });

	const ownerBusinesses = useMemo(() => {
		const ownerId = business?.owner_id;
		if (!ownerId) return [] as BusinessOutput[];
		return (allBusinesses ?? [])
			.filter((b) => b.owner_id === ownerId)
			.toSorted((a, b) => a.name.localeCompare(b.name));
	}, [allBusinesses, business?.owner_id]);

	const {
		data: employees,
		isLoading: employeesLoading,
		error: employeesError,
		refetch: refetchEmployees,
	} = useListBusinessEmployeesQuery(
		{ businessId },
		{
			skip: missingBusinessId,
		},
	);

	const {
		data: branches,
		isLoading: branchesLoading,
	} = useListBusinessBranchesQuery(
		{ businessId },
		{
			skip: missingBusinessId,
		},
	);

	const {
		data: bankAccounts,
		isLoading: bankAccountsLoading,
		error: bankAccountsError,
		refetch: refetchBankAccounts,
	} = useListBankAccountsQuery(
		{ businessId },
		{
			skip: missingBusinessId,
		},
	);

	const {
		data: subscriptionPlans,
		isLoading: subscriptionPlansLoading,
		isFetching: subscriptionPlansFetching,
		error: subscriptionPlansError,
		refetch: refetchSubscriptionPlans,
	} = useListSubscriptionPlansQuery(undefined, { skip: missingBusinessId });

	const {
		data: activeSubscription,
		isLoading: activeSubscriptionLoading,
		isFetching: activeSubscriptionFetching,
		error: activeSubscriptionError,
		refetch: refetchActiveSubscription,
	} = useGetActiveSubscriptionQuery({ businessId }, { skip: missingBusinessId });

	const {
		data: subscriptionUsage,
		error: subscriptionUsageError,
		refetch: refetchSubscriptionUsage,
	} = useGetSubscriptionUsageQuery({ businessId }, { skip: missingBusinessId });

	const {
		data: subscriptionHistory,
		isLoading: subscriptionHistoryLoading,
		isFetching: subscriptionHistoryFetching,
		error: subscriptionHistoryError,
		refetch: refetchSubscriptionHistory,
	} = useListSubscriptionHistoryQuery(
		{ businessId },
		{ skip: missingBusinessId },
	);

	const { data: roles } = useListRolesQuery(undefined, {
		skip: missingBusinessId,
	});

	const [setBusinessActive, setBusinessActiveState] =
		useSetBusinessActiveMutation();
	const [deleteBusiness, deleteBusinessState] = useDeleteBusinessMutation();
	const [updateEmployeeRole, updateEmployeeRoleState] =
		useUpdateEmployeeRoleMutation();

	const [activeDialogOpen, setActiveDialogOpen] = useState(false);
	const [statusBanner, setStatusBanner] = useState<{
		variant: "default" | "destructive";
		title: string;
		message: string;
	} | null>(null);

	const [employeeRoleDraft, setEmployeeRoleDraft] = useState<
		Record<string, string>
	>({});

	const roleById = useMemo(() => {
		const items = roles ?? [];
		return new Map(items.map((r) => [r.id, r] as const));
	}, [roles]);

	const subscriptionPlanById = useMemo(() => {
		const items = subscriptionPlans ?? [];
		return new Map(items.map((p) => [p.id, p] as const));
	}, [subscriptionPlans]);

	const employeeRows = employees ?? [];

	if (missingBusinessId) {
		return (
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
				<Alert variant="destructive">
					<AlertTitle>Missing business</AlertTitle>
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span>Open an owner from the list, then pick a business.</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => router.push("/admin/transactions")}
						>
							Back to owners
						</Button>
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	if (businessLoading) {
		return (
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
				<Skeleton className="h-4 w-28" />
				<div className="overflow-hidden rounded-2xl border border-primary/15 bg-primary p-8">
					<Skeleton className="h-4 w-32 bg-primary-foreground/20" />
					<Skeleton className="mt-4 h-10 w-64 bg-primary-foreground/20" />
					<Skeleton className="mt-2 h-4 w-48 bg-primary-foreground/15" />
				</div>
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-48 w-full" />
			</div>
		);
	}

	if (businessError || !business) {
		const isRequestError =
			businessError !== undefined &&
			businessError !== null &&
			typeof businessError === "object" &&
			"status" in businessError;

		return (
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
				<Alert variant="destructive">
					<AlertTitle>Can’t load business</AlertTitle>
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span className="wrap-break-word">
							{isRequestError ? "Request failed." : "Business not found."}
						</span>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => router.push("/admin/transactions")}
							>
								Back to owners
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => refetchBusiness()}
							>
								Try again
							</Button>
						</div>
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const ownerDisplay = user ? formatUserDisplayName(user) : "Owner loading…";

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => router.push("/admin/transactions")}
				>
					<ArrowLeft data-icon="inline-start" />
					Owners
				</Button>
				{businessFetching ? (
					<Badge variant="outline">Updating…</Badge>
				) : null}
			</div>

			{statusBanner ? (
				<Alert variant={statusBanner.variant}>
					<AlertTitle>{statusBanner.title}</AlertTitle>
					<AlertDescription>{statusBanner.message}</AlertDescription>
				</Alert>
			) : null}

			{/* Signature: owner close-out strip */}
			<section
				aria-labelledby="owner-heading"
				className="overflow-hidden rounded-2xl border border-primary/15 bg-primary text-primary-foreground shadow-md"
			>
				<div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
					<div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
						<div className="flex flex-col gap-2">
							<p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary-foreground/70 uppercase">
								Business owner
							</p>
							<h1
								id="owner-heading"
								className="truncate text-2xl font-semibold tracking-tight sm:text-[1.75rem]"
							>
								{ownerDisplay}
							</h1>
							<p className="text-sm text-primary-foreground/80">
								{user?.phone_number ? (
									<span className="font-mono tabular-nums">
										{user.phone_number}
									</span>
								) : (
									<span>No phone on file</span>
								)}
								<span>
									{" · "}
									{ownerBusinesses.length === 1
										? "1 business"
										: `${ownerBusinesses.length || 0} businesses`}
								</span>
							</p>
						</div>
					</div>

					<div className="hidden w-px shrink-0 bg-primary-foreground/15 lg:block" />

					<div className="flex flex-1 flex-col justify-center gap-3">
						<p className="font-mono text-[11px] font-medium tracking-wide text-primary-foreground/65 uppercase">
							Managing
						</p>
						<p className="truncate text-lg font-semibold tracking-tight">
							{business.name || "Untitled business"}
						</p>
						<p className="text-sm text-primary-foreground/75">
							<span className="font-mono tabular-nums">
								TIN {business.tin_number}
							</span>
							{" · "}
							{business.is_active ? "Active" : "Inactive"}
							{business.is_archived ? " · Archived" : ""}
						</p>
						<div className="flex flex-wrap gap-2 pt-1">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
								disabled={!user?.phone_number}
								onClick={() => setSendSmsOpen(true)}
							>
								<MessageSquare data-icon="inline-start" />
								SMS
							</Button>
							<AlertDialog
								open={activeDialogOpen}
								onOpenChange={setActiveDialogOpen}
							>
								<AlertDialogTrigger
									className={cn(
										buttonVariants({ variant: "secondary", size: "sm" }),
										"bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25",
									)}
									disabled={setBusinessActiveState.isLoading}
								>
									<Power data-icon="inline-start" />
									{business.is_active ? "Deactivate" : "Activate"}
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											{business.is_active
												? "Deactivate this business?"
												: "Activate this business?"}
										</AlertDialogTitle>
										<AlertDialogDescription>
											Applies only to{" "}
											<span className="font-medium text-foreground">
												{business.name || "this business"}
											</span>
											, not the owner’s other businesses.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel disabled={setBusinessActiveState.isLoading}>
											Cancel
										</AlertDialogCancel>
										<AlertDialogAction
											disabled={setBusinessActiveState.isLoading}
											onClick={async (e) => {
												e.preventDefault();
												const nextActive = !business.is_active;
												try {
													await setBusinessActive({
														businessId,
														body: { is_active: nextActive },
													}).unwrap();
													setActiveDialogOpen(false);
													setStatusBanner({
														variant: "default",
														title: nextActive
															? "Business activated"
															: "Business deactivated",
														message: `${business.name || "Business"} is now ${
															nextActive ? "active" : "inactive"
														}.`,
													});
												} catch (err) {
													setStatusBanner({
														variant: "destructive",
														title: nextActive
															? "Could not activate"
															: "Could not deactivate",
														message: getErrorMessage(err, "Request failed."),
													});
												}
											}}
										>
											{setBusinessActiveState.isLoading
												? "Working…"
												: "Confirm"}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
							<AlertDialog>
								<AlertDialogTrigger
									className={cn(
										buttonVariants({ variant: "secondary", size: "sm" }),
										"bg-destructive/20 text-primary-foreground hover:bg-destructive/30",
									)}
									disabled={deleteBusinessState.isLoading}
								>
									<Trash2 data-icon="inline-start" />
									Delete
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Delete this business?</AlertDialogTitle>
										<AlertDialogDescription>
											Deletes{" "}
											<span className="font-medium text-foreground">
												{business.name || "this business"}
											</span>
											. This cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={async () => {
												await deleteBusiness({ businessId }).unwrap();
												router.push("/admin/transactions");
											}}
										>
											Delete
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</div>
				</div>
			</section>

			{/* Business switcher */}
			{ownerBusinesses.length > 1 ? (
				<section className="flex flex-col gap-2" aria-label="Switch business">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<p className="text-sm font-semibold tracking-tight text-foreground">
							Businesses
						</p>
						<p className="text-xs text-muted-foreground">
							Tabs below apply only to the selected business
						</p>
					</div>
					{allBusinessesLoading ? (
						<Skeleton className="h-10 w-full max-w-lg" />
					) : ownerBusinesses.length <= 6 ? (
						<div
							role="tablist"
							aria-label="Select business to manage"
							className="flex max-w-full flex-wrap gap-1.5 rounded-xl border border-border bg-card p-1.5 shadow-xs"
						>
							{ownerBusinesses.map((b) => {
								const isCurrent = b.id === businessId;
								return (
									<button
										key={b.id}
										type="button"
										role="tab"
										aria-selected={isCurrent}
										onClick={() => {
											if (!isCurrent) goToBusiness(b.id);
										}}
										className={cn(
											"h-9 max-w-48 truncate rounded-lg px-3 text-left text-sm motion-safe:transition-colors",
											isCurrent
												? "bg-primary font-medium text-primary-foreground"
												: "text-foreground hover:bg-muted",
										)}
									>
										{b.name || "Untitled"}
									</button>
								);
							})}
						</div>
					) : (
						<div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-xs">
							<label htmlFor="manage-business" className="sr-only">
								Managing business
							</label>
							<Select
								value={businessId}
								onValueChange={(id) => {
									if (id && id !== businessId) goToBusiness(id);
								}}
							>
								<SelectTrigger
									id="manage-business"
									className="h-9 max-w-sm min-w-48"
									aria-label="Managing business"
								>
									<span className="truncate font-medium">
										{business.name || "Select business"}
									</span>
								</SelectTrigger>
								<SelectContent align="start">
									{ownerBusinesses.map((b) => (
										<SelectItem key={b.id} value={b.id}>
											{b.name || "Untitled"} · TIN {b.tin_number}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{business.is_active ? (
								<Badge variant="secondary">Active</Badge>
							) : (
								<Badge variant="outline">Inactive</Badge>
							)}
						</div>
					)}
				</section>
			) : null}

			<SendBusinessSmsDialog
				open={sendSmsOpen}
				onOpenChange={setSendSmsOpen}
				businessName={business.name}
				phoneNumber={user?.phone_number}
			/>

			<Tabs value={activeTab} onValueChange={onTabChange} className="gap-4">
				<TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-border p-1.5 shadow-xs">
					<TabsTrigger value="overview" className="rounded-lg">
						Overview
					</TabsTrigger>
					<TabsTrigger value="employees" className="rounded-lg">
						Employees
					</TabsTrigger>
					<TabsTrigger value="branches" className="rounded-lg">
						Branches
					</TabsTrigger>
					<TabsTrigger value="bank-accounts" className="rounded-lg">
						Bank accounts
					</TabsTrigger>
					<TabsTrigger value="payments" className="rounded-lg">
						Payments
					</TabsTrigger>
					<TabsTrigger value="referrals" className="rounded-lg">
						Referrals
					</TabsTrigger>
					<TabsTrigger value="subscription" className="rounded-lg">
						Subscription
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-0">
					<div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border bg-card shadow-xs sm:grid-cols-2 lg:grid-cols-3">
						<div className="flex flex-col gap-1 px-5 py-4">
							<p className="text-xs font-medium text-muted-foreground">
								Business name
							</p>
							<p className="text-base font-semibold tracking-tight">
								{business.name || "—"}
							</p>
						</div>
						<div className="flex flex-col gap-1 border-border px-5 py-4 sm:border-l">
							<p className="text-xs font-medium text-muted-foreground">TIN</p>
							<p className="font-mono text-base font-semibold tabular-nums tracking-tight">
								{business.tin_number}
							</p>
						</div>
						<div className="flex flex-col gap-1 border-border px-5 py-4 sm:border-t lg:border-t-0 lg:border-l">
							<p className="text-xs font-medium text-muted-foreground">Status</p>
							<p className="text-base font-semibold tracking-tight">
								{business.is_active ? "Active" : "Inactive"}
								{business.is_archived ? " · Archived" : ""}
							</p>
						</div>
						<div className="flex flex-col gap-1 border-border px-5 py-4 sm:border-t">
							<p className="text-xs font-medium text-muted-foreground">Owner</p>
							<p className="truncate text-base font-semibold tracking-tight">
								{user ? formatUserDisplayName(user) : "—"}
							</p>
						</div>
						<div className="flex flex-col gap-1 border-border px-5 py-4 sm:border-t sm:border-l">
							<p className="text-xs font-medium text-muted-foreground">
								Owner phone
							</p>
							<p className="font-mono text-base font-semibold tabular-nums tracking-tight">
								{user?.phone_number ?? "—"}
							</p>
						</div>
						<div className="flex flex-col gap-1 border-border px-5 py-4 sm:border-t lg:border-l">
							<p className="text-xs font-medium text-muted-foreground">
								Businesses owned
							</p>
							<p className="font-mono text-base font-semibold tabular-nums tracking-tight">
								{ownerBusinesses.length}
							</p>
						</div>
					</div>
				</TabsContent>

				<TabsContent value="employees" className="mt-0">
					<Card size="sm" className="shadow-xs">
						<CardHeader className="border-b border-border pb-3">
							<CardTitle className="text-base">Employees</CardTitle>
							<CardDescription>
								Roles and branch assignment for this business
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 pt-4">
							{employeesError ? (
								<Alert variant="destructive">
									<AlertTitle>Failed to load employees</AlertTitle>
									<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
										<span className="wrap-break-word">Request failed.</span>
										<button
											type="button"
											className={cn(
												buttonVariants({ variant: "link", size: "sm" }),
											)}
											onClick={() => refetchEmployees()}
										>
											Try again
										</button>
									</AlertDescription>
								</Alert>
							) : null}

							{employeesLoading ? (
								<div className="flex flex-col gap-2">
									{Array.from({ length: 8 }).map((_, i) => (
										<Skeleton key={i} className="h-10 w-full" />
									))}
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Employee</TableHead>
											<TableHead>Role</TableHead>
											<TableHead>Branch</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{employeeRows.length === 0 ? (
											<TableRow>
												<TableCell colSpan={4} className="py-10 text-center">
													<span className="text-sm text-muted-foreground">
														No employees found.
													</span>
												</TableCell>
											</TableRow>
										) : (
											employeeRows.map((emp: EmployeeOutput) => {
												const selectedRoleId =
													employeeRoleDraft[emp.id] ?? emp.role_id;
												const selectedRole = roleById.get(selectedRoleId);

												return (
													<TableRow key={emp.id}>
														<TableCell className="min-w-0">
															<div className="flex flex-col gap-0.5 min-w-0">
																<span className="font-medium truncate">
																	{emp.user?.username ??
																		emp.user?.phone_number ??
																		emp.user_id}
																</span>
																<span className="text-sm text-muted-foreground truncate">
																	{emp.user?.email ?? "—"}
																</span>
															</div>
														</TableCell>
														<TableCell>
															<Select
																value={selectedRoleId}
																onValueChange={(value) => {
																	if (!value) return;
																	setEmployeeRoleDraft((prev) => ({
																		...prev,
																		[emp.id]: value,
																	}));
																}}
															>
																<SelectTrigger
																	aria-label="Select employee role"
																	className="w-56"
																>
																	<SelectValue placeholder="Select role">
																		{roleLabel(selectedRole)}
																	</SelectValue>
																</SelectTrigger>
																<SelectContent>
																	{(roles ?? []).map((r) => (
																		<SelectItem key={r.id} value={r.id}>
																			{r.name}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
														</TableCell>
														<TableCell>
															<span className="font-medium truncate">
																{emp.branch?.name ?? "—"}
															</span>
														</TableCell>
														<TableCell className="text-right">
															<button
																type="button"
																className={cn(
																	buttonVariants({
																		variant: "outline",
																		size: "sm",
																	}),
																)}
																disabled={
																	updateEmployeeRoleState.isLoading ||
																	!selectedRoleId ||
																	selectedRoleId === emp.role_id
																}
																onClick={async () => {
																	if (!selectedRoleId) return;
																	await updateEmployeeRole({
																		businessId,
																		employeeId: emp.id,
																		body: { role_id: selectedRoleId },
																	}).unwrap();
																}}
															>
																Save
															</button>
														</TableCell>
													</TableRow>
												);
											})
										)}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="branches" className="mt-0">
					<Card size="sm" className="shadow-xs">
						<CardHeader className="border-b border-border pb-3">
							<CardTitle className="text-base">Branches</CardTitle>
							<CardDescription>
								Locations under this business
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 pt-4">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Branch</TableHead>
										<TableHead>Headquarters</TableHead>
										<TableHead>Address</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{branchesLoading ? (
										<TableRow>
											<TableCell colSpan={3} className="py-10 text-center">
												<span className="text-sm text-muted-foreground">
													Loading branches…
												</span>
											</TableCell>
										</TableRow>
									) : branches?.length === 0 ? (
										<TableRow>
											<TableCell colSpan={3} className="py-10 text-center">
												<span className="text-sm text-muted-foreground">
													No branches found.
												</span>
											</TableCell>
										</TableRow>
									) : (
										branches?.map((branch: BranchOutput) => (
											<TableRow key={branch.id}>
												<TableCell>{branch.name}</TableCell>
												<TableCell>
													{branch.is_head_quarter ? "Yes" : "No"}
												</TableCell>
												<TableCell>{branch.address ?? "—"}</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="bank-accounts" className="mt-0">
					<Card size="sm" className="shadow-xs">
						<CardHeader className="border-b border-border pb-3">
							<CardTitle className="text-base">Bank accounts</CardTitle>
							<CardDescription>
								Linked payout accounts for this business
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 pt-4">
							{bankAccountsError ? (
								<Alert variant="destructive">
									<AlertTitle>Failed to load bank accounts</AlertTitle>
									<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
										<span className="wrap-break-word">Request failed.</span>
										<button
											type="button"
											className={cn(
												buttonVariants({ variant: "link", size: "sm" }),
											)}
											onClick={() => refetchBankAccounts()}
										>
											Try again
										</button>
									</AlertDescription>
								</Alert>
							) : null}

							{bankAccountsLoading ? (
								<div className="flex flex-col gap-2">
									{Array.from({ length: 6 }).map((_, i) => (
										<Skeleton key={i} className="h-10 w-full" />
									))}
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Bank</TableHead>
											<TableHead>Account name</TableHead>
											<TableHead>Account number</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{(bankAccounts ?? []).length === 0 ? (
											<TableRow>
												<TableCell colSpan={4} className="py-10 text-center">
													<span className="text-sm text-muted-foreground">
														No bank accounts linked to this business.
													</span>
												</TableCell>
											</TableRow>
										) : (
											(bankAccounts ?? []).map((account: BankAccountResponse) => (
												<TableRow
													key={`${account.bank_name}-${account.account_number}-${account.account_name}`}
												>
													<TableCell className="font-medium">
														{account.bank_name}
													</TableCell>
													<TableCell>{account.account_name}</TableCell>
													<TableCell className="font-mono text-sm">
														{account.account_number}
													</TableCell>
													<TableCell>
														<Badge
															variant={
																account.is_archived ? "secondary" : "default"
															}
														>
															{account.is_archived ? "Archived" : "Active"}
														</Badge>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="payments" className="mt-0">
					<BusinessPaymentsTab businessId={businessId} />
				</TabsContent>

				<TabsContent value="referrals" className="mt-0">
					<BusinessReferralsTab />
				</TabsContent>

				<TabsContent value="subscription" className="mt-0">
					<div className="flex flex-col gap-4">
						{/* Active plan as dense signature-adjacent panel */}
						<section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
							<div className="border-b border-border px-5 py-4">
								<p className="font-mono text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
									Billing
								</p>
								<h2 className="mt-1 text-base font-semibold tracking-tight">
									Current subscription
								</h2>
							</div>
							<div className="flex flex-col gap-4 p-5">
								{activeSubscriptionError ? (
									<Alert variant="destructive">
										<AlertTitle>Failed to load current subscription</AlertTitle>
										<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
											<span className="wrap-break-word">
												{getErrorMessage(
													activeSubscriptionError,
													"Request failed.",
												)}
											</span>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => refetchActiveSubscription()}
											>
												Try again
											</Button>
										</AlertDescription>
									</Alert>
								) : activeSubscriptionLoading || activeSubscriptionFetching ? (
									<Skeleton className="h-16 w-full" />
								) : activeSubscription ? (
									<div className="grid grid-cols-1 overflow-hidden rounded-lg border border-border sm:grid-cols-3">
										<div className="flex flex-col gap-1 px-4 py-3">
											<p className="text-xs font-medium text-muted-foreground">
												Plan
											</p>
											<p className="text-base font-semibold tracking-tight">
												{getSubscriptionPlanLabel(
													null,
													activeSubscription.plan_id
														? subscriptionPlanById.get(
																activeSubscription.plan_id,
															)?.name
														: null,
												)}
											</p>
										</div>
										<div className="flex flex-col gap-1 border-border px-4 py-3 sm:border-l">
											<p className="text-xs font-medium text-muted-foreground">
												Status
											</p>
											<p className="text-base font-semibold capitalize tracking-tight">
												{activeSubscription.status}
											</p>
										</div>
										<div className="flex flex-col gap-1 border-border px-4 py-3 sm:border-l">
											<p className="text-xs font-medium text-muted-foreground">
												Period
											</p>
											<p className="font-mono text-sm font-medium tabular-nums tracking-tight">
												{formatDateTime(activeSubscription.started_at)}
												{activeSubscription.ended_at
													? ` → ${formatDateTime(activeSubscription.ended_at)}`
													: ""}
											</p>
										</div>
									</div>
								) : (
									<p className="text-sm text-muted-foreground">
										No active subscription on this business.
									</p>
								)}

								{subscriptionPlansError ? (
									<Alert variant="destructive">
										<AlertTitle>Failed to load plans</AlertTitle>
										<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
											<span className="wrap-break-word">
												{getErrorMessage(
													subscriptionPlansError,
													"Request failed.",
												)}
											</span>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => refetchSubscriptionPlans()}
											>
												Try again
											</Button>
										</AlertDescription>
									</Alert>
								) : null}
								{subscriptionPlansLoading || subscriptionPlansFetching ? (
									<div className="flex flex-col gap-2">
										{Array.from({ length: 2 }).map((_, i) => (
											<Skeleton key={i} className="h-8 w-full" />
										))}
									</div>
								) : null}
							</div>
						</section>

						<section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
							<div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<h2 className="text-base font-semibold tracking-tight">
										Usage
									</h2>
									<p className="mt-0.5 text-sm text-muted-foreground">
										Credits for the current period
									</p>
								</div>
								{subscriptionUsageError ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => refetchSubscriptionUsage()}
									>
										Retry
									</Button>
								) : null}
							</div>
							<div className="p-5">
								{subscriptionUsageError ? (
									<Alert variant="destructive">
										<AlertTitle>Could not load usage</AlertTitle>
									</Alert>
								) : subscriptionUsage ? (
									<div className="grid grid-cols-1 overflow-hidden rounded-lg border border-border sm:grid-cols-3">
										<div className="flex flex-col gap-1 px-4 py-4">
											<p className="text-xs font-medium text-muted-foreground">
												Used
											</p>
											<p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
												{subscriptionUsage.credits_used}
											</p>
										</div>
										<div className="flex flex-col gap-1 border-border px-4 py-4 sm:border-l">
											<p className="text-xs font-medium text-muted-foreground">
												Remaining
											</p>
											<p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
												{subscriptionUsage.remaining_credits}
											</p>
										</div>
										<div className="flex flex-col gap-1 border-border px-4 py-4 sm:border-l">
											<p className="text-xs font-medium text-muted-foreground">
												Limit
											</p>
											<p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
												{subscriptionUsage.credits_limit}
											</p>
										</div>
									</div>
								) : (
									<p className="text-sm text-muted-foreground">
										No active subscription — usage is empty for this business.
									</p>
								)}
							</div>
						</section>

						<section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
							<div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<h2 className="text-base font-semibold tracking-tight">
										History
									</h2>
									<p className="mt-0.5 text-sm text-muted-foreground">
										Past and current subscription records
									</p>
								</div>
								{subscriptionHistoryError ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => refetchSubscriptionHistory()}
									>
										Retry
									</Button>
								) : null}
							</div>
							<div className="p-5">
								{subscriptionHistoryError ? (
									<Alert variant="destructive">
										<AlertTitle>Couldn’t load history</AlertTitle>
										<AlertDescription className="wrap-break-word">
											{getErrorMessage(
												subscriptionHistoryError,
												"Request failed.",
											)}
										</AlertDescription>
									</Alert>
								) : subscriptionHistoryLoading || subscriptionHistoryFetching ? (
									<div className="flex flex-col gap-2">
										{Array.from({ length: 5 }).map((_, i) => (
											<Skeleton key={i} className="h-10 w-full" />
										))}
									</div>
								) : (
									<div className="overflow-x-auto rounded-lg border border-border">
										<Table aria-label="Subscription history">
											<TableHeader>
												<TableRow>
													<TableHead>Plan</TableHead>
													<TableHead>Status</TableHead>
													<TableHead>Started</TableHead>
													<TableHead>Ended</TableHead>
													<TableHead className="hidden lg:table-cell">
														Chapa reference
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{(subscriptionHistory ?? []).length === 0 ? (
													<TableRow>
														<TableCell
															colSpan={5}
															className="py-10 text-center text-sm text-muted-foreground"
														>
															No subscription history for this business.
														</TableCell>
													</TableRow>
												) : (
													(subscriptionHistory ?? []).map(
														(row: SubscriptionOutput) => (
															<TableRow key={row.id}>
																<TableCell className="font-medium">
																	{getSubscriptionPlanLabel(
																		null,
																		row.plan_id
																			? subscriptionPlanById.get(row.plan_id)
																					?.name
																			: null,
																	)}
																</TableCell>
																<TableCell>
																	<Badge variant="outline">{row.status}</Badge>
																</TableCell>
																<TableCell className="font-mono text-sm whitespace-nowrap tabular-nums">
																	{formatDateTime(row.started_at)}
																</TableCell>
																<TableCell className="font-mono text-sm whitespace-nowrap tabular-nums">
																	{formatDateTime(row.ended_at)}
																</TableCell>
																<TableCell className="hidden max-w-48 truncate font-mono text-xs lg:table-cell">
																	{row.chapa_transaction_reference ?? "—"}
																</TableCell>
															</TableRow>
														),
													)
												)}
											</TableBody>
										</Table>
									</div>
								)}
							</div>
						</section>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
