"use client";

import { useMemo, useState } from "react";
import {
	Loader2Icon,
	PencilIcon,
	PlusIcon,
	SearchIcon,
	TablePropertiesIcon,
	Trash2Icon,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import {
	useListBusinessBranchesQuery,
	useListMyBusinessesQuery,
} from "../../../services/branch-management/branchManagementApi";
import {
	useCreateTableMutation,
	useDeleteTableMutation,
	useLazyGetTableQuery,
	useListBranchTablesQuery,
	useUpdateTableMutation,
} from "../../../services/tables/tablesApi";
import type { TableResponse } from "../../../services/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type CreateFormState = {
	name: string;
};

type EditFormState = {
	name: string;
	is_archived: boolean;
};

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

function buildCreateValidation(
	branchId: string,
	form: CreateFormState,
): Partial<Record<keyof CreateFormState | "branch_id", string>> {
	const errors: Partial<Record<keyof CreateFormState | "branch_id", string>> =
		{};

	if (!branchId) {
		errors.branch_id = "Select a branch before creating a table.";
	}
	if (!form.name.trim()) {
		errors.name = "Table name is required.";
	}

	return errors;
}

function buildEditValidation(
	form: EditFormState,
): Partial<Record<keyof EditFormState, string>> {
	const errors: Partial<Record<keyof EditFormState, string>> = {};
	if (!form.name.trim()) {
		errors.name = "Table name is required.";
	}
	return errors;
}

function isMatchingLookup(
	tableId: string,
	lookupTable?: TableResponse,
): boolean {
	return Boolean(tableId && lookupTable && tableId === lookupTable.id);
}

function formatDate(value: string): string {
	return new Date(value).toLocaleString();
}

export default function TablesPage() {
	const { user, isBranchAdmin } = useAuth();

	const [businessId, setBusinessId] = useState("");
	const [branchId, setBranchId] = useState("");
	const [selectedTableId, setSelectedTableId] = useState("");
	const [lookupTableId, setLookupTableId] = useState("");
	const [lookupError, setLookupError] = useState<string | null>(null);

	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);
	const [createValidation, setCreateValidation] = useState<
		Partial<Record<keyof CreateFormState | "branch_id", string>>
	>({});
	const [createForm, setCreateForm] = useState<CreateFormState>({
		name: "",
	});

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editError, setEditError] = useState<string | null>(null);
	const [editValidation, setEditValidation] = useState<
		Partial<Record<keyof EditFormState, string>>
	>({});
	const [editForm, setEditForm] = useState<EditFormState>({
		name: "",
		is_archived: false,
	});

	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [archiveError, setArchiveError] = useState<string | null>(null);

	const { data: businesses = [], isLoading: businessesLoading } =
		useListMyBusinessesQuery();

	const {
		data: businessBranches = [],
		isLoading: branchesLoading,
		error: branchesError,
	} = useListBusinessBranchesQuery({ businessId }, { skip: !businessId });

	const resolvedBranchId = useMemo(() => {
		const available = new Set(businessBranches.map((branch) => branch.id));
		if (branchId && available.has(branchId)) return branchId;
		if (isBranchAdmin() && user?.branchId && available.has(user.branchId)) {
			return user.branchId;
		}
		if (businessBranches.length === 1) return businessBranches[0].id;
		return "";
	}, [branchId, businessBranches, isBranchAdmin, user?.branchId]);

	const {
		data: tables = [],
		isLoading: tablesLoading,
		isFetching: tablesFetching,
		error: tablesError,
	} = useListBranchTablesQuery(
		{ branchId: resolvedBranchId },
		{ skip: !resolvedBranchId },
	);

	const [
		triggerGetTable,
		{
			data: lookupTable,
			isFetching: lookupFetching,
			error: lookupRequestError,
		},
	] = useLazyGetTableQuery();

	const [createTable, { isLoading: creating }] = useCreateTableMutation();
	const [updateTable, { isLoading: updating }] = useUpdateTableMutation();
	const [deleteTable, { isLoading: deleting }] = useDeleteTableMutation();

	const selectedBusiness = useMemo(
		() => businesses.find((business) => business.id === businessId) ?? null,
		[businessId, businesses],
	);

	const selectedBranch = useMemo(
		() =>
			businessBranches.find((branch) => branch.id === resolvedBranchId) ?? null,
		[businessBranches, resolvedBranchId],
	);

	const detailTable = useMemo(() => {
		const fromList =
			tables.find((table) => table.id === selectedTableId) ?? null;
		if (fromList) return fromList;
		return isMatchingLookup(selectedTableId, lookupTable) ? lookupTable : null;
	}, [lookupTable, selectedTableId, tables]);

	const totalTables = tables.length;
	const activeTables = tables.filter((table) => !table.is_archived).length;
	const archivedTables = totalTables - activeTables;

	const resetCreateForm = () => {
		setCreateError(null);
		setCreateValidation({});
		setCreateForm({ name: "" });
	};

	const openEditDialog = (table: TableResponse) => {
		setEditError(null);
		setEditValidation({});
		setEditForm({
			name: table.name,
			is_archived: table.is_archived,
		});
		setEditDialogOpen(true);
	};

	const handleLookup = async (event: React.FormEvent) => {
		event.preventDefault();
		setLookupError(null);

		const tableId = lookupTableId.trim();
		if (!tableId) {
			setLookupError("Enter a table ID to look up.");
			return;
		}

		try {
			const result = await triggerGetTable({ tableId }).unwrap();
			setSelectedTableId(result.id);
		} catch (error) {
			setLookupError(
				getErrorMessage(error, "Could not fetch the table details."),
			);
		}
	};

	const handleCreate = async (event: React.FormEvent) => {
		event.preventDefault();
		setCreateError(null);

		const validation = buildCreateValidation(resolvedBranchId, createForm);
		setCreateValidation(validation);
		if (Object.keys(validation).length > 0) return;

		try {
			const created = await createTable({
				branch_id: resolvedBranchId,
				name: createForm.name.trim(),
			}).unwrap();
			setSelectedTableId(created.id);
			resetCreateForm();
			setCreateDialogOpen(false);
		} catch (error) {
			setCreateError(getErrorMessage(error, "Could not create the table."));
		}
	};

	const handleUpdate = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!detailTable) return;

		setEditError(null);
		const validation = buildEditValidation(editForm);
		setEditValidation(validation);
		if (Object.keys(validation).length > 0) return;

		try {
			const updated = await updateTable({
				tableId: detailTable.id,
				branchId: detailTable.branch_id,
				body: {
					name: editForm.name.trim(),
					is_archived: editForm.is_archived,
				},
			}).unwrap();
			setSelectedTableId(updated.id);
			setEditDialogOpen(false);
		} catch (error) {
			setEditError(getErrorMessage(error, "Could not update the table."));
		}
	};

	const handleArchive = async () => {
		if (!detailTable) return;

		setArchiveError(null);
		try {
			await deleteTable({
				tableId: detailTable.id,
				branchId: detailTable.branch_id,
			}).unwrap();
			setArchiveDialogOpen(false);
		} catch (error) {
			setArchiveError(getErrorMessage(error, "Could not archive the table."));
		}
	};

	return (
		<main className="flex flex-col gap-6">
			<header className="flex flex-col gap-3">
				<div className="flex items-start justify-between gap-4">
					<div className="flex flex-col gap-1">
						<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
							Tables
						</h1>
						<p className="text-sm text-muted-foreground">
							Manage tables for your branches: list branch tables, fetch one
							table, create a table, update it, and archive it.
						</p>
					</div>
					<Button
						type="button"
						onClick={() => {
							setCreateDialogOpen(true);
							setCreateError(null);
						}}
					>
						<PlusIcon data-icon="inline-start" />
						Add Table
					</Button>
				</div>
			</header>

			<section className="grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Total Tables</CardTitle>
						<CardDescription>For the selected branch.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold">{totalTables}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Active</CardTitle>
						<CardDescription>Ready for normal operations.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold">{activeTables}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Archived</CardTitle>
						<CardDescription>Inactive tables.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold">{archivedTables}</p>
					</CardContent>
				</Card>
			</section>

			<section className="w-full">
				<div className="flex flex-col gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Browse Branch Tables</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-5">
							<FieldGroup className="grid gap-4 md:grid-cols-2">
								<Field data-invalid={Boolean(createValidation.branch_id)}>
									<FieldLabel htmlFor="tables-business-select">
										Business
									</FieldLabel>
									<Select
										value={businessId}
										onValueChange={(value) => {
											setBusinessId(value ?? "");
											setBranchId("");
											setSelectedTableId("");
										}}
										disabled={businessesLoading}
									>
										<SelectTrigger
											id="tables-business-select"
											className="w-full"
										>
											<SelectValue placeholder="Select a business">
												{selectedBusiness?.name ?? ""}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{businesses.map((business) => (
													<SelectItem key={business.id} value={business.id}>
														{business.name}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>

								<Field data-invalid={Boolean(createValidation.branch_id)}>
									<FieldLabel htmlFor="tables-branch-select">Branch</FieldLabel>
									<Select
										value={resolvedBranchId}
										onValueChange={(value) => {
											setBranchId(value ?? "");
											setSelectedTableId("");
										}}
										disabled={!businessId || branchesLoading}
									>
										<SelectTrigger
											id="tables-branch-select"
											className="w-full"
											aria-invalid={Boolean(createValidation.branch_id)}
										>
											<SelectValue placeholder="Select a branch">
												{selectedBranch?.name ?? ""}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{businessBranches.map((branch) => (
													<SelectItem key={branch.id} value={branch.id}>
														{branch.name}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
									<FieldError>{createValidation.branch_id}</FieldError>
								</Field>
							</FieldGroup>

							{branchesError ? (
								<Alert variant="destructive">
									<AlertTitle>Could not load branches</AlertTitle>
									<AlertDescription>
										{getErrorMessage(
											branchesError,
											"Try selecting the business again.",
										)}
									</AlertDescription>
								</Alert>
							) : null}

							{tablesError ? (
								<Alert variant="destructive">
									<AlertTitle>Could not load tables</AlertTitle>
									<AlertDescription>
										{getErrorMessage(
											tablesError,
											"The table list request failed for the selected branch.",
										)}
									</AlertDescription>
								</Alert>
							) : null}

							{!resolvedBranchId ? (
								<Alert>
									<AlertTitle>Select a branch</AlertTitle>
									<AlertDescription>
										Choose a business and branch to load tables.
									</AlertDescription>
								</Alert>
							) : tablesLoading || tablesFetching ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2Icon className="animate-spin" />
									Loading tables...
								</div>
							) : tables.length === 0 ? (
								<Alert>
									<AlertTitle>No tables found</AlertTitle>
									<AlertDescription>
										This branch has no tables yet.
									</AlertDescription>
								</Alert>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Created</TableHead>
											<TableHead>Updated</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{tables.map((table) => (
											<TableRow
												key={table.id}
												data-state={
													table.id === selectedTableId ? "selected" : undefined
												}
												className="cursor-pointer"
												onClick={() => setSelectedTableId(table.id)}
											>
												<TableCell className="font-medium">
													{table.name}
												</TableCell>
												<TableCell>
													<Badge
														variant={
															table.is_archived ? "secondary" : "default"
														}
													>
														{table.is_archived ? "Archived" : "Active"}
													</Badge>
												</TableCell>
												<TableCell>{formatDate(table.created_at)}</TableCell>
												<TableCell>{formatDate(table.updated_at)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>
			</section>

			<Dialog
				open={createDialogOpen}
				onOpenChange={(open) => {
					setCreateDialogOpen(open);
					if (!open) resetCreateForm();
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Create Table</DialogTitle>
						<DialogDescription>
							This form maps directly to `POST /api/v1/tables`.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleCreate} className="flex flex-col gap-4">
						<Field data-invalid={Boolean(createValidation.branch_id)}>
							<FieldLabel htmlFor="create-table-branch">Branch</FieldLabel>
							<Select
								value={resolvedBranchId}
								onValueChange={(value) => {
									setBranchId(value ?? "");
									setCreateValidation((current) => ({
										...current,
										branch_id: undefined,
									}));
								}}
								disabled={!businessId || branchesLoading}
							>
								<SelectTrigger
									id="create-table-branch"
									className="w-full"
									aria-invalid={Boolean(createValidation.branch_id)}
								>
									<SelectValue placeholder="Select a branch">
										{selectedBranch?.name ?? ""}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{businessBranches.map((branch) => (
											<SelectItem key={branch.id} value={branch.id}>
												{branch.name}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
							<FieldError>{createValidation.branch_id}</FieldError>
						</Field>

						<Field data-invalid={Boolean(createValidation.name)}>
							<FieldLabel htmlFor="create-table-name">Table Name</FieldLabel>
							<Input
								id="create-table-name"
								value={createForm.name}
								onChange={(event) => {
									setCreateForm({ name: event.target.value });
									setCreateValidation((current) => ({
										...current,
										name: undefined,
									}));
								}}
								placeholder="Table 1"
								autoComplete="off"
								aria-invalid={Boolean(createValidation.name)}
							/>
							<FieldError>{createValidation.name}</FieldError>
						</Field>

						{createError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not create table</AlertTitle>
								<AlertDescription>{createError}</AlertDescription>
							</Alert>
						) : null}

						<DialogFooter>
							<Button type="submit" disabled={creating}>
								{creating ? (
									<>
										<Loader2Icon
											data-icon="inline-start"
											className="animate-spin"
										/>
										Creating...
									</>
								) : (
									<>
										<PlusIcon data-icon="inline-start" />
										Create Table
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={editDialogOpen}
				onOpenChange={(open) => {
					setEditDialogOpen(open);
					if (!open) {
						setEditError(null);
						setEditValidation({});
					}
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Edit Table</DialogTitle>
						<DialogDescription>
							Update the selected table with `PUT /api/v1/tables/{"{table_id}"}
							`.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleUpdate} className="flex flex-col gap-4">
						<Field data-invalid={Boolean(editValidation.name)}>
							<FieldLabel htmlFor="edit-table-name">Table Name</FieldLabel>
							<Input
								id="edit-table-name"
								value={editForm.name}
								onChange={(event) => {
									setEditForm((current) => ({
										...current,
										name: event.target.value,
									}));
									setEditValidation((current) => ({
										...current,
										name: undefined,
									}));
								}}
								autoComplete="off"
								aria-invalid={Boolean(editValidation.name)}
							/>
							<FieldError>{editValidation.name}</FieldError>
						</Field>

						<Field>
							<FieldLabel htmlFor="edit-table-archived">
								Archived State
							</FieldLabel>
							<div className="flex items-center gap-2 rounded-lg border p-3">
								<Checkbox
									id="edit-table-archived"
									checked={editForm.is_archived}
									onCheckedChange={(checked) =>
										setEditForm((current) => ({
											...current,
											is_archived: checked === true,
										}))
									}
								/>
								<label htmlFor="edit-table-archived" className="text-sm">
									Mark this table as archived
								</label>
							</div>
						</Field>

						{editError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not update table</AlertTitle>
								<AlertDescription>{editError}</AlertDescription>
							</Alert>
						) : null}

						<DialogFooter>
							<Button type="submit" disabled={updating}>
								{updating ? (
									<>
										<Loader2Icon
											data-icon="inline-start"
											className="animate-spin"
										/>
										Saving...
									</>
								) : (
									<>
										<PencilIcon data-icon="inline-start" />
										Save Changes
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Archive Table</DialogTitle>
						<DialogDescription>
							This calls `DELETE /api/v1/tables/{"{table_id}"}` for the selected
							table.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4">
						<Alert>
							<AlertTitle>Confirm archive</AlertTitle>
							<AlertDescription>
								{detailTable
									? `Archive "${detailTable.name}" now?`
									: "No table selected."}
							</AlertDescription>
						</Alert>
						{archiveError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not archive table</AlertTitle>
								<AlertDescription>{archiveError}</AlertDescription>
							</Alert>
						) : null}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="destructive"
							onClick={handleArchive}
							disabled={!detailTable || deleting}
						>
							{deleting ? (
								<>
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
									/>
									Archiving...
								</>
							) : (
								<>
									<Trash2Icon data-icon="inline-start" />
									Archive Table
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</main>
	);
}
