"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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

type BranchRow = { id: string; name: string; restaurant_id: string };

export default function StaffPage() {
	const dispatch = useAppDispatch();
	const { data: branchesData, isLoading: branchesLoading } =
		useListAllUserBranchesQuery();
	const branches = useMemo(
		() => (branchesData?.branches ?? []).map(branchFromOutput),
		[branchesData?.branches],
	);
	const myBusinesses = branchesData?.myBusinesses ?? [];
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

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
					<p className="mt-1 text-sm text-gray-500">
						Select a branch to load roles and employees for that location.
					</p>
				</div>
				<button
					type="button"
					disabled={
						!selectedBranchId ||
						rolesLoading ||
						businessRoles.length === 0 ||
						branchesForSelectedBusiness.length === 0
					}
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
					className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
				>
					<svg
						className="size-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
					Add Staff
				</button>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<label className="block text-sm font-medium text-gray-700">
					Branch
				</label>
				{branchesLoading ? (
					<p className="mt-2 text-sm text-gray-500">Loading branches…</p>
				) : (
					<select
						value={selectedBranchId}
						onChange={(e) => {
							setSelectedBranchId(e.target.value);
							dispatch(clearError());
						}}
						className="mt-1 w-full max-w-lg rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						<option value="">Select a branch</option>
						{branchOptions.map((b) => (
							<option key={b.id} value={b.id}>
								{businessLabel(b.restaurant_id)} — {b.name}
							</option>
						))}
					</select>
				)}
				{selectedBranchId && (
					<p className="mt-2 text-xs text-gray-500">{selectedBranchLabel}</p>
				)}
			</div>

			{!selectedBranchId && (
				<div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
					Choose a branch to load roles and employees.
				</div>
			)}

			{selectedBranchId &&
				branchesForSelectedBusiness.length === 0 &&
				!branchesLoading && (
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
						No branches found for this business. Add a branch first.
					</div>
				)}

			{selectedBranchId && (
				<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<svg
									className="size-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
							</div>
							<input
								type="text"
								placeholder="Search by role, branch, user name…"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="block w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 pl-10 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
							/>
						</div>
						<select
							value={roleFilter}
							onChange={(e) => setRoleFilter(e.target.value)}
							className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						>
							<option value="all">All roles</option>
							{businessRoles.map((r) => (
								<option key={r.id} value={r.id}>
									{r.name}
								</option>
							))}
						</select>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						>
							<option value="all">All status</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
						</select>
					</div>
				</div>
			)}

			{staffError && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-4">
					<p className="text-sm text-red-800">{staffError}</p>
				</div>
			)}

			{createSuccess && (
				<div className="rounded-lg border border-green-200 bg-green-50 p-4">
					<p className="text-sm font-medium text-green-900">Employee created</p>
					<p className="mt-1 text-sm text-green-800">
						Phone: {createSuccess.phone_number} — Temporary password:{" "}
						<code className="rounded bg-green-100 px-1">
							{createSuccess.temporary_password}
						</code>
					</p>
					<button
						type="button"
						className="mt-2 text-sm text-green-800 underline"
						onClick={() => setCreateSuccess(null)}
					>
						Dismiss
					</button>
				</div>
			)}

			{selectedBranchId && (
				<div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<div className="overflow-x-auto">
						{loading ? (
							<div className="p-8 text-center">
								<div className="inline-block size-8 animate-spin rounded-full border-b-2 border-blue-600" />
								<p className="mt-4 text-sm text-gray-500">Loading employees…</p>
							</div>
						) : (
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
											Role
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
											Branch name
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
											Status
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
											User name
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white">
									{filteredEmployees.length === 0 ? (
										<tr>
											<td
												colSpan={4}
												className="px-6 py-8 text-center text-gray-500"
											>
												No employees found for this branch.
											</td>
										</tr>
									) : (
										filteredEmployees.map((emp) => (
											<tr key={emp.id} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{roleNameById[emp.role_id] ?? emp.role_id}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{branchNameById[emp.branch_id] ?? emp.branch_id}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span
														className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
															emp.is_active
																? "bg-green-100 text-green-800"
																: "bg-gray-100 text-gray-800"
														}`}
													>
														{emp.is_active ? "Active" : "Inactive"}
													</span>
												</td>
												<td className="px-6 py-4 text-sm text-gray-900">
													{employeeUserDisplayName(emp)}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						)}
					</div>
				</div>
			)}

			{showAddModal && selectedBranchId && selectedBusinessId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600/50 p-4">
					<div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-xl font-semibold text-gray-900">
								Add employee
							</h3>
							<button
								type="button"
								onClick={() => {
									setShowAddModal(false);
									setFormError("");
								}}
								className="text-gray-400 hover:text-gray-500"
							>
								<svg
									className="size-6"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
						{formError && (
							<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
								<p className="text-sm text-red-800">{formError}</p>
							</div>
						)}
						<form
							onSubmit={async (e) => {
								e.preventDefault();
								setFormError("");
								dispatch(clearError());
								if (
									!formData.phone_number ||
									!formData.role_id ||
									!formData.branch_id
								) {
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
							className="flex flex-col gap-4"
						>
							<div>
								<label className="mb-1 block text-sm font-medium text-gray-700">
									Phone number *
								</label>
								<input
									type="tel"
									required
									value={formData.phone_number}
									onChange={(e) =>
										setFormData({ ...formData, phone_number: e.target.value })
									}
									className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
									placeholder="+251911234567"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-gray-700">
									Role *
								</label>
								<select
									required
									value={formData.role_id}
									onChange={(e) =>
										setFormData({ ...formData, role_id: e.target.value })
									}
									className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
								>
									<option value="">Select role</option>
									{businessRoles.map((r) => (
										<option key={r.id} value={r.id}>
											{r.name}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-gray-700">
									Branch *
								</label>
								<select
									required
									value={formData.branch_id}
									onChange={(e) =>
										setFormData({ ...formData, branch_id: e.target.value })
									}
									className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
								>
									<option value="">Select branch</option>
									{branchesForSelectedBusiness.map((b) => (
										<option key={b.id} value={b.id}>
											{b.name}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-gray-700">
									Email (optional)
								</label>
								<input
									type="email"
									value={formData.email}
									onChange={(e) =>
										setFormData({ ...formData, email: e.target.value })
									}
									className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-gray-700">
									Username (optional)
								</label>
								<input
									type="text"
									value={formData.username}
									onChange={(e) =>
										setFormData({ ...formData, username: e.target.value })
									}
									className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
								/>
							</div>
							<p className="text-xs text-gray-500">
								The API sets a temporary password; share it securely with the
								new employee.
							</p>
							<div className="flex gap-3 pt-2">
								<button
									type="button"
									onClick={() => setShowAddModal(false)}
									className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
								>
									{submitting ? "Creating…" : "Create employee"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
