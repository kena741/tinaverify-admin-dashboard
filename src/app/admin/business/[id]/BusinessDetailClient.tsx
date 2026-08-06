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
			<div className="flex flex-col gap-6">
				<Alert variant="destructive">
					<AlertTitle>Missing business id</AlertTitle>
					<AlertDescription>
						The route parameter is missing. Please go back and try again.
					</AlertDescription>
				</Alert>
				<div>
					<button
						type="button"
						className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
						onClick={() => router.push("/admin/transactions")}
					>
						Back
					</button>
				</div>
			</div>
		);
	}

	if (businessLoading) {
		return (
			<div className="flex flex-col gap-6">
				<div className="flex items-center gap-2">
					<button
						type="button"
						className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
						disabled
					>
						<ArrowLeft data-icon="inline-start" />
						Back
					</button>
				</div>
				<Card>
					<CardHeader className="flex flex-col gap-2">
						<Skeleton className="h-6 w-64" />
						<Skeleton className="h-4 w-40" />
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</CardContent>
				</Card>
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
			<div className="flex flex-col gap-6">
				<Alert variant="destructive">
					<AlertTitle>Failed to load business</AlertTitle>
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<span className="wrap-break-word">
							{isRequestError ? "Request failed." : "Business not found."}
						</span>
						<div className="flex items-center gap-2">
							<button
								type="button"
								className={cn(
									buttonVariants({ variant: "outline", size: "sm" }),
								)}
								onClick={() => router.push("/admin/transactions")}
							>
								Back
							</button>
							<button
								type="button"
								className={cn(buttonVariants({ variant: "link", size: "sm" }))}
								onClick={() => refetchBusiness()}
							>
								Try again
							</button>
						</div>
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			<header className="flex flex-col gap-3 border-b border-border pb-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex min-w-0 flex-1 flex-col gap-2">
						<div className="flex min-w-0 items-center gap-2">
							<button
								type="button"
								className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
								onClick={() => router.push("/admin/transactions")}
							>
								<ArrowLeft data-icon="inline-start" />
								Back to owners
							</button>
							{businessFetching ? (
								<Badge variant="outline">Updating…</Badge>
							) : null}
						</div>

						<div className="min-w-0">
							<p className="text-xs text-muted-foreground">Owner</p>
							<h1 className="truncate text-xl font-semibold tracking-tight">
								{user ? formatUserDisplayName(user) : "No owner found"}
							</h1>
							<p className="mt-0.5 truncate text-sm text-muted-foreground">
								{user?.phone_number ? (
									<span className="tabular-nums">{user.phone_number}</span>
								) : (
									<span>No phone</span>
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

					<div className="flex flex-wrap items-center gap-1.5">
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={!user?.phone_number}
							onClick={() => setSendSmsOpen(true)}
						>
							<MessageSquare data-icon="inline-start" />
							SMS
						</Button>

						<AlertDialog>
							<AlertDialogTrigger
								className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
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
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={async () => {
											await setBusinessActive({
												businessId,
												body: { is_active: !business.is_active },
											}).unwrap();
										}}
									>
										Confirm
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>

						<AlertDialog>
							<AlertDialogTrigger
								className={cn(
									buttonVariants({ variant: "destructive", size: "sm" }),
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

				{/* Scope control: which business tabs operate on */}
				<div className="flex flex-col gap-1.5">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<p className="text-xs font-medium text-muted-foreground">
							Managing business
						</p>
						<p className="text-xs text-muted-foreground">
							Tabs below apply only to the selected business
						</p>
					</div>

					{allBusinessesLoading ? (
						<Skeleton className="h-8 w-full max-w-md" />
					) : ownerBusinesses.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No businesses for this owner.
						</p>
					) : ownerBusinesses.length === 1 ? (
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-medium">{business.name || "—"}</span>
							<span className="text-sm text-muted-foreground">
								TIN {business.tin_number}
							</span>
							{business.is_active ? (
								<Badge variant="secondary">Active</Badge>
							) : (
								<Badge variant="outline">Inactive</Badge>
							)}
						</div>
					) : ownerBusinesses.length <= 6 ? (
						<div
							role="tablist"
							aria-label="Select business to manage"
							className="flex max-w-full flex-wrap gap-1.5"
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
											"h-8 max-w-44 truncate rounded-md border px-2.5 text-left text-sm transition-colors",
											isCurrent
												? "border-primary bg-primary font-medium text-primary-foreground"
												: "border-border bg-background hover:bg-muted",
										)}
									>
										{b.name || "Untitled"}
									</button>
								);
							})}
						</div>
					) : (
						<div className="flex flex-wrap items-center gap-2">
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
									className="h-8 max-w-sm min-w-48 border-border"
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
							<span className="text-sm text-muted-foreground">
								TIN {business.tin_number}
							</span>
						</div>
					)}

					{ownerBusinesses.length > 1 && ownerBusinesses.length <= 6 ? (
						<p className="text-xs text-muted-foreground">
							TIN {business.tin_number}
							{business.is_active ? "" : " · Inactive"}
							{business.is_archived ? " · Archived" : ""}
						</p>
					) : null}
				</div>
			</header>

			<SendBusinessSmsDialog
				open={sendSmsOpen}
				onOpenChange={setSendSmsOpen}
				businessName={business.name}
				phoneNumber={user?.phone_number}
			/>

			<Tabs value={activeTab} onValueChange={onTabChange}>
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="employees">Employees</TabsTrigger>
					<TabsTrigger value="branches">Branches</TabsTrigger>
					<TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
					<TabsTrigger value="payments">Verified payments</TabsTrigger>
					<TabsTrigger value="referrals">Referrals</TabsTrigger>
					<TabsTrigger value="subscription">Subscription</TabsTrigger>
				</TabsList>

				<TabsContent value="overview">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								{business.name || "Business"}
							</CardTitle>
							<CardDescription>
								Details for the business you are managing above.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="flex flex-col gap-1">
									<span className="text-sm text-muted-foreground">
										Business name
									</span>
									<span className="font-medium">{business.name || "—"}</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-sm text-muted-foreground">TIN</span>
									<span className="font-medium">{business.tin_number}</span>
								</div>
								<div className="flex flex-col gap-1 min-w-0">
									<span className="text-sm text-muted-foreground">Owner</span>
									<span className="font-medium truncate">
										{user ? formatUserDisplayName(user) : "No owner found"}
									</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-sm text-muted-foreground">
										Businesses owned
									</span>
									<span className="font-medium tabular-nums">
										{ownerBusinesses.length}
									</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-sm text-muted-foreground">Status</span>
									<span className="font-medium">
										{business.is_active ? "Active" : "Inactive"}
									</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-sm text-muted-foreground">
										Owner phone
									</span>
									<span className="font-medium tabular-nums">
										{user?.phone_number ?? "—"}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="employees">
					<Card>
						<CardContent className="flex flex-col gap-4">
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

				<TabsContent value="branches">
					<Card>
						<CardContent className="flex flex-col gap-4">
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
											<TableCell colSpan={1} className="py-10 text-center">
												<span className="text-sm text-muted-foreground">
													Loading branches…
												</span>
											</TableCell>
										</TableRow>
									) : branches?.length === 0 ? (
										<TableRow>
											<TableCell colSpan={1} className="py-10 text-center">
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

				<TabsContent value="bank-accounts">
					<Card>
						<CardContent className="flex flex-col gap-4">
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

				<TabsContent value="payments">
					<BusinessPaymentsTab businessId={businessId} />
				</TabsContent>

				<TabsContent value="referrals">
					<BusinessReferralsTab />
				</TabsContent>

				<TabsContent value="subscription">
					<div className="flex flex-col gap-4">
						<Card>
							<CardHeader>
								<CardTitle>Current subscription</CardTitle>
								<CardDescription>
									Active subscription, usage, and history for this business.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
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
											<button
												type="button"
												className={cn(
													buttonVariants({ variant: "outline", size: "sm" }),
												)}
												onClick={() => refetchActiveSubscription()}
											>
												Try again
											</button>
										</AlertDescription>
									</Alert>
								) : null}

								<div className="flex min-h-10 items-center gap-2 rounded-md border px-3">
									{activeSubscriptionLoading || activeSubscriptionFetching ? (
										<span className="text-muted-foreground">Loading…</span>
									) : activeSubscription ? (
										<div className="flex flex-wrap items-center gap-2">
											<Badge variant="secondary">
												{getSubscriptionPlanLabel(
													null,
													activeSubscription.plan_id
														? subscriptionPlanById.get(
																activeSubscription.plan_id,
															)?.name
														: null,
												)}
											</Badge>
											<span className="text-sm text-muted-foreground">
												Status: {activeSubscription.status}
											</span>
										</div>
									) : (
										<Alert variant="destructive" className="border-none px-0">
											<AlertTitle>No active subscription found</AlertTitle>
										</Alert>
									)}
								</div>

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
											<button
												type="button"
												className={cn(
													buttonVariants({ variant: "outline", size: "sm" }),
												)}
												onClick={() => refetchSubscriptionPlans()}
											>
												Try again
											</button>
										</AlertDescription>
									</Alert>
								) : null}
								{subscriptionPlansLoading || subscriptionPlansFetching ? (
									<div className="flex flex-col gap-2">
										{Array.from({ length: 3 }).map((_, i) => (
											<Skeleton key={i} className="h-10 w-full" />
										))}
									</div>
								) : null}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
								<div className="flex flex-col gap-1">
									<CardTitle>Usage</CardTitle>
									<CardDescription>
										Credits used and remaining for the current billing period.
									</CardDescription>
								</div>
								{subscriptionUsageError ? (
									<button
										type="button"
										className={cn(
											buttonVariants({ variant: "outline", size: "sm" }),
										)}
										onClick={() => refetchSubscriptionUsage()}
									>
										Retry
									</button>
								) : null}
							</CardHeader>
							<CardContent className="flex flex-col gap-4">
								{subscriptionUsageError ? (
									<Alert variant="destructive">
										<AlertTitle>Could not load usage</AlertTitle>
									</Alert>
								) : subscriptionUsage ? (
									<div className="grid gap-4 sm:grid-cols-3">
										<div className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-4 py-3">
											<span className="text-xs font-medium text-muted-foreground">
												Credits used
											</span>
											<span className="text-2xl font-semibold tabular-nums">
												{subscriptionUsage.credits_used}
											</span>
										</div>
										<div className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-4 py-3">
											<span className="text-xs font-medium text-muted-foreground">
												Credits remaining
											</span>
											<span className="text-2xl font-semibold tabular-nums">
												{subscriptionUsage.remaining_credits}
											</span>
										</div>
										<div className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-4 py-3">
											<span className="text-xs font-medium text-muted-foreground">
												Credits limit
											</span>
											<span className="text-2xl font-semibold tabular-nums">
												{subscriptionUsage.credits_limit}
											</span>
										</div>
										<p className="text-xs text-muted-foreground sm:col-span-3">
											Subscription ID:{" "}
											<code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8rem]">
												{subscriptionUsage.subscription_id}
											</code>
										</p>
									</div>
								) : (
									<p className="text-sm text-muted-foreground">
										No active subscription — usage is empty for this business.
									</p>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
								<div className="flex flex-col gap-1">
									<CardTitle>History</CardTitle>
									<CardDescription>
										Past and current subscription records for this business.
									</CardDescription>
								</div>
								{subscriptionHistoryError ? (
									<button
										type="button"
										className={cn(
											buttonVariants({ variant: "outline", size: "sm" }),
										)}
										onClick={() => refetchSubscriptionHistory()}
									>
										Retry
									</button>
								) : null}
							</CardHeader>
							<CardContent>
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
									<div className="overflow-x-auto rounded-md border">
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
															className="py-10 text-center text-muted-foreground"
														>
															<Alert variant="destructive" className="border-none px-0 text-center">
																<AlertTitle>No subscription history found</AlertTitle>
															</Alert>
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
																			? subscriptionPlanById.get(row.plan_id)?.name
																			: null,
																	)}
																</TableCell>
																<TableCell>
																	<Badge variant="outline">{row.status}</Badge>
																</TableCell>
																<TableCell className="text-sm whitespace-nowrap">
																	{formatDateTime(row.started_at)}
																</TableCell>
																<TableCell className="text-sm whitespace-nowrap">
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
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
