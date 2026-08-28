"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { RoleDetailSheet } from "@/components/admin/role-detail-sheet";
import {
	useCreatePermissionMutation,
	useCreateRoleMutation,
	useDeletePermissionMutation,
	useDeleteRoleMutation,
	useListPermissionsQuery,
	useListRolesQuery,
} from "../../../services/role/roleApi";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

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

export function RolesAdminPanel({ embedded = false }: { embedded?: boolean }) {
	const {
		data: roles,
		isLoading: rolesLoading,
		isFetching: rolesFetching,
		error: rolesError,
		refetch: refetchRoles,
	} = useListRolesQuery();
	const {
		data: permissions,
		isLoading: permissionsLoading,
		isFetching: permissionsFetching,
		error: permissionsError,
		refetch: refetchPermissions,
	} = useListPermissionsQuery();

	const [createRole, createRoleState] = useCreateRoleMutation();
	const [createPermission, createPermissionState] = useCreatePermissionMutation();
	const [deleteRole, deleteRoleState] = useDeleteRoleMutation();
	const [deletePermission, deletePermissionState] = useDeletePermissionMutation();

	const [roleSearch, setRoleSearch] = useState("");
	const [rolePendingDelete, setRolePendingDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [deleteRoleError, setDeleteRoleError] = useState("");
	const [permissionSearch, setPermissionSearch] = useState("");
	const [permissionPendingDelete, setPermissionPendingDelete] = useState<{
		id: string;
		action: string;
	} | null>(null);
	const [deletePermissionError, setDeletePermissionError] = useState("");
	const [addRoleOpen, setAddRoleOpen] = useState(false);
	const [addPermissionOpen, setAddPermissionOpen] = useState(false);
	const [roleName, setRoleName] = useState("");
	const [permissionAction, setPermissionAction] = useState("");
	const [roleFormError, setRoleFormError] = useState("");
	const [permissionFormError, setPermissionFormError] = useState("");
	const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

	const filteredRoles = useMemo(() => {
		const list = roles ?? [];
		const q = roleSearch.trim().toLowerCase();
		if (!q) return list;
		return list.filter((r) => r.name.toLowerCase().includes(q));
	}, [roles, roleSearch]);

	const filteredPermissions = useMemo(() => {
		const list = permissions ?? [];
		const q = permissionSearch.trim().toLowerCase();
		if (!q) return list;
		return list.filter((p) => p.action.toLowerCase().includes(q));
	}, [permissions, permissionSearch]);

	const handleCreateRole = async (e: React.FormEvent) => {
		e.preventDefault();
		setRoleFormError("");

		const name = roleName.trim();
		if (!name) {
			setRoleFormError("Role name is required.");
			return;
		}

		try {
			await createRole({ body: { name } }).unwrap();
			setRoleName("");
			setAddRoleOpen(false);
		} catch (err) {
			setRoleFormError(getErrorMessage(err, "Failed to create role."));
		}
	};

	const handleCreatePermission = async (e: React.FormEvent) => {
		e.preventDefault();
		setPermissionFormError("");

		const action = permissionAction.trim();
		if (!action) {
			setPermissionFormError("Permission action is required.");
			return;
		}

		try {
			await createPermission({ body: { action } }).unwrap();
			setPermissionAction("");
			setAddPermissionOpen(false);
		} catch (err) {
			setPermissionFormError(
				getErrorMessage(err, "Failed to create permission."),
			);
		}
	};

	const handleDeleteRoleConfirm = async () => {
		if (!rolePendingDelete) return;
		setDeleteRoleError("");
		try {
			await deleteRole({ roleId: rolePendingDelete.id }).unwrap();
			if (selectedRoleId === rolePendingDelete.id) {
				setSelectedRoleId(null);
			}
			setRolePendingDelete(null);
		} catch (err) {
			setDeleteRoleError(getErrorMessage(err, "Failed to delete role."));
		}
	};

	const handleDeletePermissionConfirm = async () => {
		if (!permissionPendingDelete) return;
		setDeletePermissionError("");
		try {
			await deletePermission({
				permissionId: permissionPendingDelete.id,
			}).unwrap();
			setPermissionPendingDelete(null);
		} catch (err) {
			setDeletePermissionError(
				getErrorMessage(err, "Failed to delete permission."),
			);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			{!embedded ? (
				<PageHeader
					title="Roles & permissions"
					description="Manage roles and the permissions that can be assigned to staff."
				/>
			) : null}

			<Card>
				<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle>Roles</CardTitle>
					<Button type="button" size="sm" onClick={() => setAddRoleOpen(true)}>
						<PlusIcon data-icon="inline-start" aria-hidden />
						Add role
					</Button>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{rolesError ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load roles</AlertTitle>
							<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<span className="wrap-break-word">
									{getErrorMessage(rolesError, "Request failed.")}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => refetchRoles()}
								>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : null}

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Input
							aria-label="Search roles by name"
							placeholder="Search roles…"
							value={roleSearch}
							onChange={(e) => setRoleSearch(e.target.value)}
							className="h-10 sm:max-w-xs"
						/>
						{rolesFetching && !rolesLoading ? (
							<span className="text-sm text-muted-foreground">Refreshing…</span>
						) : null}
					</div>

					{rolesLoading ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : (
						<Table aria-label="Roles">
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="w-[4.5rem] text-right">
										<span className="sr-only">Actions</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredRoles.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={2}
											className="py-10 text-center text-muted-foreground"
										>
											{roleSearch.trim()
												? "No roles match your search."
												: "No roles yet. Add one to get started."}
										</TableCell>
									</TableRow>
								) : (
									filteredRoles.map((role) => (
										<TableRow
											key={role.id}
											className="cursor-pointer"
											onClick={() => setSelectedRoleId(role.id)}
										>
											<TableCell className="font-medium">{role.name}</TableCell>
											<TableCell
												className="text-right"
												onClick={(e) => e.stopPropagation()}
											>
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													className="text-muted-foreground hover:text-destructive"
													aria-label={`Delete ${role.name}`}
													onClick={() => {
														setDeleteRoleError("");
														setRolePendingDelete({
															id: role.id,
															name: role.name,
														});
													}}
												>
													<Trash2Icon aria-hidden />
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle>Permissions</CardTitle>
					<Button
						type="button"
						size="sm"
						onClick={() => setAddPermissionOpen(true)}
					>
						<PlusIcon data-icon="inline-start" aria-hidden />
						Add permission
					</Button>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{permissionsError ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load permissions</AlertTitle>
							<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<span className="wrap-break-word">
									{getErrorMessage(permissionsError, "Request failed.")}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => refetchPermissions()}
								>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : null}

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Input
							aria-label="Search permissions by action"
							placeholder="Search permissions…"
							value={permissionSearch}
							onChange={(e) => setPermissionSearch(e.target.value)}
							className="h-10 sm:max-w-xs"
						/>
						{permissionsFetching && !permissionsLoading ? (
							<span className="text-sm text-muted-foreground">Refreshing…</span>
						) : null}
					</div>

					{permissionsLoading ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : (
						<Table aria-label="Permissions">
							<TableHeader>
								<TableRow>
									<TableHead>Action</TableHead>
									<TableHead className="w-[4.5rem] text-right">
										<span className="sr-only">Actions</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredPermissions.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={2}
											className="py-10 text-center text-muted-foreground"
										>
											{permissionSearch.trim()
												? "No permissions match your search."
												: "No permissions yet. Add one to get started."}
										</TableCell>
									</TableRow>
								) : (
									filteredPermissions.map((permission) => (
										<TableRow key={permission.id}>
											<TableCell className="font-medium">
												{permission.action}
											</TableCell>
											<TableCell className="text-right">
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													className="text-muted-foreground hover:text-destructive"
													aria-label={`Delete ${permission.action}`}
													onClick={() => {
														setDeletePermissionError("");
														setPermissionPendingDelete({
															id: permission.id,
															action: permission.action,
														});
													}}
												>
													<Trash2Icon aria-hidden />
												</Button>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={addRoleOpen}
				onOpenChange={(open) => {
					setAddRoleOpen(open);
					if (!open) {
						setRoleName("");
						setRoleFormError("");
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add role</DialogTitle>
						<DialogDescription>
							Create a new role. The name should describe the access level (for
							example, Branch Manager).
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleCreateRole} className="flex flex-col gap-4">
						{roleFormError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not create role</AlertTitle>
								<AlertDescription>{roleFormError}</AlertDescription>
							</Alert>
						) : null}

						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="role-name">Role name</FieldLabel>
								<Input
									id="role-name"
									value={roleName}
									onChange={(e) => setRoleName(e.target.value)}
									placeholder="e.g. Branch Manager"
									required
									autoFocus
								/>
							</Field>
						</FieldGroup>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setAddRoleOpen(false)}
								disabled={createRoleState.isLoading}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={createRoleState.isLoading}>
								{createRoleState.isLoading && (
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
								)}
								{createRoleState.isLoading ? "Creating…" : "Create role"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={addPermissionOpen}
				onOpenChange={(open) => {
					setAddPermissionOpen(open);
					if (!open) {
						setPermissionAction("");
						setPermissionFormError("");
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add permission</DialogTitle>
						<DialogDescription>
							Create a permission action that can be assigned to roles (for
							example, view_transactions).
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleCreatePermission} className="flex flex-col gap-4">
						{permissionFormError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not create permission</AlertTitle>
								<AlertDescription>{permissionFormError}</AlertDescription>
							</Alert>
						) : null}

						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="permission-action">Action</FieldLabel>
								<Input
									id="permission-action"
									value={permissionAction}
									onChange={(e) => setPermissionAction(e.target.value)}
									placeholder="e.g. view_transactions"
									required
									autoFocus
								/>
							</Field>
						</FieldGroup>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setAddPermissionOpen(false)}
								disabled={createPermissionState.isLoading}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={createPermissionState.isLoading}>
								{createPermissionState.isLoading && (
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
								)}
								{createPermissionState.isLoading
									? "Creating…"
									: "Create permission"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<RoleDetailSheet
				roleId={selectedRoleId}
				onOpenChange={(open) => {
					if (!open) setSelectedRoleId(null);
				}}
			/>

			<AlertDialog
				open={rolePendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) {
						setRolePendingDelete(null);
						setDeleteRoleError("");
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete role?</AlertDialogTitle>
						<AlertDialogDescription>
							You are about to permanently delete{" "}
							<strong>{rolePendingDelete?.name}</strong>. Staff with this role may
							lose access until they are assigned another role. This cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deleteRoleError ? (
						<Alert variant="destructive">
							<AlertDescription>{deleteRoleError}</AlertDescription>
						</Alert>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteRoleState.isLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={deleteRoleState.isLoading}
							onClick={(e) => {
								e.preventDefault();
								void handleDeleteRoleConfirm();
							}}
						>
							{deleteRoleState.isLoading ? (
								<>
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
									Deleting…
								</>
							) : (
								"Delete role"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={permissionPendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) {
						setPermissionPendingDelete(null);
						setDeletePermissionError("");
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete permission?</AlertDialogTitle>
						<AlertDialogDescription>
							You are about to permanently delete{" "}
							<strong>{permissionPendingDelete?.action}</strong>. It will be
							removed from all roles that use it. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deletePermissionError ? (
						<Alert variant="destructive">
							<AlertDescription>{deletePermissionError}</AlertDescription>
						</Alert>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deletePermissionState.isLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={deletePermissionState.isLoading}
							onClick={(e) => {
								e.preventDefault();
								void handleDeletePermissionConfirm();
							}}
						>
							{deletePermissionState.isLoading ? (
								<>
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
									Deleting…
								</>
							) : (
								"Delete permission"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

export default function RolesPage() {
	const router = useRouter();
	useEffect(() => {
		router.replace("/admin/settings?tab=roles");
	}, [router]);
	return null;
}
