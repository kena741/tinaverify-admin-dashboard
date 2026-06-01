"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
	ChevronRightIcon,
	CircleDollarSignIcon,
	MessageSquareIcon,
	SettingsIcon,
} from "lucide-react";

import {
	adminPathMatches,
	normalizeAdminPath,
} from "@/lib/admin-sidebar-path";
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
	{ name: "Global settings", href: "/admin/settings", icon: SettingsIcon },
	{
		name: "Contact messages",
		href: "/admin/settings/contact-messages",
		icon: MessageSquareIcon,
	},
] as const;

const navButtonClass = (isActive: boolean) =>
	cn(
		"h-10 gap-3 text-primary [&_svg]:text-primary",
		isActive &&
			"bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground [&_svg]:text-sidebar-primary-foreground",
		!isActive && "hover:text-primary",
	);

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
		<SidebarGroup className="group-data-[collapsible=icon]:p-0">
			<SidebarGroupLabel className="text-xs font-semibold tracking-wider text-primary uppercase">
				System Management
			</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu className="gap-1">
					<SidebarMenuItem>
						<SidebarMenuButton
							type="button"
							isActive={financeActive}
							tooltip="Finance"
							className={navButtonClass(financeActive)}
							onClick={() => setFinanceOpen((open) => !open)}
						>
							<CircleDollarSignIcon className="size-5!" />
							<span>Finance</span>
							<ChevronRightIcon
								className={cn(
									"ml-auto size-4! transition-transform",
									financeOpen && "rotate-90",
								)}
								aria-hidden
							/>
						</SidebarMenuButton>
						{financeOpen ? (
							<SidebarMenuSub>
								{financeLinks.map((item) => {
									const isActive = adminPathMatches(pathname, item.href);
									return (
										<SidebarMenuSubItem key={item.href}>
											<SidebarMenuSubButton
												isActive={isActive}
												className={cn(
													isActive && "font-medium text-primary",
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
									className={navButtonClass(isActive)}
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
