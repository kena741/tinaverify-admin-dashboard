"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
	BarChart3,
	BadgeCheck,
	Bell,
	Building2,
	ClipboardList,
	CreditCard,
	LayoutDashboard,
	Landmark,
	MapPin,
	Settings,
	TableProperties,
	UtensilsCrossed,
	Users,
} from "lucide-react";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/** Normalize for comparing app paths (trailing slashes). */
function normalizePath(p: string) {
	if (p === "/") return p;
	return p.replace(/\/$/, "") || "/";
}

const systemAdminNavigation: {
	name: string;
	href: string;
	icon: LucideIcon;
}[] = [
	{ name: "Dashboard", href: "/admin", icon: LayoutDashboard },
	{ name: "Orders", href: "/admin/orders", icon: ClipboardList },
	{ name: "Restaurants", href: "/admin/restaurants", icon: Building2 },
	{ name: "Branch", href: "/admin/branches/", icon: MapPin },
	{ name: "Staff", href: "/admin/staff", icon: Users },
	{ name: "Menu", href: "/admin/menu", icon: UtensilsCrossed },
	{ name: "Tables", href: "/admin/tables", icon: TableProperties },
	{ name: "Bank Accounts", href: "/admin/bank-accounts", icon: Landmark },
	{ name: "Transactions", href: "/admin/transactions", icon: CreditCard },
	{ name: "Subscription", href: "/admin/subscription", icon: BadgeCheck },
	{ name: "Notifications", href: "/admin/notifications", icon: Bell },
	{ name: "Reports", href: "/admin/reports", icon: BarChart3 },
	{ name: "Settings", href: "/admin/settings", icon: Settings },
];

const branchAdminNavigation: {
	name: string;
	href: string;
	icon: LucideIcon;
}[] = [
	{ name: "Dashboard", href: "/admin", icon: LayoutDashboard },
	{ name: "Branch", href: "/admin/branches/", icon: MapPin },
	{ name: "Orders", href: "/admin/orders", icon: ClipboardList },
	{ name: "Menu", href: "/admin/menu", icon: UtensilsCrossed },
	{ name: "Tables", href: "/admin/tables", icon: TableProperties },
	{ name: "Bank Accounts", href: "/admin/bank-accounts", icon: Landmark },
	{ name: "Transactions", href: "/admin/transactions", icon: CreditCard },
	{ name: "Staff", href: "/admin/staff", icon: Users },
	{ name: "Subscription", href: "/admin/subscription", icon: BadgeCheck },
	{ name: "Notifications", href: "/admin/notifications", icon: Bell },
];

type AppSidebarProps = {
	isSystemAdmin: boolean;
	userName: string;
	userEmail: string;
	roleLabel: string;
};

export function AppSidebar({
	isSystemAdmin,
	userName,
	userEmail,
	roleLabel,
}: AppSidebarProps) {
	const pathname = usePathname();
	const { isMobile, setOpenMobile } = useSidebar();
	const navigation = isSystemAdmin ? systemAdminNavigation : branchAdminNavigation;

	const initials =
		userName
			.split(" ")
			.map((n) => n[0])
			.join("")
			.substring(0, 2)
			.toUpperCase() || "U";

	return (
		<Sidebar collapsible="offcanvas">
			<SidebarHeader className="border-b border-sidebar-border px-4 py-4">
				<span className="text-xl font-semibold tracking-tight text-sidebar-foreground">
					Zuludine
				</span>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup className="px-1">
					<SidebarGroupContent>
						<SidebarMenu className="gap-1">
							{navigation.map((item) => {
								const path = pathname ?? "";
								const itemBase = normalizePath(item.href);
								const isActive =
									normalizePath(path) === itemBase ||
									(item.href !== "/admin" &&
										item.href !== "/admin/" &&
										path.startsWith(itemBase) &&
										itemBase !== "/admin");
								const Icon = item.icon;
								return (
									<SidebarMenuItem key={item.name}>
										<SidebarMenuButton
											isActive={isActive}
											size="lg"
											tooltip={item.name}
											className={cn(
												"h-11 min-h-11 gap-3 text-base leading-snug transition-colors duration-150 [&_svg]:size-5",
												isActive
													? "hover:bg-sidebar-primary hover:text-sidebar-primary-foreground font-semibold shadow-sm data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
													: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
											)}
											render={
												<Link
													href={item.href}
													onClick={() => {
														if (isMobile) setOpenMobile(false);
													}}
												/>
											}
										>
											<Icon />
											<span>{item.name}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="border-t border-sidebar-border">
				<div className="flex items-center gap-3 px-2 py-2">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
						{initials}
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-base font-medium text-sidebar-foreground">
							{userName}
						</p>
						<p className="truncate text-sm text-muted-foreground">{userEmail}</p>
						<p className="truncate text-sm text-muted-foreground">{roleLabel}</p>
					</div>
				</div>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
