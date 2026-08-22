import Image from "next/image";

import appIcon from "@/assets/images/app_icon.png";
import { BRAND_NAME } from "@/lib/brand";

export function AdminShellLoading() {
	return (
		<div
			className="admin-loading relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background"
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			<div className="admin-loading-glow" aria-hidden />

			<div className="relative flex flex-col items-center gap-7 px-6">
				<div className="admin-loading-mark">
					<Image
						src={appIcon}
						alt=""
						priority
						width={72}
						height={72}
						className="size-18 rounded-2xl shadow-md"
					/>
				</div>

				<div className="flex flex-col items-center gap-3">
					<p className="text-base font-semibold tracking-tight text-foreground">
						{BRAND_NAME}
					</p>
					<div
						className="admin-loading-track h-0.5 w-36 overflow-hidden rounded-full bg-muted"
						aria-hidden
					>
						<div className="admin-loading-bar h-full rounded-full bg-primary" />
					</div>
					<p className="text-sm text-muted-foreground">Preparing your workspace</p>
				</div>
			</div>

			<span className="sr-only">Loading {BRAND_NAME}</span>
		</div>
	);
}
