"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
	EyeIcon,
	Loader2Icon,
	MoreHorizontalIcon,
	PencilIcon,
	PlusIcon,
	RefreshCwIcon,
	Trash2Icon,
} from "lucide-react";

import {
	useArchiveSubscriptionPlanMutation,
	useCreateSubscriptionPlanMutation,
	useGetSubscriptionPlanQuery,
	useListSubscriptionPlansQuery,
	useUpdateSubscriptionPlanMutation,
} from "../../../services/subscription-plan/subscriptionPlanApi";
import type { SubscriptionPlanOutput } from "../../../services/types";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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

function formatMoney(price: string) {
	const n = Number(price);
	if (!Number.isFinite(n)) return price;
	return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function parsePriceInput(raw: string): number | string {
	const trimmed = raw.trim();
	if (trimmed === "") return "";
	const asNum = Number(trimmed);
	return Number.isFinite(asNum) ? asNum : trimmed;
}

type Banner = { variant: "default" | "destructive"; title: string; message: string };

export function PlansAdminPanel({ embedded = false }: { embedded?: boolean }) {
	const [includeArchived, setIncludeArchived] = useState(false);
	const [detailPlanId, setDetailPlanId] = useState<string | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [editPlanId, setEditPlanId] = useState<string | null>(null);
	const [createOpen, setCreateOpen] = useState(false);
	const [archiveTarget, setArchiveTarget] = useState<SubscriptionPlanOutput | null>(
		null,
	);
	const [banner, setBanner] = useState<Banner | null>(null);

	const listArg = useMemo(
		() => (includeArchived ? { includeArchived: true } : undefined),
		[includeArchived],
	);

	const {
		data: plans = [],
		isLoading: listLoading,
		isFetching: listFetching,
		error: listError,
		refetch,
	} = useListSubscriptionPlansQuery(listArg);

	const detailQuery = useGetSubscriptionPlanQuery(
		{ subscriptionPlanId: detailPlanId ?? "" },
		{ skip: !detailPlanId },
	);

	const editQuery = useGetSubscriptionPlanQuery(
		{ subscriptionPlanId: editPlanId ?? "" },
		{ skip: !editOpen || !editPlanId },
	);

	const [createPlan, { isLoading: creating }] = useCreateSubscriptionPlanMutation();
	const [updatePlan, { isLoading: updating }] = useUpdateSubscriptionPlanMutation();
	const [archivePlan, { isLoading: archiving }] = useArchiveSubscriptionPlanMutation();

	const [createName, setCreateName] = useState("");
	const [createMonthlyLimit, setCreateMonthlyLimit] = useState("");
	const [createPrice, setCreatePrice] = useState("");
	const [createDurationDays, setCreateDurationDays] = useState("30");

	const [editName, setEditName] = useState("");
	const [editMonthlyLimit, setEditMonthlyLimit] = useState("");
	const [editPrice, setEditPrice] = useState("");
	const [editDurationDays, setEditDurationDays] = useState("");

	const resetCreateForm = useCallback(() => {
		setCreateName("");
		setCreateMonthlyLimit("");
		setCreatePrice("");
		setCreateDurationDays("30");
	}, []);

	const openEdit = (plan: SubscriptionPlanOutput) => {
		setBanner(null);
		setEditPlanId(plan.id);
		setEditName(plan.name);
		setEditMonthlyLimit(String(plan.monthly_transaction_limit));
		setEditPrice(String(plan.price));
		setEditDurationDays(String(plan.duration_days));
		setEditOpen(true);
	};

	const closeEdit = () => {
		setEditOpen(false);
		setEditPlanId(null);
	};

	const onCreateSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setBanner(null);
		const name = createName.trim();
		const monthly = Number.parseInt(createMonthlyLimit, 10);
		const priceVal = parsePriceInput(createPrice);
		if (!name) {
			setBanner({
				variant: "destructive",
				title: "Validation",
				message: "Enter a plan name.",
			});
			return;
		}
		if (!Number.isFinite(monthly) || monthly < 0) {
			setBanner({
				variant: "destructive",
				title: "Validation",
				message: "Enter a valid monthly transaction limit (0 or greater).",
			});
			return;
		}
		if (priceVal === "") {
			setBanner({
				variant: "destructive",
				title: "Validation",
				message: "Enter a price.",
			});
			return;
		}
		const durationRaw = createDurationDays.trim();
		const durationParsed = durationRaw === "" ? undefined : Number.parseInt(durationRaw, 10);
		if (durationParsed !== undefined && (!Number.isFinite(durationParsed) || durationParsed < 1)) {
			setBanner({
				variant: "destructive",
				title: "Validation",
				message: "Duration must be at least 1 day, or leave blank for the default.",
			});
			return;
		}
		try {
			await createPlan({
				body: {
					name,
					monthly_transaction_limit: monthly,
					price: priceVal,
					...(durationParsed !== undefined ? { duration_days: durationParsed } : {}),
				},
			}).unwrap();
			setCreateOpen(false);
			setBanner({
				variant: "default",
				title: "Plan created",
				message: "The subscription plan was added successfully.",
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				title: "Could not create plan",
				message: getErrorMessage(err, "Request failed."),
			});
		}
	};

	const onEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editPlanId) return;
		setBanner(null);
		const name = editName.trim();
		const monthly = Number.parseInt(editMonthlyLimit, 10);
		const priceVal = parsePriceInput(editPrice);
		const durationRaw = editDurationDays.trim();
		const durationParsed = durationRaw === "" ? null : Number.parseInt(durationRaw, 10);

		if (!name) {
			setBanner({
				variant: "destructive",
				title: "Validation",
				message: "Enter a plan name.",
			});
			return;
		}
		if (!Number.isFinite(monthly) || monthly < 0) {
			setBanner({
				variant: "destructive",
				title: "Validation",
				message: "Enter a valid monthly transaction limit.",
			});
			return;
		}
		if (priceVal === "") {
			setBanner({
				variant: "destructive",
				title: "Validation",
				message: "Enter a price.",
			});
			return;
		}
		if (durationParsed !== null && (!Number.isFinite(durationParsed) || durationParsed < 1)) {
			setBanner({
				variant: "destructive",
				title: "Validation",
				message: "Duration must be at least 1 day or cleared.",
			});
			return;
		}

		try {
			await updatePlan({
				subscriptionPlanId: editPlanId,
				body: {
					name,
					monthly_transaction_limit: monthly,
					price: priceVal,
					duration_days:
						durationParsed === null
							? null
							: durationParsed,
				},
			}).unwrap();
			closeEdit();
			setBanner({
				variant: "default",
				title: "Plan updated",
				message: "Changes were saved.",
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				title: "Could not update plan",
				message: getErrorMessage(err, "Request failed."),
			});
		}
	};

	const onConfirmArchive = async () => {
		if (!archiveTarget) return;
		setBanner(null);
		try {
			await archivePlan({ subscriptionPlanId: archiveTarget.id }).unwrap();
			setArchiveTarget(null);
			setDetailPlanId((id) => (id === archiveTarget.id ? null : id));
			setBanner({
				variant: "default",
				title: "Plan archived",
				message: `"${archiveTarget.name}" is no longer offered to new subscribers.`,
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				title: "Could not archive plan",
				message: getErrorMessage(err, "Request failed."),
			});
		}
	};

	const listBusy = listLoading || listFetching;

	return (
		<div className="flex flex-col gap-6">
			{!embedded ? (
				<h1 className="text-balance text-2xl font-semibold tracking-tight">
					Subscription plans
				</h1>
			) : null}

			<div aria-live="polite" className="min-h-0">
				{banner && (
					<Alert
						variant={banner.variant === "destructive" ? "destructive" : "default"}
						className="mb-4"
					>
						<AlertTitle>{banner.title}</AlertTitle>
						<AlertDescription>{banner.message}</AlertDescription>
					</Alert>
				)}
			</div>

			<Card>
				<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-1">
						<CardTitle>Plans</CardTitle>
						<p className="text-sm text-muted-foreground">
							{plans.length} plan{plans.length === 1 ? "" : "s"} loaded
						</p>
					</div>
					<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
						<Field orientation="horizontal" className="sm:items-center">
							<Checkbox
								id="include-archived"
								checked={includeArchived}
								onCheckedChange={(v) => setIncludeArchived(v === true)}
								aria-describedby="include-archived-desc"
							/>
							<div className="flex flex-col gap-0.5">
								<FieldLabel htmlFor="include-archived" className="cursor-pointer">
									Include archived
								</FieldLabel>
								<p id="include-archived-desc" className="sr-only">
									When checked, the list includes plans that were archived
								</p>
							</div>
						</Field>
						<Button
							type="button"
							variant="outline"
							onClick={() => void refetch()}
							disabled={listBusy}
							aria-busy={listBusy}
						>
							{listBusy ? (
								<Loader2Icon className="animate-spin" aria-hidden="true" />
							) : (
								<RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
							)}
							Refresh
						</Button>
						<Button type="button" onClick={() => setCreateOpen(true)}>
							<PlusIcon data-icon="inline-start" aria-hidden="true" />
							New plan
						</Button>
					</div>
				</CardHeader>

				<Separator />

				<CardContent className="flex flex-col gap-4 pt-6">
					{listError ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load plans</AlertTitle>
							<AlertDescription>
								{getErrorMessage(listError, "Could not fetch subscription plans.")}
							</AlertDescription>
						</Alert>
					) : listLoading ? (
						<div className="flex flex-col gap-3">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</div>
					) : plans.length === 0 ? (
						<p className="text-center text-sm text-muted-foreground">
							No plans yet. Create one to get started.
						</p>
					) : (
						<div className="overflow-x-auto rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="min-w-48">Name</TableHead>
										<TableHead className="text-right tabular-nums">Price</TableHead>
										<TableHead className="text-right tabular-nums">
											Monthly limit
										</TableHead>
										<TableHead className="text-right tabular-nums">Duration</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="w-12 text-right">
											<span className="sr-only">Actions</span>
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{plans.map((plan) => (
										<TableRow key={plan.id}>
											<TableCell className="min-w-0 max-w-[16rem] font-medium">
												<span className="truncate">{plan.name}</span>
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{formatMoney(plan.price)}
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{plan.monthly_transaction_limit.toLocaleString()}
											</TableCell>
											<TableCell className="text-right tabular-nums text-muted-foreground">
												{plan.duration_days} days
											</TableCell>
											<TableCell>
												{plan.is_archived ? (
													<Badge variant="secondary">Archived</Badge>
												) : (
													<Badge variant="default">Active</Badge>
												)}
											</TableCell>
											<TableCell className="text-right">
												<DropdownMenu>
													<DropdownMenuTrigger
														render={
															<Button
																variant="ghost"
																size="icon-sm"
																aria-label={`Actions for ${plan.name}`}
															/>
														}
													>
														<MoreHorizontalIcon aria-hidden="true" />
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end" className="w-48">
														<DropdownMenuGroup>
															<DropdownMenuItem
																onClick={() => {
																	setBanner(null);
																	setDetailPlanId(plan.id);
																}}
															>
																<EyeIcon aria-hidden="true" />
																View details
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => openEdit(plan)}
																disabled={plan.is_archived}
															>
																<PencilIcon aria-hidden="true" />
																Edit
															</DropdownMenuItem>
															<DropdownMenuItem
																variant="destructive"
																onClick={() => {
																	setBanner(null);
																	setArchiveTarget(plan);
																}}
																disabled={plan.is_archived}
															>
																<Trash2Icon aria-hidden="true" />
																Archive
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

			{/* Detail: GET /api/v1/subscription-plan/{id} */}
			<Sheet
				open={detailPlanId !== null}
				onOpenChange={(open) => {
					if (!open) setDetailPlanId(null);
				}}
			>
				<SheetContent side="right" className="sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Plan details</SheetTitle>
						<SheetDescription>
							Latest data from the server for this plan.
						</SheetDescription>
					</SheetHeader>
					<div className="flex flex-col gap-4 px-4 pb-6">
						{detailQuery.isLoading || (detailQuery.isFetching && !detailQuery.data) ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-8 w-full" />
							</div>
						) : detailQuery.error ? (
							<Alert variant="destructive">
								<AlertTitle>Could not load plan</AlertTitle>
								<AlertDescription>
									{getErrorMessage(detailQuery.error, "Try again from the list.")}
								</AlertDescription>
							</Alert>
						) : detailQuery.data ? (
							<dl className="flex flex-col gap-4 text-sm">
								<div>
									<dt className="text-muted-foreground">Name</dt>
									<dd className="font-medium">{detailQuery.data.name}</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">Plan ID</dt>
									<dd className="break-all font-mono text-xs" translate="no">
										{detailQuery.data.id}
									</dd>
								</div>
								<div className="flex flex-wrap gap-6">
									<div>
										<dt className="text-muted-foreground">Price</dt>
										<dd className="tabular-nums font-medium">
											{formatMoney(detailQuery.data.price)}
										</dd>
									</div>
									<div>
										<dt className="text-muted-foreground">Monthly limit</dt>
										<dd className="tabular-nums font-medium">
											{detailQuery.data.monthly_transaction_limit.toLocaleString()}
										</dd>
									</div>
									<div>
										<dt className="text-muted-foreground">Duration</dt>
										<dd className="tabular-nums font-medium">
											{detailQuery.data.duration_days} days
										</dd>
									</div>
								</div>
								<div>
									<dt className="text-muted-foreground">Status</dt>
									<dd>
										{detailQuery.data.is_archived ? (
											<Badge variant="secondary">Archived</Badge>
										) : (
											<Badge variant="default">Active</Badge>
										)}
									</dd>
								</div>
							</dl>
						) : null}
					</div>
				</SheetContent>
			</Sheet>

			{/* Create: POST /api/v1/subscription-plan */}
			<Dialog
				open={createOpen}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (open) resetCreateForm();
				}}
			>
				<DialogContent className="sm:max-w-md" showCloseButton>
					<form onSubmit={onCreateSubmit}>
						<DialogHeader>
							<DialogTitle>New subscription plan</DialogTitle>
							<DialogDescription>
								Required fields match the API. Duration defaults to 30 days on the
								server if omitted.
							</DialogDescription>
						</DialogHeader>
						<FieldGroup className="py-2">
							<Field>
								<FieldLabel htmlFor="create-name">Name</FieldLabel>
								<Input
									id="create-name"
									name="name"
									autoComplete="off"
									placeholder="e.g. Professional…"
									value={createName}
									onChange={(e) => setCreateName(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="create-monthly">Monthly transaction limit</FieldLabel>
								<Input
									id="create-monthly"
									name="monthly_transaction_limit"
									type="text"
									inputMode="numeric"
									autoComplete="off"
									spellCheck={false}
									placeholder="e.g. 1000"
									value={createMonthlyLimit}
									onChange={(e) => setCreateMonthlyLimit(e.target.value)}
								/>
								<FieldDescription>Whole number; 0 means unlimited depending on policy.</FieldDescription>
							</Field>
							<Field>
								<FieldLabel htmlFor="create-price">Price</FieldLabel>
								<Input
									id="create-price"
									name="price"
									type="text"
									inputMode="decimal"
									autoComplete="off"
									placeholder="e.g. 99.99"
									value={createPrice}
									onChange={(e) => setCreatePrice(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="create-duration">Duration (days)</FieldLabel>
								<Input
									id="create-duration"
									name="duration_days"
									type="text"
									inputMode="numeric"
									autoComplete="off"
									placeholder="30"
									value={createDurationDays}
									onChange={(e) => setCreateDurationDays(e.target.value)}
								/>
								<FieldDescription>Leave as 30 or clear to rely on server default.</FieldDescription>
							</Field>
						</FieldGroup>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setCreateOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={creating}>
								{creating ? (
									<Loader2Icon className="animate-spin" aria-hidden="true" />
								) : null}
								{creating ? "Creating…" : "Create plan"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Edit: PATCH /api/v1/subscription-plan/{id} */}
			<Dialog
				open={editOpen}
				onOpenChange={(open) => {
					if (!open) closeEdit();
				}}
			>
				<DialogContent className="sm:max-w-md" showCloseButton>
					<form onSubmit={onEditSubmit}>
						<DialogHeader>
							<DialogTitle>Edit plan</DialogTitle>
							<DialogDescription>
								Updates are sent as a partial-shaped payload; empty duration clears
								the field when supported by the API.
							</DialogDescription>
						</DialogHeader>
						{editQuery.error ? (
							<Alert variant="destructive" className="mb-2">
								<AlertTitle>Could not refresh plan from server</AlertTitle>
								<AlertDescription>
									{getErrorMessage(editQuery.error, "You can still edit values from the list, or close and retry.")}
								</AlertDescription>
							</Alert>
						) : null}
						{editQuery.isFetching && !editQuery.error ? (
							<p className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
								<Loader2Icon className="animate-spin" aria-hidden="true" />
								Syncing latest plan…
							</p>
						) : null}
						<FieldGroup className="py-2">
								<Field>
									<FieldLabel htmlFor="edit-name">Name</FieldLabel>
									<Input
										id="edit-name"
										name="name"
										autoComplete="off"
										value={editName}
										onChange={(e) => setEditName(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="edit-monthly">Monthly transaction limit</FieldLabel>
									<Input
										id="edit-monthly"
										name="monthly_transaction_limit"
										type="text"
										inputMode="numeric"
										autoComplete="off"
										spellCheck={false}
										value={editMonthlyLimit}
										onChange={(e) => setEditMonthlyLimit(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="edit-price">Price</FieldLabel>
									<Input
										id="edit-price"
										name="price"
										type="text"
										inputMode="decimal"
										autoComplete="off"
										value={editPrice}
										onChange={(e) => setEditPrice(e.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="edit-duration">Duration (days)</FieldLabel>
									<Input
										id="edit-duration"
										name="duration_days"
										type="text"
										inputMode="numeric"
										autoComplete="off"
										placeholder="Clear to send null"
										value={editDurationDays}
										onChange={(e) => setEditDurationDays(e.target.value)}
									/>
									<FieldDescription>
										Clear the field to set duration to null on update.
									</FieldDescription>
								</Field>
							</FieldGroup>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={closeEdit}>
								Cancel
							</Button>
							<Button type="submit" disabled={updating}>
								{updating ? (
									<Loader2Icon className="animate-spin" aria-hidden="true" />
								) : null}
								{updating ? "Saving…" : "Save changes"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Archive: DELETE /api/v1/subscription-plan/{id} */}
			<AlertDialog
				open={archiveTarget !== null}
				onOpenChange={(open) => {
					if (!open) setArchiveTarget(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Archive this plan?</AlertDialogTitle>
						<AlertDialogDescription>
							{archiveTarget ? (
								<>
									<span className="font-medium text-foreground">
										{archiveTarget.name}
									</span>{" "}
									will be archived. Existing subscriptions may continue according to
									your billing rules.
								</>
							) : null}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={(e) => {
								e.preventDefault();
								void onConfirmArchive();
							}}
							disabled={archiving}
						>
							{archiving ? (
								<Loader2Icon className="animate-spin" aria-hidden="true" />
							) : null}
							{archiving ? "Archiving…" : "Archive plan"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

export default function PlansPage() {
	const router = useRouter();
	useEffect(() => {
		router.replace("/admin/settings?tab=plans");
	}, [router]);
	return null;
}
