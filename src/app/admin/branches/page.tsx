"use client";

import { useMemo, useState } from "react";
import {
	Building2Icon,
	Loader2Icon,
	MoreHorizontalIcon,
	PlusIcon,
	SearchIcon,
	Trash2Icon,
} from "lucide-react";

import {
	useCreateBranchMutation,
	useDeleteBranchMutation,
	useListAllUserBranchesQuery,
} from "../../../services/branch-management/branchManagementApi";
import { getStoredAccessToken } from "../../../services/authTokens";
import { branchFromOutput, type Branch } from "../../../services/types";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type CreateFormState = {
	businessId: string;
	name: string;
	address: string;
	isHeadQuarter: boolean;
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
	form: CreateFormState,
): Partial<Record<keyof CreateFormState | "businessId", string>> {
	const errors: Partial<Record<keyof CreateFormState | "businessId", string>> =
		{};
	if (!form.businessId) {
		errors.businessId = "Select a business.";
	}
	if (!form.name.trim()) {
		errors.name = "Branch name is required.";
	}
	return errors;
}

export default function BranchesPage() {
	const router = useRouter();
	const branchDateFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			}),
		[],
	);

	const formatBranchDate = (value: string) =>
		branchDateFormatter.format(new Date(value));
	const {
		data,
		isLoading: loading,
		error: queryError,
	} = useListAllUserBranchesQuery();
	const branches = useMemo(
		() => (data?.branches ?? []).map(branchFromOutput),
		[data?.branches],
	);
	const myBusinesses = useMemo(() => data?.myBusinesses ?? [], [data]);

	const [searchTerm, setSearchTerm] = useState("");
	const [restaurantFilter, setRestaurantFilter] = useState("all");

	const [createOpen, setCreateOpen] = useState(false);
	const [createForm, setCreateForm] = useState<CreateFormState>({
		businessId: "",
		name: "",
		address: "",
		isHeadQuarter: false,
	});
	const [createValidation, setCreateValidation] = useState<
		Partial<Record<keyof CreateFormState | "businessId", string>>
	>({});
	const [createError, setCreateError] = useState<string | null>(null);

	const [branchPendingDelete, setBranchPendingDelete] = useState<Branch | null>(
		null,
	);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [branchActionsMenuId, setBranchActionsMenuId] = useState<string | null>(
		null,
	);

	const [createBranch, { isLoading: creating }] = useCreateBranchMutation();
	const [deleteBranch, { isLoading: deleting }] = useDeleteBranchMutation();

	const restaurantMap = useMemo(() => {
		const map: Record<string, string> = {};
		myBusinesses.forEach((b: { id: string; name: string }) => {
			map[b.id] = b.name;
		});
		return map;
	}, [myBusinesses]);

	const filteredBranches = useMemo(() => {
		return branches.filter((branch: Branch) => {
			const restaurantName = restaurantMap[branch.restaurant_id] || "";
			const q = searchTerm.toLowerCase();
			const matchesSearch =
				branch.name.toLowerCase().includes(q) ||
				restaurantName.toLowerCase().includes(q) ||
				(branch.address && branch.address.toLowerCase().includes(q));

			const matchesRestaurant =
				restaurantFilter === "all" || branch.restaurant_id === restaurantFilter;

			return matchesSearch && matchesRestaurant;
		});
	}, [branches, restaurantMap, searchTerm, restaurantFilter]);

	const totalBranches = branches.length;
	const activeCount = branches.filter((b) => b.active).length;
	const businessCount = myBusinesses.length;

	const loadError = queryError
		? getErrorMessage(queryError, "Failed to load branches.")
		: null;

	const resetCreateForm = () => {
		setCreateForm({
			businessId: "",
			name: "",
			address: "",
			isHeadQuarter: false,
		});
		setCreateValidation({});
		setCreateError(null);
	};

	const openCreate = () => {
		resetCreateForm();
		setCreateOpen(true);
	};

	const handleCreateSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setCreateError(null);
		const validation = buildCreateValidation(createForm);
		setCreateValidation(validation);
		if (Object.keys(validation).length > 0) return;

		const token = getStoredAccessToken();
		if (!token) {
			setCreateError("You are not signed in.");
			return;
		}

		try {
			await createBranch({
				accessToken: token,
				body: {
					business_id: createForm.businessId,
					name: createForm.name.trim(),
					address: createForm.address.trim() || null,
					is_head_quarter: createForm.isHeadQuarter,
				},
			}).unwrap();
			resetCreateForm();
			setCreateOpen(false);
		} catch (error) {
			setCreateError(getErrorMessage(error, "Could not create the branch."));
		}
	};

	const handleDeleteConfirm = async () => {
		if (!branchPendingDelete) return;
		setDeleteError(null);
		const token = getStoredAccessToken();
		if (!token) {
			setDeleteError("You are not signed in.");
			return;
		}
		try {
			await deleteBranch({
				branchId: branchPendingDelete.id,
				accessToken: token,
			}).unwrap();
			setBranchPendingDelete(null);
		} catch (error) {
			setDeleteError(getErrorMessage(error, "Could not remove this branch."));
		}
	};

	return (
		<main className="flex flex-col gap-6">
			<header className="flex flex-col gap-3">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex flex-col gap-1">
						<h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
							Branches
						</h1>
						<p className="text-pretty text-sm text-muted-foreground">
							View and manage branches across your businesses.
						</p>
					</div>
					<Button type="button" onClick={openCreate}>
						<PlusIcon data-icon="inline-start" aria-hidden="true" />
						Add Branch
					</Button>
				</div>
			</header>

			<section className="grid gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Total branches</CardTitle>
						<CardDescription>Across all your businesses.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold tabular-nums">
							{totalBranches}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Active</CardTitle>
						<CardDescription>Not archived.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-semibold tabular-nums">{activeCount}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Businesses</CardTitle>
						<CardDescription>Tenants you can add branches to.</CardDescription>
					</CardHeader>
					<CardContent className="flex items-center gap-2">
						<Building2Icon
							className="text-muted-foreground"
							aria-hidden="true"
						/>
						<p className="text-3xl font-semibold tabular-nums">
							{businessCount}
						</p>
					</CardContent>
				</Card>
			</section>

			<Card>
				<CardHeader className="gap-4 border-b border-border pb-4">
					<div className="flex flex-col gap-1">
						<CardTitle className="text-balance">Branch Directory</CardTitle>
						<CardDescription className="text-pretty">
							{loading ? (
								<span aria-live="polite">Loading branches…</span>
							) : (
								<>
									Showing{" "}
									<span className="font-medium text-foreground tabular-nums">
										{filteredBranches.length}
									</span>{" "}
									of <span className="tabular-nums">{branches.length}</span>{" "}
									branches. Search by name, business, or address.
								</>
							)}
						</CardDescription>
					</div>
					<FieldGroup className="grid min-w-0 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,16rem)]">
						<Field className="min-w-0 h-full">
							<FieldLabel htmlFor="branches-search">Search</FieldLabel>
							<InputGroup className="h-10 shrink-0">
								<InputGroupAddon>
									<SearchIcon aria-hidden="true" />
								</InputGroupAddon>
								<InputGroupInput
									id="branches-search"
									name="branch-search"
									placeholder="Search branches…"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									autoComplete="off"
									spellCheck={false}
									disabled={Boolean(loadError)}
								/>
							</InputGroup>
						</Field>
						<Field className="min-w-0 h-full">
							<FieldLabel htmlFor="branches-business-filter">
								Business
							</FieldLabel>
							<Select
								value={restaurantFilter}
								onValueChange={(value) => setRestaurantFilter(value ?? "all")}
								disabled={Boolean(loadError)}
							>
								<SelectTrigger
									id="branches-business-filter"
									className="h-10 w-full min-h-10 data-[size=default]:h-10"
								>
									<SelectValue placeholder="All businesses" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="all">All businesses</SelectItem>
										{myBusinesses.map((b: { id: string; name: string }) => (
											<SelectItem key={b.id} value={b.id}>
												{b.name}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>
					</FieldGroup>
				</CardHeader>
				<CardContent className="p-0">
					{loadError ? (
						<div className="p-4">
							<Alert variant="destructive">
								<AlertTitle>Could not load branches</AlertTitle>
								<AlertDescription>{loadError}</AlertDescription>
							</Alert>
						</div>
					) : loading ? (
						<div
							role="status"
							aria-live="polite"
							className="flex items-center gap-2 px-4 py-12 text-sm text-muted-foreground"
						>
							<Loader2Icon className="animate-spin" aria-hidden="true" />
							Loading branches…
						</div>
					) : filteredBranches.length === 0 ? (
						<div className="px-4 py-12">
							<Alert className="border-none">
								<AlertTitle>No branches found</AlertTitle>
								<AlertDescription>
									{branches.length === 0
										? "Create a branch to get started."
										: "Try adjusting search or filters."}
								</AlertDescription>
							</Alert>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableCaption className="sr-only">
									Branches you have access to; columns include name, business,
									address, headquarters flag, status, and last updated time.
								</TableCaption>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Business</TableHead>
										<TableHead>Address</TableHead>
										<TableHead>HQ</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="hidden min-w-0 lg:table-cell">
											Updated
										</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredBranches.map((branch: Branch) => (
										<TableRow
											key={branch.id}
											className="group/row cursor-pointer"
											onClick={() =>
												router.push(`/admin/branches/${branch.id}`)
											}
										>
											<TableCell className="min-w-0 max-w-40 font-medium sm:max-w-none">
												<span className="block truncate">{branch.name}</span>
											</TableCell>
											<TableCell className="min-w-0 max-w-40 truncate sm:max-w-none">
												{restaurantMap[branch.restaurant_id] ?? "—"}
											</TableCell>
											<TableCell className="max-w-40 truncate text-muted-foreground">
												{branch.address ?? "—"}
											</TableCell>
											<TableCell>
												{branch.is_head_quarter ? (
													<Badge variant="secondary">HQ</Badge>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</TableCell>
											<TableCell>
												<Badge variant={branch.active ? "default" : "outline"}>
													{branch.active ? "Active" : "Archived"}
												</Badge>
											</TableCell>
											<TableCell className="hidden tabular-nums text-muted-foreground lg:table-cell">
												{formatBranchDate(branch.updated_at)}
											</TableCell>
											<TableCell
												className="text-right"
												onClick={(e) => e.stopPropagation()}
											>
												<DropdownMenu
													open={branchActionsMenuId === branch.id}
													onOpenChange={(open) =>
														setBranchActionsMenuId(open ? branch.id : null)
													}
												>
													<DropdownMenuTrigger
														render={
															<Button
																type="button"
																variant="ghost"
																size="icon-sm"
																className={cn(
																	"text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground",
																	"group-hover/row:opacity-100",
																	"focus-visible:opacity-100",
																	branchActionsMenuId === branch.id &&
																		"opacity-100",
																)}
																aria-label="Branch actions"
															/>
														}
													>
														<MoreHorizontalIcon aria-hidden="true" />
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end" sideOffset={4}>
														<DropdownMenuGroup>
															<DropdownMenuItem
																variant="destructive"
																onClick={() => {
																	setDeleteError(null);
																	setBranchPendingDelete(branch);
																	setBranchActionsMenuId(null);
																}}
															>
																<Trash2Icon aria-hidden="true" />
																Delete
															</DropdownMenuItem>
														</DropdownMenuGroup>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={createOpen}
				onOpenChange={(open) => {
					if (!open) {
						resetCreateForm();
					}
					setCreateOpen(open);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add branch</DialogTitle>
						<DialogDescription>
							Create a branch under a business. You can edit details later on
							the branch page.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
						<FieldGroup className="flex flex-col gap-4">
							<Field
								data-invalid={createValidation.businessId ? true : undefined}
							>
								<FieldLabel htmlFor="create-branch-business">
									Business
								</FieldLabel>
								<Select
									value={createForm.businessId}
									onValueChange={(value) =>
										setCreateForm((c) => ({
											...c,
											businessId: value ?? "",
										}))
									}
								>
									<SelectTrigger
										id="create-branch-business"
										className="w-full"
										aria-invalid={Boolean(createValidation.businessId)}
									>
										<SelectValue placeholder="Select a business" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{myBusinesses.map((b: { id: string; name: string }) => (
												<SelectItem key={b.id} value={b.id}>
													{b.name}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								{createValidation.businessId ? (
									<FieldError>{createValidation.businessId}</FieldError>
								) : null}
							</Field>

							<Field data-invalid={createValidation.name ? true : undefined}>
								<FieldLabel htmlFor="create-branch-name">
									Branch name
								</FieldLabel>
								<Input
									id="create-branch-name"
									value={createForm.name}
									onChange={(e) =>
										setCreateForm((c) => ({ ...c, name: e.target.value }))
									}
									placeholder="e.g. Bole"
									autoComplete="off"
									aria-invalid={Boolean(createValidation.name)}
								/>
								{createValidation.name ? (
									<FieldError>{createValidation.name}</FieldError>
								) : null}
							</Field>

							<Field>
								<FieldLabel htmlFor="create-branch-address">Address</FieldLabel>
								<FieldDescription>Optional location details.</FieldDescription>
								<Textarea
									id="create-branch-address"
									value={createForm.address}
									onChange={(e) =>
										setCreateForm((c) => ({ ...c, address: e.target.value }))
									}
									placeholder="Street, city…"
									rows={3}
								/>
							</Field>

							<Field orientation="horizontal">
								<Checkbox
									id="create-branch-hq"
									checked={createForm.isHeadQuarter}
									onCheckedChange={(checked) =>
										setCreateForm((c) => ({
											...c,
											isHeadQuarter: checked === true,
										}))
									}
								/>
								<FieldContent>
									<FieldLabel htmlFor="create-branch-hq">
										Headquarters branch
									</FieldLabel>
									<FieldDescription>
										Mark if this is the main branch for the business.
									</FieldDescription>
								</FieldContent>
							</Field>
						</FieldGroup>

						{createError ? (
							<Alert variant="destructive">
								<AlertDescription>{createError}</AlertDescription>
							</Alert>
						) : null}

						<DialogFooter className="gap-2 sm:gap-0">
							<Button
								type="button"
								variant="outline"
								onClick={() => setCreateOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={creating}>
								{creating ? (
									<>
										<Loader2Icon
											className="animate-spin"
											data-icon="inline-start"
										/>
										Creating…
									</>
								) : (
									"Create branch"
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={branchPendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) {
						setBranchPendingDelete(null);
						setDeleteError(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete branch?</AlertDialogTitle>
						<AlertDialogDescription>
							This will archive or remove{" "}
							<strong>{branchPendingDelete?.name}</strong> depending on server
							rules. This cannot be undone from here.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deleteError ? (
						<Alert variant="destructive">
							<AlertDescription>{deleteError}</AlertDescription>
						</Alert>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={(e) => {
								e.preventDefault();
								void handleDeleteConfirm();
							}}
							disabled={deleting}
						>
							{deleting ? (
								<>
									<Loader2Icon
										className="animate-spin"
										data-icon="inline-start"
									/>
									Deleting…
								</>
							) : (
								"Delete"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
