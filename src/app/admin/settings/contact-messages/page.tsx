"use client";

import { Fragment, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import {
	useListContactMessagesQuery,
	useUpdateContactMessageStatusMutation,
} from "@/services/contact-messages/contactMessagesApi";
import type {
	ContactMessageOutput,
	ContactMessageStatus,
} from "@/services/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type StatusFilter = "all" | ContactMessageStatus;

function getErrorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"data" in error &&
		(error as { data?: { detail?: unknown; message?: unknown } }).data
	) {
		const data = (error as { data: { detail?: unknown; message?: unknown } })
			.data;
		if (typeof data.detail === "string") return data.detail;
		if (typeof data.message === "string") return data.message;
		if (Array.isArray(data.detail)) {
			const messages = data.detail
				.map((item) =>
					typeof item === "object" &&
					item !== null &&
					"msg" in item &&
					typeof item.msg === "string"
						? item.msg
						: null,
				)
				.filter(Boolean);
			if (messages.length > 0) return messages.join(", ");
		}
	}
	if (error instanceof Error) return error.message;
	return fallback;
}

function formatWhen(iso: string | null | undefined): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function statusBadgeVariant(
	status: string,
): "default" | "secondary" | "outline" {
	const s = status.toLowerCase();
	if (s === "pending") return "secondary";
	if (s === "resolved") return "default";
	return "outline";
}

export default function ContactMessagesPage() {
	const {
		data: messages,
		isLoading,
		isError,
		error,
		refetch,
	} = useListContactMessagesQuery();
	const [updateStatus, updateState] = useUpdateContactMessageStatusMutation();
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [updatingId, setUpdatingId] = useState<string | null>(null);
	const [banner, setBanner] = useState<{
		variant: "default" | "destructive";
		message: string;
	} | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const sorted = useMemo(() => {
		const list = [...(messages ?? [])];
		list.sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);
		return list;
	}, [messages]);

	const filtered = useMemo(() => {
		if (statusFilter === "all") return sorted;
		return sorted.filter(
			(m) => m.status.toLowerCase() === statusFilter,
		);
	}, [sorted, statusFilter]);

	const pendingCount = sorted.filter(
		(m) => m.status.toLowerCase() === "pending",
	).length;

	async function setMessageStatus(
		message: ContactMessageOutput,
		status: ContactMessageStatus,
	) {
		if (message.status.toLowerCase() === status) return;
		setUpdatingId(message.id);
		setBanner(null);
		try {
			await updateStatus({
				messageId: message.id,
				body: { status },
			}).unwrap();
			setBanner({
				variant: "default",
				message: `Marked "${message.subject}" as ${status}.`,
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				message: getErrorMessage(err, "Could not update message status."),
			});
		} finally {
			setUpdatingId(null);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Contact Messages"
				description="View and update status for messages submitted through the public contact form."
			/>

			{banner ? (
				<Alert
					variant={banner.variant === "destructive" ? "destructive" : "default"}
				>
					<AlertTitle>
						{banner.variant === "destructive" ? "Update failed" : "Updated"}
					</AlertTitle>
					<AlertDescription>{banner.message}</AlertDescription>
				</Alert>
			) : null}

			{isError ? (
				<Alert variant="destructive">
					<AlertTitle>Could not load contact messages</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(error, "Request failed.")}</span>
						<button
							type="button"
							className="text-sm font-medium underline"
							onClick={() => void refetch()}
						>
							Try again
						</button>
					</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<CardTitle>Inbox</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							{isLoading
								? "Loading…"
								: `${filtered.length} message${filtered.length === 1 ? "" : "s"}${
										statusFilter === "all" && pendingCount > 0
											? ` · ${pendingCount} pending`
											: ""
									}`}
						</p>
					</div>
					<Select
						value={statusFilter}
						onValueChange={(v) => setStatusFilter(v as StatusFilter)}
					>
						<SelectTrigger className="w-40" size="sm">
							<SelectValue placeholder="Filter status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="resolved">Resolved</SelectItem>
						</SelectContent>
					</Select>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex flex-col gap-2">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : filtered.length === 0 ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							No contact messages
							{statusFilter !== "all" ? ` with status “${statusFilter}”` : ""}.
						</p>
					) : (
						<div className="overflow-x-auto rounded-md border border-border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>From</TableHead>
										<TableHead>Subject</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Received</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filtered.map((message) => {
										const isExpanded = expandedId === message.id;
										const isPending =
											message.status.toLowerCase() === "pending";
										const isBusy =
											updatingId === message.id || updateState.isLoading;
										return (
											<Fragment key={message.id}>
												<TableRow
													className="cursor-pointer"
													onClick={() =>
														setExpandedId((id) =>
															id === message.id ? null : message.id,
														)
													}
												>
													<TableCell>
														<div className="flex flex-col gap-0.5">
															<span className="font-medium">{message.name}</span>
															<span className="text-xs text-muted-foreground">
																{[message.email, message.phone]
																	.filter(Boolean)
																	.join(" · ") || "—"}
															</span>
														</div>
													</TableCell>
													<TableCell className="max-w-60 truncate">
														{message.subject}
													</TableCell>
													<TableCell>
														<Badge
															variant={statusBadgeVariant(message.status)}
														>
															{message.status}
														</Badge>
													</TableCell>
													<TableCell className="whitespace-nowrap text-muted-foreground">
														{formatWhen(message.created_at)}
													</TableCell>
													<TableCell className="text-right">
														{isPending ? (
															<Button
																type="button"
																size="sm"
																variant="outline"
																disabled={isBusy}
																onClick={(e) => {
																	e.stopPropagation();
																	void setMessageStatus(message, "resolved");
																}}
															>
																{isBusy && updatingId === message.id ? (
																	<Loader2Icon
																		data-icon="inline-start"
																		className="animate-spin"
																		aria-hidden
																	/>
																) : null}
																Mark resolved
															</Button>
														) : (
															<Button
																type="button"
																size="sm"
																variant="ghost"
																disabled={isBusy}
																onClick={(e) => {
																	e.stopPropagation();
																	void setMessageStatus(message, "pending");
																}}
															>
																{isBusy && updatingId === message.id ? (
																	<Loader2Icon
																		data-icon="inline-start"
																		className="animate-spin"
																		aria-hidden
																	/>
																) : null}
																Reopen
															</Button>
														)}
													</TableCell>
												</TableRow>
												{isExpanded ? (
													<TableRow>
														<TableCell colSpan={5} className="bg-muted/30">
															<div className="flex flex-col gap-2 py-2 text-sm">
																<p className="whitespace-pre-wrap text-foreground">
																	{message.message}
																</p>
																{message.resolved_at ? (
																	<p className="text-xs text-muted-foreground">
																		Resolved {formatWhen(message.resolved_at)}
																	</p>
																) : null}
															</div>
														</TableCell>
													</TableRow>
												) : null}
											</Fragment>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
