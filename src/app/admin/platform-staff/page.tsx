"use client";

import { useMemo, useState } from "react";
import { KeyRoundIcon, PlusIcon, ShieldIcon, Trash2Icon, UsersIcon } from "lucide-react";

import { PlatformRoleDetailSheet } from "@/components/admin/platform-role-detail-sheet";
import type { PlatformRoleOutput, PlatformStaffOutput, UserOutput } from "@/services/types";
import { formatPlatformLabel, formatUserDisplayName } from "@/lib/userDisplay";
import { cn } from "@/lib/utils";
import { useGetUserByIdQuery, useListAllUsersQuery } from "@/services/auth/authApi";
import {
	useAdminRegisterUserMutation,
	useAdminUpdateSuperuserMutation,
} from "@/services/admin/adminApi";
import {
	useCreatePlatformPermissionMutation,
	useCreatePlatformRoleMutation,
	useCreatePlatformStaffMutation,
	useDeletePlatformPermissionMutation,
	useDeletePlatformRoleMutation,
	useDeletePlatformStaffMutation,
	useListPlatformPermissionsQuery,
	useListPlatformRolesQuery,
	useListPlatformStaffQuery,
	useUpdatePlatformStaffMutation,
} from "@/services/platform/platformApi";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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

function initialsFromName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type AccessTab = "people" | "roles" | "permissions";

function StaffPersonRow({
	member,
	roleName,
	busy,
	onToggleActive,
	onRemove,
}: {
	member: PlatformStaffOutput;
	roleName: string | undefined;
	busy: boolean;
	onToggleActive: (staffId: string, userId: string, isActive: boolean) => void;
	onRemove: (staffId: string, userId: string, label: string) => void;
}) {
	const { data: user, isLoading } = useGetUserByIdQuery({
		userId: member.user_id,
	});
	const label = user
		? formatUserDisplayName(user)
		: isLoading
			? "Loading…"
			: "Unknown user";
	const secondary =
		user?.email?.trim() || user?.phone_number?.trim() || null;
	const roleLabel = roleName ? formatPlatformLabel(roleName) : "No role";

	return (
		<li className="flex flex-col gap-3 border-b border-border px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex min-w-0 items-center gap-3">
				<div
					className={cn(
						"flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
						member.is_active
							? "bg-primary text-primary-foreground"
							: "bg-muted text-muted-foreground",
					)}
					aria-hidden
				>
					{initialsFromName(label === "Loading…" ? "?" : label)}
				</div>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<p className="truncate font-medium text-foreground">{label}</p>
						<Badge variant={member.is_active ? "default" : "secondary"}>
							{member.is_active ? "Active" : "Inactive"}
						</Badge>
					</div>
					{secondary ? (
						<p className="truncate text-sm text-muted-foreground">{secondary}</p>
					) : null}
					<p className="truncate text-sm text-muted-foreground">{roleLabel}</p>
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-2 pl-13 sm:pl-0">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={busy}
					onClick={() =>
						onToggleActive(member.id, member.user_id, member.is_active)
					}
				>
					{member.is_active ? "Deactivate" : "Activate"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="text-muted-foreground hover:text-destructive"
					aria-label={`Remove ${label}`}
					onClick={() => onRemove(member.id, member.user_id, label)}
				>
					<Trash2Icon aria-hidden />
				</Button>
			</div>
		</li>
	);
}

export default function PlatformStaffPage() {
	const {
		data: roles,
		isLoading: rolesLoading,
		isFetching: rolesFetching,
		error: rolesError,
		refetch: refetchRoles,
	} = useListPlatformRolesQuery({ includeInactive: true });
	const {
		data: permissions,
		isLoading: permissionsLoading,
		isFetching: permissionsFetching,
		error: permissionsError,
		refetch: refetchPermissions,
	} = useListPlatformPermissionsQuery();
	const {
		data: staff,
		isLoading: staffLoading,
		isFetching: staffFetching,
		error: staffError,
		refetch: refetchStaff,
	} = useListPlatformStaffQuery();
	const { data: users } = useListAllUsersQuery();

	const [createRole, createRoleState] = useCreatePlatformRoleMutation();
	const [createPermission, createPermissionState] =
		useCreatePlatformPermissionMutation();
	const [deleteRole, deleteRoleState] = useDeletePlatformRoleMutation();
	const [deletePermission, deletePermissionState] =
		useDeletePlatformPermissionMutation();
	const [createStaff, createStaffState] = useCreatePlatformStaffMutation();
	const [registerUser, registerUserState] = useAdminRegisterUserMutation();
	const [updateSuperuser, updateSuperuserState] =
		useAdminUpdateSuperuserMutation();
	const [updateStaff, updateStaffState] = useUpdatePlatformStaffMutation();
	const [deleteStaff, deleteStaffState] = useDeletePlatformStaffMutation();

	const [roleSearch, setRoleSearch] = useState("");
	const [permissionSearch, setPermissionSearch] = useState("");
	const [staffSearch, setStaffSearch] = useState("");
	const [tab, setTab] = useState<AccessTab>("people");
	const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

	const [addRoleOpen, setAddRoleOpen] = useState(false);
	const [addPermissionOpen, setAddPermissionOpen] = useState(false);
	const [addStaffOpen, setAddStaffOpen] = useState(false);
	const [roleName, setRoleName] = useState("");
	const [roleDescription, setRoleDescription] = useState("");
	const [permissionAction, setPermissionAction] = useState("");
	const [permissionDescription, setPermissionDescription] = useState("");
	const [staffRoleId, setStaffRoleId] = useState("");
	const [staffPhone, setStaffPhone] = useState("");
	const [staffPassword, setStaffPassword] = useState("");
	const [staffEmail, setStaffEmail] = useState("");
	const [staffUsername, setStaffUsername] = useState("");
	const [staffFirstName, setStaffFirstName] = useState("");
	const [staffLastName, setStaffLastName] = useState("");
	const [roleFormError, setRoleFormError] = useState("");
	const [permissionFormError, setPermissionFormError] = useState("");
	const [staffFormError, setStaffFormError] = useState("");

	const [rolePendingDelete, setRolePendingDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [permissionPendingDelete, setPermissionPendingDelete] = useState<{
		id: string;
		action: string;
	} | null>(null);
	const [staffPendingDelete, setStaffPendingDelete] = useState<{
		id: string;
		userId: string;
		label: string;
	} | null>(null);
	const [deleteRoleError, setDeleteRoleError] = useState("");
	const [deletePermissionError, setDeletePermissionError] = useState("");
	const [deleteStaffError, setDeleteStaffError] = useState("");

	const rolesById = useMemo(() => {
		const map = new Map<string, PlatformRoleOutput>();
		for (const r of roles ?? []) map.set(r.id, r);
		return map;
	}, [roles]);

	const usersById = useMemo(() => {
		const map = new Map<string, UserOutput>();
		for (const user of users ?? []) map.set(user.id, user);
		return map;
	}, [users]);

	const activeRoles = useMemo(
		() => (roles ?? []).filter((r) => r.is_active),
		[roles],
	);

	const activeStaffCount = useMemo(
		() => (staff ?? []).filter((s) => s.is_active).length,
		[staff],
	);
	const roleCount = roles?.length ?? 0;
	const permissionCount = permissions?.length ?? 0;
	const staffCount = staff?.length ?? 0;

	const filteredRoles = useMemo(() => {
		const list = roles ?? [];
		const q = roleSearch.trim().toLowerCase();
		if (!q) return list;
		return list.filter(
			(r) =>
				r.name.toLowerCase().includes(q) ||
				(r.description ?? "").toLowerCase().includes(q),
		);
	}, [roles, roleSearch]);

	const filteredPermissions = useMemo(() => {
		const list = permissions ?? [];
		const q = permissionSearch.trim().toLowerCase();
		if (!q) return list;
		return list.filter(
			(p) =>
				p.action.toLowerCase().includes(q) ||
				(p.description ?? "").toLowerCase().includes(q),
		);
	}, [permissions, permissionSearch]);

	const filteredStaff = useMemo(() => {
		const list = staff ?? [];
		const q = staffSearch.trim().toLowerCase();
		if (!q) return list;
		return list.filter((s) => {
			const role = rolesById.get(s.platform_role_id);
			const user = usersById.get(s.user_id);
			const hay = [
				role?.name ?? "",
				role ? formatPlatformLabel(role.name) : "",
				s.user_id,
				user ? formatUserDisplayName(user) : "",
				user?.email ?? "",
				user?.phone_number ?? "",
				user?.username ?? "",
				user?.user_information?.first_name ?? "",
				user?.user_information?.last_name ?? "",
			]
				.join(" ")
				.toLowerCase();
			return hay.includes(q);
		});
	}, [staff, staffSearch, rolesById, usersById]);

	const selectedStaffRole = activeRoles.find((r) => r.id === staffRoleId);
	const isAddingStaff =
		registerUserState.isLoading ||
		createStaffState.isLoading ||
		updateSuperuserState.isLoading;

	function resetStaffForm() {
		setStaffRoleId("");
		setStaffPhone("");
		setStaffPassword("");
		setStaffEmail("");
		setStaffUsername("");
		setStaffFirstName("");
		setStaffLastName("");
		setStaffFormError("");
	}

	async function handleCreateRole(e: React.FormEvent) {
		e.preventDefault();
		setRoleFormError("");
		const name = roleName.trim();
		if (!name) {
			setRoleFormError("Role name is required.");
			return;
		}
		try {
			const description = roleDescription.trim();
			await createRole({
				body: {
					name,
					description: description ? description : null,
				},
			}).unwrap();
			setRoleName("");
			setRoleDescription("");
			setAddRoleOpen(false);
		} catch (err) {
			setRoleFormError(getErrorMessage(err, "Failed to create role."));
		}
	}

	async function handleCreatePermission(e: React.FormEvent) {
		e.preventDefault();
		setPermissionFormError("");
		const action = permissionAction.trim();
		if (!action) {
			setPermissionFormError("Permission action is required.");
			return;
		}
		try {
			const description = permissionDescription.trim();
			await createPermission({
				body: {
					action,
					description: description ? description : null,
				},
			}).unwrap();
			setPermissionAction("");
			setPermissionDescription("");
			setAddPermissionOpen(false);
		} catch (err) {
			setPermissionFormError(
				getErrorMessage(err, "Failed to create permission."),
			);
		}
	}

	async function handleCreateStaff(e: React.FormEvent) {
		e.preventDefault();
		setStaffFormError("");
		const phoneNumber = staffPhone.trim();
		if (!phoneNumber || !staffPassword || !staffRoleId) {
			setStaffFormError("Phone, password, and platform role are required.");
			return;
		}
		try {
			const user = await registerUser({
				body: {
					phone_number: phoneNumber,
					password: staffPassword,
					email: staffEmail.trim() || null,
					username: staffUsername.trim() || null,
					user_information:
						staffFirstName.trim() || staffLastName.trim()
							? {
									first_name: staffFirstName.trim() || "—",
									last_name: staffLastName.trim() || "—",
								}
							: null,
				},
			}).unwrap();
			await createStaff({
				body: {
					user_id: user.id,
					platform_role_id: staffRoleId,
				},
			}).unwrap();
			await updateSuperuser({
				userId: user.id,
				body: { is_superuser: true },
			}).unwrap();
			resetStaffForm();
			setAddStaffOpen(false);
		} catch (err) {
			setStaffFormError(getErrorMessage(err, "Failed to add platform staff."));
		}
	}

	async function handleDeleteRoleConfirm() {
		if (!rolePendingDelete) return;
		setDeleteRoleError("");
		try {
			await deleteRole({ roleId: rolePendingDelete.id }).unwrap();
			if (selectedRoleId === rolePendingDelete.id) setSelectedRoleId(null);
			setRolePendingDelete(null);
		} catch (err) {
			setDeleteRoleError(getErrorMessage(err, "Failed to delete role."));
		}
	}

	async function handleDeletePermissionConfirm() {
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
	}

	async function handleDeleteStaffConfirm() {
		if (!staffPendingDelete) return;
		setDeleteStaffError("");
		try {
			await deleteStaff({ staffId: staffPendingDelete.id }).unwrap();
			await updateSuperuser({
				userId: staffPendingDelete.userId,
				body: { is_superuser: false },
			}).unwrap();
			setStaffPendingDelete(null);
		} catch (err) {
			setDeleteStaffError(getErrorMessage(err, "Failed to remove staff."));
		}
	}

	async function handleToggleStaffActive(
		staffId: string,
		userId: string,
		isActive: boolean,
	) {
		const nextActive = !isActive;
		await updateStaff({
			staffId,
			body: { is_active: nextActive },
		}).unwrap();
		await updateSuperuser({
			userId,
			body: { is_superuser: nextActive },
		}).unwrap();
	}

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-8">
			<header className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<p className="admin-eyebrow">Platform access</p>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div className="min-w-0">
							<h1 className="admin-page-title">Staff management</h1>
							<p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
								Who can operate Tina Verify — assign people, then shape what
								their role is allowed to do.
							</p>
						</div>
						<div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs tabular-nums text-muted-foreground">
							<span>
								<span className="text-foreground font-semibold">{staffCount}</span>{" "}
								people
							</span>
							<span>
								<span className="text-foreground font-semibold">{roleCount}</span>{" "}
								roles
							</span>
							<span>
								<span className="text-foreground font-semibold">
									{permissionCount}
								</span>{" "}
								permissions
							</span>
						</div>
					</div>
				</div>
			</header>

			<Tabs
				value={tab}
				onValueChange={(v) => {
					if (v === "people" || v === "roles" || v === "permissions") setTab(v);
				}}
				className="gap-5"
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<TabsList
						variant="line"
						className="h-auto w-full justify-start gap-5 rounded-none border-b border-border bg-transparent p-0 sm:w-auto"
					>
						<TabsTrigger value="people" className="admin-tabs-line">
							<UsersIcon className="size-4" aria-hidden />
							People
							<span className="font-mono text-[11px] text-muted-foreground tabular-nums">
								{staffCount}
							</span>
						</TabsTrigger>
						<TabsTrigger value="roles" className="admin-tabs-line">
							<ShieldIcon className="size-4" aria-hidden />
							Roles
							<span className="font-mono text-[11px] text-muted-foreground tabular-nums">
								{roleCount}
							</span>
						</TabsTrigger>
						<TabsTrigger value="permissions" className="admin-tabs-line">
							<KeyRoundIcon className="size-4" aria-hidden />
							Permissions
							<span className="font-mono text-[11px] text-muted-foreground tabular-nums">
								{permissionCount}
							</span>
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="people" className="flex flex-col gap-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="text-sm font-medium text-foreground">Team</p>
							<p className="text-sm text-muted-foreground">
								{activeStaffCount} active
								{staffCount - activeStaffCount > 0
									? ` · ${staffCount - activeStaffCount} inactive`
									: ""}
							</p>
						</div>
						<Button type="button" onClick={() => setAddStaffOpen(true)}>
							<PlusIcon data-icon="inline-start" aria-hidden />
							Add person
						</Button>
					</div>

					{staffError ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load staff</AlertTitle>
							<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<span className="wrap-break-word">
									{getErrorMessage(staffError, "Request failed.")}
								</span>
								<Button type="button" variant="outline" size="sm" onClick={() => refetchStaff()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : null}

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Input
							aria-label="Search people"
							placeholder="Search by name, email, or role…"
							value={staffSearch}
							onChange={(e) => setStaffSearch(e.target.value)}
							className="h-10 sm:max-w-sm"
						/>
						{staffFetching && !staffLoading ? (
							<span className="text-sm text-muted-foreground">Refreshing…</span>
						) : null}
					</div>

					{staffLoading ? (
						<div className="overflow-hidden rounded-xl border border-border">
							{Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
									<Skeleton className="size-10 rounded-full" />
									<div className="flex flex-1 flex-col gap-2">
										<Skeleton className="h-4 w-40" />
										<Skeleton className="h-3 w-56" />
									</div>
								</div>
							))}
						</div>
					) : filteredStaff.length === 0 ? (
						<div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border px-6 py-12">
							<p className="text-sm font-medium text-foreground">
								{staffSearch.trim() ? "No people match" : "No platform staff yet"}
							</p>
							<p className="max-w-md text-sm text-muted-foreground">
								{staffSearch.trim()
									? "Try another search, or clear the filter."
									: "Add someone and give them a platform role to start."}
							</p>
							{!staffSearch.trim() ? (
								<Button type="button" size="sm" onClick={() => setAddStaffOpen(true)}>
									<PlusIcon data-icon="inline-start" aria-hidden />
									Add person
								</Button>
							) : null}
						</div>
					) : (
						<ul className="overflow-hidden rounded-xl border border-border bg-card" aria-label="Platform staff">
							{filteredStaff.map((member) => (
								<StaffPersonRow
									key={member.id}
									member={member}
									roleName={rolesById.get(member.platform_role_id)?.name}
									busy={
										updateStaffState.isLoading || updateSuperuserState.isLoading
									}
									onToggleActive={(staffId, userId, isActive) => {
										void handleToggleStaffActive(staffId, userId, isActive);
									}}
									onRemove={(staffId, userId, label) => {
										setDeleteStaffError("");
										setStaffPendingDelete({ id: staffId, userId, label });
									}}
								/>
							))}
						</ul>
					)}
				</TabsContent>

				<TabsContent value="roles" className="flex flex-col gap-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="text-sm font-medium text-foreground">Roles</p>
							<p className="text-sm text-muted-foreground">
								Bundles of permissions you assign to people. Open a role to manage access.
							</p>
						</div>
						<Button type="button" onClick={() => setAddRoleOpen(true)}>
							<PlusIcon data-icon="inline-start" aria-hidden />
							Add role
						</Button>
					</div>

					{rolesError ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load roles</AlertTitle>
							<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<span className="wrap-break-word">
									{getErrorMessage(rolesError, "Request failed.")}
								</span>
								<Button type="button" variant="outline" size="sm" onClick={() => refetchRoles()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : null}

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Input
							aria-label="Search roles"
							placeholder="Search roles…"
							value={roleSearch}
							onChange={(e) => setRoleSearch(e.target.value)}
							className="h-10 sm:max-w-sm"
						/>
						{rolesFetching && !rolesLoading ? (
							<span className="text-sm text-muted-foreground">Refreshing…</span>
						) : null}
					</div>

					{rolesLoading ? (
						<div className="grid gap-3 sm:grid-cols-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-28 w-full rounded-xl" />
							))}
						</div>
					) : filteredRoles.length === 0 ? (
						<div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border px-6 py-12">
							<p className="text-sm font-medium text-foreground">
								{roleSearch.trim() ? "No roles match" : "No roles yet"}
							</p>
							<p className="max-w-md text-sm text-muted-foreground">
								{roleSearch.trim()
									? "Try another search."
									: "Create a role, then attach permissions and assign people."}
							</p>
							{!roleSearch.trim() ? (
								<Button type="button" size="sm" onClick={() => setAddRoleOpen(true)}>
									<PlusIcon data-icon="inline-start" aria-hidden />
									Add role
								</Button>
							) : null}
						</div>
					) : (
						<ul className="grid gap-3 sm:grid-cols-2">
							{filteredRoles.map((role) => (
								<li key={role.id}>
									<div
										role="button"
										tabIndex={0}
										className="group relative flex h-full cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
										onClick={() => setSelectedRoleId(role.id)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												setSelectedRoleId(role.id);
											}
										}}
										aria-label={`View permissions for ${role.name}`}
									>
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0">
												<p className="font-medium text-foreground">
													{formatPlatformLabel(role.name)}
												</p>
												<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
													{role.description || "No description"}
												</p>
											</div>
											<Badge variant={role.is_active ? "default" : "secondary"}>
												{role.is_active ? "Active" : "Inactive"}
											</Badge>
										</div>
										<div className="mt-auto flex items-center justify-end gap-2 pt-1">
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												className="relative z-10 text-muted-foreground hover:text-destructive"
												aria-label={`Delete ${role.name}`}
												onClick={(e) => {
													e.stopPropagation();
													setDeleteRoleError("");
													setRolePendingDelete({ id: role.id, name: role.name });
												}}
											>
												<Trash2Icon aria-hidden />
											</Button>
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
				</TabsContent>

				<TabsContent value="permissions" className="flex flex-col gap-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<p className="text-sm font-medium text-foreground">Permissions</p>
							<p className="text-sm text-muted-foreground">
								Stable action keys you attach to roles (for example{" "}
								<span className="font-mono text-foreground/80">platform:users:view</span>).
							</p>
						</div>
						<Button type="button" onClick={() => setAddPermissionOpen(true)}>
							<PlusIcon data-icon="inline-start" aria-hidden />
							Add permission
						</Button>
					</div>

					{permissionsError ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load permissions</AlertTitle>
							<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<span className="wrap-break-word">
									{getErrorMessage(permissionsError, "Request failed.")}
								</span>
								<Button type="button" variant="outline" size="sm" onClick={() => refetchPermissions()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : null}

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Input
							aria-label="Search permissions"
							placeholder="Search actions…"
							value={permissionSearch}
							onChange={(e) => setPermissionSearch(e.target.value)}
							className="h-10 sm:max-w-sm"
						/>
						{permissionsFetching && !permissionsLoading ? (
							<span className="text-sm text-muted-foreground">Refreshing…</span>
						) : null}
					</div>

					{permissionsLoading ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-12 w-full rounded-lg" />
							))}
						</div>
					) : filteredPermissions.length === 0 ? (
						<div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border px-6 py-12">
							<p className="text-sm font-medium text-foreground">
								{permissionSearch.trim() ? "No permissions match" : "No permissions yet"}
							</p>
							<p className="max-w-md text-sm text-muted-foreground">
								{permissionSearch.trim()
									? "Try another search."
									: "Define an action key, then assign it from a role."}
							</p>
							{!permissionSearch.trim() ? (
								<Button type="button" size="sm" onClick={() => setAddPermissionOpen(true)}>
									<PlusIcon data-icon="inline-start" aria-hidden />
									Add permission
								</Button>
							) : null}
						</div>
					) : (
						<ul className="overflow-hidden rounded-xl border border-border bg-card" aria-label="Platform permissions">
							{filteredPermissions.map((permission) => (
								<li
									key={permission.id}
									className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
								>
									<div className="min-w-0">
										<p className="truncate font-mono text-sm font-medium text-foreground">
											{permission.action}
										</p>
										{permission.description ? (
											<p className="truncate text-sm text-muted-foreground">
												{permission.description}
											</p>
										) : null}
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										className="shrink-0 text-muted-foreground hover:text-destructive"
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
								</li>
							))}
						</ul>
					)}
				</TabsContent>
			</Tabs>


			<Dialog
				open={addRoleOpen}
				onOpenChange={(open) => {
					setAddRoleOpen(open);
					if (!open) {
						setRoleName("");
						setRoleDescription("");
						setRoleFormError("");
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add platform role</DialogTitle>
						<DialogDescription>
							Create a role for platform staff (for example, Support or Billing).
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={(e) => void handleCreateRole(e)} className="flex flex-col gap-4">
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
									placeholder="e.g. Support"
									required
									autoFocus
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="role-description">Description</FieldLabel>
								<Textarea
									id="role-description"
									value={roleDescription}
									onChange={(e) => setRoleDescription(e.target.value)}
									placeholder="Optional"
									rows={2}
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
						setPermissionDescription("");
						setPermissionFormError("");
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add platform permission</DialogTitle>
						<DialogDescription>
							Use a stable action key such as{" "}
							<span className="font-mono">platform:users:view</span>.
						</DialogDescription>
					</DialogHeader>
					<form
						onSubmit={(e) => void handleCreatePermission(e)}
						className="flex flex-col gap-4"
					>
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
									placeholder="e.g. platform:billing:manage"
									required
									autoFocus
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="permission-description">
									Description
								</FieldLabel>
								<Textarea
									id="permission-description"
									value={permissionDescription}
									onChange={(e) => setPermissionDescription(e.target.value)}
									placeholder="Optional"
									rows={2}
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
								{createPermissionState.isLoading
									? "Creating…"
									: "Create permission"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={addStaffOpen}
				onOpenChange={(open) => {
					setAddStaffOpen(open);
					if (!open) resetStaffForm();
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add person</DialogTitle>
						<DialogDescription>
							Create a new user and assign a platform role.
						</DialogDescription>
					</DialogHeader>
					<form
						onSubmit={(e) => void handleCreateStaff(e)}
						className="flex flex-col gap-4"
					>
						{staffFormError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not add staff</AlertTitle>
								<AlertDescription>{staffFormError}</AlertDescription>
							</Alert>
						) : null}
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="staff-phone">Phone</FieldLabel>
								<Input
									id="staff-phone"
									type="tel"
									autoComplete="tel"
									value={staffPhone}
									onChange={(e) => setStaffPhone(e.target.value)}
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="staff-password">Password</FieldLabel>
								<Input
									id="staff-password"
									type="password"
									autoComplete="new-password"
									value={staffPassword}
									onChange={(e) => setStaffPassword(e.target.value)}
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="staff-email">Email</FieldLabel>
								<Input
									id="staff-email"
									type="email"
									autoComplete="email"
									value={staffEmail}
									onChange={(e) => setStaffEmail(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="staff-username">Username</FieldLabel>
								<Input
									id="staff-username"
									value={staffUsername}
									onChange={(e) => setStaffUsername(e.target.value)}
								/>
							</Field>
							<div className="grid grid-cols-2 gap-3">
								<Field>
									<FieldLabel htmlFor="staff-first-name">First name</FieldLabel>
									<Input
										id="staff-first-name"
										value={staffFirstName}
										onChange={(e) => setStaffFirstName(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="staff-last-name">Last name</FieldLabel>
									<Input
										id="staff-last-name"
										value={staffLastName}
										onChange={(e) => setStaffLastName(e.target.value)}
									/>
								</Field>
							</div>
							<Field>
								<FieldLabel htmlFor="staff-role">Platform role</FieldLabel>
								<Select
									value={staffRoleId}
									onValueChange={(v) => {
										if (v != null) setStaffRoleId(v);
									}}
								>
									<SelectTrigger id="staff-role" className="h-10 w-full">
										<span className="flex flex-1 truncate text-left">
											{selectedStaffRole
												? formatPlatformLabel(selectedStaffRole.name)
												: activeRoles.length === 0
													? "No active roles"
													: "Select a role…"}
										</span>
									</SelectTrigger>
									<SelectContent>
										{activeRoles.map((r) => (
											<SelectItem key={r.id} value={r.id}>
												{formatPlatformLabel(r.name)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						</FieldGroup>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setAddStaffOpen(false)}
								disabled={isAddingStaff}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isAddingStaff}>
								{isAddingStaff ? "Adding…" : "Add person"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<PlatformRoleDetailSheet
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
							Permanently delete{" "}
							<strong>
								{rolePendingDelete
									? formatPlatformLabel(rolePendingDelete.name)
									: ""}
							</strong>
							?
							Staff with this role may lose access.
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
							{deleteRoleState.isLoading ? "Deleting…" : "Delete role"}
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
							Permanently delete{" "}
							<strong>{permissionPendingDelete?.action}</strong>?
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
							{deletePermissionState.isLoading
								? "Deleting…"
								: "Delete permission"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={staffPendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) {
						setStaffPendingDelete(null);
						setDeleteStaffError("");
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove staff?</AlertDialogTitle>
						<AlertDialogDescription>
							Remove <strong>{staffPendingDelete?.label}</strong> from platform
							staff?
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deleteStaffError ? (
						<Alert variant="destructive">
							<AlertDescription>{deleteStaffError}</AlertDescription>
						</Alert>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteStaffState.isLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={deleteStaffState.isLoading}
							onClick={(e) => {
								e.preventDefault();
								void handleDeleteStaffConfirm();
							}}
						>
							{deleteStaffState.isLoading ? "Removing…" : "Remove staff"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

