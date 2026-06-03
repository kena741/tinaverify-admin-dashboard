"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Loader2Icon } from "lucide-react";

import { useBannerImageSrc } from "@/hooks/use-banner-image-src";
import type { BannerOutput } from "@/services/types";
import { cn } from "@/lib/utils";

type BannerImageProps = {
	banner: BannerOutput;
	alt?: string;
	className?: string;
	fallbackClassName?: string;
};

export function BannerImage({
	banner,
	alt = "Banner",
	className,
	fallbackClassName,
}: BannerImageProps) {
	const { src, failed } = useBannerImageSrc(banner);
	const [imgError, setImgError] = useState(false);
	const loading = !src && !failed && !imgError;

	useEffect(() => {
		setImgError(false);
	}, [src]);

	if (loading) {
		return (
			<div
				className={cn(
					"flex items-center justify-center rounded-md border bg-muted",
					fallbackClassName,
				)}
			>
				<Loader2Icon
					className="size-5 animate-spin text-muted-foreground"
					aria-hidden
				/>
			</div>
		);
	}

	if (!src || failed || imgError) {
		return (
			<div
				className={cn(
					"flex items-center justify-center rounded-md border bg-muted",
					fallbackClassName,
				)}
			>
				<ImageIcon className="size-5 text-muted-foreground" aria-hidden />
			</div>
		);
	}

	return (
		// eslint-disable-next-line @next/next/no-img-element -- blob URL or signed GCS asset
		<img
			src={src}
			alt={alt}
			className={className}
			referrerPolicy="no-referrer"
			onError={() => setImgError(true)}
		/>
	);
}
