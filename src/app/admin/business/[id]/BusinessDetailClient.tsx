"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
	ArrowLeft,
	Building2,
	CalendarDays,
	Loader2Icon,
	MessageSquare,
	MoreHorizontal,
	Phone,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
	SelectGroup,
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
	useCreateBranchMutation,
	useUpdateBranchMutation,
	useDeleteBranchMutation,
	useCreateEmployeeMutation,
	useDeleteEmployeeMutation,
} from "../../../../services/branch-management/branchManagementApi";
import {
	useCreateBankAccountMutation,
	useDeleteBankAccountMutation,
	useListBankAccountsQuery,
	useUpdateBankAccountMutation,
} from "../../../../services/bank-accounts/bankAccountsApi";
import {
	useGetActiveSubscriptionQuery,
	useGrantSubscriptionCreditsMutation,
	useGetSubscriptionUsageQuery,
	useListAdminSubscriptionTransactionsQuery,
} from "../../../../services/subscription/subscriptionApi";
import { useAdminAssignSubscriptionMutation } from "../../../../services/admin/adminApi";
import { useListSubscriptionPlansQuery } from "../../../../services/subscription-plan/subscriptionPlanApi";
import type {
	AdminSubscriptionOutput,
	BankAccountResponse,
	BankNameEnum,
	BranchOutput,
	BusinessOutput,
	EmployeeOutput,
	RoleOutput,
	VerifiedTransactionOutput,
} from "../../../../services/types";
import { useListRolesQuery } from "../../../../services/role/roleApi";
import { useGetUserByIdQuery } from "../../../../services/auth/authApi";
import { useListTransactionsByBusinessQuery } from "../../../../services/transactions/transactionsApi";
import { ConfirmCreditActionDialog } from "@/components/admin/confirm-credit-action-dialog";
import { ResetUserPasswordDialog } from "@/components/admin/reset-user-password-dialog";
import { SendBusinessSmsDialog } from "@/components/admin/send-business-sms-dialog";
import { usePlatformAccess } from "@/hooks/use-platform-access";
import { ADMIN_FEATURE } from "@/lib/admin-feature-flags";
import { cn } from "@/lib/utils";
import {
	asAdminSubscriptionRows,
	getSubscriptionPlanLabel,
	getSubscriptionStatusLabel,
	subscriptionRowTimestamp,
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

function transactionBadgeVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	const normalizedStatus = status.toLowerCase();
	if (normalizedStatus === "verified" || normalizedStatus === "success")
		return "default";
	if (normalizedStatus === "pending") return "secondary";
	if (normalizedStatus === "failed" || normalizedStatus === "canceled")
		return "destructive";
	return "outline";
}

function ScanTransactionRow({ row }: { row: VerifiedTransactionOutput }) {
	return (
		<TableRow>
			<TableCell className="whitespace-nowrap text-left text-sm text-muted-foreground">
				{formatDateTime(row.recorded_date)}
			</TableCell>
			<TableCell className="max-w-48 truncate text-left">
				{row.sender_name ?? "—"}
			</TableCell>
			<TableCell className="text-left font-mono text-sm tabular-nums">
				{row.currency}{" "}
				{Number.isFinite(Number(row.amount))
					? Number(row.amount).toLocaleString(undefined, {
							maximumFractionDigits: 2,
						})
					: row.amount}
			</TableCell>
			<TableCell className="text-left">
				<Badge
					variant={transactionBadgeVariant(row.status)}
					className="font-normal capitalize"
				>
					{row.status.replaceAll("_", " ")}
				</Badge>
			</TableCell>
			<TableCell className="text-left">
				{row.receipt_url ? (
					<a
						href={row.receipt_url}
						target="_blank"
						rel="noreferrer"
						className="font-medium text-primary underline-offset-4 hover:underline"
					>
						View receipt
					</a>
				) : (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
		</TableRow>
	);
}

const DETAIL_TABS = ["business", "people", "money", "scans"] as const;
const SCANS_PAGE_SIZE = 25;
const EMPTY_SCAN_ROWS: VerifiedTransactionOutput[] = [];

type DetailTab = (typeof DETAIL_TABS)[number];

const LEGACY_TAB_MAP: Record<string, DetailTab> = {
	overview: "business",
	employees: "people",
	branches: "business",
	"bank-accounts": "money",
	payments: "money",
	subscription: "money",
	referrals: "money",
	transactions: "scans",
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
	const [scansOffset, setScansOffset] = useState(0);
	const [groupScansByBank, setGroupScansByBank] = useState(false);
	const [scansCalendarOpen, setScansCalendarOpen] = useState(false);
	const [scansDateRange, setScansDateRange] = useState<DateRange | undefined>(
		() => {
			const to = new Date();
			return { from: subDays(to, 29), to };
		},
	);
	const [resetPasswordTarget, setResetPasswordTarget] = useState<{
		userName: string;
		phoneNumber?: string | null;
		email?: string | null;
		contextLabel?: string | null;
	} | null>(null);

	const tabParam = searchParams.get("tab");
	const activeTab: DetailTab = resolveDetailTab(tabParam);

	function goToBusiness(nextBusinessId: string) {
		setScansOffset(0);
		router.push(businessDetailPath(nextBusinessId, activeTab), {
			scroll: false,
		});
	}

	function onTabChange(next: DetailTab | string | number | null) {
		const tab = typeof next === "string" ? next : String(next ?? "");
		if (!isDetailTab(tab) || tab === activeTab) return;
		router.replace(businessDetailPath(businessId, tab), { scroll: false });
	}

	const scansStartDate = scansDateRange?.from
		? startOfDay(scansDateRange.from).toISOString()
		: null;
	const scansEndDate = scansDateRange?.to
		? endOfDay(scansDateRange.to).toISOString()
		: null;
	const hasCompleteScansDateRange = Boolean(scansStartDate && scansEndDate);

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

	const { data: user } = useGetUserByIdQuery(
		{ userId: business?.owner_id ?? "" },
		{ skip: businessLoading || businessFetching || missingBusinessId },
	);

	const { data: allBusinesses = [], isLoading: allBusinessesLoading } =
		useListAllBusinessesQuery({}, { skip: missingBusinessId });

	const ownerBusinesses = useMemo(() => {
		const ownerId = business?.owner_id;
		if (!ownerId) return [] as BusinessOutput[];
		return allBusinesses
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

	const { data: branches, isLoading: branchesLoading } =
		useListBusinessBranchesQuery(
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

	const { data: subscriptionPlans } = useListSubscriptionPlansQuery(undefined, {
		skip: missingBusinessId,
	});

	const {
		data: activeSubscription,
		error: activeSubscriptionError,
		refetch: refetchActiveSubscription,
	} = useGetActiveSubscriptionQuery(
		{ businessId },
		{ skip: missingBusinessId },
	);

	const {
		data: scans,
		isLoading: scansLoading,
		isFetching: scansFetching,
		error: scansError,
		refetch: refetchScans,
	} = useListTransactionsByBusinessQuery(
		{
			businessId,
			startDate: scansStartDate ?? "",
			endDate: scansEndDate ?? "",
			bankFilter: groupScansByBank,
			limit: SCANS_PAGE_SIZE,
			offset: scansOffset,
		},
		{
			skip:
				missingBusinessId ||
				activeTab !== "scans" ||
				!hasCompleteScansDateRange,
		},
	);

	const { data: subscriptionUsage } = useGetSubscriptionUsageQuery(
		{ businessId },
		{ skip: missingBusinessId },
	);

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
	const [createBranch, createBranchState] = useCreateBranchMutation();
	const [updateBranch, updateBranchState] = useUpdateBranchMutation();
	const [deleteBranch, deleteBranchState] = useDeleteBranchMutation();
	const [createEmployee, createEmployeeState] = useCreateEmployeeMutation();
	const [deleteEmployee, deleteEmployeeState] = useDeleteEmployeeMutation();
	const [createBankAccount, createBankAccountState] =
		useCreateBankAccountMutation();
	const [updateBankAccount, updateBankAccountState] =
		useUpdateBankAccountMutation();
	const [deleteBankAccount, deleteBankAccountState] =
		useDeleteBankAccountMutation();
	const [grantSubscriptionCredits, { isLoading: grantingCredits }] =
		useGrantSubscriptionCreditsMutation();
	const [assignSubscription, { isLoading: assigningSubscription }] =
		useAdminAssignSubscriptionMutation();

	const [activeDialogOpen, setActiveDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
	const [employeeBranchDraft, setEmployeeBranchDraft] = useState<
		Record<string, string>
	>({});
	const [branchDialogOpen, setBranchDialogOpen] = useState(false);
	const [editingBranch, setEditingBranch] = useState<BranchOutput | null>(null);
	const [branchForm, setBranchForm] = useState({
		name: "",
		address: "",
		is_head_quarter: false,
	});
	const [branchError, setBranchError] = useState<string | null>(null);
	const [branchPendingDelete, setBranchPendingDelete] =
		useState<BranchOutput | null>(null);
	const [bankDialogOpen, setBankDialogOpen] = useState(false);
	const [editingBankAccount, setEditingBankAccount] =
		useState<BankAccountResponse | null>(null);
	const [bankForm, setBankForm] = useState<{
		bank_name: BankNameEnum | "";
		account_name: string;
		account_number: string;
	}>({ bank_name: "", account_name: "", account_number: "" });
	const [bankError, setBankError] = useState<string | null>(null);
	const [bankPendingDelete, setBankPendingDelete] =
		useState<BankAccountResponse | null>(null);
	const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
	const [employeeForm, setEmployeeForm] = useState({
		phone_number: "",
		username: "",
		email: "",
		role_id: "",
		branch_id: "",
	});
	const [employeeError, setEmployeeError] = useState<string | null>(null);
	const [createdEmployeePassword, setCreatedEmployeePassword] = useState<
		string | null
	>(null);
	const [employeePendingDelete, setEmployeePendingDelete] =
		useState<EmployeeOutput | null>(null);

	const roleById = useMemo(() => {
		const items = roles ?? [];
		return new Map(items.map((r) => [r.id, r] as const));
	}, [roles]);

	const subscriptionPlanById = useMemo(() => {
		const items = subscriptionPlans ?? [];
		return new Map(items.map((p) => [p.id, p] as const));
	}, [subscriptionPlans]);

	const subscriptionHistoryRows = useMemo(
		() => asAdminSubscriptionRows(subscriptionHistory),
		[subscriptionHistory],
	);

	const latestSubscriptionFromHistory = useMemo(() => {
		if (subscriptionHistoryRows.length === 0) return null;
		return subscriptionHistoryRows.reduce((latest, row) =>
			subscriptionRowTimestamp(row) >= subscriptionRowTimestamp(latest)
				? row
				: latest,
		);
	}, [subscriptionHistoryRows]);

	const employeeRows = employees ?? [];
	const scanRows = scans ?? EMPTY_SCAN_ROWS;
	const canPreviousScansPage = scansOffset > 0;
	const canNextScansPage = scanRows.length === SCANS_PAGE_SIZE;
	const scansGroupedByBank = useMemo(() => {
		if (!groupScansByBank) return [];

		const bankNameByAccountId = new Map(
			(bankAccounts ?? []).map((account) => [account.id, account.bank_name]),
		);
		const rowsByBank = new Map<string, VerifiedTransactionOutput[]>();
		for (const row of scanRows) {
			const bankName = row.bank_account_id
				? (bankNameByAccountId.get(row.bank_account_id) ?? "Other / unknown bank")
				: "Other / unknown bank";
			const rows = rowsByBank.get(bankName) ?? [];
			rows.push(row);
			rowsByBank.set(bankName, rows);
		}

		return Array.from(rowsByBank, ([bankName, rows]) => ({ bankName, rows }));
	}, [bankAccounts, groupScansByBank, scanRows]);
	const scanTableRows = groupScansByBank
		? scansGroupedByBank.flatMap(({ bankName, rows }) => [
				<TableRow key={`bank-${bankName}`} className="bg-muted/40">
					<TableCell colSpan={5} className="font-medium">
						{bankName}
					</TableCell>
				</TableRow>,
				...rows.map((row) => <ScanTransactionRow key={row.id} row={row} />),
			])
		: scanRows.map((row) => <ScanTransactionRow key={row.id} row={row} />);
	const scansDateRangeLabel = scansDateRange?.from
		? scansDateRange.to
			? `${format(scansDateRange.from, "MMM d, yyyy")} – ${format(scansDateRange.to, "MMM d, yyyy")}`
			: `${format(scansDateRange.from, "MMM d, yyyy")} – Select end date`
		: "Select date range";

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

	async function onConfirmGrantCredits({
		referenceImage,
		isInternal,
	}: {
		referenceImage: File;
		isInternal: boolean;
	}) {
		try {
			const out = await grantSubscriptionCredits({
				businessId,
				body: {
					credits: grantCreditsParsed,
					file: referenceImage,
					is_internal: isInternal,
				},
			}).unwrap();
			setGrantCreditsInput("");
			setGrantConfirmOpen(false);
			setGrantBanner({
				variant: "default",
				title: "Credits granted",
				message: `Granted ${grantCreditsParsed} credits${isInternal ? " (internal)" : ""} (ref: ${referenceImage.name}). Status is now ${out.status}.`,
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

	async function onConfirmManualAssign({
		referenceImage,
		isInternal,
	}: {
		referenceImage: File;
		isInternal: boolean;
	}) {
		if (!manualPlanId) return;
		try {
			const out = await assignSubscription({
				body: {
					business_id: businessId,
					plan_id: manualPlanId,
					file: referenceImage,
					is_internal: isInternal,
				},
			}).unwrap();
			setAssignConfirmOpen(false);
			setManualBanner({
				variant: "default",
				title: "Subscription assigned",
				message: `Assigned ${selectedAssignPlan?.name ?? "plan"}${isInternal ? " (internal)" : ""} (ref: ${referenceImage.name}). Status is now ${out.status}.`,
			});
		} catch (err) {
			setManualBanner({
				variant: "destructive",
				title: "Assign failed",
				message: getErrorMessage(err, "Could not assign subscription."),
			});
		}
	}

	function openCreateBranch() {
		setEditingBranch(null);
		setBranchForm({ name: "", address: "", is_head_quarter: false });
		setBranchError(null);
		setBranchDialogOpen(true);
	}

	function openEditBranch(branch: BranchOutput) {
		setEditingBranch(branch);
		setBranchForm({
			name: branch.name,
			address: branch.address ?? "",
			is_head_quarter: branch.is_head_quarter,
		});
		setBranchError(null);
		setBranchDialogOpen(true);
	}

	async function handleBranchSubmit(event: React.FormEvent) {
		event.preventDefault();
		setBranchError(null);
		if (!branchForm.name.trim()) {
			setBranchError("Enter a branch name.");
			return;
		}
		try {
			if (editingBranch) {
				await updateBranch({
					branchId: editingBranch.id,
					body: {
						name: branchForm.name.trim(),
						address: branchForm.address.trim() || null,
						is_head_quarter: branchForm.is_head_quarter,
					},
				}).unwrap();
			} else {
				await createBranch({
					accessToken: "",
					body: {
						business_id: businessId,
						name: branchForm.name.trim(),
						address: branchForm.address.trim() || null,
						is_head_quarter: branchForm.is_head_quarter,
					},
				}).unwrap();
			}
			setBranchDialogOpen(false);
		} catch (error) {
			setBranchError(getErrorMessage(error, "Could not save the branch."));
		}
	}

	async function handleBranchDelete() {
		if (!branchPendingDelete) return;
		setBranchError(null);
		try {
			await deleteBranch({ branchId: branchPendingDelete.id }).unwrap();
			setBranchPendingDelete(null);
		} catch (error) {
			setBranchError(getErrorMessage(error, "Could not delete the branch."));
		}
	}

	function openCreateBankAccount() {
		setEditingBankAccount(null);
		setBankForm({ bank_name: "", account_name: "", account_number: "" });
		setBankError(null);
		setBankDialogOpen(true);
	}

	function openEditBankAccount(account: BankAccountResponse) {
		setEditingBankAccount(account);
		setBankForm({
			bank_name: account.bank_name,
			account_name: account.account_name,
			account_number: account.account_number,
		});
		setBankError(null);
		setBankDialogOpen(true);
	}

	async function handleBankSubmit(event: React.FormEvent) {
		event.preventDefault();
		setBankError(null);
		if (!bankForm.bank_name || !bankForm.account_name.trim() || !bankForm.account_number.trim()) {
			setBankError("Complete all bank account fields.");
			return;
		}
		try {
			if (editingBankAccount) {
				await updateBankAccount({
					accountId: editingBankAccount.id,
					businessId,
					body: {
						bank_name: bankForm.bank_name,
						account_name: bankForm.account_name.trim(),
						account_number: bankForm.account_number.trim(),
					},
				}).unwrap();
			} else {
				await createBankAccount({
					business_id: businessId,
					bank_name: bankForm.bank_name,
					account_name: bankForm.account_name.trim(),
					account_number: bankForm.account_number.trim(),
				}).unwrap();
			}
			setBankDialogOpen(false);
		} catch (error) {
			setBankError(getErrorMessage(error, "Could not save the bank account."));
		}
	}

	async function handleBankDelete() {
		if (!bankPendingDelete) return;
		setBankError(null);
		try {
			await deleteBankAccount({
				accountId: bankPendingDelete.id,
				businessId,
			}).unwrap();
			setBankPendingDelete(null);
		} catch (error) {
			setBankError(getErrorMessage(error, "Could not delete the bank account."));
		}
	}

	function openCreateEmployee() {
		setEmployeeForm({
			phone_number: "",
			username: "",
			email: "",
			role_id: "",
			branch_id: "",
		});
		setCreatedEmployeePassword(null);
		setEmployeeError(null);
		setEmployeeDialogOpen(true);
	}

	async function handleEmployeeCreate(event: React.FormEvent) {
		event.preventDefault();
		setEmployeeError(null);
		if (!employeeForm.phone_number.trim() || !employeeForm.role_id || !employeeForm.branch_id) {
			setEmployeeError("Phone number, role, and branch are required.");
			return;
		}
		try {
			const created = await createEmployee({
				body: {
					business_id: businessId,
					phone_number: employeeForm.phone_number.trim(),
					role_id: employeeForm.role_id,
					branch_id: employeeForm.branch_id,
					username: employeeForm.username.trim() || null,
					email: employeeForm.email.trim() || null,
				},
			}).unwrap();
			setCreatedEmployeePassword(created.temporary_password);
		} catch (error) {
			setEmployeeError(getErrorMessage(error, "Could not create the staff member."));
		}
	}

	async function handleEmployeeDelete() {
		if (!employeePendingDelete) return;
		setEmployeeError(null);
		try {
			await deleteEmployee({
				businessId,
				employeeId: employeePendingDelete.id,
			}).unwrap();
			setEmployeePendingDelete(null);
		} catch (error) {
			setEmployeeError(getErrorMessage(error, "Could not delete the staff member."));
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
	const planName = latestSubscriptionFromHistory
		? getSubscriptionPlanLabel(latestSubscriptionFromHistory.plan)
		: null;
	const usageCredits = subscriptionUsage?.remaining_credits
		?.toLocaleString() ?? null;
	const usageDaysRemaining = subscriptionUsage?.days_remaining
		?.toLocaleString() ?? null;

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
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex min-w-0 flex-col gap-2">
						<h1
							id="owner-heading"
							className="text-pretty text-2xl font-semibold tracking-tight text-foreground"
						>
							{ownerDisplay}
						</h1>
						<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
							<Building2
								className="size-4 shrink-0 text-muted-foreground"
								aria-hidden="true"
							/>
							<p className="min-w-0 wrap-break-word text-base font-medium text-foreground">
								{business.name || "Untitled business"}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
							<span className="inline-flex items-center gap-1.5">
								<Phone className="size-3.5 shrink-0" aria-hidden="true" />
								{user?.phone_number ? (
									<span className="font-mono tabular-nums text-foreground/80">
										{user.phone_number}
									</span>
								) : (
									<span>No phone on file</span>
								)}
							</span>
						</div>
					</div>
					<div className="flex shrink-0 flex-wrap items-center gap-2">
						{user?.id ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									setResetPasswordTarget({
										userName: ownerDisplay,
										phoneNumber: user.phone_number,
										email: user.email,
										contextLabel: business.name,
									})
								}
							>
								Reset password
							</Button>
						) : null}
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
						{canMutateOwners || user?.phone_number ? (
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
													void navigator.clipboard.writeText(user.phone_number);
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

				<div
					className="flex flex-wrap items-center gap-2"
					aria-label="Businesses"
				>
					{allBusinessesLoading ? (
						<Skeleton className="h-8 w-40" />
					) : ownerBusinesses.length <= 1 ? null : ownerBusinesses.length <= 6 ? (
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
				className="sticky top-0 z-10 flex flex-col gap-3 bg-card/95 py-3 backdrop-blur-sm supports-backdrop-filter:bg-card/90"
			>
				<div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-4">
					<div className="flex min-h-14 min-w-0 flex-col justify-center gap-1.5 py-2">
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
					<div className="flex min-h-14 min-w-0 flex-col justify-center gap-1.5 py-2">
						<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Plan
						</p>
						<p className="truncate text-sm font-medium tracking-tight">
							{planName ?? "—"}
						</p>
					</div>
					<div className="flex min-h-14 min-w-0 flex-col justify-center gap-1.5 py-2">
						<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Remaining Credits
						</p>
						<p className="font-mono text-sm font-medium tabular-nums">
							{usageCredits ?? "—"}
						</p>
					</div>
					<div className="flex min-h-14 min-w-0 flex-col justify-center gap-1.5 py-2">
						<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							Remaining Days
						</p>
						<p className="font-mono text-sm font-medium tabular-nums">
							{usageDaysRemaining ?? "—"}
						</p>
					</div>
				</div>

				{activeSubscriptionError ? (
					<div className="flex flex-col gap-2">
						{activeSubscriptionError ? (
							<Alert variant="destructive">
								<AlertTitle>Subscription</AlertTitle>
								<AlertDescription className="flex flex-wrap items-center gap-2">
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
										Retry
									</Button>
								</AlertDescription>
							</Alert>
						) : null}
					</div>
				) : null}

				{manualBanner || grantBanner ? (
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
								<SelectTrigger
									id="quick-assign-plan"
									className="h-9 w-full bg-background"
								>
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
							className="flex flex-wrap items-end gap-2 sm:border-l sm:border-border sm:pl-3"
							onSubmit={(e) => {
								e.preventDefault();
								openGrantConfirm();
							}}
						>
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
						<div className="flex flex-col gap-1.5 px-3 py-2.5 sm:border-l sm:border-border">
							<div className="flex flex-wrap items-center gap-2">
								<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
									Under development
								</p>
								<Badge
									variant="outline"
									className="font-normal text-muted-foreground"
								>
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
				internalLabel="Credits are for internal teams"
				onConfirm={onConfirmGrantCredits}
			/>

			<ConfirmCreditActionDialog
				open={assignConfirmOpen}
				onOpenChange={setAssignConfirmOpen}
				title="Confirm assign plan?"
				summary={`Are you sure you want to assign ${selectedAssignPlan?.name ?? "this plan"} to ${business.name}?`}
				confirmLabel="Yes, assign plan"
				isPending={assigningSubscription}
				internalLabel="Plan is for internal teams"
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
			{resetPasswordTarget ? (
				<ResetUserPasswordDialog
					open={Boolean(resetPasswordTarget)}
					onOpenChange={(nextOpen) => {
						if (!nextOpen) setResetPasswordTarget(null);
					}}
					userName={resetPasswordTarget.userName}
					phoneNumber={resetPasswordTarget.phoneNumber}
					email={resetPasswordTarget.email}
					contextLabel={resetPasswordTarget.contextLabel}
				/>
			) : null}

			<Tabs
				value={activeTab}
				onValueChange={onTabChange}
				className="mt-2 gap-3"
			>
				<TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-lg border border-border bg-muted/40 p-1">
					<TabsTrigger value="business" className="rounded-md">
						Business
					</TabsTrigger>
					<TabsTrigger value="people" className="rounded-md">
						Staff
					</TabsTrigger>
					<TabsTrigger value="scans" className="rounded-md">
						Scans
					</TabsTrigger>
					<TabsTrigger value="money" className="rounded-md">
						Billing
					</TabsTrigger>
				</TabsList>

				<TabsContent value="business" className="mt-0 flex flex-col gap-10">
					<section className="overflow-hidden rounded-xl border border-border">
						<div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
							<div>
								<h2 className="text-sm font-semibold tracking-tight">Branches</h2>
								<p className="text-xs text-muted-foreground">
									Locations under this business
								</p>
							</div>
							{canMutateOwners ? (
								<Button type="button" size="sm" onClick={openCreateBranch}>
									<Plus data-icon="inline-start" aria-hidden="true" />
									Add Branch
								</Button>
							) : null}
						</div>
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Branch</TableHead>
										<TableHead>Headquarters</TableHead>
										<TableHead>Address</TableHead>
										{canMutateOwners ? (
											<TableHead className="text-right">Actions</TableHead>
										) : null}
									</TableRow>
								</TableHeader>
								<TableBody>
									{branchesLoading ? (
										<TableRow>
											<TableCell colSpan={canMutateOwners ? 4 : 3} className="py-10 text-center">
												<span className="text-sm text-muted-foreground">
													Loading branches…
												</span>
											</TableCell>
										</TableRow>
									) : branches?.length === 0 ? (
										<TableRow>
											<TableCell colSpan={canMutateOwners ? 4 : 3} className="py-10 text-center">
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
												{canMutateOwners ? (
													<TableCell className="text-right">
														<DropdownMenu>
															<DropdownMenuTrigger
																render={
																	<Button
																		type="button"
																		variant="ghost"
																		size="icon-sm"
																		aria-label={`Actions for ${branch.name}`}
																	/>
																}
															>
																<MoreHorizontal aria-hidden="true" />
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuGroup>
																	<DropdownMenuItem
																		onClick={() => openEditBranch(branch)}
																	>
																		<Pencil aria-hidden="true" />
																		Edit
																	</DropdownMenuItem>
																	<DropdownMenuSeparator />
																	<DropdownMenuItem
																		variant="destructive"
																		onClick={() => setBranchPendingDelete(branch)}
																	>
																		<Trash2 aria-hidden="true" />
																		Delete
																	</DropdownMenuItem>
																</DropdownMenuGroup>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												) : null}
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</section>

					<section className="overflow-hidden rounded-xl border border-border">
						<div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
							<div>
								<h2 className="text-sm font-semibold tracking-tight">
									Bank accounts
								</h2>
								<p className="text-xs text-muted-foreground">
									Bank accounts linked to this business
								</p>
							</div>
							{canMutateOwners ? (
								<Button type="button" size="sm" onClick={openCreateBankAccount}>
									<Plus data-icon="inline-start" aria-hidden="true" />
									Add Account
								</Button>
							) : null}
						</div>
						{bankAccountsError ? (
							<div className="p-4">
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
							</div>
						) : null}
						{bankAccountsLoading ? (
							<div className="flex flex-col gap-2 p-4">
								{Array.from({ length: 4 }).map((_, i) => (
									<Skeleton key={i} className="h-10 w-full" />
								))}
							</div>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Bank</TableHead>
											<TableHead>Account name</TableHead>
											<TableHead>Account number</TableHead>
											<TableHead>Status</TableHead>
											{canMutateOwners ? (
												<TableHead className="text-right">Actions</TableHead>
											) : null}
										</TableRow>
									</TableHeader>
									<TableBody>
										{(bankAccounts ?? []).length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={canMutateOwners ? 5 : 4}
													className="py-10 text-center text-sm text-muted-foreground"
												>
													No bank accounts linked to this business.
												</TableCell>
											</TableRow>
										) : (
											(bankAccounts ?? []).map(
												(account: BankAccountResponse) => (
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
																	account.is_archived
																		? "secondary"
																		: "default"
																}
															>
																{account.is_archived ? "Archived" : "Active"}
															</Badge>
														</TableCell>
														{canMutateOwners ? (
															<TableCell className="text-right">
																<DropdownMenu>
																	<DropdownMenuTrigger
																		render={
																			<Button
																				type="button"
																				variant="ghost"
																				size="icon-sm"
																				aria-label={`Actions for ${account.account_name}`}
																			/>
																		}
																	>
																		<MoreHorizontal aria-hidden="true" />
																	</DropdownMenuTrigger>
																	<DropdownMenuContent align="end">
																		<DropdownMenuGroup>
																			<DropdownMenuItem
																				onClick={() => openEditBankAccount(account)}
																			>
																				<Pencil aria-hidden="true" />
																				Edit
																			</DropdownMenuItem>
																			<DropdownMenuSeparator />
																			<DropdownMenuItem
																				variant="destructive"
																				disabled={account.is_archived}
																				onClick={() => setBankPendingDelete(account)}
																			>
																				<Trash2 aria-hidden="true" />
																				Delete
																			</DropdownMenuItem>
																		</DropdownMenuGroup>
																	</DropdownMenuContent>
																</DropdownMenu>
															</TableCell>
														) : null}
													</TableRow>
												),
											)
										)}
									</TableBody>
								</Table>
							</div>
						)}
					</section>
				</TabsContent>

				<TabsContent value="people" className="mt-0">
					<section className="overflow-hidden rounded-xl border border-border">
						<div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
							<div>
								<h2 className="text-sm font-semibold tracking-tight">Staff</h2>
								<p className="text-xs text-muted-foreground">
									Roles and branch assignment for this business
								</p>
							</div>
							{canMutateOwners ? (
								<Button type="button" size="sm" onClick={openCreateEmployee}>
									<Plus data-icon="inline-start" aria-hidden="true" />
									Add Staff
								</Button>
							) : null}
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
														const selectedBranchId =
															employeeBranchDraft[emp.id] ?? emp.branch_id ?? "";

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
																{canMutateOwners ? (
																	<Select
																		value={selectedBranchId}
																		onValueChange={(value) => {
																			if (!value) return;
																			setEmployeeBranchDraft((prev) => ({
																				...prev,
																				[emp.id]: value,
																			}));
																		}}
																	>
																		<SelectTrigger
																			aria-label="Select employee branch"
																			className="w-56"
																		>
																			<SelectValue placeholder="Select branch">
																				{branches?.find((branch) => branch.id === selectedBranchId)?.name ?? "—"}
																			</SelectValue>
																		</SelectTrigger>
																		<SelectContent>
																			{(branches ?? []).map((branch) => (
																				<SelectItem key={branch.id} value={branch.id}>
																					{branch.name}
																				</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																) : (
																	<span className="truncate font-medium">
																		{emp.branch?.name ?? "—"}
																	</span>
																)}
															</TableCell>
															{canMutateOwners ? (
																<TableCell className="text-right">
																	<div className="flex items-center justify-end gap-2">
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
																				(!selectedBranchId && !emp.branch_id) ||
																				(selectedRoleId === emp.role_id &&
																					selectedBranchId === (emp.branch_id ?? ""))
																			}
																			onClick={async () => {
																				if (!selectedRoleId || !selectedBranchId) return;
																				await updateEmployeeRole({
																					businessId,
																					employeeId: emp.id,
																					body: {
																						role_id: selectedRoleId,
																						branch_id: selectedBranchId,
																					},
																				}).unwrap();
																			}}
																		>
																			Save
																		</button>
																		<DropdownMenu>
																			<DropdownMenuTrigger
																				render={
																					<Button
																						type="button"
																					variant="ghost"
																					size="icon-sm"
																					aria-label={`Actions for ${emp.user?.username ?? emp.user?.phone_number ?? "staff member"}`}
																					/>
																				}
																			>
																				<MoreHorizontal aria-hidden="true" />
																			</DropdownMenuTrigger>
																			<DropdownMenuContent align="end">
																				<DropdownMenuGroup>
																					<DropdownMenuItem
																						onClick={() =>
																							setResetPasswordTarget({
																								userName:
																									emp.user?.username ??
																									emp.user?.phone_number ??
																									emp.user_id,
																								phoneNumber:
																									emp.user?.phone_number ?? null,
																								email: emp.user?.email ?? null,
																								contextLabel: business.name,
																							})
																						}
																					>
																						Reset password
																					</DropdownMenuItem>
																					<DropdownMenuSeparator />
																					<DropdownMenuItem
																						variant="destructive"
																						onClick={() => setEmployeePendingDelete(emp)}
																					>
																						<Trash2 aria-hidden="true" />
																						Delete
																					</DropdownMenuItem>
																				</DropdownMenuGroup>
																			</DropdownMenuContent>
																		</DropdownMenu>
																	</div>
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

				<TabsContent value="scans" className="mt-0 flex flex-col gap-3">
					<Card size="sm">
						<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex flex-col gap-1">
								<CardTitle>Scan filters</CardTitle>
							</div>
							<CardAction className="w-full self-stretch sm:w-auto sm:self-center">
								<Popover
									open={scansCalendarOpen}
									onOpenChange={setScansCalendarOpen}
								>
									<PopoverTrigger
										render={
											<Button
												type="button"
												variant="outline"
												className="w-full justify-start font-normal sm:w-auto"
												aria-label="Choose scan date range"
											/>
										}
									>
										<CalendarDays data-icon="inline-start" aria-hidden="true" />
										{scansDateRangeLabel}
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="end">
										<Calendar
											mode="range"
											selected={scansDateRange}
											onSelect={(range) => {
												setScansDateRange(range);
												setScansOffset(0);
												if (range?.from && range.to) {
													setScansCalendarOpen(false);
												}
											}}
											numberOfMonths={2}
											disabled={{ after: new Date() }}
										/>
									</PopoverContent>
								</Popover>
							</CardAction>
						</CardHeader>
						<CardContent className="pt-0">
							<Field orientation="horizontal" className="items-start">
								<Checkbox
									id="scans-group-by-bank"
									checked={groupScansByBank}
									onCheckedChange={(checked) => {
										setGroupScansByBank(checked === true);
										setScansOffset(0);
									}}
								/>
								<div className="flex flex-col gap-0.5">
									<FieldLabel
										htmlFor="scans-group-by-bank"
										className="cursor-pointer"
									>
										Group transactions by bank
									</FieldLabel>
									<p className="text-xs text-muted-foreground">
										Organize the results into bank groups.
									</p>
								</div>
							</Field>
						</CardContent>
					</Card>

					{!hasCompleteScansDateRange ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							Select both dates to view scans.
						</p>
					) : scansError ? (
						<Alert variant="destructive">
							<AlertTitle>Couldn’t load scans</AlertTitle>
							<AlertDescription className="flex flex-wrap items-center gap-2">
								<span className="wrap-break-word">
									{getErrorMessage(scansError, "Request failed.")}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => refetchScans()}
								>
									Retry
								</Button>
							</AlertDescription>
						</Alert>
					) : scansLoading || scansFetching ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 6 }).map((_, index) => (
								<Skeleton key={index} className="h-10 w-full" />
							))}
						</div>
					) : (
						<>
							<div className="overflow-x-auto rounded-xl border border-border">
								<Table
									aria-label="Business scans"
									className="w-full table-fixed"
								>
									<TableHeader>
										<TableRow>
											<TableHead className="text-left">Date</TableHead>
											<TableHead className="text-left">Sender name</TableHead>
											<TableHead className="text-left">Amount</TableHead>
											<TableHead className="text-left">Status</TableHead>
											<TableHead className="text-left">Receipt</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{scanRows.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={5}
													className="py-10 text-center text-sm text-muted-foreground"
												>
													No scans found for the selected filters.
												</TableCell>
											</TableRow>
										) : (
											scanTableRows
										)}
									</TableBody>
								</Table>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="text-xs text-muted-foreground">
									{scanRows.length === 0
										? "Showing 0 scans"
										: `Showing ${scansOffset + 1}–${scansOffset + scanRows.length} scans`}
									{scansFetching ? " · refreshing…" : ""}
								</p>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={!canPreviousScansPage || scansFetching}
										onClick={() =>
											setScansOffset((offset) =>
												Math.max(0, offset - SCANS_PAGE_SIZE),
											)
										}
									>
										Previous
									</Button>
									<span className="font-mono text-xs tabular-nums text-muted-foreground">
										{Math.floor(scansOffset / SCANS_PAGE_SIZE) + 1}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={!canNextScansPage || scansFetching}
										onClick={() =>
											setScansOffset((offset) => offset + SCANS_PAGE_SIZE)
										}
									>
										Next
									</Button>
								</div>
							</div>
						</>
					)}
				</TabsContent>

				<TabsContent value="money" className="mt-0 flex flex-col gap-4">
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
										{subscriptionHistoryRows.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={9}
													className="py-10 text-center text-sm text-muted-foreground"
												>
													No subscription history for this business.
												</TableCell>
											</TableRow>
										) : (
											subscriptionHistoryRows.map(
												(row: AdminSubscriptionOutput) => (
													<TableRow key={row.id}>
														<TableCell className="font-medium">
															{getSubscriptionPlanLabel(row.plan)}
														</TableCell>
														<TableCell>
															<Badge
																variant={subscriptionBadgeVariant(row.status)}
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
				</TabsContent>
			</Tabs>

			<Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{editingBranch ? "Edit Branch" : "Add Branch"}</DialogTitle>
						<DialogDescription>
							Manage the location details for {business.name}.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleBranchSubmit} className="flex flex-col gap-4">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="business-branch-name">Branch name</FieldLabel>
								<Input
									id="business-branch-name"
									name="branch-name"
									value={branchForm.name}
									onChange={(event) =>
										setBranchForm((current) => ({
											...current,
											name: event.target.value,
										}))
									}
									placeholder="Main location"
									autoComplete="off"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="business-branch-address">Address</FieldLabel>
								<Input
									id="business-branch-address"
									name="branch-address"
									value={branchForm.address}
									onChange={(event) =>
										setBranchForm((current) => ({
											...current,
											address: event.target.value,
										}))
									}
									placeholder="City, street, building…"
									autoComplete="street-address"
								/>
							</Field>
							<label className="flex items-center gap-2 text-sm">
								<Checkbox
									checked={branchForm.is_head_quarter}
									onCheckedChange={(checked) =>
										setBranchForm((current) => ({
											...current,
											is_head_quarter: checked === true,
										}))
									}
								/>
								Headquarters
							</label>
						</FieldGroup>
						{branchError ? <FieldError>{branchError}</FieldError> : null}
						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setBranchDialogOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={createBranchState.isLoading || updateBranchState.isLoading}>
								{createBranchState.isLoading || updateBranchState.isLoading ? (
									<Loader2Icon className="animate-spin" aria-hidden="true" />
								) : null}
								{editingBranch ? "Save Branch" : "Create Branch"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{editingBankAccount ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
						<DialogDescription>
							Manage the payment account linked to {business.name}.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleBankSubmit} className="flex flex-col gap-4">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="business-bank-name">Bank</FieldLabel>
								<Select
									value={bankForm.bank_name}
									onValueChange={(value) =>
										setBankForm((current) => ({
											...current,
											bank_name: (value as BankNameEnum) || "",
										}))
									}
								>
									<SelectTrigger id="business-bank-name" className="w-full">
										<SelectValue placeholder="Select a bank" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="CBE">Commercial Bank of Ethiopia</SelectItem>
											<SelectItem value="DASHEN">Dashen Bank</SelectItem>
											<SelectItem value="AWASH">Awash Bank</SelectItem>
											<SelectItem value="ABYSINIA">Bank of Abyssinia</SelectItem>
											<SelectItem value="TELEBIRR">Telebirr</SelectItem>
											<SelectItem value="CBEBIRR">CBE Birr</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="business-bank-account-name">Account name</FieldLabel>
								<Input
									id="business-bank-account-name"
									name="account-name"
									value={bankForm.account_name}
									onChange={(event) =>
										setBankForm((current) => ({
											...current,
											account_name: event.target.value,
										}))
									}
									placeholder="Business account"
									autoComplete="off"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="business-bank-account-number">Account number</FieldLabel>
								<Input
									id="business-bank-account-number"
									name="account-number"
									value={bankForm.account_number}
									onChange={(event) =>
										setBankForm((current) => ({
											...current,
											account_number: event.target.value,
										}))
									}
									placeholder="Enter account number"
									autoComplete="off"
									inputMode="numeric"
								/>
							</Field>
						</FieldGroup>
						{bankError ? <FieldError>{bankError}</FieldError> : null}
						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => setBankDialogOpen(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={createBankAccountState.isLoading || updateBankAccountState.isLoading}>
								{createBankAccountState.isLoading || updateBankAccountState.isLoading ? (
									<Loader2Icon className="animate-spin" aria-hidden="true" />
								) : null}
								{editingBankAccount ? "Save Account" : "Create Account"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{createdEmployeePassword ? "Staff Created" : "Add Staff"}</DialogTitle>
						<DialogDescription>
							{createdEmployeePassword
								? "Share the temporary password securely with this staff member."
								: `Create a staff account for ${business.name}.`}
						</DialogDescription>
					</DialogHeader>
					{createdEmployeePassword ? (
						<div className="flex flex-col gap-4">
							<Alert>
								<AlertTitle>Temporary password</AlertTitle>
								<AlertDescription className="font-mono text-sm">
									{createdEmployeePassword}
								</AlertDescription>
							</Alert>
							<DialogFooter>
								<Button type="button" onClick={() => setEmployeeDialogOpen(false)}>Done</Button>
							</DialogFooter>
						</div>
					) : (
						<form onSubmit={handleEmployeeCreate} className="flex flex-col gap-4">
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="staff-phone">Phone number</FieldLabel>
									<Input
										id="staff-phone"
										name="phone"
										type="tel"
										inputMode="tel"
										value={employeeForm.phone_number}
										onChange={(event) => setEmployeeForm((current) => ({ ...current, phone_number: event.target.value }))}
										placeholder="+251…"
										autoComplete="tel"
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="staff-username">Username</FieldLabel>
									<Input
										id="staff-username"
										name="username"
										value={employeeForm.username}
										onChange={(event) => setEmployeeForm((current) => ({ ...current, username: event.target.value }))}
										placeholder="Optional"
										autoComplete="off"
										spellCheck={false}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="staff-email">Email</FieldLabel>
									<Input
										id="staff-email"
										name="email"
										type="email"
										value={employeeForm.email}
										onChange={(event) => setEmployeeForm((current) => ({ ...current, email: event.target.value }))}
										placeholder="name@example.com"
										autoComplete="email"
										spellCheck={false}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="staff-role">Role</FieldLabel>
									<Select value={employeeForm.role_id} onValueChange={(value) => setEmployeeForm((current) => ({ ...current, role_id: value ?? "" }))}>
										<SelectTrigger id="staff-role" className="w-full"><SelectValue placeholder="Select role" /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{(roles ?? []).map((role) => (
													<SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor="staff-branch">Branch</FieldLabel>
									<Select value={employeeForm.branch_id} onValueChange={(value) => setEmployeeForm((current) => ({ ...current, branch_id: value ?? "" }))}>
										<SelectTrigger id="staff-branch" className="w-full"><SelectValue placeholder="Select branch" /></SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{(branches ?? []).map((branch) => (
													<SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							</FieldGroup>
							{employeeError ? <FieldError>{employeeError}</FieldError> : null}
							<DialogFooter>
								<Button type="button" variant="outline" onClick={() => setEmployeeDialogOpen(false)}>Cancel</Button>
								<Button type="submit" disabled={createEmployeeState.isLoading}>
									{createEmployeeState.isLoading ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
									Create Staff
								</Button>
							</DialogFooter>
						</form>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog open={Boolean(branchPendingDelete)} onOpenChange={(open) => !open && setBranchPendingDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete {branchPendingDelete?.name}?</AlertDialogTitle>
						<AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
					</AlertDialogHeader>
					{branchError ? <Alert variant="destructive"><AlertDescription>{branchError}</AlertDescription></Alert> : null}
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleBranchDelete} disabled={deleteBranchState.isLoading}>Delete Branch</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={Boolean(bankPendingDelete)} onOpenChange={(open) => !open && setBankPendingDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete {bankPendingDelete?.account_name}?</AlertDialogTitle>
						<AlertDialogDescription>This bank account will be removed from this business.</AlertDialogDescription>
					</AlertDialogHeader>
					{bankError ? <Alert variant="destructive"><AlertDescription>{bankError}</AlertDescription></Alert> : null}
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleBankDelete} disabled={deleteBankAccountState.isLoading}>Delete Account</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={Boolean(employeePendingDelete)} onOpenChange={(open) => !open && setEmployeePendingDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this staff member?</AlertDialogTitle>
						<AlertDialogDescription>This removes the employee assignment from this business.</AlertDialogDescription>
					</AlertDialogHeader>
					{employeeError ? <Alert variant="destructive"><AlertDescription>{employeeError}</AlertDescription></Alert> : null}
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleEmployeeDelete} disabled={deleteEmployeeState.isLoading}>Delete Staff</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
