import Image from "next/image";

import brandLogoImage from "@/assets/images/zuluverify.png";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Font size on the row — icon uses `em` so it scales with the label */
const rowSizeClasses = {
	sm: "text-base",
	md: "text-lg",
	lg: "text-2xl",
} as const;

type BrandLogoProps = {
	className?: string;
	imageClassName?: string;
	iconOnlyClassName?: string;
	labelClassName?: string;
	showTagline?: boolean;
	/** Show “Zulu Verify” beside the logo icon */
	showLabel?: boolean;
	size?: keyof typeof rowSizeClasses;
	priority?: boolean;
	variant?: "default" | "light";
};

export function BrandLogo({
	className,
	imageClassName,
	iconOnlyClassName,
	labelClassName,
	showTagline = false,
	showLabel = true,
	size = "md",
	priority = false,
	variant = "default",
}: BrandLogoProps) {
	const isLight = variant === "light";

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<div
				className={cn(
					"flex items-center gap-px",
					rowSizeClasses[size],
				)}
			>
				<Image
					src={brandLogoImage}
					alt={showLabel ? "" : BRAND_NAME}
					aria-hidden={showLabel}
					priority={priority}
					className={cn(
						"h-[1.75em] w-auto shrink-0 object-contain",
						imageClassName,
						iconOnlyClassName,
					)}
				/>
				{showLabel ? (
					<span
						className={cn(
							"font-semibold leading-none tracking-tight",
							isLight ? "text-white" : "text-primary",
							labelClassName,
						)}
					>
						{BRAND_NAME}
					</span>
				) : null}
			</div>
			{showTagline ? (
				<p
					className={cn(
						"text-sm font-medium tracking-wide uppercase",
						isLight ? "text-emerald-100/85" : "text-primary",
						labelClassName,
					)}
				>
					{BRAND_TAGLINE}
				</p>
			) : null}
		</div>
	);
}
