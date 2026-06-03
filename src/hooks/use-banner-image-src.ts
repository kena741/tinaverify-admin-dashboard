"use client";

import { useEffect, useState } from "react";

import {
	isUnsignedGcsUrl,
	pickBannerDisplayUrl,
} from "@/lib/banner";
import { backendFetchBlob, backendFetchJson } from "@/services/backendFetch";
import type { BannerOutput } from "@/services/types";

async function fetchBannerImageBlob(banner: BannerOutput): Promise<Blob | null> {
	const objectPath = banner.image_path?.trim();
	const paths = [
		`/api/v1/banners/${banner.id}/image`,
		`/api/v1/banners/${banner.id}/file`,
		...(objectPath
			? [
					`/api/v1/storage/object?path=${encodeURIComponent(objectPath)}`,
					`/api/v1/files?path=${encodeURIComponent(objectPath)}`,
				]
			: []),
	];

	for (const path of paths) {
		try {
			return await backendFetchBlob(path);
		} catch {
			/* try next */
		}
	}

	const signedUrlPaths = [
		`/api/v1/banners/${banner.id}/signed-url`,
		`/api/v1/banners/${banner.id}/image-url`,
	];
	for (const path of signedUrlPaths) {
		try {
			const data = await backendFetchJson<{ url?: string; image_url?: string }>(
				path,
			);
			const signed = data.url ?? data.image_url;
			if (!signed) continue;
			const res = await fetch(signed);
			if (res.ok) return res.blob();
		} catch {
			/* try next */
		}
	}

	return null;
}

/**
 * Resolves a displayable `src` for banner previews.
 * Unsigned GCS URLs are private (403); those are loaded via the backend with auth.
 */
export function useBannerImageSrc(banner: BannerOutput | null | undefined) {
	const [src, setSrc] = useState<string | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (!banner) {
			setSrc(null);
			setFailed(false);
			return;
		}

		let objectUrl: string | null = null;
		let cancelled = false;

		const directSrc = pickBannerDisplayUrl(banner);

		if (directSrc && !isUnsignedGcsUrl(directSrc)) {
			setSrc(directSrc);
			setFailed(false);
			return () => {
				cancelled = true;
			};
		}

		setSrc(null);
		setFailed(false);

		void (async () => {
			const blob = await fetchBannerImageBlob(banner);
			if (cancelled) return;

			if (blob) {
				objectUrl = URL.createObjectURL(blob);
				setSrc(objectUrl);
				setFailed(false);
				return;
			}

			if (directSrc) {
				setSrc(directSrc);
				setFailed(false);
				return;
			}

			setFailed(true);
		})();

		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [
		banner?.id,
		banner?.image_url,
		banner?.image_path,
		banner?.redirect_url,
	]);

	return { src, failed: failed || !src };
}
