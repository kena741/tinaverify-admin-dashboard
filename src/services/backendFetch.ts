import { backendBaseUrl } from "./baseQuery";
import {
	getStoredAccessToken,
	getStoredRefreshToken,
	refreshAccessToken,
} from "./authTokens";

type Json = Record<string, unknown>;

async function parseError(res: Response): Promise<string> {
	const text = await res.text();
	try {
		const j = JSON.parse(text) as Json;
		const detail = j.detail;
		if (typeof detail === "string") return detail;
		if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object") {
			const d0 = detail[0] as { msg?: string };
			if (d0.msg) return d0.msg;
		}
		if (typeof j.message === "string") return j.message;
	} catch {
		/* ignore */
	}
	return text || res.statusText || "Request failed";
}

export async function backendFetchJson<T>(
	path: string,
	init: RequestInit & { accessToken?: string } = {},
): Promise<T> {
	const { accessToken, ...rest } = init;

	const doFetch = async (token: string | null): Promise<Response> => {
		if (!token) {
			throw new Error("Not authenticated");
		}
		const url = path.startsWith("http") ? path : `${backendBaseUrl}${path}`;
		const headers = new Headers(rest.headers);
		headers.set("Authorization", `Bearer ${token}`);
		if (!headers.has("Accept")) headers.set("Accept", "application/json");
		return fetch(url, { ...rest, headers });
	};

	let token = accessToken ?? getStoredAccessToken();
	let res = await doFetch(token);

	if (res.status === 401 && getStoredRefreshToken()) {
		const ok = await refreshAccessToken();
		if (ok) {
			token = accessToken ?? getStoredAccessToken();
			res = await doFetch(token);
		}
	}

	if (!res.ok) {
		throw new Error(await parseError(res));
	}
	if (res.status === 204) {
		return undefined as T;
	}
	return res.json() as Promise<T>;
}
