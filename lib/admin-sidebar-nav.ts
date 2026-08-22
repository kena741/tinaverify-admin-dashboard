import { cn } from "@/lib/utils";

/** Shared admin sidebar item styles: muted idle, gold accent on hover/active. */
export function adminNavButtonClass(isActive: boolean) {
	return cn(
		"h-10 gap-3 rounded-lg text-sidebar-foreground/80 [&_svg]:size-4! [&_svg]:text-sidebar-foreground/65",
		"hover:bg-primary/10 hover:text-sidebar-foreground [&_svg]:hover:text-brand-ink",
		"transition-colors duration-150",
		isActive &&
			"bg-primary font-medium text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground data-active:bg-primary data-active:text-primary-foreground [&_svg]:text-primary-foreground [&_svg]:hover:text-primary-foreground",
	);
}

export function adminNavGroupLabelClass() {
	return "mb-1 px-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase";
}
