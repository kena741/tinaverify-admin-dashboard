"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, Loader2Icon } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import {
	useListBusinessBranchesQuery,
	useListMyBusinessesQuery,
} from "../../../services/branch-management/branchManagementApi";
import {
	useCreateMenuMutation,
	useListBranchMenusQuery,
} from "../../../services/menu/menuApi";
import type { BranchOutput, MenuCategoryEnum } from "../../../services/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const DEFAULT_CURRENCY = "Birr";

function getMutationError(error: unknown): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"data" in error &&
		(error as { data?: { detail?: string } }).data?.detail
	) {
		return String((error as { data: { detail: string } }).data.detail);
	}
	if (error instanceof Error) return error.message;
	return "Request failed";
}

function formatPrice(value: number): string {
	return value.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

export default function MenuPage() {
	const { user, isBranchAdmin } = useAuth();

	const [selectState, setSelectState] = useState<{
		businessId: string;
		viewBranchId: string;
		category: MenuCategoryEnum | "";
	}>({
		businessId: "",
		viewBranchId: "",
		category: "",
	});
	const [selectedCreateBranchIds, setSelectedCreateBranchIds] = useState<
		string[]
	>([]);
	const [branchSelectOpen, setBranchSelectOpen] = useState(false);
	const [dialogBranchSelectOpen, setDialogBranchSelectOpen] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [addDialogOpen, setAddDialogOpen] = useState(false);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [price, setPrice] = useState("");

	const { data: businesses = [], isLoading: businessesLoading } =
		useListMyBusinessesQuery();

	const effectiveBusinessId = selectState.businessId;

	const {
		data: businessBranches = [],
		isLoading: branchesLoading,
		error: branchesError,
	} = useListBusinessBranchesQuery(
		{ businessId: effectiveBusinessId },
		{ skip: !effectiveBusinessId },
	);

	const resolvedViewBranchId = useMemo(() => {
		const available = new Set(businessBranches.map((b) => b.id));
		if (selectState.viewBranchId && available.has(selectState.viewBranchId)) {
			return selectState.viewBranchId;
		}
		if (isBranchAdmin() && user?.branchId && available.has(user.branchId)) {
			return user.branchId;
		}
		if (businessBranches.length === 1) return businessBranches[0].id;
		return "";
	}, [
		businessBranches,
		isBranchAdmin,
		selectState.viewBranchId,
		user?.branchId,
	]);

	const resolvedCreateBranchIds = useMemo(() => {
		const available = new Set(businessBranches.map((b) => b.id));
		const kept = selectedCreateBranchIds.filter((id) => available.has(id));
		if (kept.length > 0) return kept;
		if (isBranchAdmin() && user?.branchId && available.has(user.branchId)) {
			return [user.branchId];
		}
		if (businessBranches.length === 1) return [businessBranches[0].id];
		return [];
	}, [businessBranches, isBranchAdmin, selectedCreateBranchIds, user]);

	const {
		data: menus = [],
		isLoading: menusLoading,
		isFetching: menusFetching,
		error: menusError,
	} = useListBranchMenusQuery(
		{ branchId: resolvedViewBranchId },
		{ skip: !resolvedViewBranchId },
	);

	const [createMenu, { isLoading: creating }] = useCreateMenuMutation();

	const allChecked =
		businessBranches.length > 0 &&
		resolvedCreateBranchIds.length === businessBranches.length;

	const canSubmit =
		Boolean(effectiveBusinessId) &&
		resolvedCreateBranchIds.length > 0 &&
		name.trim().length > 0 &&
		price.trim().length > 0 &&
		Boolean(selectState.category) &&
		!creating;

	const businessLabel = useMemo(() => {
		if (!effectiveBusinessId) return "Select Business";
		return (
			businesses.find((business) => business.id === effectiveBusinessId)
				?.name ?? "Selected Business"
		);
	}, [effectiveBusinessId, businesses]);

	const createBranchSummary = useMemo(() => {
		if (businessBranches.length === 0) return "No Branches";
		if (resolvedCreateBranchIds.length === 0) return "Choose Branches";
		if (allChecked) return `All branches (${businessBranches.length})`;
		return `${resolvedCreateBranchIds.length} selected`;
	}, [resolvedCreateBranchIds, businessBranches, allChecked]);

	const selectedBusinessName = useMemo(() => {
		if (!effectiveBusinessId) return "";
		return (
			businesses.find((business) => business.id === effectiveBusinessId)
				?.name ?? ""
		);
	}, [businesses, effectiveBusinessId]);

	const selectedViewBranchName = useMemo(() => {
		if (!resolvedViewBranchId) return "";
		return (
			businessBranches.find((branch) => branch.id === resolvedViewBranchId)
				?.name ?? ""
		);
	}, [businessBranches, resolvedViewBranchId]);

	const toggleAll = (checked: boolean) => {
		if (checked) {
			setSelectedCreateBranchIds(businessBranches.map((branch) => branch.id));
			return;
		}
		setSelectedCreateBranchIds([]);
	};

	const toggleBranch = (branchId: string, checked: boolean) => {
		setSelectedCreateBranchIds((prev) => {
			if (checked) return prev.includes(branchId) ? prev : [...prev, branchId];
			return prev.filter((id) => id !== branchId);
		});
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setSubmitError(null);

		const parsedPrice = Number.parseFloat(price);
		if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
			setSubmitError("Enter a valid price.");
			return;
		}
		if (!selectState.category) {
			setSubmitError("Select a category.");
			return;
		}

		try {
			for (const branchId of resolvedCreateBranchIds) {
				await createMenu({
					branch_id: branchId,
					name: name.trim(),
					description: description.trim() || null,
					price: parsedPrice,
					currency: DEFAULT_CURRENCY,
					category: selectState.category,
				}).unwrap();
			}
			setName("");
			setDescription("");
			setPrice("");
			setSelectState((prev) => ({ ...prev, category: "" }));
			setAddDialogOpen(false);
		} catch (error) {
			setSubmitError(getMutationError(error));
		}
	};

	return (
		<main className="flex flex-col">
			<section className="sm:p-6">
				<header className="mb-5 flex flex-col gap-2">
					<div className="flex flex-row justify-between items-center gap-4">
						<h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
							Menu Management
						</h1>
						<Button
							type="button"
							className="h-10"
							disabled={
								!effectiveBusinessId || resolvedCreateBranchIds.length === 0
							}
							onClick={() => {
								setSubmitError(null);
								setDialogBranchSelectOpen(false);
								setAddDialogOpen(true);
							}}
						>
							Add Menu Item
						</Button>
					</div>
					<p className="text-pretty text-sm text-muted-foreground">
						Select a business, pick one or more branches, & create the same menu
						item for all selected branches in one action.
					</p>
				</header>
				<div className="flex flex-col gap-4">
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field className="min-w-0">
							<FieldLabel htmlFor="menu-business-select">Business</FieldLabel>
							<Select
								value={effectiveBusinessId}
								onValueChange={(value) => {
									setSelectState((prev) => ({
										...prev,
										businessId: value ?? "",
										viewBranchId: "",
									}));
									setSelectedCreateBranchIds([]);
								}}
								disabled={businessesLoading}
							>
								<SelectTrigger
									id="menu-business-select"
									className="h-10 w-full"
								>
									<SelectValue placeholder="Select a business">
										{selectedBusinessName}
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

						<Field className="min-w-0">
							<FieldLabel id="menu-create-branches-label">
								Branches (Multi-select)
							</FieldLabel>
							<Popover
								open={branchSelectOpen}
								onOpenChange={setBranchSelectOpen}
							>
								<PopoverTrigger
									render={
										<Button
											type="button"
											variant="outline"
											className="h-10 w-full justify-between"
											disabled={!effectiveBusinessId || branchesLoading}
											aria-labelledby="menu-create-branches-label"
										/>
									}
								>
									<span className="truncate">{createBranchSummary}</span>
									<ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
								</PopoverTrigger>
								<PopoverContent
									className="w-(--anchor-width) p-0"
									align="start"
								>
									<div className="border-b p-3">
										<div className="flex items-center gap-2">
											<Checkbox
												id="menu-branch-all"
												checked={allChecked}
												onCheckedChange={(checked) =>
													toggleAll(checked === true)
												}
											/>
											<Label htmlFor="menu-branch-all">All</Label>
										</div>
									</div>
									<div className="max-h-56 overflow-y-auto p-2">
										{businessBranches.map((branch: BranchOutput) => (
											<div key={branch.id} className="rounded-md px-2 py-1.5">
												<div className="flex items-center gap-2">
													<Checkbox
														id={`menu-branch-${branch.id}`}
														checked={resolvedCreateBranchIds.includes(
															branch.id,
														)}
														onCheckedChange={(checked) =>
															toggleBranch(branch.id, checked === true)
														}
													/>
													<Label
														htmlFor={`menu-branch-${branch.id}`}
														className="truncate"
													>
														{branch.name}
													</Label>
												</div>
											</div>
										))}
										{businessBranches.length === 0 ? (
											<p className="px-2 py-2 text-sm text-muted-foreground">
												No branches found for this business.
											</p>
										) : null}
									</div>
								</PopoverContent>
							</Popover>
						</Field>

						<Field className="min-w-0">
							<FieldLabel htmlFor="menu-view-branch">
								View Branch Menus
							</FieldLabel>
							<Select
								value={resolvedViewBranchId}
								onValueChange={(value) =>
									setSelectState((prev) => ({
										...prev,
										viewBranchId: value ?? "",
									}))
								}
								disabled={!effectiveBusinessId || branchesLoading}
							>
								<SelectTrigger id="menu-view-branch" className="h-10 w-full">
									<SelectValue placeholder="Choose Branch to View Menus…">
										{selectedViewBranchName}
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
						</Field>
					</FieldGroup>

					{branchesError ? (
						<Alert variant="destructive" aria-live="polite">
							<AlertTitle>Branch load error</AlertTitle>
							<AlertDescription>
								Could not load branches for {businessLabel}. Try selecting the
								business again.
							</AlertDescription>
						</Alert>
					) : null}
				</div>
			</section>

			<Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Add Menu Item</DialogTitle>
						<DialogDescription>
							This creates one menu item for each selected branch.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<Field>
							<FieldLabel id="dialog-menu-create-branches-label">
								Branches (Multi-select)
							</FieldLabel>
							<Popover
								open={dialogBranchSelectOpen}
								onOpenChange={setDialogBranchSelectOpen}
							>
								<PopoverTrigger
									render={
										<Button
											type="button"
											variant="outline"
											className="h-10 w-full justify-between"
											disabled={!effectiveBusinessId || branchesLoading}
											aria-labelledby="dialog-menu-create-branches-label"
										/>
									}
								>
									<span className="truncate">{createBranchSummary}</span>
									<ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
								</PopoverTrigger>
								<PopoverContent
									className="w-(--anchor-width) p-0"
									align="start"
								>
									<div className="border-b p-3">
										<div className="flex items-center gap-2">
											<Checkbox
												id="dialog-menu-branch-all"
												checked={allChecked}
												onCheckedChange={(checked) =>
													toggleAll(checked === true)
												}
											/>
											<Label htmlFor="dialog-menu-branch-all">All</Label>
										</div>
									</div>
									<div className="max-h-56 overflow-y-auto p-2">
										{businessBranches.map((branch: BranchOutput) => (
											<div key={branch.id} className="rounded-md px-2 py-1.5">
												<div className="flex items-center gap-2">
													<Checkbox
														id={`dialog-menu-branch-${branch.id}`}
														checked={resolvedCreateBranchIds.includes(
															branch.id,
														)}
														onCheckedChange={(checked) =>
															toggleBranch(branch.id, checked === true)
														}
													/>
													<Label
														htmlFor={`dialog-menu-branch-${branch.id}`}
														className="truncate"
													>
														{branch.name}
													</Label>
												</div>
											</div>
										))}
										{businessBranches.length === 0 ? (
											<p className="px-2 py-2 text-sm text-muted-foreground">
												No branches found for this business.
											</p>
										) : null}
									</div>
								</PopoverContent>
							</Popover>
						</Field>

						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field className="min-w-0">
								<FieldLabel htmlFor="menu-item-name">Menu Name</FieldLabel>
								<Input
									id="menu-item-name"
									name="menu_name"
									autoComplete="off"
									placeholder="Menu Name…"
									className="h-10"
									value={name}
									onChange={(event) => setName(event.target.value)}
									required
								/>
							</Field>

							<Field className="min-w-0">
								<FieldLabel htmlFor="menu-item-category">Category</FieldLabel>
								<Select
									value={selectState.category}
									onValueChange={(value) =>
										setSelectState((prev) => ({
											...prev,
											category: value as MenuCategoryEnum,
										}))
									}
								>
									<SelectTrigger
										id="menu-item-category"
										className="h-10 w-full"
									>
										<SelectValue placeholder="Select a category" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="Food">Food</SelectItem>
											<SelectItem value="Drink">Drink</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>

							<Field className="min-w-0">
								<FieldLabel htmlFor="menu-item-price">Price</FieldLabel>
								<div className="flex items-center gap-2">
									<Input
										id="menu-item-price"
										name="price"
										type="number"
										min={0}
										step="0.01"
										inputMode="decimal"
										placeholder="Price…"
										className="h-10"
										value={price}
										onChange={(event) => setPrice(event.target.value)}
										required
									/>
									<span className="text-sm font-medium text-muted-foreground">
										Birr
									</span>
								</div>
							</Field>
						</FieldGroup>

						<Field>
							<FieldLabel htmlFor="menu-item-description">
								Description
							</FieldLabel>
							<Input
								id="menu-item-description"
								name="description"
								autoComplete="off"
								placeholder="Description (optional)…"
								className="h-10"
								value={description}
								onChange={(event) => setDescription(event.target.value)}
							/>
						</Field>

						{submitError ? (
							<Alert variant="destructive" aria-live="polite">
								<AlertTitle>Failed to create menu</AlertTitle>
								<AlertDescription>{submitError}</AlertDescription>
							</Alert>
						) : null}

						<div className="flex justify-end">
							<Button type="submit" disabled={!canSubmit}>
								{creating ? (
									<>
										<Loader2Icon
											data-icon="inline-start"
											className="animate-spin"
										/>
										Creating…
									</>
								) : (
									"Create Menu for Selected Branches"
								)}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			<div className="rounded-xl bg-card p-4 shadow-xs sm:p-6">
				<div className="mb-4">
					<h2 className="text-xl font-semibold tracking-tight">Branch Menus</h2>
				</div>
				<div>
					{!resolvedViewBranchId ? (
						<Alert className="border-none bg-transparent text-muted-foreground">
							<AlertTitle>No Branch Selected</AlertTitle>
							<AlertDescription>
								Choose a branch in the view dropdown to load menus.
							</AlertDescription>
						</Alert>
					) : menusLoading || menusFetching ? (
						<div
							className="flex items-center gap-2 text-sm text-muted-foreground"
							aria-live="polite"
						>
							<Loader2Icon className="animate-spin" />
							Loading menus…
						</div>
					) : menusError ? (
						<Alert variant="destructive" aria-live="polite">
							<AlertTitle>Menu load error</AlertTitle>
							<AlertDescription>
								Could not load menus for this branch.
							</AlertDescription>
						</Alert>
					) : menus.length === 0 ? (
						<Alert>
							<AlertTitle>No menus yet</AlertTitle>
							<AlertDescription>
								This branch has no menu entries.
							</AlertDescription>
						</Alert>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Category</TableHead>
									<TableHead>Price</TableHead>
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{menus.map((menu) => (
									<TableRow key={menu.id}>
										<TableCell className="max-w-56 truncate">
											{menu.name}
										</TableCell>
										<TableCell>{menu.category}</TableCell>
										<TableCell className="tabular-nums">
											{formatPrice(menu.price)} {DEFAULT_CURRENCY}
										</TableCell>
										<TableCell>
											{menu.is_archived ? "Archived" : "Active"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>
			</div>
		</main>
	);
}
