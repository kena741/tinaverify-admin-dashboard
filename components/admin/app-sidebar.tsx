"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
	BadgeCheck,
	Bell,
	Building2,
	ClipboardList,
	Landmark,
	LayoutDashboard,
	MapPin,
	TableProperties,
	UtensilsCrossed,
	Users,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { ServiceManagementNav } from "@/components/admin/service-management-nav";
import { SystemManagementNav } from "@/components/admin/system-management-nav";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
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

type NavItem = {
	name: string;
	href: string;
	icon: LucideIcon;
};

const systemAdminMainNav: NavItem[] = [
	{ name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
];

const systemAdminUsersNav: NavItem[] = [
	{ name: "Business", href: "/admin/transactions", icon: Building2 },
];

const branchAdminMainNav: NavItem[] = [
	{ name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
	{ name: "Branch", href: "/admin/branches/", icon: MapPin },
	{ name: "Orders", href: "/admin/orders", icon: ClipboardList },
	{ name: "Menu", href: "/admin/menu", icon: UtensilsCrossed },
	{ name: "Tables", href: "/admin/tables", icon: TableProperties },
	{ name: "Bank Accounts", href: "/admin/bank-accounts", icon: Landmark },
];

const branchAdminUsersNav: NavItem[] = [
	{ name: "Business", href: "/admin/transactions", icon: Building2 },
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
	const mainNav = isSystemAdmin ? systemAdminMainNav : branchAdminMainNav;
	const usersNav = isSystemAdmin ? systemAdminUsersNav : branchAdminUsersNav;

	function renderNavItems(items: NavItem[]) {
		return items.map((item) => {
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
				<SidebarMenuItem
					key={item.name}
					className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center"
				>
					<SidebarMenuButton
						isActive={isActive}
						size="default"
						tooltip={item.name}
						className={cn(
							"h-10 gap-3 transition-colors duration-150",
							"group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!",
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
		});
	}

	const initials =
		userName
			.split(" ")
			.map((n) => n[0])
			.join("")
			.substring(0, 2)
			.toUpperCase() || "U";

	return (
		<Sidebar collapsible="icon" className="border-r-0">
			<SidebarHeader className="border-b border-sidebar-border px-4 py-5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-4 group-data-[collapsible=icon]:pr-3">
				<BrandLogo
					size="sm"
					className="group-data-[collapsible=icon]:items-center"
					imageClassName="group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-auto"
					labelClassName="group-data-[collapsible=icon]:hidden"
				/>
			</SidebarHeader>
			<SidebarContent className="px-2 py-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pr-3">
				<SidebarGroup className="group-data-[collapsible=icon]:p-0">
					<SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
						<SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
							{renderNavItems(mainNav)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<SidebarGroup className="group-data-[collapsible=icon]:p-0">
					<SidebarGroupLabel className="text-xs font-semibold tracking-wider text-primary uppercase">
						Users
					</SidebarGroupLabel>
					<SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
						<SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
							{renderNavItems(usersNav)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				{isSystemAdmin ? (
					<>
						<ServiceManagementNav pathname={pathname ?? ""} />
						<SystemManagementNav pathname={pathname ?? ""} />
					</>
				) : null}
			</SidebarContent>
			<SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3 group-data-[collapsible=icon]:pr-3">
				<Link
					href="/admin/profile"
					onClick={() => {
						if (isMobile) setOpenMobile(false);
					}}
					className="flex items-center gap-3 rounded-lg bg-sidebar-accent/60 p-2.5 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2"
					title="View profile"
				>
					<div
						className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground"
						aria-hidden
					>
						{initials}
					</div>
					<div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
						<p className="truncate text-sm font-medium text-sidebar-foreground">
							{userName}
						</p>
						<p className="truncate text-xs text-sidebar-foreground/65">
							{userEmail || roleLabel}
						</p>
					</div>
				</Link>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
