"use client";

import { useState } from "react";
import {
	AlertTriangleIcon,
	BellIcon,
	UserIcon,
	WifiIcon,
	XIcon,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NotificationFilter = "all" | "unread" | "critical";

type NotificationItem = {
	id: number;
	type: string;
	message: string;
	time: string;
	read: boolean;
	critical: boolean;
};

const notifications: NotificationItem[] = [
	{
		id: 1,
		type: "payment_failure",
		message:
			"Payment failed at Addis Café - Bole, Table 5. Amount: ETB 450",
		time: "2 minutes ago",
		read: false,
		critical: true,
	},
	{
		id: 2,
		type: "telebirr_error",
		message:
			"Telebirr connection error at Blue Nile Hotel. Retrying connection...",
		time: "15 minutes ago",
		read: false,
		critical: true,
	},
	{
		id: 3,
		type: "staff_login",
		message: "Waiter John Doe logged in at Addis Café - Bole",
		time: "1 hour ago",
		read: true,
		critical: false,
	},
	{
		id: 4,
		type: "business_added",
		message: "New business 'Habesha Group' added to the platform",
		time: "2 hours ago",
		read: true,
		critical: false,
	},
	{
		id: 5,
		type: "branch_activated",
		message: "Branch 'Kaldi's Coffee - Meskel' has been activated",
		time: "3 hours ago",
		read: true,
		critical: false,
	},
	{
		id: 6,
		type: "payment_failure",
		message: "Payment failed at Tomoca - Piazza, Table 2. Amount: ETB 150",
		time: "4 hours ago",
		read: true,
		critical: true,
	},
	{
		id: 7,
		type: "telebirr_restored",
		message: "Telebirr connection restored at Tomoca - Piazza",
		time: "5 hours ago",
		read: true,
		critical: false,
	},
	{
		id: 8,
		type: "staff_logout",
		message: "Admin Sarah logged out from Blue Nile Hotel",
		time: "6 hours ago",
		read: true,
		critical: false,
	},
];

function NotificationIcon({ type }: { type: string }) {
	if (type === "payment_failure") {
		return <AlertTriangleIcon className="size-5 text-destructive" aria-hidden />;
	}
	if (type === "telebirr_error" || type === "telebirr_restored") {
		return <WifiIcon className="size-5 text-chart-3" aria-hidden />;
	}
	if (type === "staff_login" || type === "staff_logout") {
		return <UserIcon className="size-5 text-primary" aria-hidden />;
	}
	return <BellIcon className="size-5 text-muted-foreground" aria-hidden />;
}

export default function NotificationsPage() {
	const [filter, setFilter] = useState<NotificationFilter>("all");

	const filteredNotifications = notifications.filter((notif) => {
		if (filter === "unread") return !notif.read;
		if (filter === "critical") return notif.critical;
		return true;
	});

	const unreadCount = notifications.filter((n) => !n.read).length;
	const criticalCount = notifications.filter((n) => n.critical && !n.read).length;

	const markAsRead = (id: number) => {
		console.log("Mark as read:", id);
	};

	const markAllAsRead = () => {
		console.log("Mark all as read");
	};

	const clearNotification = (id: number) => {
		console.log("Clear notification:", id);
	};

	const filterOptions: { value: NotificationFilter; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "unread", label: "Unread" },
		{ value: "critical", label: "Critical" },
	];

	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title="Notifications"
				description="System notifications and alerts across businesses and branches."
				actions={
					unreadCount > 0 ? (
						<Button type="button" size="sm" onClick={markAllAsRead}>
							Mark all as read
						</Button>
					) : null
				}
			/>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard
					label="Total notifications"
					value={notifications.length.toLocaleString()}
					icon={BellIcon}
				/>
				<StatCard
					label="Unread"
					value={unreadCount.toLocaleString()}
					icon={BellIcon}
				/>
				<StatCard
					label="Critical alerts"
					value={criticalCount.toLocaleString()}
					icon={AlertTriangleIcon}
				/>
			</div>

			<Card className="shadow-sm">
				<CardContent className="flex flex-wrap gap-2 p-4">
					{filterOptions.map((option) => (
						<Button
							key={option.value}
							type="button"
							size="sm"
							variant={filter === option.value ? "default" : "secondary"}
							onClick={() => setFilter(option.value)}
						>
							{option.label}
						</Button>
					))}
				</CardContent>
			</Card>

			<Card className="overflow-hidden shadow-sm">
				<div className="divide-y divide-border">
					{filteredNotifications.map((notif) => (
						<div
							key={notif.id}
							className={cn(
								"flex items-start gap-4 p-4 transition-colors hover:bg-muted/40 sm:p-5",
								!notif.read && "bg-accent/30",
								notif.critical && "border-l-4 border-l-destructive",
							)}
						>
							<div
								className={cn(
									"flex size-10 shrink-0 items-center justify-center rounded-lg",
									notif.critical ? "bg-destructive/10" : "bg-primary/10",
								)}
							>
								<NotificationIcon type={notif.type} />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<p
										className={cn(
											"text-sm leading-relaxed",
											!notif.read && "font-medium text-foreground",
										)}
									>
										{notif.message}
									</p>
									{notif.critical ? (
										<Badge variant="destructive">Critical</Badge>
									) : null}
									{!notif.read ? (
										<Badge variant="secondary">Unread</Badge>
									) : null}
								</div>
								<p className="mt-1 text-xs text-muted-foreground">{notif.time}</p>
							</div>
							<div className="flex shrink-0 items-center gap-1">
								{!notif.read ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => markAsRead(notif.id)}
									>
										Mark read
									</Button>
								) : null}
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => clearNotification(notif.id)}
									aria-label="Dismiss notification"
								>
									<XIcon aria-hidden />
								</Button>
							</div>
						</div>
					))}
				</div>
			</Card>
		</div>
	);
}
