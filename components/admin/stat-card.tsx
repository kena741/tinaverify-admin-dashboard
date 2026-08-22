import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatCardProps = {
	label: string;
	value: string | null;
	icon: LucideIcon;
	loading?: boolean;
	hint?: string;
	className?: string;
};

export function StatCard({
	label,
	value,
	icon: Icon,
	loading = false,
	hint,
	className,
}: StatCardProps) {
	return (
		<Card className={cn("shadow-sm", className)}>
			<CardContent className="flex flex-row items-start gap-4 pt-6">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
					<Icon className="size-5 text-brand-ink" aria-hidden />
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm leading-snug text-muted-foreground">{label}</p>
					{loading ? (
						<Skeleton className="mt-2 h-8 w-28" />
					) : (
						<p className="admin-stat-value mt-1 truncate">{value ?? "—"}</p>
					)}
					{hint && !loading ? (
						<p className="mt-1 text-xs text-muted-foreground">{hint}</p>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}
