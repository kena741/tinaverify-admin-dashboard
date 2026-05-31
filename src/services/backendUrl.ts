/** Normalized backend origin without a trailing slash. */
export const backendBaseUrl = (
	process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? ""
).replace(/\/$/, "");
