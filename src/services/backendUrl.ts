/** Normalized backend origin without a trailing slash. */
export const backendBaseUrl = (
	process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? ""
).replace(/\/$/, "");

export const isBackendConfigured = Boolean(backendBaseUrl);

export const BACKEND_NOT_CONFIGURED_MESSAGE =
	"API URL is not configured. Set NEXT_PUBLIC_BACKEND_BASE_URL in Vercel (Settings → Environment Variables), then redeploy.";

export const BACKEND_HTML_RESPONSE_MESSAGE =
	"Could not reach the API server (received a web page instead of JSON). Check that NEXT_PUBLIC_BACKEND_BASE_URL points to your backend API URL, not the Vercel app URL.";
