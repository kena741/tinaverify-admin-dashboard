"use client";

import { useMemo, useState } from "react";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import {
	useAssignPermissionsToRoleMutation,
	useGetRolePermissionsQuery,
	useGetRoleQuery,
	useListPermissionsQuery,
	useRemovePermissionFromRoleMutation,
} from "@/services/role/roleApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

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

type RoleDetailSheetProps = {
	roleId: string | null;
	onOpenChange: (open: boolean) => void;
};

export function RoleDetailSheet({ roleId, onOpenChange }: RoleDetailSheetProps) {
	const open = roleId !== null;

	const {
		data: role,
		isLoading: roleLoading,
		error: roleError,
		refetch: refetchRole,
	} = useGetRoleQuery({ roleId: roleId ?? "" }, { skip: !roleId });

	const {
		data: rolePermissions,
		isLoading: permissionsLoading,
		error: permissionsError,
		refetch: refetchRolePermissions,
	} = useGetRolePermissionsQuery({ roleId: roleId ?? "" }, { skip: !roleId });

	const { data: allPermissions } = useListPermissionsQuery(undefined, {
		skip: !open,
	});

	const [assignPermissions, assignState] = useAssignPermissionsToRoleMutation();
	const [removePermission, removeState] = useRemovePermissionFromRoleMutation();

	const [permissionToAdd, setPermissionToAdd] = useState("");
	const [assignError, setAssignError] = useState("");
	const [removingPermissionId, setRemovingPermissionId] = useState<string | null>(
		null,
	);

	const assignedIds = useMemo(
		() => new Set((rolePermissions ?? []).map((p) => p.id)),
		[rolePermissions],
	);

	const availableToAssign = useMemo(
		() => (allPermissions ?? []).filter((p) => !assignedIds.has(p.id)),
		[allPermissions, assignedIds],
	);

	const selectedAddPermission = useMemo(
		() => availableToAssign.find((p) => p.id === permissionToAdd),
		[availableToAssign, permissionToAdd],
	);

	const handleAssign = async () => {
		if (!roleId || !permissionToAdd) return;
		setAssignError("");
		try {
			await assignPermissions({
				roleId,
				body: { permission_ids: [permissionToAdd] },
			}).unwrap();
			setPermissionToAdd("");
		} catch (err) {
			setAssignError(getErrorMessage(err, "Failed to assign permission."));
		}
	};

	const handleRemove = async (permissionId: string) => {
		if (!roleId) return;
		setRemovingPermissionId(permissionId);
		try {
			await removePermission({ roleId, permissionId }).unwrap();
		} finally {
			setRemovingPermissionId(null);
		}
	};

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					setPermissionToAdd("");
					setAssignError("");
					onOpenChange(false);
				}
			}}
		>
			<SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
				<SheetHeader className="border-b border-border pb-4">
					<SheetTitle>Role details</SheetTitle>
					<SheetDescription>
						View this role and manage its permissions.
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-6 p-4">
					{roleLoading ? (
						<Skeleton className="h-8 w-48" />
					) : roleError ? (
						<Alert variant="destructive">
							<AlertTitle>Could not load role</AlertTitle>
							<AlertDescription className="flex flex-col gap-2">
								<span>{getErrorMessage(roleError, "Request failed.")}</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="w-fit"
									onClick={() => refetchRole()}
								>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : role ? (
						<div className="flex flex-col gap-1">
							<p className="text-2xl font-semibold tracking-tight">{role.name}</p>
						</div>
					) : null}

					<Separator />

					<div className="flex flex-col gap-4">
						<div className="flex flex-col gap-1">
							<h3 className="text-sm font-medium">Assigned permissions</h3>
							<p className="text-sm text-muted-foreground">
								Permissions granted to users with this role.
							</p>
						</div>

						{permissionsError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not load permissions</AlertTitle>
								<AlertDescription className="flex flex-col gap-2">
									<span>
										{getErrorMessage(permissionsError, "Request failed.")}
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-fit"
										onClick={() => refetchRolePermissions()}
									>
										Try again
									</Button>
								</AlertDescription>
							</Alert>
						) : permissionsLoading ? (
							<div className="flex flex-col gap-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={i} className="h-10 w-full" />
								))}
							</div>
						) : (rolePermissions ?? []).length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No permissions assigned yet.
							</p>
						) : (
							<ul className="flex flex-col gap-2">
								{(rolePermissions ?? []).map((permission) => {
									const isRemoving =
										removingPermissionId === permission.id ||
										removeState.isLoading;
									return (
										<li
											key={permission.id}
											className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
										>
											<span className="text-sm font-medium">
												{permission.action}
											</span>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="shrink-0 text-muted-foreground hover:text-destructive"
												disabled={isRemoving}
												aria-label={`Remove ${permission.action}`}
												onClick={() => handleRemove(permission.id)}
											>
												{removingPermissionId === permission.id ? (
													<Loader2Icon className="animate-spin" />
												) : (
													<Trash2Icon />
												)}
											</Button>
										</li>
									);
								})}
							</ul>
						)}

						<div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
							<Field>
								<FieldLabel htmlFor="add-permission-to-role">
									Add permission
								</FieldLabel>
								<Select
									value={permissionToAdd}
									onValueChange={(v) => {
										if (v != null) setPermissionToAdd(v);
									}}
									disabled={availableToAssign.length === 0}
								>
									<SelectTrigger
										id="add-permission-to-role"
										className="h-10 w-full bg-background"
									>
										<span className="flex flex-1 truncate text-left">
											{selectedAddPermission
												? selectedAddPermission.action
												: availableToAssign.length === 0
													? "No permissions available"
													: "Select a permission…"}
										</span>
									</SelectTrigger>
									<SelectContent>
										{availableToAssign.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.action}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>

							{assignError ? (
								<Alert variant="destructive">
									<AlertDescription>{assignError}</AlertDescription>
								</Alert>
							) : null}

							<Button
								type="button"
								size="sm"
								disabled={!permissionToAdd || assignState.isLoading}
								onClick={handleAssign}
							>
								{assignState.isLoading && (
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
								)}
								{assignState.isLoading ? "Assigning…" : "Assign permission"}
							</Button>
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
