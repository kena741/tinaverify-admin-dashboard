import { CrownIcon } from "lucide-react";

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
	className?: string;
	iconClassName?: string;
	showTagline?: boolean;
	variant?: "default" | "light";
};

export function BrandLogo({
	className,
	iconClassName,
	showTagline = false,
	variant = "default",
}: BrandLogoProps) {
	const isLight = variant === "light";

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<div className="flex items-center gap-2.5">
				<div
					className={cn(
						"flex size-9 items-center justify-center rounded-lg",
						isLight ? "bg-white/15 ring-1 ring-white/20" : "bg-primary/10 ring-1 ring-primary/20",
					)}
				>
					<CrownIcon
						className={cn(
							"size-5",
							isLight ? "text-amber-300" : "text-primary",
							iconClassName,
						)}
						aria-hidden
					/>
				</div>
				<span
					className={cn(
						"text-xl font-semibold tracking-tight",
						isLight ? "text-white" : "text-foreground",
					)}
				>
					{BRAND_NAME}
				</span>
			</div>
			{showTagline && (
				<p
					className={cn(
						"text-sm font-medium tracking-wide uppercase",
						isLight ? "text-emerald-100/85" : "text-primary",
					)}
				>
					{BRAND_TAGLINE}
				</p>
			)}
		</div>
	);
}
