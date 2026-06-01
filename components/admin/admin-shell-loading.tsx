import { Loader2Icon } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { BRAND_TAGLINE } from "@/lib/brand";

export function AdminShellLoading() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background">
			<BrandLogo size="lg" showTagline className="items-center" labelClassName="text-center" />
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2Icon className="size-4 animate-spin" aria-hidden />
				<span>Loading {BRAND_TAGLINE.toLowerCase()}…</span>
			</div>
		</div>
	);
}
