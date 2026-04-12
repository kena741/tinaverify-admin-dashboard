import { cn } from "@/lib/utils";

/** Tab trigger: smooth border and text color when switching. */
export function tabNavButtonClass(active: boolean) {
	return cn(
		"border-b-2 py-4 px-1 text-sm font-medium transition-colors duration-200 ease-out motion-reduce:transition-none",
		active
			? "border-blue-500 text-blue-600"
			: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
	);
}

/** Tab panel enter: subtle fade + slight rise when content swaps. */
export const tabPanelEnterClass = cn(
	"animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ease-out motion-reduce:animate-none motion-reduce:slide-in-from-bottom-0",
);
