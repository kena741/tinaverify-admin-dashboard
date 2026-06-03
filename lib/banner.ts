/** GCS bucket for receipt and banner uploads (objects are not public by default). */
export const receiptsStorageBaseUrl = (
	process.env.NEXT_PUBLIC_RECEIPTS_STORAGE_BASE_URL ??
	"https://storage.googleapis.com/zuludine-receipts"
).replace(/\/$/, "");

/**
 * Resolve `image_url` or `image_path` from the API into a browser-loadable URL.
 * Supports full HTTPS URLs, `gs://` URIs, and object paths under the receipts bucket.
 */
export function resolveBannerImageSrc(imageUrl: string): string {
	const trimmed = imageUrl?.trim() ?? "";
	if (!trimmed) return "";

	if (/^https?:\/\//i.test(trimmed)) return trimmed;

	if (trimmed.startsWith("gs://")) {
		const withoutScheme = trimmed.slice(5);
		const slash = withoutScheme.indexOf("/");
		if (slash === -1) return "";
		const bucket = withoutScheme.slice(0, slash);
		const objectPath = withoutScheme.slice(slash + 1);
		return `https://storage.googleapis.com/${bucket}/${objectPath}`;
	}

	const objectPath = trimmed.replace(/^\/+/, "");
	return `${receiptsStorageBaseUrl}/${objectPath}`;
}

/** GCS object URL without a V4 signed query string (browser GET returns 403 on private buckets). */
export function isUnsignedGcsUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (parsed.hostname !== "storage.googleapis.com") return false;
		return !(
			parsed.searchParams.has("X-Goog-Signature") ||
			parsed.searchParams.has("Signature") ||
			parsed.searchParams.has("GoogleAccessId")
		);
	} catch {
		return false;
	}
}

function isLikelyImageAssetUrl(url: string): boolean {
	if (/\.(png|jpe?g|gif|webp|svg|bmp|avif)(\?|#|$)/i.test(url)) return true;
	if (url.includes("storage.googleapis.com")) return true;
	if (url.startsWith("gs://")) return true;
	return false;
}

/** Pick the best static URL for a banner (may still require auth for private GCS). */
export function pickBannerDisplayUrl(banner: {
	image_url: string;
	image_path: string;
	redirect_url?: string | null;
}): string {
	const pathSrc = resolveBannerImageSrc(banner.image_path);
	const urlSrc = resolveBannerImageSrc(banner.image_url);
	const redirect = banner.redirect_url?.trim() ?? "";
	const imageUrl = banner.image_url?.trim() ?? "";

	if (redirect && imageUrl === redirect) return pathSrc;
	if (urlSrc && isLikelyImageAssetUrl(urlSrc)) return urlSrc;
	return pathSrc || urlSrc;
}
