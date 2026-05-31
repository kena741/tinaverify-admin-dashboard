"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
	BadgeCheck,
	Bell,
	Building2,
	CircleDollarSign,
	ClipboardList,
	CreditCard,
	ShieldCheck,
	Landmark,
	LayoutDashboard,
	MapPin,
	TableProperties,
	UtensilsCrossed,
	Users,
	Wallet,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
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

function normalizePath(p: string) {
	if (p === "/") return p;
	return p.replace(/\/$/, "") || "/";
}

const systemAdminNavigation: {
	name: string;
	href: string;
	icon: LucideIcon;
}[] = [
	{ name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
	{ name: "Business", href: "/admin/business", icon: Building2 },
	{ name: "Transactions", href: "/admin/transactions", icon: CreditCard },
	{ name: "Subscription", href: "/admin/subscription", icon: Wallet },
	{ name: "Plans", href: "/admin/plans", icon: CircleDollarSign },
	{ name: "Roles", href: "/admin/roles", icon: ShieldCheck },
];

const branchAdminNavigation: {
	name: string;
	href: string;
	icon: LucideIcon;
}[] = [
	{ name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
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
		<Sidebar collapsible="offcanvas" className="border-r-0">
			<SidebarHeader className="border-b border-sidebar-border px-4 py-5">
				<BrandLogo />
			</SidebarHeader>
			<SidebarContent className="px-2 py-3">
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu className="gap-0.5">
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
											size="default"
											tooltip={item.name}
											className={cn(
												"h-10 gap-3 transition-colors duration-150",
												isActive &&
													"bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground",
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
			<SidebarFooter className="border-t border-sidebar-border p-3">
				<div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/60 p-2.5">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
						{initials}
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium text-sidebar-foreground">
							{userName}
						</p>
						<p className="truncate text-xs text-sidebar-foreground/65">
							{userEmail || roleLabel}
						</p>
					</div>
				</div>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
