"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	ArrowLeftIcon,
	Building2Icon,
	Loader2Icon,
	MapPinIcon,
	PlusIcon,
	TablePropertiesIcon,
	UsersIcon,
} from "lucide-react";

import { employeeUserDisplayName } from "../../../../../lib/userDisplay";
import {
	useGetBranchQuery,
	useListBusinessEmployeesQuery,
	useListMyBusinessesQuery,
	useUpdateBranchMutation,
} from "../../../../services/branch-management/branchManagementApi";
import {
	useCreateTableMutation,
	useListBranchTablesQuery,
} from "../../../../services/tables/tablesApi";
import type { BranchOutput } from "../../../../services/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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

function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

type SettingsFormState = {
	name: string;
	address: string;
	isHeadQuarter: boolean;
	isArchived: boolean;
};

function branchToSettingsForm(b: BranchOutput): SettingsFormState {
	return {
		name: b.name,
		address: b.address ?? "",
		isHeadQuarter: b.is_head_quarter,
		isArchived: b.is_archived,
	};
}

export default function BranchDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { id } = use(params);

	const {
		data: branch,
		isLoading: branchLoading,
		isError: branchError,
		error: branchQueryError,
	} = useGetBranchQuery({ branchId: id }, { skip: !id });

	const { data: businesses = [], isLoading: businessesLoading } =
		useListMyBusinessesQuery();

	const businessName = useMemo(() => {
		if (!branch) return null;
		return businesses.find((b) => b.id === branch.business_id)?.name ?? null;
	}, [branch, businesses]);

	const {
		data: tables = [],
		isLoading: tablesLoading,
		error: tablesError,
	} = useListBranchTablesQuery({ branchId: id }, { skip: !id || !branch });

	const {
		data: businessEmployees = [],
		isLoading: employeesLoading,
		error: employeesError,
	} = useListBusinessEmployeesQuery(
		{ businessId: branch?.business_id ?? "" },
		{ skip: !branch?.business_id },
	);

	const branchTeam = useMemo(
		() => businessEmployees.filter((e) => e.branch_id === id),
		[businessEmployees, id],
	);

	const activeTables = tables.filter((t) => !t.is_archived).length;

	const [createOpen, setCreateOpen] = useState(false);
	const [newTableName, setNewTableName] = useState("");
	const [createError, setCreateError] = useState<string | null>(null);
	const [createTable, { isLoading: creatingTable }] = useCreateTableMutation();

	const baseSettings = useMemo(
		() => (branch ? branchToSettingsForm(branch) : null),
		[branch],
	);
	const [settingsOverride, setSettingsOverride] =
		useState<SettingsFormState | null>(null);
	const [settingsBranchId, setSettingsBranchId] = useState(id);
	if (id !== settingsBranchId) {
		setSettingsBranchId(id);
		setSettingsOverride(null);
	}
	const settingsForm = settingsOverride ?? baseSettings;

	const [settingsError, setSettingsError] = useState<string | null>(null);
	const [settingsFieldErrors, setSettingsFieldErrors] = useState<
		Partial<Record<"name", string>>
	>({});
	const [updateBranch, { isLoading: savingSettings }] =
		useUpdateBranchMutation();

	const loadError = branchError
		? getErrorMessage(branchQueryError, "Could not load this branch.")
		: null;

	const handleCreateTable = async (event: React.FormEvent) => {
		event.preventDefault();
		setCreateError(null);
		const name = newTableName.trim();
		if (!name) {
			setCreateError("Enter a table name.");
			return;
		}
		try {
			await createTable({ branch_id: id, name }).unwrap();
			setNewTableName("");
			setCreateOpen(false);
		} catch (err) {
			setCreateError(getErrorMessage(err, "Could not create the table."));
		}
	};

	const handleSaveSettings = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!branch || !settingsForm) return;
		setSettingsError(null);
		setSettingsFieldErrors({});
		const name = settingsForm.name.trim();
		if (!name) {
			setSettingsFieldErrors({ name: "Branch name is required." });
			return;
		}
		try {
			await updateBranch({
				branchId: id,
				body: {
					name,
					address: settingsForm.address.trim() || null,
					is_head_quarter: settingsForm.isHeadQuarter,
					is_archived: settingsForm.isArchived,
				},
			}).unwrap();
			setSettingsOverride(null);
		} catch (err) {
			setSettingsError(
				getErrorMessage(err, "Could not update branch settings."),
			);
		}
	};

	if (branchLoading || businessesLoading) {
		return (
			<main className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
				<Loader2Icon
					className="animate-spin text-muted-foreground"
					aria-hidden="true"
				/>
				<p className="text-sm text-muted-foreground" role="status">
					Loading branch…
				</p>
			</main>
		);
	}

	if (loadError) {
		return (
			<main className="flex flex-col gap-4">
				<Alert variant="destructive">
					<AlertTitle>Could not load branch</AlertTitle>
					<AlertDescription>{loadError}</AlertDescription>
				</Alert>
				<Button type="button" variant="outline" onClick={() => router.back()}>
					<ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
					Go Back
				</Button>
			</main>
		);
	}

	if (!branch) {
		return (
			<main className="flex flex-col gap-4">
				<Alert>
					<AlertTitle>Branch not found</AlertTitle>
					<AlertDescription>
						This branch does not exist or you do not have access.
					</AlertDescription>
				</Alert>
				<Link
					href="/admin/branches"
					className={cn(buttonVariants({ variant: "outline" }))}
				>
					Back to branches
				</Link>
			</main>
		);
	}

	return (
		<main className="flex flex-col gap-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={() => router.back()}
							aria-label="Back"
						>
							<ArrowLeftIcon aria-hidden="true" />
						</Button>
						<h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
							{branch.name}
						</h1>
					</div>
					<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
						<Building2Icon className="shrink-0" aria-hidden="true" />
						<span>{businessName ?? "Business"}</span>
						<Badge variant={branch.is_archived ? "outline" : "default"}>
							{branch.is_archived ? "Archived" : "Active"}
						</Badge>
						{branch.is_head_quarter ? (
							<Badge variant="secondary">Headquarters</Badge>
						) : null}
					</div>
					{branch.address ? (
						<p className="flex max-w-2xl gap-2 text-sm text-muted-foreground">
							<MapPinIcon className="mt-0.5 shrink-0" aria-hidden="true" />
							<span>{branch.address}</span>
						</p>
					) : null}
				</div>
				<Link
					href="/admin/branches"
					className={cn(buttonVariants({ variant: "outline" }))}
				>
					All branches
				</Link>
			</header>

			<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center gap-2 pb-2">
						<TablePropertiesIcon
							className="text-muted-foreground"
							aria-hidden="true"
						/>
						<CardTitle className="text-base">Tables</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold tabular-nums">
							{tablesLoading ? "—" : activeTables}
						</p>
						<CardDescription>
							{tablesLoading
								? "Loading…"
								: `${tables.length} total (${activeTables} active)`}
						</CardDescription>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center gap-2 pb-2">
						<UsersIcon className="text-muted-foreground" aria-hidden="true" />
						<CardTitle className="text-base">Team</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold tabular-nums">
							{employeesLoading ? "—" : branchTeam.length}
						</p>
						<CardDescription>
							Employees assigned to this branch (from API).
						</CardDescription>
					</CardContent>
				</Card>
				<Card className="sm:col-span-2 lg:col-span-2">
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Timestamps</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
						<span>Created {formatDateTime(branch.created_at)}</span>
						<span>Updated {formatDateTime(branch.updated_at)}</span>
					</CardContent>
				</Card>
			</section>

			<Tabs defaultValue="overview" className="gap-4">
				<TabsList className="w-full flex-wrap sm:w-fit">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="tables">
						Tables
						{!tablesLoading ? (
							<Badge variant="secondary" className="ml-1 tabular-nums">
								{tables.length}
							</Badge>
						) : null}
					</TabsTrigger>
					<TabsTrigger value="team">
						Team
						{!employeesLoading ? (
							<Badge variant="secondary" className="ml-1 tabular-nums">
								{branchTeam.length}
							</Badge>
						) : null}
					</TabsTrigger>
					<TabsTrigger value="settings">Settings</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="flex flex-col gap-4">
					<Card>
						<CardHeader>
							<CardTitle>Branch details</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<dl className="grid gap-3 sm:grid-cols-2">
								<div>
									<dt className="text-xs font-medium text-muted-foreground">
										Branch name
									</dt>
									<dd className="text-sm">{branch.name}</dd>
								</div>
								<div>
									<dt className="text-xs font-medium text-muted-foreground">
										Business
									</dt>
									<dd className="text-sm">{businessName ?? "—"}</dd>
								</div>
								<div>
									<dt className="text-xs font-medium text-muted-foreground">
										Headquarters
									</dt>
									<dd className="text-sm">
										{branch.is_head_quarter ? "Yes" : "No"}
									</dd>
								</div>
							</dl>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="tables" className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<Button type="button" onClick={() => setCreateOpen(true)}>
							<PlusIcon data-icon="inline-start" aria-hidden="true" />
							Add Table
						</Button>
					</div>
					{tablesError ? (
						<Alert variant="destructive">
							<AlertTitle>Could not load tables</AlertTitle>
							<AlertDescription>
								{getErrorMessage(tablesError, "Request failed.")}
							</AlertDescription>
						</Alert>
					) : null}
					{tablesLoading ? (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2Icon className="animate-spin" aria-hidden="true" />
							Loading tables…
						</div>
					) : tables.length === 0 ? (
						<Alert className="border-none">
							<AlertTitle>No tables yet</AlertTitle>
							<AlertDescription>
								Create a table for this branch to use it in service.
							</AlertDescription>
						</Alert>
					) : (
						<div className="overflow-x-auto rounded-lg border border-border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="hidden md:table-cell">
											Updated
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{tables.map((t) => (
										<TableRow key={t.id}>
											<TableCell className="font-medium">{t.name}</TableCell>
											<TableCell>
												<Badge variant={t.is_archived ? "outline" : "default"}>
													{t.is_archived ? "Archived" : "Active"}
												</Badge>
											</TableCell>
											<TableCell className="hidden text-muted-foreground md:table-cell">
												{formatDateTime(t.updated_at)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</TabsContent>

				<TabsContent value="team" className="flex flex-col gap-4">
					{employeesError ? (
						<Alert variant="destructive">
							<AlertTitle>Could not load employees</AlertTitle>
							<AlertDescription>
								{getErrorMessage(employeesError, "Request failed.")}
							</AlertDescription>
						</Alert>
					) : null}
					{employeesLoading ? (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2Icon className="animate-spin" aria-hidden="true" />
							Loading team…
						</div>
					) : branchTeam.length === 0 ? (
						<Alert className="border-none">
							<AlertTitle>No employees on this branch</AlertTitle>
							<AlertDescription>
								Assign staff in your HR tools or invite employees for this
								business.
							</AlertDescription>
						</Alert>
					) : (
						<div className="overflow-x-auto rounded-lg border border-border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead className="hidden sm:table-cell">
											Active
										</TableHead>
										<TableHead className="hidden md:table-cell">
											Phone
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{branchTeam.map((emp) => (
										<TableRow key={emp.id}>
											<TableCell className="font-medium">
												{employeeUserDisplayName(emp)}
											</TableCell>
											<TableCell className="hidden sm:table-cell">
												<Badge variant={emp.is_active ? "default" : "outline"}>
													{emp.is_active ? "Active" : "Inactive"}
												</Badge>
											</TableCell>
											<TableCell className="hidden text-muted-foreground md:table-cell">
												{emp.user?.phone_number ?? "—"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</TabsContent>

				<TabsContent value="settings" className="flex flex-col gap-4">
					<Card>
						<CardHeader>
							<CardTitle>Edit branch</CardTitle>
						</CardHeader>
						<CardContent>
							{settingsForm ? (
								<form
									onSubmit={handleSaveSettings}
									className="flex flex-col gap-4"
								>
									<FieldGroup className="flex flex-col gap-4">
										<Field
											data-invalid={settingsFieldErrors.name ? true : undefined}
										>
											<FieldLabel htmlFor="branch-name">Branch name</FieldLabel>
											<Input
												id="branch-name"
												value={settingsForm.name}
												onChange={(e) =>
													setSettingsOverride((prev) => ({
														...(prev ?? baseSettings!),
														name: e.target.value,
													}))
												}
												aria-invalid={Boolean(settingsFieldErrors.name)}
												autoComplete="off"
											/>
											{settingsFieldErrors.name ? (
												<FieldError>{settingsFieldErrors.name}</FieldError>
											) : null}
										</Field>
										<Field>
											<FieldLabel htmlFor="branch-address">Address</FieldLabel>
											<FieldDescription>Optional.</FieldDescription>
											<Textarea
												id="branch-address"
												value={settingsForm.address}
												onChange={(e) =>
													setSettingsOverride((prev) => ({
														...(prev ?? baseSettings!),
														address: e.target.value,
													}))
												}
												rows={3}
											/>
										</Field>
										<Field orientation="horizontal">
											<Checkbox
												id="branch-hq"
												checked={settingsForm.isHeadQuarter}
												onCheckedChange={(checked) =>
													setSettingsOverride((prev) => ({
														...(prev ?? baseSettings!),
														isHeadQuarter: checked === true,
													}))
												}
											/>
											<FieldContent>
												<FieldLabel htmlFor="branch-hq">
													Headquarters branch
												</FieldLabel>
											</FieldContent>
										</Field>
										<Field orientation="horizontal">
											<Checkbox
												id="branch-archived"
												checked={settingsForm.isArchived}
												onCheckedChange={(checked) =>
													setSettingsOverride((prev) => ({
														...(prev ?? baseSettings!),
														isArchived: checked === true,
													}))
												}
											/>
											<FieldContent>
												<FieldLabel htmlFor="branch-archived">
													Archived
												</FieldLabel>
												<FieldDescription>
													Archived branches are hidden from normal operations.
												</FieldDescription>
											</FieldContent>
										</Field>
									</FieldGroup>
									{settingsError ? (
										<Alert variant="destructive">
											<AlertDescription>{settingsError}</AlertDescription>
										</Alert>
									) : null}
									<Button type="submit" disabled={savingSettings}>
										{savingSettings ? (
											<>
												<Loader2Icon
													className="animate-spin"
													data-icon="inline-start"
													aria-hidden="true"
												/>
												Saving…
											</>
										) : (
											"Save Changes"
										)}
									</Button>
								</form>
							) : (
								<p className="text-sm text-muted-foreground">Loading form…</p>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="sm:max-w-md">
					<form onSubmit={handleCreateTable}>
						<DialogHeader>
							<DialogTitle>Add table</DialogTitle>
						</DialogHeader>
						<FieldGroup className="py-4">
							<Field>
								<FieldLabel htmlFor="new-table-name">Table name</FieldLabel>
								<Input
									id="new-table-name"
									value={newTableName}
									onChange={(e) => setNewTableName(e.target.value)}
									placeholder="e.g. Terrace 1…"
									autoComplete="off"
								/>
							</Field>
							{createError ? (
								<Alert variant="destructive">
									<AlertDescription>{createError}</AlertDescription>
								</Alert>
							) : null}
						</FieldGroup>
						<DialogFooter className="gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setCreateOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={creatingTable}>
								{creatingTable ? (
									<>
										<Loader2Icon
											className="animate-spin"
											data-icon="inline-start"
											aria-hidden="true"
										/>
										Creating…
									</>
								) : (
									"Create Table"
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</main>
	);
}
