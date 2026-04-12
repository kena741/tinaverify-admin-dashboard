import { backendFetchJson } from "../src/services/backendFetch";
import type { UserOutput } from "../src/services/types";

/** Prefer full name, then username, then phone. */
export function formatUserDisplayName(u: UserOutput): string {
	const first = u.user_information?.first_name?.trim() ?? "";
	const last = u.user_information?.last_name?.trim() ?? "";
	const full = `${first} ${last}`.trim();
	if (full) return full;
	if (u.username) return u.username;
	return u.phone_number;
}

/**
 * Loads user for display. Backend may expose `GET /api/v1/users/{user_id}` even if omitted from OpenAPI.
 */
export async function fetchUserById(
	userId: string,
): Promise<UserOutput | null> {
	try {
		return await backendFetchJson<UserOutput>(`/api/v1/users/${userId}`, {
			method: "GET",
		});
	} catch {
		return null;
	}
}
