"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ImageIcon, TicketIcon } from "lucide-react";

import { adminPathMatches } from "@/lib/admin-sidebar-path";
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
	{ name: "Coupon", href: "/admin/services/coupons", icon: TicketIcon },
];

export function ServiceManagementNav({ pathname }: { pathname: string }) {
	const { isMobile, setOpenMobile } = useSidebar();

	return (
		<SidebarGroup className="group-data-[collapsible=icon]:p-0">
			<SidebarGroupLabel className="text-xs font-semibold tracking-wider text-primary uppercase">
				Service Management
			</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu className="gap-1">
					{serviceLinks.map((item) => {
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
										"h-10 gap-3 text-primary [&_svg]:text-primary",
										isActive &&
											"bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground [&_svg]:text-sidebar-primary-foreground",
										!isActive && "hover:text-primary",
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
									<Icon className="size-5!" />
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
