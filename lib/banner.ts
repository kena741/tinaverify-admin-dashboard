/** Public GCS bucket for receipt and banner uploads. */
export const receiptsStorageBaseUrl = (
	process.env.NEXT_PUBLIC_RECEIPTS_STORAGE_BASE_URL ??
	"https://storage.googleapis.com/zuludine-receipts"
).replace(/\/$/, "");

/**
 * Resolve `image_url` from the API into a browser-loadable image URL.
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
