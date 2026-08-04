import {
	fetchBaseQuery,
	type BaseQueryFn,
	type FetchArgs,
} from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import {
	getStoredAccessToken,
	getStoredRefreshToken,
	refreshAccessToken,
} from "./authTokens";
import {
	backendBaseUrl,
	BACKEND_NOT_CONFIGURED_MESSAGE,
	isBackendConfigured,
} from "./backendUrl";

/** API surface is defined in `src/services/openapi.json` (synced from the backend). */

const rawBaseQuery = fetchBaseQuery({
	baseUrl: backendBaseUrl,
	prepareHeaders: (headers) => {
		headers.set("Accept", "application/json");
		const token = getStoredAccessToken();
		if (token) headers.set("Authorization", `Bearer ${token}`);
		else headers.delete("Authorization");
		return headers;
	},
});

function shouldAttemptRefreshOn401(
	args: string | FetchArgs,
): boolean {
	const url = typeof args === "string" ? args : args.url;
	if (url.includes("/users/login")) return false;
	if (url.includes("/users/refresh-token")) return false;
	if (
		url === "/api/v1/users" &&
		typeof args === "object" &&
		"method" in args &&
		String(args.method).toUpperCase() === "POST"
	) {
		return false;
	}
	return Boolean(getStoredRefreshToken());
}

export const backendBaseQuery: BaseQueryFn<
	string | FetchArgs,
	unknown,
	FetchBaseQueryError
> = async (args, api, extraOptions) => {
	if (!isBackendConfigured) {
		return {
			error: {
				status: "CUSTOM_ERROR",
				error: "Backend not configured",
				data: BACKEND_NOT_CONFIGURED_MESSAGE,
			} as FetchBaseQueryError,
		};
	}

	let result = await rawBaseQuery(args, api, extraOptions);

	if (
		result.error &&
		typeof result.error === "object" &&
		"status" in result.error &&
		result.error.status === 401 &&
		shouldAttemptRefreshOn401(args)
	) {
		const ok = await refreshAccessToken();
		if (ok) {
			result = await rawBaseQuery(args, api, extraOptions);
		}
	}

	return result;
};
