"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import {
	canAccessSystemAdminPath,
	firstAllowedSystemAdminPath,
	hasAnyPermission,
	isCustomerSupportRole,
	type PlatformPermissionSet,
} from "@/lib/platform-access";
import { formatPlatformLabel } from "@/lib/userDisplay";
import {
	useListPlatformRolePermissionsQuery,
	useListPlatformRolesQuery,
	useListPlatformStaffQuery,
} from "@/services/platform/platformApi";
import { useAuth } from "@/store/useAuth";

function isUnauthorizedError(error: unknown): boolean {
	if (typeof error !== "object" || error === null || !("status" in error)) {
		return false;
	}
	return (error as FetchBaseQueryError).status === 401;
}

/**
 * Resolves the signed-in user's platform role permissions for system-admin UI.
 * - Branch users (`!isSuperuser`): `permissions = null` (branch nav, not this map).
 * - Superuser with no staff row: `permissions = "all"` (bootstrap admins).
 * - Superuser on an active staff row: permission actions from their platform role.
 */
export function usePlatformAccess() {
	const { user, isSystemAdmin, logout } = useAuth();
	const systemAdmin = isSystemAdmin();
	const loggedOutForAuthRef = useRef(false);

	const {
		data: staffList,
		isLoading: staffLoading,
		isError: staffError,
		error: staffQueryError,
	} = useListPlatformStaffQuery(undefined, { skip: !systemAdmin });

	const staffUnauthorized = isUnauthorizedError(staffQueryError);

	useEffect(() => {
		if (!staffUnauthorized || loggedOutForAuthRef.current) return;
		loggedOutForAuthRef.current = true;
		logout();
	}, [staffUnauthorized, logout]);

	const myStaff = useMemo(() => {
		if (!user?.id || !staffList) return null;
		return (
			staffList.find((s) => s.user_id === user.id && s.is_active) ?? null
		);
	}, [staffList, user?.id]);

	const { data: roles } = useListPlatformRolesQuery(
		{ includeInactive: true },
		{ skip: !systemAdmin || staffUnauthorized },
	);

	const roleName = useMemo(() => {
		if (!myStaff || !roles) return null;
		return roles.find((r) => r.id === myStaff.platform_role_id)?.name ?? null;
	}, [myStaff, roles]);

	const { data: rolePermissions, isLoading: permsLoading } =
		useListPlatformRolePermissionsQuery(
			{ roleId: myStaff?.platform_role_id ?? "" },
			{ skip: !myStaff?.platform_role_id || staffUnauthorized },
		);

	const permissions: PlatformPermissionSet | null | undefined = useMemo(() => {
		if (!systemAdmin) return null;
		if (staffLoading) return undefined;
		// 401: session is dead — do not pretend bootstrap-admin "all" access.
		if (staffUnauthorized) return undefined;
		// Non-auth staff list failure: keep superusers unblocked.
		if (staffError) return "all";
		if (!myStaff) return "all";
		if (permsLoading) return undefined;
		return new Set((rolePermissions ?? []).map((p) => p.action));
	}, [
		systemAdmin,
		staffLoading,
		staffUnauthorized,
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

	const isCustomerSupport = isCustomerSupportRole(roleName);
	/** Owner/business mutations support should not perform (role, delete, deactivate). */
	const canMutateOwners =
		systemAdmin && (permissions === "all" || !isCustomerSupport);

	return {
		isSystemAdmin: systemAdmin,
		permissions,
		isLoading,
		roleName,
		roleLabel,
		isCustomerSupport,
		canMutateOwners,
		can,
		canPath,
		homePath,
	};
}
