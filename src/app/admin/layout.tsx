"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
	BellIcon,
	LogOutIcon,
	SearchIcon,
} from "lucide-react";

import { AdminShellLoading } from "@/components/admin/admin-shell-loading";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { ModeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "../../store/useAuth";
import { useAppSelector } from "../../store/hooks";
import { selectAuthSessionPending } from "../../store/authSlice";

function getUserInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "U";
	if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
	return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const { user, logout, isSystemAdmin } = useAuth();
	const sessionPending = useAppSelector(selectAuthSessionPending);
	const [notificationsOpen, setNotificationsOpen] = useState(false);

	useEffect(() => {
		if (sessionPending) return;
		if (!user) {
			router.push("/login");
		}
	}, [user, router, sessionPending]);

	if (sessionPending || !user) {
		return <AdminShellLoading />;
	}

	const notifications = [
		{
			id: 1,
			message: "Payment failed at Addis Café — Table 5",
			time: "2 min ago",
			read: false,
			type: "error" as const,
		},
		{
			id: 2,
			message: "New business registered: Habesha Group",
			time: "15 min ago",
			read: false,
			type: "info" as const,
		},
		{
			id: 3,
			message: "Telebirr connection restored at Blue Nile Hotel",
			time: "1 hour ago",
			read: true,
			type: "success" as const,
		},
	];

	const unreadCount = notifications.filter((n) => !n.read).length;

	const userName = user?.name || "User";
	const userEmail = user?.email ?? "";
	const roleLabel = isSystemAdmin()
		? "System Administrator"
		: user?.branchName || "Branch Staff";
	const userInitials = getUserInitials(userName);

	return (
		<SidebarProvider>
			<AppSidebar
				isSystemAdmin={isSystemAdmin()}
				userName={userName}
				userEmail={userEmail}
				roleLabel={roleLabel}
			/>
			<SidebarInset className="bg-muted/30">
				<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border/80 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
					<SidebarTrigger className="-ml-1" />
					<div className="relative max-w-md flex-1">
						<SearchIcon
							className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden
						/>
						<Input
							type="search"
							placeholder="Search…"
							className="h-9 bg-muted/50 pl-9"
							aria-label="Search"
						/>
					</div>
					<div className="flex items-center gap-1">
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
								<BellIcon />
								{unreadCount > 0 && (
									<span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
								)}
							</Button>

							{notificationsOpen && (
								<div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
									<div className="flex items-center justify-between gap-2 border-b px-4 py-3">
										<h3 className="font-semibold">Notifications</h3>
										<Button variant="link" className="h-auto p-0 text-xs">
											Mark all read
										</Button>
									</div>
									<div className="max-h-96 overflow-y-auto">
										{notifications.map((notification) => (
											<div
												key={notification.id}
												className={`cursor-pointer border-b px-4 py-3 last:border-b-0 hover:bg-muted/50 ${
													!notification.read ? "bg-accent/40" : ""
												}`}
											>
												<div className="flex gap-3">
													<div
														className={`mt-1.5 size-2 shrink-0 rounded-full ${
															notification.type === "error"
																? "bg-destructive"
																: notification.type === "success"
																	? "bg-primary"
																	: "bg-chart-3"
														}`}
													/>
													<div className="min-w-0 flex-1">
														<p className="text-sm leading-snug">
															{notification.message}
														</p>
														<p className="mt-1 text-xs text-muted-foreground">
															{notification.time}
														</p>
													</div>
												</div>
											</div>
										))}
									</div>
									<div className="border-t px-4 py-3 text-center">
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

						<Link
							href="/admin/profile"
							className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
							title={`${userName} — view profile`}
							aria-label={`${userName} — view profile`}
						>
							{userInitials}
						</Link>

						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="text-muted-foreground"
							onClick={() => logout()}
							title="Sign out"
							aria-label="Sign out"
						>
							<LogOutIcon />
						</Button>
					</div>
				</header>

				<main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
					{children}
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
