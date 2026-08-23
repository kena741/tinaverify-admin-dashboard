"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { useListAdminAuditLogsQuery } from "@/services/admin/adminApi";
import { useGetUserByIdQuery } from "@/services/auth/authApi";
import { useGetBusinessQuery } from "@/services/branch-management/branchManagementApi";
import type { AuditLogOutput } from "@/services/types";
import { formatPlatformLabel, formatUserDisplayName } from "@/lib/userDisplay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 50;

function getErrorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"data" in error &&
		(error as { data?: { detail?: unknown } }).data?.detail
	) {
		const detail = (error as { data: { detail: unknown } }).data.detail;
		if (typeof detail === "string") return detail;
		if (Array.isArray(detail)) {
			const messages = detail
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

function formatWhen(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function detailString(
	details: Record<string, unknown> | null | undefined,
	key: string,
): string | null {
	const value = details?.[key];
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function AuditAdminCell({ adminId }: { adminId: string }) {
	const { data: user, isLoading } = useGetUserByIdQuery({ userId: adminId });
	if (isLoading) {
		return <span className="text-sm text-muted-foreground">Loading…</span>;
	}
	if (!user) {
		return <span className="text-sm text-muted-foreground">Unknown admin</span>;
	}
	const name = formatUserDisplayName(user);
	const secondary = user.email?.trim() || user.phone_number?.trim() || null;
	return (
		<div className="min-w-0">
			<p className="truncate text-sm font-medium text-foreground">{name}</p>
			{secondary ? (
				<p className="truncate text-xs text-muted-foreground">{secondary}</p>
			) : null}
		</div>
	);
}

function AuditEntityCell({ row }: { row: AuditLogOutput }) {
	const entityType = (row.entity_type ?? "").toLowerCase();
	const isUser = entityType === "user";
	const isBusiness = entityType === "business";

	const { data: user, isLoading: userLoading } = useGetUserByIdQuery(
		{ userId: row.entity_id ?? "" },
		{ skip: !isUser || !row.entity_id },
	);
	const { data: business, isLoading: businessLoading } = useGetBusinessQuery(
		{ businessId: row.entity_id ?? "" },
		{ skip: !isBusiness || !row.entity_id },
	);

	const detailEmail = detailString(row.details, "email");
	const detailPhone = detailString(row.details, "phone_number");
	const detailName =
		detailString(row.details, "name") ||
		detailString(row.details, "username") ||
		[
			detailString(row.details, "first_name"),
			detailString(row.details, "last_name"),
		]
			.filter(Boolean)
			.join(" ")
			.trim() ||
		null;

	let title = "—";
	let secondary: string | null = null;

	if (isUser) {
		if (user) {
			title = formatUserDisplayName(user);
			secondary = user.email?.trim() || user.phone_number?.trim() || null;
		} else if (detailEmail || detailPhone || detailName) {
			title = detailName || detailEmail || detailPhone || "User";
			const extras = [detailEmail, detailPhone].filter(
				(v): v is string => Boolean(v) && v !== title,
			);
			secondary = extras[0] ?? null;
		} else if (userLoading) {
			title = "Loading…";
		} else {
			title = "Unknown user";
		}
	} else if (isBusiness) {
		if (business) {
			title = business.name;
			secondary = business.tin_number || null;
		} else if (detailName) {
			title = detailName;
		} else if (businessLoading) {
			title = "Loading…";
		} else {
			title = "Unknown business";
		}
	} else if (row.entity_type) {
		title = formatPlatformLabel(row.entity_type);
		secondary = detailName || detailEmail || detailPhone;
	}

	const typeLabel = row.entity_type
		? formatPlatformLabel(row.entity_type)
		: null;

	return (
		<div className="min-w-0">
			{typeLabel ? (
				<p className="text-xs text-muted-foreground">{typeLabel}</p>
			) : null}
			<p className="truncate text-sm font-medium text-foreground">{title}</p>
			{secondary ? (
				<p className="truncate text-xs text-muted-foreground">{secondary}</p>
			) : null}
		</div>
	);
}

export default function AuditLogsPage() {
	const [offset, setOffset] = useState(0);
	const { data, error, isLoading, isFetching, refetch } =
		useListAdminAuditLogsQuery({ limit: PAGE_SIZE, offset });

	const rows = data ?? [];
	const canPrev = offset > 0;
	const canNext = rows.length >= PAGE_SIZE;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Audit logs"
				description="Admin actions recorded by the API (superuser only)."
			/>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Couldn’t load audit logs</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(error, "Request failed.")}</span>
						<Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardContent className="pt-6">
					{isLoading ? (
						<div className="flex flex-col gap-2">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : rows.length === 0 ? (
						<p className="text-sm text-muted-foreground">No audit events yet.</p>
					) : (
						<div className="overflow-x-auto rounded-xl border border-border">
							<Table>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead>When</TableHead>
										<TableHead>Admin</TableHead>
										<TableHead>Action</TableHead>
										<TableHead>Entity</TableHead>
										<TableHead>IP</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((row) => (
										<TableRow key={row.id}>
											<TableCell className="whitespace-nowrap text-sm text-muted-foreground">
												{formatWhen(row.created_at)}
											</TableCell>
											<TableCell>
												<AuditAdminCell adminId={row.admin_id} />
											</TableCell>
											<TableCell>
												<Badge variant="secondary">
													{formatPlatformLabel(row.action)}
												</Badge>
											</TableCell>
											<TableCell>
												<AuditEntityCell row={row} />
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{row.ip_address ?? "—"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}

					<div className="mt-4 flex items-center justify-between gap-3">
						<p className="text-xs text-muted-foreground">
							Showing {rows.length} event{rows.length === 1 ? "" : "s"}
							{offset > 0 ? ` · from ${offset + 1}` : ""}
							{isFetching ? " · refreshing…" : ""}
						</p>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!canPrev || isFetching}
								onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
							>
								Previous
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!canNext || isFetching}
								onClick={() => setOffset((o) => o + PAGE_SIZE)}
							>
								{isFetching ? (
									<Loader2Icon className="animate-spin" aria-hidden />
								) : null}
								Next
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
