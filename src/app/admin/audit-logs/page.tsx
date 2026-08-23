"use client";

import { useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { useListAdminAuditLogsQuery } from "@/services/admin/adminApi";
import { useListAllUsersQuery } from "@/services/auth/authApi";
import { formatUserDisplayName } from "@/lib/userDisplay";
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

export default function AuditLogsPage() {
	const [offset, setOffset] = useState(0);
	const { data: users } = useListAllUsersQuery();
	const { data, error, isLoading, isFetching, refetch } =
		useListAdminAuditLogsQuery({ limit: PAGE_SIZE, offset });

	const usersById = useMemo(() => {
		const map = new Map<string, string>();
		for (const u of users ?? []) {
			map.set(u.id, formatUserDisplayName(u));
		}
		return map;
	}, [users]);

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
											<TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
												{formatWhen(row.created_at)}
											</TableCell>
											<TableCell className="text-sm">
												{usersById.get(row.admin_id) ?? (
													<span className="font-mono text-xs">
														{row.admin_id.slice(0, 8)}…
													</span>
												)}
											</TableCell>
											<TableCell>
												<Badge variant="secondary">{row.action}</Badge>
											</TableCell>
											<TableCell className="text-sm">
												<span className="text-muted-foreground">
													{row.entity_type ?? "—"}
												</span>
												{row.entity_id ? (
													<span className="ml-1 font-mono text-xs text-muted-foreground">
														{row.entity_id.slice(0, 8)}…
													</span>
												) : null}
											</TableCell>
											<TableCell className="font-mono text-xs text-muted-foreground">
												{row.ip_address ?? "—"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}

					<div className="mt-4 flex items-center justify-between gap-3">
						<p className="font-mono text-xs tabular-nums text-muted-foreground">
							Offset {offset}
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
