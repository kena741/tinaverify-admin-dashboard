"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, MoreHorizontal, Power, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	useListBusinessEmployeesQuery,
	useListBusinessBranchesQuery,
	useSetBusinessActiveMutation,
	useUpdateEmployeeRoleMutation,
} from "../../../../services/branch-management/branchManagementApi";
import { useListBankAccountsQuery } from "../../../../services/bank-accounts/bankAccountsApi";
import type {
	BankAccountResponse,
	BranchOutput,
	EmployeeOutput,
	RoleOutput,
} from "../../../../services/types";
import { useListRolesQuery } from "../../../../services/role/roleApi";
import { cn } from "@/lib/utils";

function roleLabel(role?: RoleOutput | null) {
	return role?.name ?? "—";
}

export default function BusinessDetailClient({
	params,
}: {
	params: { id: string };
}) {
	const router = useRouter();
	const businessId = params.id;
	const missingBusinessId = !businessId;

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
		error: branchesError,
		refetch: refetchBranches,
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
						onClick={() => router.back()}
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
								onClick={() => router.back()}
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
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<button
							type="button"
							className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
							onClick={() => router.back()}
						>
							<ArrowLeft data-icon="inline-start" />
							Back
						</button>
						{businessFetching ? (
							<Badge variant="outline">Updating…</Badge>
						) : null}
					</div>

					<h1 className="text-2xl font-semibold tracking-tight">
						{business.name}
					</h1>
					<div className="flex flex-wrap items-center gap-2">
						{business.is_active ? (
							<Badge variant="secondary">Active</Badge>
						) : (
							<Badge variant="outline">Inactive</Badge>
						)}
						{business.is_archived ? (
							<Badge variant="outline">Archived</Badge>
						) : null}
						<span className="text-sm text-muted-foreground">
							TIN: {business.tin_number}
						</span>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
						disabled
						aria-label="More actions"
					>
						<MoreHorizontal data-icon="inline-start" />
						Actions
					</button>

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
										? "Deactivate business?"
										: "Activate business?"}
								</AlertDialogTitle>
								<AlertDialogDescription>
									This changes whether the business is active. You can toggle it
									back later.
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
								<AlertDialogTitle>Delete business?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={async () => {
										await deleteBusiness({ businessId }).unwrap();
										router.push("/admin/business");
									}}
								>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			<Tabs defaultValue="overview">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="employees">Employees</TabsTrigger>
					<TabsTrigger value="branches">Branches</TabsTrigger>
					<TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
				</TabsList>

				<TabsContent value="overview">
					<Card>
						<CardContent className="flex flex-col gap-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="flex flex-col gap-1">
									<span className="text-sm text-muted-foreground">Name</span>
									<span className="font-medium">{business.name}</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-sm text-muted-foreground">TIN</span>
									<span className="font-medium">{business.tin_number}</span>
								</div>
								<div className="flex flex-col gap-1 min-w-0">
									<span className="text-sm text-muted-foreground">Owner</span>
									<span className="font-medium truncate">
										{business.owner_id}
									</span>
								</div>
								<div className="flex flex-col gap-1">
									<span className="text-sm text-muted-foreground">Status</span>
									<span className="font-medium">
										{business.is_active ? "Active" : "Inactive"}
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
			</Tabs>
		</div>
	);
}
