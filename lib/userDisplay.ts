import type { EmployeeOutput, UserOutput } from "../src/services/types";

/** Prefer full name, then username, then phone. */
export function formatUserDisplayName(u: UserOutput): string {
	const first = u.user_information?.first_name?.trim() ?? "";
	const last = u.user_information?.last_name?.trim() ?? "";
	const full = `${first} ${last}`.trim();
	if (full) return full;
	if (u.username) return u.username;
	return u.phone_number;
}

/** `super_admin` → `Super Admin` */
export function formatPlatformLabel(raw: string): string {
	return raw
		.trim()
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join(" ");
}

/** Uses nested `user` from `GET /api/v1/business/{business_id}/employees` — no extra user fetch. */
export function employeeUserDisplayName(emp: EmployeeOutput): string {
	const u = emp.user;
	if (u) return formatUserDisplayName(u);
	return "—";
}
