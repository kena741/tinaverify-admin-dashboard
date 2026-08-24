"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
	ArrowLeft,
	Loader2Icon,
	MessageSquare,
	MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
	useGrantSubscriptionCreditsMutation,
	useListAdminSubscriptionTransactionsQuery,
} from "../../../../services/subscription/subscriptionApi";
import { useAdminAssignSubscriptionMutation } from "../../../../services/admin/adminApi";
import { useListSubscriptionPlansQuery } from "../../../../services/subscription-plan/subscriptionPlanApi";
import type {
	AdminSubscriptionOutput,
	BankAccountResponse,
	BranchOutput,
	BusinessOutput,
	EmployeeOutput,
	RoleOutput,
} from "../../../../services/types";
import { useListRolesQuery } from "../../../../services/role/roleApi";
import { useGetUserByIdQuery } from "../../../../services/auth/authApi";
import { BusinessPaymentsTab } from "@/components/admin/business-payments-tab";
import { ConfirmCreditActionDialog } from "@/components/admin/confirm-credit-action-dialog";
import { SendBusinessSmsDialog } from "@/components/admin/send-business-sms-dialog";
import { usePlatformAccess } from "@/hooks/use-platform-access";
import { ADMIN_FEATURE } from "@/lib/admin-feature-flags";
import { cn } from "@/lib/utils";
import {
	getSubscriptionPlanLabel,
	getSubscriptionStatusLabel,
} from "@/lib/subscription-filters";
import { formatPlatformLabel, formatUserDisplayName } from "@/lib/userDisplay";


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

function subscriptionBadgeVariant(
	status: string | undefined,
): "default" | "secondary" | "destructive" | "outline" {
	const s = (status ?? "").toLowerCase();
	if (s === "active") return "default";
	if (s === "pending" || s === "upgraded") return "secondary";
	if (s === "expired" || s === "cancelled" || s === "insufficient_credits")
		return "destructive";
	return "outline";
}

const DETAIL_TABS = ["business", "people", "money"] as const;

type DetailTab = (typeof DETAIL_TABS)[number];

const LEGACY_TAB_MAP: Record<string, DetailTab> = {
	overview: "business",
	employees: "people",
	branches: "business",
	"bank-accounts": "money",
	payments: "money",
	subscription: "money",
	referrals: "money",
};

function isDetailTab(value: string | null | undefined): value is DetailTab {
	return (
		typeof value === "string" &&
		(DETAIL_TABS as readonly string[]).includes(value)
	);
}

function resolveDetailTab(value: string | null | undefined): DetailTab {
	if (isDetailTab(value)) return value;
	if (value && value in LEGACY_TAB_MAP) return LEGACY_TAB_MAP[value];
	return "business";
}

function businessDetailPath(businessId: string, tab: DetailTab): string {
	if (tab === "business") return `/admin/business/${businessId}`;
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
	const { canMutateOwners } = usePlatformAccess();
	const grantCreditsEnabled = ADMIN_FEATURE.grantCredits;
	const businessSmsEnabled = ADMIN_FEATURE.businessSms;
	const missingBusinessId = !businessId;
	const [sendSmsOpen, setSendSmsOpen] = useState(false);

	const tabParam = searchParams.get("tab");
	const activeTab: DetailTab = resolveDetailTab(tabParam);

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

	const { data: subscriptionPlans } = useListSubscriptionPlansQuery(
		undefined,
		{ skip: missingBusinessId },
	);

	const {
		data: activeSubscription,
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
	} = useListAdminSubscriptionTransactionsQuery(
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
	const [grantSubscriptionCredits, { isLoading: grantingCredits }] =
		useGrantSubscriptionCreditsMutation();
	const [assignSubscription, { isLoading: assigningSubscription }] =
		useAdminAssignSubscriptionMutation();

	const [activeDialogOpen, setActiveDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [billingPane, setBillingPane] = useState<
		"history" | "payments" | "banks"
	>("history");
	const [statusBanner, setStatusBanner] = useState<{
		variant: "default" | "destructive";
		title: string;
		message: string;
	} | null>(null);
	const [grantCreditsInput, setGrantCreditsInput] = useState("");
	const [grantConfirmOpen, setGrantConfirmOpen] = useState(false);
	const [grantBanner, setGrantBanner] = useState<{
		variant: "default" | "destructive";
		title: string;
		message: string;
	} | null>(null);
	const [manualPlanId, setManualPlanId] = useState("");
	const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);
	const [manualBanner, setManualBanner] = useState<{
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

	const grantCreditsParsed = Number.parseInt(grantCreditsInput.trim(), 10);
	const canGrantCredits =
		!missingBusinessId &&
		Number.isFinite(grantCreditsParsed) &&
		grantCreditsParsed >= 1 &&
		!grantingCredits;

	function openGrantConfirm() {
		if (!ADMIN_FEATURE.grantCredits) return;
		setGrantBanner(null);
		if (!canGrantCredits) {
			setGrantBanner({
				variant: "destructive",
				title: "Invalid credits",
				message: "Enter a whole number of credits (at least 1).",
			});
			return;
		}
		setGrantConfirmOpen(true);
	}

	async function onConfirmGrantCredits(referenceImage: File) {
		try {
			const out = await grantSubscriptionCredits({
				businessId,
				body: { credits: grantCreditsParsed, file: referenceImage },
			}).unwrap();
			setGrantCreditsInput("");
			setGrantConfirmOpen(false);
			setGrantBanner({
				variant: "default",
				title: "Credits granted",
				message: `Granted ${grantCreditsParsed} credits (ref: ${referenceImage.name}). Status is now ${out.status}.`,
			});
		} catch (err) {
			setGrantBanner({
				variant: "destructive",
				title: "Grant failed",
				message: getErrorMessage(err, "Could not grant credits."),
			});
		}
	}

	const canManualAssign = Boolean(manualPlanId) && !assigningSubscription;
	const selectedAssignPlan = manualPlanId
		? subscriptionPlanById.get(manualPlanId)
		: undefined;

	function openAssignConfirm() {
		setManualBanner(null);
		if (!manualPlanId) {
			setManualBanner({
				variant: "destructive",
				title: "Plan required",
				message: "Select a plan to assign.",
			});
			return;
		}
		setAssignConfirmOpen(true);
	}

	async function onConfirmManualAssign(referenceImage: File) {
		if (!manualPlanId) return;
		try {
			const out = await assignSubscription({
				body: {
					business_id: businessId,
					plan_id: manualPlanId,
					file: referenceImage,
				},
			}).unwrap();
			setAssignConfirmOpen(false);
			setManualBanner({
				variant: "default",
				title: "Subscription assigned",
				message: `Assigned ${selectedAssignPlan?.name ?? "plan"} (ref: ${referenceImage.name}). Status is now ${out.status}.`,
			});
		} catch (err) {
			setManualBanner({
				variant: "destructive",
				title: "Assign failed",
				message: getErrorMessage(err, "Could not assign subscription."),
			});
		}
	}

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
							onClick={() => router.push("/admin/owners")}
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
				<div className="admin-brand-band p-8">
					<Skeleton className="admin-brand-band-skeleton h-4 w-32" />
					<Skeleton className="admin-brand-band-skeleton mt-4 h-10 w-64" />
					<Skeleton className="admin-brand-band-skeleton mt-2 h-4 w-48" />
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
								onClick={() => router.push("/admin/owners")}
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
	const planName = activeSubscription?.plan_id
		? getSubscriptionPlanLabel(
				null,
				subscriptionPlanById.get(activeSubscription.plan_id)?.name,
			)
		: null;
	const planPrice = activeSubscription?.plan_id
		? (subscriptionPlanById.get(activeSubscription.plan_id)?.price ?? null)
		: null;

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-10">
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="-ml-2 text-muted-foreground"
					onClick={() => router.push("/admin/owners")}
				>
					<ArrowLeft data-icon="inline-start" />
					Owners
				</Button>
				{businessFetching ? (
					<Badge variant="outline" className="font-normal">
						Updating…
					</Badge>
				) : null}
			</div>

			{statusBanner ? (
				<Alert variant={statusBanner.variant}>
					<AlertTitle>{statusBanner.title}</AlertTitle>
					<AlertDescription>{statusBanner.message}</AlertDescription>
				</Alert>
			) : null}

			<header className="flex flex-col gap-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 flex flex-col gap-1">
						<div className="flex flex-wrap items-center gap-2">
							<h1
								id="owner-heading"
								className="truncate text-[1.625rem] font-semibold tracking-tight text-foreground"
							>
								{ownerDisplay}
							</h1>
							{business.is_active ? (
								<Badge variant="secondary" className="font-normal">
									Business active
								</Badge>
							) : (
								<Badge variant="outline" className="font-normal">
									Business inactive
								</Badge>
							)}
						</div>
						<p className="text-sm text-muted-foreground">
							{user?.phone_number ? (
								<span className="font-mono tabular-nums text-foreground/80">
									{user.phone_number}
								</span>
							) : (
								<span>No phone on file</span>
							)}
							<span className="text-muted-foreground/80">
								{" · "}
								{ownerBusinesses.length === 1
									? "1 business"
									: `${ownerBusinesses.length || 0} businesses`}
							</span>
						</p>
					</div>
					<div className="flex shrink-0 flex-wrap items-center gap-2">
						{businessSmsEnabled ? (
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
						) : (
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled
								title="SMS is upcoming — API not ready"
								className="gap-2"
							>
								<MessageSquare data-icon="inline-start" />
								SMS
								<Badge variant="secondary" className="font-normal">
									Upcoming
								</Badge>
							</Button>
						)}
						{(canMutateOwners || user?.phone_number) ? (
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											aria-label="More actions"
										/>
									}
								>
									<MoreHorizontal aria-hidden="true" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-48">
									<DropdownMenuGroup>
										<DropdownMenuItem
											disabled={!user?.phone_number}
											onClick={() => {
												if (user?.phone_number) {
													void navigator.clipboard.writeText(
														user.phone_number,
													);
												}
											}}
										>
											Copy phone
										</DropdownMenuItem>
										{canMutateOwners ? (
											<>
												<DropdownMenuItem
													onClick={() => setActiveDialogOpen(true)}
												>
													{business.is_active
														? "Deactivate business"
														: "Activate business"}
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													variant="destructive"
													onClick={() => setDeleteDialogOpen(true)}
												>
													Delete business…
												</DropdownMenuItem>
											</>
										) : null}
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						) : null}
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2" aria-label="Businesses">
					{allBusinessesLoading ? (
						<Skeleton className="h-8 w-40" />
					) : ownerBusinesses.length <= 1 ? (
						<span className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm">
							<span className="font-medium">{business.name || "Untitled"}</span>
							<span className="font-mono text-xs text-muted-foreground">
								{business.tin_number}
							</span>
						</span>
					) : ownerBusinesses.length <= 6 ? (
						<div
							role="tablist"
							aria-label="Select business"
							className="flex max-w-full flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1"
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
											"h-7 max-w-44 truncate rounded-md px-2.5 text-sm motion-safe:transition-colors",
											isCurrent
												? "bg-background font-medium text-foreground shadow-xs"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										{b.name || "Untitled"}
									</button>
								);
							})}
						</div>
					) : (
						<Select
							value={businessId}
							onValueChange={(id) => {
								if (id && id !== businessId) goToBusiness(id);
							}}
						>
							<SelectTrigger
								className="h-8 max-w-sm min-w-48"
								aria-label="Managing business"
							>
								<span className="truncate text-sm font-medium">
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
					)}
				</div>
			</header>

			<AlertDialog open={activeDialogOpen} onOpenChange={setActiveDialogOpen}>
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
							{setBusinessActiveState.isLoading ? "Working…" : "Confirm"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
						<AlertDialogCancel disabled={deleteBusinessState.isLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleteBusinessState.isLoading}
							onClick={async (e) => {
								e.preventDefault();
								await deleteBusiness({ businessId }).unwrap();
								router.push("/admin/owners");
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<section
				aria-label="Live account context"
				className="sticky top-0 z-10 flex flex-col gap-3 rounded-xl border border-border bg-card/95 p-4 shadow-xs backdrop-blur-sm supports-backdrop-filter:bg-card/90"
			>
				<div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border sm:grid-cols-5 sm:divide-y-0">
					<div className="flex flex-col gap-1.5 px-3 py-3">
						<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Status
						</p>
						<div>
							{activeSubscription ? (
								<Badge
									variant={subscriptionBadgeVariant(activeSubscription.status)}
									className="font-normal capitalize"
								>
									{getSubscriptionStatusLabel(activeSubscription.status)}
								</Badge>
							) : (
								<Badge variant="outline" className="font-normal">
									None
								</Badge>
							)}
						</div>
					</div>
					<div className="flex flex-col gap-1.5 px-3 py-3">
						<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Plan
						</p>
						<p className="truncate text-sm font-medium tracking-tight">
							{planName ?? "—"}
						</p>
					</div>
					<div className="flex flex-col gap-1.5 px-3 py-3">
						<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Price
						</p>
						<p className="font-mono text-sm font-medium tabular-nums">
							{planPrice ?? "—"}
						</p>
					</div>
					<div className="flex flex-col gap-1.5 px-3 py-3">
						<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Credits
						</p>
						<p className="font-mono text-sm font-medium tabular-nums">
							{subscriptionUsage
								? `${subscriptionUsage.remaining_credits.toLocaleString()} / ${subscriptionUsage.credits_limit.toLocaleString()}`
								: "—"}
						</p>
					</div>
					<div className="col-span-2 flex flex-col gap-1.5 px-3 py-3 sm:col-span-1">
						<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							TIN
						</p>
						<p className="font-mono text-sm font-medium tabular-nums">
							{business.tin_number}
						</p>
					</div>
				</div>

				{(activeSubscriptionError || subscriptionUsageError) ? (
					<div className="flex flex-col gap-2">
						{activeSubscriptionError ? (
							<Alert variant="destructive">
								<AlertTitle>Subscription</AlertTitle>
								<AlertDescription className="flex flex-wrap items-center gap-2">
									<span className="wrap-break-word">
										{getErrorMessage(activeSubscriptionError, "Request failed.")}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => refetchActiveSubscription()}
									>
										Retry
									</Button>
								</AlertDescription>
							</Alert>
						) : null}
						{subscriptionUsageError ? (
							<Alert variant="destructive">
								<AlertTitle>Credits</AlertTitle>
								<AlertDescription className="flex flex-wrap items-center gap-2">
									<span>Could not load usage.</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => refetchSubscriptionUsage()}
									>
										Retry
									</Button>
								</AlertDescription>
							</Alert>
						) : null}
					</div>
				) : null}

				{(manualBanner || grantBanner) ? (
					<div className="flex flex-col gap-2">
						{manualBanner ? (
							<Alert
								variant={
									manualBanner.variant === "destructive"
										? "destructive"
										: "default"
								}
							>
								<AlertTitle>{manualBanner.title}</AlertTitle>
								<AlertDescription>{manualBanner.message}</AlertDescription>
							</Alert>
						) : null}
						{grantBanner ? (
							<Alert
								variant={
									grantBanner.variant === "destructive"
										? "destructive"
										: "default"
								}
							>
								<AlertTitle>{grantBanner.title}</AlertTitle>
								<AlertDescription>{grantBanner.message}</AlertDescription>
							</Alert>
						) : null}
					</div>
				) : null}

				<div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
					<form
						className="flex flex-wrap items-end gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							openAssignConfirm();
						}}
					>
						<Field className="min-w-40 flex-1">
							<FieldLabel
								htmlFor="quick-assign-plan"
								className="text-xs text-muted-foreground"
							>
								Assign plan
							</FieldLabel>
							<Select
								value={manualPlanId}
								onValueChange={(value) => {
									setManualPlanId(value ?? "");
									setManualBanner(null);
								}}
							>
								<SelectTrigger id="quick-assign-plan" className="h-9 w-full bg-background">
									<SelectValue placeholder="Select plan…">
										{manualPlanId
											? subscriptionPlanById.get(manualPlanId)?.name
											: undefined}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{(subscriptionPlans ?? [])
										.filter((p) => !p.is_archived)
										.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</Field>
						<Button type="submit" size="sm" disabled={!canManualAssign}>
							{assigningSubscription ? (
								<Loader2Icon
									data-icon="inline-start"
									className="animate-spin"
									aria-hidden
								/>
							) : null}
							{assigningSubscription ? "…" : "Assign"}
						</Button>
					</form>

					{grantCreditsEnabled ? (
						<form
							className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-2.5"
							onSubmit={(e) => {
								e.preventDefault();
								openGrantConfirm();
							}}
						>
							<div className="flex w-full flex-wrap items-center gap-2">
								<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
									Grant credits
								</p>
							</div>
							<Field className="min-w-40 flex-1">
								<FieldLabel
									htmlFor="quick-grant-credits"
									className="text-xs text-muted-foreground"
								>
									Credits
								</FieldLabel>
								<Input
									id="quick-grant-credits"
									name="credits"
									type="text"
									inputMode="numeric"
									autoComplete="off"
									placeholder="e.g. 500"
									className="h-9 bg-background"
									value={grantCreditsInput}
									onChange={(e) => {
										setGrantCreditsInput(e.target.value);
										setGrantBanner(null);
									}}
								/>
							</Field>
							<Button type="submit" size="sm" disabled={!canGrantCredits}>
								{grantingCredits ? (
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
								) : null}
								{grantingCredits ? "…" : "Grant"}
							</Button>
						</form>
					) : (
						<div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5">
							<div className="flex flex-wrap items-center gap-2">
								<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
									Under development
								</p>
								<Badge variant="outline" className="font-normal text-muted-foreground">
									Unavailable
								</Badge>
							</div>
							<p className="text-xs leading-snug text-muted-foreground">
								<span className="font-medium text-foreground/80">
									Grant credits
								</span>{" "}
								will return when the credits API is ready.
							</p>
						</div>
					)}
				</div>
			</section>

			<ConfirmCreditActionDialog
				open={grantConfirmOpen}
				onOpenChange={setGrantConfirmOpen}
				title="Confirm grant credits?"
				summary={`Are you sure you want to grant ${grantCreditsParsed} credits to ${business.name}?`}
				confirmLabel="Yes, grant credits"
				isPending={grantingCredits}
				onConfirm={onConfirmGrantCredits}
			/>

			<ConfirmCreditActionDialog
				open={assignConfirmOpen}
				onOpenChange={setAssignConfirmOpen}
				title="Confirm assign plan?"
				summary={`Are you sure you want to assign ${selectedAssignPlan?.name ?? "this plan"} to ${business.name}?`}
				confirmLabel="Yes, assign plan"
				isPending={assigningSubscription}
				onConfirm={onConfirmManualAssign}
			/>

			{businessSmsEnabled ? (
				<SendBusinessSmsDialog
					open={sendSmsOpen}
					onOpenChange={setSendSmsOpen}
					businessName={business.name}
					phoneNumber={user?.phone_number}
				/>
			) : null}

			<Tabs value={activeTab} onValueChange={onTabChange} className="gap-3">
				<TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-lg border border-border bg-muted/40 p-1">
					<TabsTrigger value="business" className="rounded-md">
						Business
					</TabsTrigger>
					<TabsTrigger value="people" className="rounded-md">
						Staff
					</TabsTrigger>
					<TabsTrigger value="money" className="rounded-md">
						Billing
					</TabsTrigger>
				</TabsList>

				<TabsContent value="business" className="mt-0 flex flex-col gap-4">
					<div className="grid grid-cols-1 overflow-hidden rounded-xl border border-border sm:grid-cols-3">
						<div className="flex flex-col gap-1 px-4 py-3.5">
							<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
								Name
							</p>
							<p className="text-sm font-medium tracking-tight">
								{business.name || "—"}
							</p>
						</div>
						<div className="flex flex-col gap-1 border-border px-4 py-3.5 sm:border-l">
							<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
								TIN
							</p>
							<p className="font-mono text-sm font-medium tabular-nums">
								{business.tin_number}
							</p>
						</div>
						<div className="flex flex-col gap-1 border-border px-4 py-3.5 sm:border-l">
							<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
								Status
							</p>
							<p className="text-sm font-medium tracking-tight">
								{business.is_active ? "Active" : "Inactive"}
								{business.is_archived ? " · Archived" : ""}
							</p>
						</div>
					</div>

					<section className="overflow-hidden rounded-xl border border-border">
						<div className="border-b border-border px-4 py-3">
							<h2 className="text-sm font-semibold tracking-tight">Branches</h2>
							<p className="text-xs text-muted-foreground">
								Locations under this business
							</p>
						</div>
						<div className="overflow-x-auto">
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
												<TableCell className="font-medium">
													{branch.name}
												</TableCell>
												<TableCell>
													{branch.is_head_quarter ? "Yes" : "No"}
												</TableCell>
												<TableCell className="text-muted-foreground">
													{branch.address ?? "—"}
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</section>
				</TabsContent>

				<TabsContent value="people" className="mt-0">
					<section className="overflow-hidden rounded-xl border border-border">
						<div className="border-b border-border px-4 py-3">
							<h2 className="text-sm font-semibold tracking-tight">Staff</h2>
							<p className="text-xs text-muted-foreground">
								Roles and branch assignment for this business
							</p>
						</div>
						<div className="flex flex-col gap-4 p-4">
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
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Employee</TableHead>
												<TableHead>Role</TableHead>
												<TableHead>Branch</TableHead>
												{canMutateOwners ? (
													<TableHead className="text-right">Actions</TableHead>
												) : null}
											</TableRow>
										</TableHeader>
										<TableBody>
											{employeeRows.length === 0 ? (
												<TableRow>
													<TableCell
														colSpan={canMutateOwners ? 4 : 3}
														className="py-10 text-center"
													>
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
																<div className="flex min-w-0 flex-col gap-0.5">
																	<span className="truncate font-medium">
																		{emp.user?.username ??
																			emp.user?.phone_number ??
																			emp.user_id}
																	</span>
																	<span className="truncate text-sm text-muted-foreground">
																		{emp.user?.email ?? "—"}
																	</span>
																</div>
															</TableCell>
															<TableCell>
																{canMutateOwners ? (
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
																) : (
																	<span className="text-sm font-medium">
																		{roleLabel(
																			roleById.get(emp.role_id) ?? selectedRole,
																		)}
																	</span>
																)}
															</TableCell>
															<TableCell>
																<span className="truncate font-medium">
																	{emp.branch?.name ?? "—"}
																</span>
															</TableCell>
															{canMutateOwners ? (
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
															) : null}
														</TableRow>
													);
												})
											)}
										</TableBody>
									</Table>
								</div>
							)}
						</div>
					</section>
				</TabsContent>

				<TabsContent value="money" className="mt-0 flex flex-col gap-4">
					<div
						role="tablist"
						aria-label="Billing records"
						className="flex w-fit flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1"
					>
						{(
							[
								["history", "History"],
								["payments", "Payments"],
								["banks", "Banks"],
							] as const
						).map(([id, label]) => (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={billingPane === id}
								onClick={() => setBillingPane(id)}
								className={cn(
									"h-7 rounded-md px-3 text-sm motion-safe:transition-colors",
									billingPane === id
										? "bg-background font-medium text-foreground shadow-xs"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{label}
							</button>
						))}
					</div>

					{billingPane === "history" ? (
						<div className="flex flex-col gap-3">
							{subscriptionHistoryError ? (
								<Alert variant="destructive">
									<AlertTitle>Couldn’t load history</AlertTitle>
									<AlertDescription className="flex flex-wrap items-center gap-2">
										<span className="wrap-break-word">
											{getErrorMessage(
												subscriptionHistoryError,
												"Request failed.",
											)}
										</span>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => refetchSubscriptionHistory()}
										>
											Retry
										</Button>
									</AlertDescription>
								</Alert>
							) : subscriptionHistoryLoading || subscriptionHistoryFetching ? (
								<div className="flex flex-col gap-2">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton key={i} className="h-10 w-full" />
									))}
								</div>
							) : (
								<div className="overflow-x-auto rounded-xl border border-border">
									<Table aria-label="Subscription history">
										<TableHeader>
											<TableRow>
												<TableHead>Plan</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Amount</TableHead>
												<TableHead>Paid</TableHead>
												<TableHead>Method</TableHead>
												<TableHead>Credits</TableHead>
												<TableHead>Started</TableHead>
												<TableHead>Ended</TableHead>
												<TableHead className="hidden lg:table-cell">
													Reference
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{(subscriptionHistory ?? []).length === 0 ? (
												<TableRow>
													<TableCell
														colSpan={9}
														className="py-10 text-center text-sm text-muted-foreground"
													>
														No subscription history for this business.
													</TableCell>
												</TableRow>
											) : (
												(subscriptionHistory ?? []).map(
													(row: AdminSubscriptionOutput) => (
														<TableRow key={row.id}>
															<TableCell className="font-medium">
																{getSubscriptionPlanLabel(row.plan)}
															</TableCell>
															<TableCell>
																<Badge
																	variant={subscriptionBadgeVariant(
																		row.status,
																	)}
																	className="font-normal capitalize"
																>
																	{getSubscriptionStatusLabel(row.status)}
																</Badge>
															</TableCell>
															<TableCell className="font-mono text-sm tabular-nums">
																{row.amount == null
																	? "—"
																	: row.amount.toLocaleString(undefined, {
																			maximumFractionDigits: 2,
																		})}
															</TableCell>
															<TableCell className="font-mono text-sm tabular-nums">
																{row.transaction_amount == null
																	? "—"
																	: row.transaction_amount.toLocaleString(
																			undefined,
																			{ maximumFractionDigits: 2 },
																		)}
															</TableCell>
															<TableCell className="text-sm text-muted-foreground">
																{row.transaction_payment_method
																	? formatPlatformLabel(
																			row.transaction_payment_method,
																		)
																	: "—"}
															</TableCell>
															<TableCell className="font-mono text-sm tabular-nums">
																{row.credits_limit.toLocaleString()}
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
					) : null}

					{billingPane === "payments" ? (
						<BusinessPaymentsTab businessId={businessId} />
					) : null}

					{billingPane === "banks" ? (
						<div className="flex flex-col gap-3">
							{bankAccountsError ? (
								<Alert variant="destructive">
									<AlertTitle>Failed to load bank accounts</AlertTitle>
									<AlertDescription className="flex flex-wrap items-center gap-2">
										<span className="wrap-break-word">Request failed.</span>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => refetchBankAccounts()}
										>
											Try again
										</Button>
									</AlertDescription>
								</Alert>
							) : null}
							{bankAccountsLoading ? (
								<div className="flex flex-col gap-2">
									{Array.from({ length: 4 }).map((_, i) => (
										<Skeleton key={i} className="h-10 w-full" />
									))}
								</div>
							) : (
								<div className="overflow-x-auto rounded-xl border border-border">
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
													<TableCell
														colSpan={4}
														className="py-10 text-center text-sm text-muted-foreground"
													>
														No bank accounts linked to this business.
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
								</div>
							)}
						</div>
					) : null}
				</TabsContent>
			</Tabs>
		</div>
	);
}
