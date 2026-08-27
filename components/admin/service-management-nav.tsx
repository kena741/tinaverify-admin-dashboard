"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ImageIcon, Share2Icon, TicketIcon } from "lucide-react";

import { usePlatformAccess } from "@/hooks/use-platform-access";
import { adminPathMatches } from "@/lib/admin-sidebar-path";
import {
	adminNavButtonClass,
	adminNavGroupLabelClass,
} from "@/lib/admin-sidebar-nav";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const serviceLinks: {
	name: string;
	href: string;
	icon: LucideIcon;
}[] = [
	{ name: "Banners", href: "/admin/services/banners", icon: ImageIcon },
	// { name: "Coupon", href: "/admin/services/coupons", icon: TicketIcon },
	{ name: "Referrals", href: "/admin/referrals", icon: Share2Icon },
];

export function ServiceManagementNav({ pathname }: { pathname: string }) {
	const { isMobile, setOpenMobile } = useSidebar();
	const { canPath } = usePlatformAccess();
	const links = serviceLinks.filter((item) => canPath(item.href));
	if (links.length === 0) return null;

	return (
		<SidebarGroup className="p-0 group-data-[collapsible=icon]:p-0">
			<SidebarGroupLabel className={adminNavGroupLabelClass()}>
				Service Management
			</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu className="gap-0.5">
					{links.map((item) => {
						const isActive = adminPathMatches(pathname, item.href);
						const Icon = item.icon;
						return (
							<SidebarMenuItem
								key={item.href}
								className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center"
							>
								<SidebarMenuButton
									isActive={isActive}
									tooltip={item.name}
									className={cn(
										adminNavButtonClass(isActive),
										"group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!",
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
	);
}
