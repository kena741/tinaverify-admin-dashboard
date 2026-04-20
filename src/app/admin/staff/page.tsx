"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
	CheckIcon,
	Loader2Icon,
	PlusIcon,
	SearchIcon,
	UsersIcon,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { useListAllUserBranchesQuery } from "../../../services/branch-management/branchManagementApi";
import { branchFromOutput } from "../../../services/types";
import { fetchRestaurants } from "../../../features/restaurants/restaurantsSlice";
import {
	fetchBusinessEmployees,
	fetchBusinessRoles,
	createEmployeeUser,
	clearError,
} from "../../../features/staff/staffSlice";
import { employeeUserDisplayName } from "../../../../lib/userDisplay";
import type { EmployeeOutput } from "../../../services/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
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

type BranchRow = { id: string; name: string; restaurant_id: string };

export default function StaffPage() {
	const dispatch = useAppDispatch();
	const { data: branchesData, isLoading: branchesLoading } =
		useListAllUserBranchesQuery();
	const branches = useMemo(
		() => (branchesData?.branches ?? []).map(branchFromOutput),
		[branchesData?.branches],
	);
	const myBusinesses = useMemo(
		() => branchesData?.myBusinesses ?? [],
		[branchesData?.myBusinesses],
	);
	const { restaurants } = useAppSelector(
		(state: { restaurants: { restaurants: { id: string; name: string }[] } }) =>
			state.restaurants,
	);
	const {
		businessRoles,
		rolesLoading,
		apiEmployees,
		employeesLoading,
		employeesBusinessId,
		error: staffError,
	} = useAppSelector(
		(state: {
			staff: {
				businessRoles: { id: string; name: string }[];
				rolesLoading: boolean;
				apiEmployees: unknown[];
				employeesLoading: boolean;
				employeesBusinessId: string | null;
				error: string | null;
			};
		}) => state.staff,
	);

	const [selectedBranchId, setSelectedBranchId] = useState("");

	const [showAddModal, setShowAddModal] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	const [formData, setFormData] = useState({
		phone_number: "",
		role_id: "",
		branch_id: "",
		email: "",
		username: "",
	});
	const [formError, setFormError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [createSuccess, setCreateSuccess] = useState<{
		temporary_password: string;
		phone_number: string;
	} | null>(null);

	useEffect(() => {
		dispatch(fetchRestaurants());
	}, [dispatch]);

	const selectedBranch = useMemo((): BranchRow | undefined => {
		return (branches as BranchRow[]).find((b) => b.id === selectedBranchId);
	}, [branches, selectedBranchId]);

	const selectedBusinessId = selectedBranch?.restaurant_id ?? "";

	const loadBusinessData = useCallback(
		(businessId: string) => {
			if (!businessId) return;
			dispatch(fetchBusinessRoles(businessId));
			dispatch(fetchBusinessEmployees(businessId));
		},
		[dispatch],
	);

	useEffect(() => {
		if (!selectedBranchId || !selectedBusinessId) return;
		loadBusinessData(selectedBusinessId);
	}, [selectedBranchId, selectedBusinessId, loadBusinessData]);

	const restaurantMap = useMemo(() => {
		const map: Record<string, string> = {};
		restaurants.forEach((r) => {
			map[r.id] = r.name;
		});
		return map;
	}, [restaurants]);

	/** Names from `listAllUserBranches` → `myBusinesses` when restaurant slice has no row yet. */
	const businessNameById = useMemo(() => {
		const m: Record<string, string> = {};
		myBusinesses.forEach((b) => {
			m[b.id] = b.name;
		});
		return m;
	}, [myBusinesses]);

	const businessLabel = useCallback(
		(businessId: string) =>
			restaurantMap[businessId] ?? businessNameById[businessId] ?? "Business",
		[restaurantMap, businessNameById],
	);

	/** Branches in the same business as the selected branch (for the add form). */
	const branchesForSelectedBusiness = useMemo((): BranchRow[] => {
		if (!selectedBusinessId) return [];
		return (branches as BranchRow[]).filter(
			(b) => b.restaurant_id === selectedBusinessId,
		);
	}, [branches, selectedBusinessId]);

	const branchOptions = useMemo(() => {
		const list = branches as BranchRow[];
		return [...list].sort((a, b) => {
			const an = `${businessLabel(a.restaurant_id)} ${a.name}`.toLowerCase();
			const bn = `${businessLabel(b.restaurant_id)} ${b.name}`.toLowerCase();
			return an.localeCompare(bn);
		});
	}, [branches, businessLabel]);

	const roleNameById = useMemo(() => {
		const m: Record<string, string> = {};
		businessRoles.forEach((r) => {
			m[r.id] = r.name;
		});
		return m;
	}, [businessRoles]);

	const branchNameById = useMemo(() => {
		const m: Record<string, string> = {};
		(branches as BranchRow[]).forEach((b) => {
			m[b.id] = b.name;
		});
		return m;
	}, [branches]);

	const employeesForBranch = useMemo((): EmployeeOutput[] => {
		const list = apiEmployees as EmployeeOutput[];
		if (!selectedBranchId || !selectedBusinessId) return [];
		if (employeesBusinessId !== selectedBusinessId) return [];
		return list.filter((emp) => emp.branch_id === selectedBranchId);
	}, [apiEmployees, employeesBusinessId, selectedBranchId, selectedBusinessId]);

	const filteredEmployees = useMemo(() => {
		return employeesForBranch.filter((emp) => {
			const roleName = (roleNameById[emp.role_id] || "").toLowerCase();
			const branchName = (branchNameById[emp.branch_id] || "").toLowerCase();
			const userName = employeeUserDisplayName(emp).toLowerCase();
			const q = searchTerm.toLowerCase();
			const matchesSearch =
				!q ||
				roleName.includes(q) ||
				branchName.includes(q) ||
				userName.includes(q);
			const matchesRole = roleFilter === "all" || emp.role_id === roleFilter;
			const matchesStatus =
				statusFilter === "all" ||
				(statusFilter === "active" && emp.is_active) ||
				(statusFilter === "inactive" && !emp.is_active);
			return matchesSearch && matchesRole && matchesStatus;
		});
	}, [
		employeesForBranch,
		searchTerm,
		roleFilter,
		statusFilter,
		roleNameById,
		branchNameById,
	]);

	const loading = employeesLoading || rolesLoading;

	const selectedBranchLabel = selectedBranch
		? `${businessLabel(selectedBranch.restaurant_id)} — ${selectedBranch.name}`
		: "";

	const canAddStaff =
		!!selectedBranchId &&
		!rolesLoading &&
		businessRoles.length > 0 &&
		branchesForSelectedBusiness.length > 0;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<UsersIcon aria-hidden="true" />
						<h1 className="text-pretty text-2xl leading-tight font-semibold">
							Staff Management
						</h1>
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						Select a branch to load roles and employees for that location.
					</p>
				</div>
				<Button
					type="button"
					disabled={!canAddStaff}
					onClick={() => {
						setFormError("");
						setCreateSuccess(null);
						dispatch(clearError());
						setFormData({
							phone_number: "",
							role_id: "",
							branch_id: selectedBranchId,
							email: "",
							username: "",
						});
						setShowAddModal(true);
					}}
				>
					<PlusIcon data-icon="inline-start" aria-hidden="true" />
					Add Staff
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Employees</CardTitle>
					<CardDescription>
						Pick a branch, then manage employees and roles for that location.
					</CardDescription>
					<CardAction>
						<div className="text-sm text-muted-foreground">
							{selectedBranchId
								? loading
									? "Loading…"
									: `${filteredEmployees.length} employees`
								: null}
						</div>
					</CardAction>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="branch">Branch</FieldLabel>
							{branchesLoading ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2Icon className="animate-spin" aria-hidden="true" />
									Loading branches…
								</div>
							) : (
								<Select
									value={selectedBranchId}
									onValueChange={(value) => {
										setSelectedBranchId(value ?? "");
										dispatch(clearError());
									}}
								>
									<SelectTrigger id="branch" className="w-full sm:max-w-lg">
										<SelectValue placeholder="Select a branch">
											{(() => {
												const selectedBranch = branchOptions.find(
													(b) => b.id === selectedBranchId,
												);
												return selectedBranch
													? `${businessLabel(selectedBranch.restaurant_id)} — ${selectedBranch.name}`
													: "";
											})()}
										</SelectValue>
									</SelectTrigger>
									<SelectContent align="start">
										<SelectGroup>
											{branchOptions.map((b) => (
												<SelectItem key={b.id} value={b.id}>
													{businessLabel(b.restaurant_id)} — {b.name}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							)}
						</Field>
					</FieldGroup>

					{!selectedBranchId && (
						<Alert className="border-none">
							<AlertTitle>Select a branch</AlertTitle>
							<AlertDescription>
								Choose a branch above to load roles and employees.
							</AlertDescription>
						</Alert>
					)}

					{selectedBranchId &&
						branchesForSelectedBusiness.length === 0 &&
						!branchesLoading && (
							<Alert>
								<AlertTitle>No branches for this business</AlertTitle>
								<AlertDescription>
									Add a branch first, then come back to create staff users.
								</AlertDescription>
							</Alert>
						)}

					{selectedBranchId && (
						<>
							<Separator />
							<div className="flex flex-col gap-1">
								<div className="text-sm leading-none font-medium">Employees</div>
								<div className="text-sm text-muted-foreground">
									Search and filter employees for the selected branch.
								</div>
							</div>

							<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
								<InputGroup>
									<InputGroupAddon align="inline-start">
										<SearchIcon aria-hidden="true" />
									</InputGroupAddon>
									<InputGroupInput
										name="q"
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										placeholder="Search by role, branch, user name…"
										autoComplete="off"
									/>
								</InputGroup>

								<Select
									value={roleFilter}
									onValueChange={(value) => setRoleFilter(value ?? "all")}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="All roles" />
									</SelectTrigger>
									<SelectContent align="start">
										<SelectGroup>
											<SelectItem value="all">All roles</SelectItem>
											{businessRoles.map((r) => (
												<SelectItem key={r.id} value={r.id}>
													{r.name}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>

								<Select
									value={statusFilter}
									onValueChange={(value) => setStatusFilter(value ?? "all")}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="All statuses" />
									</SelectTrigger>
									<SelectContent align="start">
										<SelectGroup>
											<SelectItem value="all">All statuses</SelectItem>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="inactive">Inactive</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>

							{staffError && (
								<Alert variant="destructive">
									<AlertTitle>Couldn’t load staff</AlertTitle>
									<AlertDescription>{staffError}</AlertDescription>
								</Alert>
							)}

							{createSuccess && (
								<Alert>
									<AlertTitle className="flex items-center gap-2">
										<CheckIcon aria-hidden="true" />
										Employee created
									</AlertTitle>
									<AlertDescription>
										<div className="flex flex-col gap-2">
											<div className="text-sm">
												Phone:{" "}
												<span className="font-medium">
													{createSuccess.phone_number}
												</span>
											</div>
											<div className="flex flex-wrap items-center gap-2">
												<span className="text-sm">Temporary password:</span>
												<Badge variant="secondary" render={<code />}>
													{createSuccess.temporary_password}
												</Badge>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => setCreateSuccess(null)}
												>
													Dismiss
												</Button>
											</div>
										</div>
									</AlertDescription>
								</Alert>
							)}

							{loading ? (
								<div className="flex flex-col gap-2">
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<Skeleton className="h-10 w-full" />
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Loader2Icon className="animate-spin" aria-hidden="true" />
										Loading employees…
									</div>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Role</TableHead>
											<TableHead>Branch</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="min-w-0">User</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredEmployees.length === 0 ? (
											<TableRow>
												<TableCell colSpan={4} className="py-10 text-center">
													<div className="text-sm text-muted-foreground">
														No employees found for this branch.
													</div>
												</TableCell>
											</TableRow>
										) : (
											filteredEmployees.map((emp) => (
												<TableRow key={emp.id}>
													<TableCell>
														{roleNameById[emp.role_id] ?? emp.role_id}
													</TableCell>
													<TableCell>
														{branchNameById[emp.branch_id] ?? emp.branch_id}
													</TableCell>
													<TableCell>
														<Badge
															variant={emp.is_active ? "secondary" : "outline"}
														>
															{emp.is_active ? "Active" : "Inactive"}
														</Badge>
													</TableCell>
													<TableCell className="min-w-0">
														<span className="truncate">
															{employeeUserDisplayName(emp)}
														</span>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							)}
						</>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={showAddModal}
				onOpenChange={(open) => {
					setShowAddModal(open);
					if (!open) setFormError("");
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add employee</DialogTitle>
						<DialogDescription>
							Create a staff user for the current business and assign them to a
							branch.
						</DialogDescription>
					</DialogHeader>

					{formError && (
						<Alert variant="destructive">
							<AlertTitle>Can’t create employee</AlertTitle>
							<AlertDescription>{formError}</AlertDescription>
						</Alert>
					)}

					<form
						onSubmit={async (e) => {
							e.preventDefault();
							setFormError("");
							dispatch(clearError());
							if (!formData.phone_number || !formData.role_id || !formData.branch_id) {
								setFormError("Phone, role, and branch are required.");
								return;
							}
							setSubmitting(true);
							try {
								const body = {
									phone_number: formData.phone_number.trim(),
									role_id: formData.role_id,
									branch_id: formData.branch_id,
									email: formData.email.trim() || null,
									username: formData.username.trim() || null,
								};
								const res = await dispatch(createEmployeeUser(body)).unwrap();
								setCreateSuccess({
									temporary_password: res.temporary_password,
									phone_number: res.phone_number,
								});
								setFormData({
									phone_number: "",
									role_id: "",
									branch_id: selectedBranchId,
									email: "",
									username: "",
								});
								setShowAddModal(false);
								loadBusinessData(selectedBusinessId);
							} catch (err: unknown) {
								const msg =
									typeof err === "string"
										? err
										: err instanceof Error
											? err.message
											: "Failed to create employee";
								setFormError(msg);
							} finally {
								setSubmitting(false);
							}
						}}
						className="flex flex-col gap-5"
					>
						<FieldGroup>
							<Field data-invalid={!!formError && !formData.phone_number}>
								<FieldLabel htmlFor="phone_number">Phone number</FieldLabel>
								<InputGroup>
									<InputGroupInput
										id="phone_number"
										name="phone_number"
										type="tel"
										inputMode="tel"
										autoComplete="tel"
										required
										placeholder="+251911234567…"
										value={formData.phone_number}
										onChange={(e) =>
											setFormData({ ...formData, phone_number: e.target.value })
										}
										aria-invalid={!!formError && !formData.phone_number}
									/>
								</InputGroup>
								<FieldDescription>
									Use the employee’s reachable phone number.
								</FieldDescription>
							</Field>

							<Field data-invalid={!!formError && !formData.role_id}>
								<FieldLabel htmlFor="role_id">Role</FieldLabel>
								<Select
									value={formData.role_id}
									onValueChange={(value) =>
										setFormData({ ...formData, role_id: value ?? "" })
									}
								>
									<SelectTrigger id="role_id" className="w-full" aria-invalid={!!formError && !formData.role_id}>
										<SelectValue placeholder="Select role" />
									</SelectTrigger>
									<SelectContent align="start">
										<SelectGroup>
											{businessRoles.map((r) => (
												<SelectItem key={r.id} value={r.id}>
													{r.name}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								<FieldError>
									{!!formError && !formData.role_id ? "Role is required." : null}
								</FieldError>
							</Field>

							<Field data-invalid={!!formError && !formData.branch_id}>
								<FieldLabel htmlFor="branch_id">Branch</FieldLabel>
								<Select
									value={formData.branch_id}
									onValueChange={(value) =>
										setFormData({ ...formData, branch_id: value ?? "" })
									}
								>
									<SelectTrigger id="branch_id" className="w-full" aria-invalid={!!formError && !formData.branch_id}>
										<SelectValue placeholder="Select branch" />
									</SelectTrigger>
									<SelectContent align="start">
										<SelectGroup>
											{branchesForSelectedBusiness.map((b) => (
												<SelectItem key={b.id} value={b.id}>
													{b.name}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								<FieldError>
									{!!formError && !formData.branch_id ? "Branch is required." : null}
								</FieldError>
							</Field>

							<Field>
								<FieldLabel htmlFor="email">Email (optional)</FieldLabel>
								<InputGroup>
									<InputGroupInput
										id="email"
										name="email"
										type="email"
										autoComplete="email"
										inputMode="email"
										spellCheck={false}
										placeholder="name@company.com…"
										value={formData.email}
										onChange={(e) =>
											setFormData({ ...formData, email: e.target.value })
										}
									/>
								</InputGroup>
							</Field>

							<Field>
								<FieldLabel htmlFor="username">Username (optional)</FieldLabel>
								<InputGroup>
									<InputGroupInput
										id="username"
										name="username"
										type="text"
										autoComplete="off"
										spellCheck={false}
										placeholder="employee.username…"
										value={formData.username}
										onChange={(e) =>
											setFormData({ ...formData, username: e.target.value })
										}
									/>
								</InputGroup>
								<FieldDescription>
									Temporary password will be shown after creation.
								</FieldDescription>
							</Field>
						</FieldGroup>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setShowAddModal(false)}
								disabled={submitting}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={submitting}>
								{submitting && (
									<Loader2Icon data-icon="inline-start" className="animate-spin" aria-hidden="true" />
								)}
								{submitting ? "Creating…" : "Create employee"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
