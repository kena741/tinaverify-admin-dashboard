"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
	ChevronRightIcon,
	CircleDollarSignIcon,
	MessageSquareIcon,
	ScrollTextIcon,
	SettingsIcon,
	UserCogIcon,
} from "lucide-react";

import {
	adminPathMatches,
	normalizeAdminPath,
} from "@/lib/admin-sidebar-path";
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
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const financeLinks = [
	{ name: "Subscription", href: "/admin/subscription" },
	{ name: "Payment settings", href: "/admin/finance/payment-settings" },
	{ name: "Taxes", href: "/admin/finance/taxes" },
] as const;

const systemFlatLinks = [
	{
		name: "Staff management",
		href: "/admin/platform-staff",
		icon: UserCogIcon,
	},
	{
		name: "Audit logs",
		href: "/admin/audit-logs",
		icon: ScrollTextIcon,
	},
	{ name: "Global settings", href: "/admin/settings", icon: SettingsIcon },
	{
		name: "Contact messages",
		href: "/admin/settings/contact-messages",
		icon: MessageSquareIcon,
	},
] as const;

function isGlobalSettingsActive(pathname: string) {
	const path = normalizeAdminPath(pathname);
	return path === "/admin/settings";
}

export function SystemManagementNav({ pathname }: { pathname: string }) {
	const { isMobile, setOpenMobile } = useSidebar();
	const financeActive =
		normalizeAdminPath(pathname).startsWith("/admin/finance") ||
		financeLinks.some((item) => adminPathMatches(pathname, item.href));
	const [financeOpen, setFinanceOpen] = useState(financeActive);

	useEffect(() => {
		if (financeActive) setFinanceOpen(true);
	}, [financeActive]);

	return (
		<SidebarGroup className="p-0 group-data-[collapsible=icon]:p-0">
			<SidebarGroupLabel className={adminNavGroupLabelClass()}>
				System Management
			</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu className="gap-0.5">
					<SidebarMenuItem>
						<SidebarMenuButton
							type="button"
							isActive={financeActive}
							tooltip="Finance"
							className={adminNavButtonClass(financeActive)}
							onClick={() => setFinanceOpen((open) => !open)}
						>
							<CircleDollarSignIcon />
							<span>Finance</span>
							<ChevronRightIcon
								className={cn(
									"ml-auto size-4! opacity-50 transition-transform",
									financeOpen && "rotate-90",
								)}
								aria-hidden
							/>
						</SidebarMenuButton>
						{financeOpen ? (
							<SidebarMenuSub className="ml-3.5 border-l border-sidebar-border pl-2.5">
								{financeLinks.map((item) => {
									const isActive = adminPathMatches(pathname, item.href);
									return (
										<SidebarMenuSubItem key={item.href}>
											<SidebarMenuSubButton
												isActive={isActive}
												className={cn(
													"h-8 rounded-md text-sidebar-foreground/75 hover:bg-primary/10 hover:text-sidebar-foreground",
													isActive &&
														"bg-primary/15 font-medium text-brand-ink",
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
												<span>{item.name}</span>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									);
								})}
							</SidebarMenuSub>
						) : null}
					</SidebarMenuItem>

					{systemFlatLinks.map((item) => {
						const isActive =
							item.href === "/admin/settings"
								? isGlobalSettingsActive(pathname)
								: adminPathMatches(pathname, item.href);
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
