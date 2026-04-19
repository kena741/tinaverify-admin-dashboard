"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/admin/app-sidebar";
import { ModeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const { user, logout, isSystemAdmin } = useAuth();
	const [notificationsOpen, setNotificationsOpen] = useState(false);

	useEffect(() => {
		if (!user) {
			router.push("/login");
		}
	}, [user, router]);

	if (!user) {
		return null;
	}

	const handleLogout = () => {
		logout();
	};

	const notifications = [
		{
			id: 1,
			message: "Payment failed at Addis Café - Table 5",
			time: "2 min ago",
			read: false,
			type: "error",
		},
		{
			id: 2,
			message: "New restaurant registered: Habesha Restaurant",
			time: "15 min ago",
			read: false,
			type: "info",
		},
		{
			id: 3,
			message: "Telebirr connection restored at Blue Nile Hotel",
			time: "1 hour ago",
			read: true,
			type: "success",
		},
	];

	const unreadCount = notifications.filter((n) => !n.read).length;

	const userName = user?.name || "User";
	const userEmail = user?.email ?? "";
	const roleLabel = isSystemAdmin()
		? "System Administrator"
		: user?.branchName || "Branch Staff";

	return (
		<SidebarProvider>
			<AppSidebar
				isSystemAdmin={isSystemAdmin()}
				userName={userName}
				userEmail={userEmail}
				roleLabel={roleLabel}
			/>
			<SidebarInset>
				<header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4">
					<SidebarTrigger />
					<div className="flex flex-1 items-center gap-4">
						<div className="relative max-w-lg flex-1">
							<Input
								type="search"
								placeholder="Search..."
								className="bg-background pl-9"
								aria-label="Search"
							/>
							<svg
								className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
					</div>
					<div className="flex items-center gap-4">
						<ModeToggle />
						<div className="relative">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="relative text-muted-foreground"
								onClick={() => setNotificationsOpen(!notificationsOpen)}
								aria-expanded={notificationsOpen}
								aria-label="Notifications"
							>
								<svg
									className="size-6"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
									/>
								</svg>
								{unreadCount > 0 && (
									<span className="absolute top-1 right-1 size-2 rounded-full bg-destructive ring-2 ring-background" />
								)}
							</Button>

							{notificationsOpen && (
								<div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-popover text-popover-foreground shadow-lg">
									<div className="border-b p-4">
										<div className="flex items-center justify-between gap-2">
											<h3 className="text-lg font-semibold">Notifications</h3>
											<Button variant="link" className="h-auto p-0 text-sm">
												Mark all read
											</Button>
										</div>
									</div>
									<div className="max-h-96 overflow-y-auto">
										{notifications.map((notification) => (
											<div
												key={notification.id}
												className={`cursor-pointer border-b p-4 last:border-b-0 hover:bg-muted/50 ${
													!notification.read ? "bg-accent/30" : ""
												}`}
											>
												<div className="flex gap-3">
													<div
														className={`mt-2 size-2 shrink-0 rounded-full ${
															notification.type === "error"
																? "bg-destructive"
																: notification.type === "success"
																	? "bg-green-500"
																	: "bg-primary"
														}`}
													/>
													<div className="min-w-0 flex-1">
														<p className="text-sm">{notification.message}</p>
														<p className="mt-1 text-xs text-muted-foreground">
															{notification.time}
														</p>
													</div>
													{!notification.read && (
														<div className="shrink-0">
															<div className="size-2 rounded-full bg-primary" />
														</div>
													)}
												</div>
											</div>
										))}
									</div>
									<div className="border-t p-4 text-center">
										<Link
											href="/admin/notifications"
											className="text-sm font-medium text-primary hover:underline"
										>
											View all notifications
										</Link>
									</div>
								</div>
							)}
						</div>

						<div className="hidden items-center gap-3 sm:flex">
							<div className="text-right">
								<p className="text-sm font-medium">{userName}</p>
								<p className="text-xs text-muted-foreground">
									{isSystemAdmin()
										? "System Administrator"
										: user?.branchName || "Branch Staff"}
								</p>
							</div>
							<div className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
								{userName
									.split(" ")
									.map((n) => n[0])
									.join("")
									.substring(0, 2)
									.toUpperCase() || "U"}
							</div>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="text-muted-foreground"
							onClick={handleLogout}
							title="Logout"
							aria-label="Logout"
						>
							<svg
								className="size-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
								/>
							</svg>
						</Button>
					</div>
				</header>

				<div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
