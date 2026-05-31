import { backendBaseUrl } from "./backendUrl";

export const AUTH_ACCESS_TOKEN_KEY = "zuluverify_access_token";
export const AUTH_REFRESH_TOKEN_KEY = "zuluverify_refresh_token";

export function getStoredAccessToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
}

export function setStoredTokens(accessToken: string, refreshToken: string): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
	localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
}

export function clearStoredTokens(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
	localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Calls `POST /api/v1/users/refresh-token?refresh_token=...` and stores new tokens.
 * Concurrent callers share one refresh. Returns false if refresh fails (and clears tokens).
 */
export async function refreshAccessToken(): Promise<boolean> {
	if (refreshInFlight) return refreshInFlight;

	refreshInFlight = (async () => {
		const refresh = getStoredRefreshToken();
		if (!refresh) {
			clearStoredTokens();
			return false;
		}
		try {
			const url = `${backendBaseUrl}/api/v1/users/refresh-token?refresh_token=${encodeURIComponent(refresh)}`;
			const res = await fetch(url, {
				method: "POST",
				headers: { Accept: "application/json" },
			});
			if (!res.ok) {
				clearStoredTokens();
				return false;
			}
			const data = (await res.json()) as {
				access_token: string;
				refresh_token: string;
			};
			if (!data.access_token || !data.refresh_token) {
				clearStoredTokens();
				return false;
			}
			setStoredTokens(data.access_token, data.refresh_token);
			return true;
		} catch {
			clearStoredTokens();
			return false;
		} finally {
			refreshInFlight = null;
		}
	})();

	return refreshInFlight;
}
