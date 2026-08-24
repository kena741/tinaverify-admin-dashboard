/** Platform permission actions from `GET /api/v1/platform/permissions`. */
export type PlatformPermissionAction = string;

export type PlatformPermissionSet = Set<string> | "all";

/**
 * Longest-prefix wins. `anyOf` = need at least one permission.
 * Profile is always allowed for signed-in users (not listed).
 */
const ROUTE_RULES: { prefix: string; anyOf: string[] }[] = [
	{ prefix: "/admin/settings/contact-messages", anyOf: ["platform:support:view"] },
	{ prefix: "/admin/settings", anyOf: ["platform:settings:view"] },
	{ prefix: "/admin/finance", anyOf: ["platform:billing:view"] },
	{ prefix: "/admin/subscription", anyOf: ["platform:billing:view"] },
	{ prefix: "/admin/plans", anyOf: ["platform:billing:view", "platform:billing:manage"] },
	{
		prefix: "/admin/platform-staff",
		anyOf: ["platform:staff:view", "platform:roles:view", "platform:permissions:view"],
	},
	{
		prefix: "/admin/roles",
		anyOf: ["platform:roles:view", "platform:permissions:view"],
	},
	{ prefix: "/admin/audit-logs", anyOf: ["platform:settings:view"] },
	{ prefix: "/admin/services/banners", anyOf: ["platform:notifications:view"] },
	{
		prefix: "/admin/services/coupons",
		anyOf: ["platform:notifications:view", "platform:referral:view"],
	},
	{ prefix: "/admin/referrals", anyOf: ["platform:referral:view"] },
	{
		prefix: "/admin/owners",
		anyOf: ["platform:users:view", "platform:businesses:view"],
	},
	{ prefix: "/admin/business", anyOf: ["platform:businesses:view"] },
	{ prefix: "/admin/reports", anyOf: ["platform:analytics:view"] },
	{ prefix: "/admin/dashboard", anyOf: ["platform:analytics:view"] },
];

function normalizePath(path: string): string {
	if (!path) return "/";
	const bare = path.split("?")[0]?.split("#")[0] ?? path;
	if (bare === "/") return bare;
	return bare.replace(/\/$/, "") || "/";
}

export function hasAnyPermission(
	perms: PlatformPermissionSet | undefined | null,
	anyOf: string[],
): boolean {
	if (perms === "all") return true;
	if (!perms) return false;
	return anyOf.some((a) => perms.has(a));
}

/** Branch admins skip this (caller checks `isSystemAdmin` first). */
export function canAccessSystemAdminPath(
	pathname: string,
	perms: PlatformPermissionSet | undefined | null,
): boolean {
	const path = normalizePath(pathname);
	if (path === "/admin" || path === "/admin/profile") return true;
	if (perms === "all") return true;
	if (!perms) return false;

	let best: { prefix: string; anyOf: string[] } | null = null;
	for (const rule of ROUTE_RULES) {
		if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
			if (!best || rule.prefix.length > best.prefix.length) best = rule;
		}
	}
	if (!best) {
		// Unknown system-admin route: only full access roles.
		return false;
	}
	return hasAnyPermission(perms, best.anyOf);
}

export function firstAllowedSystemAdminPath(
	perms: PlatformPermissionSet,
): string {
	const candidates = [
		"/admin/dashboard",
		"/admin/owners",
		"/admin/services/banners",
		"/admin/referrals",
		"/admin/settings/contact-messages",
		"/admin/platform-staff",
		"/admin/profile",
	];
	for (const href of candidates) {
		if (canAccessSystemAdminPath(href, perms)) return href;
	}
	return "/admin/profile";
}

/** Platform role name check for Customer Support (and close variants). */
export function isCustomerSupportRole(
	roleName: string | null | undefined,
): boolean {
	if (!roleName) return false;
	const n = roleName.trim().toLowerCase().replace(/[_-]+/g, " ");
	return (
		n.includes("customer support") ||
		n === "support" ||
		n.startsWith("support ")
	);
}
