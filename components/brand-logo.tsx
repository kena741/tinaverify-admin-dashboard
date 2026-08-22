import Image from "next/image";

import appIcon from "@/assets/images/app_icon.png";
import logoIcon from "@/assets/images/logo_icon.png";
import splashIcon from "@/assets/images/splash_icon.png";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const marks = {
	/** Gold tile + white check — sidebar, compact UI */
	app: appIcon,
	/** Full lockup on gold — login / splash */
	splash: splashIcon,
	/** Gold check on black — dark surfaces */
	logo: logoIcon,
} as const;

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
	/** Show brand name beside the mark (ignored for splash lockup) */
	showLabel?: boolean;
	size?: keyof typeof rowSizeClasses;
	priority?: boolean;
	/** `light` uses the black-tile mark for dark backgrounds */
	variant?: "default" | "light";
	mark?: keyof typeof marks;
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
	mark: markProp,
}: BrandLogoProps) {
	const isLight = variant === "light";
	const mark = markProp ?? (isLight ? "logo" : "app");
	const src = marks[mark];
	const isLockup = mark === "splash";
	const showWordmark = showLabel && !isLockup;

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<div
				className={cn(
					"flex items-center gap-2",
					rowSizeClasses[size],
				)}
			>
				<Image
					src={src}
					alt={showWordmark ? "" : BRAND_NAME}
					aria-hidden={showWordmark}
					priority={priority}
					className={cn(
						isLockup
							? "h-[4.5em] w-auto shrink-0 object-contain"
							: "h-[1.75em] w-auto shrink-0 rounded-md object-contain",
						imageClassName,
						iconOnlyClassName,
					)}
				/>
				{showWordmark ? (
					<span
						className={cn(
							"font-semibold leading-none tracking-tight",
							isLight ? "text-white" : "text-brand-ink",
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
						isLight ? "text-white/85" : "text-brand-ink",
						labelClassName,
					)}
				>
					{BRAND_TAGLINE}
				</p>
			) : null}
		</div>
	);
}
