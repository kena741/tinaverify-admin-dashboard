"use client";

import { useCallback, useMemo } from "react";

import {
	canAccessSystemAdminPath,
	firstAllowedSystemAdminPath,
	hasAnyPermission,
	type PlatformPermissionSet,
} from "@/lib/platform-access";
import { formatPlatformLabel } from "@/lib/userDisplay";
import {
	useListPlatformRolePermissionsQuery,
	useListPlatformRolesQuery,
	useListPlatformStaffQuery,
} from "@/services/platform/platformApi";
import { useAuth } from "@/store/useAuth";

/**
 * Resolves the signed-in user's platform role permissions for system-admin UI.
 * - Branch users (`!isSuperuser`): `permissions = null` (branch nav, not this map).
 * - Superuser with no staff row: `permissions = "all"` (bootstrap admins).
 * - Superuser on an active staff row: permission actions from their platform role.
 */
export function usePlatformAccess() {
	const { user, isSystemAdmin } = useAuth();
	const systemAdmin = isSystemAdmin();

	const {
		data: staffList,
		isLoading: staffLoading,
		isError: staffError,
	} = useListPlatformStaffQuery(undefined, { skip: !systemAdmin });

	const myStaff = useMemo(() => {
		if (!user?.id || !staffList) return null;
		return (
			staffList.find((s) => s.user_id === user.id && s.is_active) ?? null
		);
	}, [staffList, user?.id]);

	const { data: roles } = useListPlatformRolesQuery(
		{ includeInactive: true },
		{ skip: !systemAdmin },
	);

	const roleName = useMemo(() => {
		if (!myStaff || !roles) return null;
		return roles.find((r) => r.id === myStaff.platform_role_id)?.name ?? null;
	}, [myStaff, roles]);

	const { data: rolePermissions, isLoading: permsLoading } =
		useListPlatformRolePermissionsQuery(
			{ roleId: myStaff?.platform_role_id ?? "" },
			{ skip: !myStaff?.platform_role_id },
		);

	const permissions: PlatformPermissionSet | null | undefined = useMemo(() => {
		if (!systemAdmin) return null;
		if (staffLoading) return undefined;
		if (staffError) return "all";
		if (!myStaff) return "all";
		if (permsLoading) return undefined;
		return new Set((rolePermissions ?? []).map((p) => p.action));
	}, [
		systemAdmin,
		staffLoading,
		staffError,
		myStaff,
		permsLoading,
		rolePermissions,
	]);

	const isLoading = systemAdmin && permissions === undefined;

	const roleLabel = roleName
		? formatPlatformLabel(roleName)
		: systemAdmin
			? "System Administrator"
			: null;

	const can = useCallback(
		(anyOf: string | string[]): boolean => {
			const list = Array.isArray(anyOf) ? anyOf : [anyOf];
			return hasAnyPermission(permissions, list);
		},
		[permissions],
	);

	const canPath = useCallback(
		(pathname: string): boolean => {
			if (!systemAdmin) return true;
			return canAccessSystemAdminPath(pathname, permissions);
		},
		[systemAdmin, permissions],
	);

	const homePath = useCallback((): string => {
		if (!systemAdmin) return "/admin/dashboard";
		if (permissions === undefined || permissions === null) {
			return "/admin/dashboard";
		}
		return firstAllowedSystemAdminPath(permissions);
	}, [systemAdmin, permissions]);

	return {
		isSystemAdmin: systemAdmin,
		permissions,
		isLoading,
		roleName,
		roleLabel,
		can,
		canPath,
		homePath,
	};
}
