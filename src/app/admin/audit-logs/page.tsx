"use client";

import { useMemo, useState } from "react";
import { Loader2Icon, XIcon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { useListAdminAuditLogsQuery } from "@/services/admin/adminApi";
import {
	useGetUserByIdQuery,
	useListAllUsersQuery,
} from "@/services/auth/authApi";
import {
	useGetBusinessQuery,
	useLazyGetBusinessQuery,
} from "@/services/branch-management/branchManagementApi";
import { useListPlatformStaffQuery } from "@/services/platform/platformApi";
import { useListAdminSubscriptionTransactionsQuery } from "@/services/subscription/subscriptionApi";
import type { AuditLogOutput } from "@/services/types";
import { formatPlatformLabel, formatUserDisplayName } from "@/lib/userDisplay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
const ADMIN_ALL = "all";
const ACTION_ALL = "all";

const ACTION_PRESETS = [
	{ value: "create_business", label: "Create business" },
	{ value: "register_user", label: "Register user" },
	{ value: "assign_subscription", label: "Assign subscription" },
	{ value: "grant_credits", label: "Grant credits" },
	{ value: "update_superuser", label: "Update superuser" },
] as const;

type DatePreset = "all" | "today" | "7d" | "30d" | "custom";

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

function toDateInputValue(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function dayStartIso(yyyyMmDd: string): string {
	return new Date(`${yyyyMmDd}T00:00:00`).toISOString();
}

function dayEndIso(yyyyMmDd: string): string {
	return new Date(`${yyyyMmDd}T23:59:59.999`).toISOString();
}

function rangeForPreset(preset: DatePreset): { from: string; to: string } {
	const today = new Date();
	const to = toDateInputValue(today);
	if (preset === "today") return { from: to, to };
	if (preset === "7d") {
		const from = new Date(today);
		from.setDate(from.getDate() - 6);
		return { from: toDateInputValue(from), to };
	}
	if (preset === "30d") {
		const from = new Date(today);
		from.setDate(from.getDate() - 29);
		return { from: toDateInputValue(from), to };
	}
	return { from: "", to: "" };
}

function detailString(
	details: Record<string, unknown> | null | undefined,
	key: string,
): string | null {
	const value = details?.[key];
	if (typeof value === "string" && value.trim()) return value.trim();
	return typeof value === "number" ? String(value) : null;
}

function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

function DetailValue({ value }: { value: unknown }) {
	if (typeof value === "string" && isHttpUrl(value)) {
		return (
			<a
				href={value}
				target="_blank"
				rel="noopener noreferrer"
				className="text-brand-ink underline-offset-2 hover:underline"
			>
				Link
			</a>
		);
	}
	if (typeof value === "string" || typeof value === "number") {
		return <>{String(value)}</>;
	}
	return <>{JSON.stringify(value, null, 2)}</>;
}

function AuditAdminCell({
	adminId,
	labelById,
}: {
	adminId: string;
	labelById: Map<string, string>;
}) {
	const cached = labelById.get(adminId);
	const { data: user, isLoading } = useGetUserByIdQuery(
		{ userId: adminId },
		{ skip: Boolean(cached) },
	);
	if (cached) {
		return (
			<p className="truncate text-sm font-medium text-foreground">{cached}</p>
		);
	}
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

function DetailEntries({
	details,
	businessName,
	businessLoading,
}: {
	details: AuditLogOutput["details"];
	businessName?: string;
	businessLoading: boolean;
}) {
	const entries = details ? Object.entries(details) : [];
	const ownerId = detailString(details, "owner_id");
	const planId = detailString(details, "plan_id");
	const { data: owner, isLoading: ownerLoading } = useGetUserByIdQuery(
		{ userId: ownerId ?? "" },
		{ skip: !ownerId },
	);
	const { data: subscriptions, isLoading: planLoading } =
		useListAdminSubscriptionTransactionsQuery({ planId }, { skip: !planId });
	const plan = subscriptions?.find(
		(subscription) => subscription.plan_id === planId,
	)?.plan;
	if (!details || Object.keys(details).length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				No extra details recorded.
			</p>
		);
	}
	return (
		<dl className="divide-y divide-border rounded-lg border border-border bg-muted/20">
			{entries.map(([key, value]) => {
				const resolvedValue =
					key === "business_id"
						? (businessName ??
							(businessLoading ? "Loading business…" : value))
						: key === "owner_id"
							? owner
								? formatUserDisplayName(owner)
								: ownerLoading
									? "Loading user…"
									: value
							: key === "plan_id"
								? (plan?.name ?? (planLoading ? "Loading plan…" : value))
								: value;
				return (
					<div
						key={key}
						className="grid gap-1 px-3 py-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-4"
					>
						<dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
							{formatPlatformLabel(key)}
						</dt>
						<dd className="font-mono text-sm break-all text-foreground">
							<DetailValue value={resolvedValue} />
						</dd>
					</div>
				);
			})}
		</dl>
	);
}

export default function AuditLogsPage() {
	const [offset, setOffset] = useState(0);
	const [datePreset, setDatePreset] = useState<DatePreset>("30d");
	const [dateFrom, setDateFrom] = useState(() => rangeForPreset("30d").from);
	const [dateTo, setDateTo] = useState(() => rangeForPreset("30d").to);
	const [adminFilter, setAdminFilter] = useState(ADMIN_ALL);
	const [actionFilter, setActionFilter] = useState(ACTION_ALL);
	const [actionCustom, setActionCustom] = useState("");
	const [selected, setSelected] = useState<AuditLogOutput | null>(null);
	const [selectedBusiness, setSelectedBusiness] = useState<{
		id: string;
		name: string;
	}>();
	const [fetchBusiness, { isLoading: selectedBusinessLoading }] =
		useLazyGetBusinessQuery();

	const { data: staff } = useListPlatformStaffQuery();
	const { data: users } = useListAllUsersQuery();

	const adminLabelById = useMemo(() => {
		const map = new Map<string, string>();
		for (const u of users ?? []) {
			map.set(u.id, formatUserDisplayName(u));
		}
		return map;
	}, [users]);

	const resolvedAction =
		actionFilter === ACTION_ALL
			? null
			: actionFilter === "custom"
				? actionCustom.trim() || null
				: actionFilter;

	const startDate = dateFrom ? dayStartIso(dateFrom) : null;
	const endDate = dateTo ? dayEndIso(dateTo) : null;

	const { data, error, isLoading, isFetching, refetch } =
		useListAdminAuditLogsQuery({
			limit: PAGE_SIZE,
			offset,
			startDate,
			endDate,
			action: resolvedAction,
			adminId: adminFilter === ADMIN_ALL ? null : adminFilter,
		});

	const rows = data ?? [];
	const canPrev = offset > 0;
	const canNext = rows.length >= PAGE_SIZE;

	function selectAuditRow(row: AuditLogOutput) {
		setSelected(row);
		const businessId = detailString(row.details, "business_id");
		if (!businessId) return;
		void fetchBusiness({ businessId })
			.unwrap()
			.then((business) => setSelectedBusiness({ id: business.id, name: business.name }))
			.catch(() => undefined);
	}

	const adminOptions = useMemo(() => {
		const ids = new Set<string>();
		for (const u of users ?? []) {
			if (u.is_superuser) ids.add(u.id);
		}
		for (const member of staff ?? []) {
			ids.add(member.user_id);
		}
		for (const row of rows) {
			if (row.admin_id) ids.add(row.admin_id);
		}
		const options = [...ids].map((id) => ({
			id,
			label: adminLabelById.get(id) ?? id.slice(0, 8),
		}));
		options.sort((a, b) => a.label.localeCompare(b.label));
		return options;
	}, [users, staff, rows, adminLabelById]);

	const filtersActive =
		datePreset !== "all" ||
		Boolean(dateFrom) ||
		Boolean(dateTo) ||
		adminFilter !== ADMIN_ALL ||
		actionFilter !== ACTION_ALL ||
		Boolean(actionCustom.trim());

	const actionOptions = useMemo(() => {
		const fromRows = new Set(
			rows.map((r) => r.action).filter((a): a is string => Boolean(a?.trim())),
		);
		const presets = ACTION_PRESETS.map((p) => p.value);
		const extras = [...fromRows]
			.filter((a) => !presets.includes(a as (typeof presets)[number]))
			.sort();
		return extras;
	}, [rows]);

	function applyPreset(preset: DatePreset) {
		setDatePreset(preset);
		setOffset(0);
		if (preset === "custom") return;
		const range = rangeForPreset(preset);
		setDateFrom(range.from);
		setDateTo(range.to);
	}

	function clearFilters() {
		setDatePreset("all");
		setDateFrom("");
		setDateTo("");
		setAdminFilter(ADMIN_ALL);
		setActionFilter(ACTION_ALL);
		setActionCustom("");
		setOffset(0);
	}

	const adminFilterLabel =
		adminFilter === ADMIN_ALL
			? "All admins"
			: (adminLabelById.get(adminFilter) ?? "Selected admin");

	const actionFilterLabel =
		actionFilter === ACTION_ALL
			? "All actions"
			: actionFilter === "custom"
				? actionCustom.trim() || "Custom action"
				: (ACTION_PRESETS.find((p) => p.value === actionFilter)?.label ??
					formatPlatformLabel(actionFilter));

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Audit logs"
				description="Who changed what, and when. Superuser-only trail of admin actions."
			/>

			<section
				aria-labelledby="audit-filters-heading"
				className="flex flex-col gap-3"
			>
				<Card size="sm">
					<CardHeader className="border-b">
						<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<CardTitle id="audit-filters-heading">Find events</CardTitle>
								<CardDescription>
									Filter by date, admin, and action — then open a row for
									details.
								</CardDescription>
							</div>
							{filtersActive ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={clearFilters}
								>
									Clear filters
								</Button>
							) : null}
						</div>
					</CardHeader>
					<CardContent className="flex flex-col gap-4 pt-4">
						<div
							className="flex flex-wrap gap-2"
							role="group"
							aria-label="Date range"
						>
							{(
								[
									["all", "All time"],
									["today", "Today"],
									["7d", "Last 7 days"],
									["30d", "Last 30 days"],
									["custom", "Custom"],
								] as const
							).map(([value, label]) => (
								<Button
									key={value}
									type="button"
									size="sm"
									variant={datePreset === value ? "default" : "outline"}
									className={cn(
										"h-8 transition-colors duration-150",
										datePreset === value ? "" : "bg-background",
									)}
									onClick={() => applyPreset(value)}
								>
									{label}
								</Button>
							))}
						</div>

						<div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:p-4">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<Field className="gap-1">
									<FieldLabel className="text-[11px] text-muted-foreground">
										From
									</FieldLabel>
									<Input
										type="date"
										value={dateFrom}
										max={dateTo || undefined}
										onChange={(e) => {
											setDateFrom(e.target.value);
											setDatePreset("custom");
											setOffset(0);
										}}
										className="h-9 bg-background"
									/>
								</Field>
								<Field className="gap-1">
									<FieldLabel className="text-[11px] text-muted-foreground">
										To
									</FieldLabel>
									<Input
										type="date"
										value={dateTo}
										min={dateFrom || undefined}
										onChange={(e) => {
											setDateTo(e.target.value);
											setDatePreset("custom");
											setOffset(0);
										}}
										className="h-9 bg-background"
									/>
								</Field>
								<Field className="gap-1">
									<FieldLabel className="text-[11px] text-muted-foreground">
										Admin
									</FieldLabel>
									<Select
										value={adminFilter}
										onValueChange={(v) => {
											if (v == null) return;
											setAdminFilter(v);
											setOffset(0);
										}}
									>
										<SelectTrigger className="h-9 w-full bg-background">
											<span className="flex flex-1 truncate text-left text-sm">
												{adminFilterLabel}
											</span>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value={ADMIN_ALL}>All admins</SelectItem>
												{adminOptions.map((opt) => (
													<SelectItem key={opt.id} value={opt.id}>
														{opt.label}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field className="gap-1">
									<FieldLabel className="text-[11px] text-muted-foreground">
										Action
									</FieldLabel>
									<Select
										value={actionFilter}
										onValueChange={(v) => {
											if (v == null) return;
											setActionFilter(v);
											if (v !== "custom") setActionCustom("");
											setOffset(0);
										}}
									>
										<SelectTrigger className="h-9 w-full bg-background">
											<span className="flex flex-1 truncate text-left text-sm">
												{actionFilterLabel}
											</span>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value={ACTION_ALL}>All actions</SelectItem>
												{ACTION_PRESETS.map((opt) => (
													<SelectItem key={opt.value} value={opt.value}>
														{opt.label}
													</SelectItem>
												))}
												{actionOptions.map((action) => (
													<SelectItem key={action} value={action}>
														{formatPlatformLabel(action)}
													</SelectItem>
												))}
												<SelectItem value="custom">Custom…</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							</div>

							{actionFilter === "custom" ? (
								<Field className="gap-1 max-w-md">
									<FieldLabel className="text-[11px] text-muted-foreground">
										Action key
									</FieldLabel>
									<Input
										value={actionCustom}
										onChange={(e) => {
											setActionCustom(e.target.value);
											setOffset(0);
										}}
										placeholder="Exact action string from the API"
										className="h-9 bg-background font-mono text-sm"
										autoFocus
									/>
								</Field>
							) : null}

							{filtersActive ? (
								<div className="flex flex-wrap items-center gap-2">
									{dateFrom || dateTo ? (
										<Badge variant="secondary" className="gap-1 font-normal">
											{dateFrom || "…"} → {dateTo || "…"}
											<button
												type="button"
												className="rounded-sm p-0.5 hover:bg-muted"
												aria-label="Clear date filter"
												onClick={() => applyPreset("all")}
											>
												<XIcon className="size-3" />
											</button>
										</Badge>
									) : null}
									{adminFilter !== ADMIN_ALL ? (
										<Badge variant="secondary" className="gap-1 font-normal">
											{adminFilterLabel}
											<button
												type="button"
												className="rounded-sm p-0.5 hover:bg-muted"
												aria-label="Clear admin filter"
												onClick={() => {
													setAdminFilter(ADMIN_ALL);
													setOffset(0);
												}}
											>
												<XIcon className="size-3" />
											</button>
										</Badge>
									) : null}
									{resolvedAction ? (
										<Badge variant="secondary" className="gap-1 font-normal">
											{formatPlatformLabel(resolvedAction)}
											<button
												type="button"
												className="rounded-sm p-0.5 hover:bg-muted"
												aria-label="Clear action filter"
												onClick={() => {
													setActionFilter(ACTION_ALL);
													setActionCustom("");
													setOffset(0);
												}}
											>
												<XIcon className="size-3" />
											</button>
										</Badge>
									) : null}
								</div>
							) : null}
						</div>
					</CardContent>
				</Card>
			</section>

			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Couldn’t load audit logs</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(error, "Request failed.")}</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => refetch()}
						>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			<section
				aria-labelledby="audit-results-heading"
				className="flex flex-col gap-3"
			>
				<div className="flex flex-col gap-0.5">
					<h2
						id="audit-results-heading"
						className="text-sm font-semibold tracking-tight text-foreground"
					>
						Events
					</h2>
					<p className="text-sm text-muted-foreground">
						Click a row to inspect payload details.
					</p>
				</div>

				<Card>
					<CardContent className="pt-6">
						{isLoading ? (
							<div className="flex flex-col gap-2">
								{Array.from({ length: 6 }).map((_, i) => (
									<Skeleton key={i} className="h-12 w-full" />
								))}
							</div>
						) : rows.length === 0 ? (
							<div className="flex flex-col items-start gap-1 py-10">
								<p className="text-sm font-medium text-foreground">
									No events match
								</p>
								<p className="max-w-md text-sm text-muted-foreground">
									Widen the date range or clear filters to see the full trail.
								</p>
								{filtersActive ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="mt-3"
										onClick={clearFilters}
									>
										Clear filters
									</Button>
								) : null}
							</div>
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
											<TableRow
												key={row.id}
												className="cursor-pointer transition-colors duration-150"
												onClick={() => selectAuditRow(row)}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														selectAuditRow(row);
													}
												}}
												tabIndex={0}
												aria-label={`Open details for ${formatPlatformLabel(row.action)}`}
											>
												<TableCell className="whitespace-nowrap text-sm text-muted-foreground">
													{formatWhen(row.created_at)}
												</TableCell>
												<TableCell>
													<AuditAdminCell
														adminId={row.admin_id}
														labelById={adminLabelById}
													/>
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
			</section>

			<Sheet
				open={selected != null}
				onOpenChange={(open) => {
					if (!open) setSelected(null);
				}}
			>
				<SheetContent className="flex w-full flex-col gap-8 p-6 sm:max-w-md">
					{selected ? (
						<>
							<SheetHeader className="p-0">
								<SheetTitle>{formatPlatformLabel(selected.action)}</SheetTitle>
								<SheetDescription>
									{formatWhen(selected.created_at)}
									{selected.ip_address ? ` · ${selected.ip_address}` : ""}
								</SheetDescription>
							</SheetHeader>
							<div className="flex flex-col gap-8 overflow-y-auto pb-2">
								<div className="grid gap-3">
									<div>
										<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
											Admin
										</p>
										<div className="mt-1">
											<AuditAdminCell
												adminId={selected.admin_id}
												labelById={adminLabelById}
											/>
										</div>
									</div>
									<div>
										<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
											Entity
										</p>
										<div className="mt-1">
											<AuditEntityCell row={selected} />
										</div>
									</div>
								</div>
								<div>
									<p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
										Details
									</p>
									<DetailEntries
										details={selected.details}
										businessName={selectedBusiness?.name}
										businessLoading={selectedBusinessLoading}
									/>
								</div>
							</div>
						</>
					) : null}
				</SheetContent>
			</Sheet>
		</div>
	);
}
