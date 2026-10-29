"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
	CalendarIcon,
	Loader2Icon,
	PencilIcon,
	PlusIcon,
	RefreshCwIcon,
	Trash2Icon,
	ViewIcon,
	XIcon,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
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
import { Calendar } from "@/components/ui/calendar";
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
	FieldGroup,
	FieldLegend,
	FieldLabel,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
	SelectValue,
	SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	useCreateCouponMutation,
	useDeleteCouponMutation,
	useGetCouponQuery,
	useListCouponsQuery,
	useUpdateCouponMutation,
} from "@/services/coupons/couponsApi";
import { useListSubscriptionPlansQuery } from "@/services/subscription-plan/subscriptionPlanApi";
import type {
	CouponCreateRequest,
	CouponDiscountType,
	CouponOutput,
	CouponUpdateRequest,
	SubscriptionPlanOutput,
} from "@/services/types";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
type StatusFilter = "all" | "active" | "inactive";
type CouponFormMode = "create" | "edit";
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function isPageSize(value: number): value is PageSize {
	return PAGE_SIZE_OPTIONS.some((option) => option === value);
}

type CouponFormState = {
	code: string;
	description: string;
	discountType: CouponDiscountType;
	discountValue: string;
	maxDiscountAmount: string;
	minPurchaseAmount: string;
	applicablePlanIds: string[] | null;
	maxUses: string;
	maxUsesPerBusiness: string;
	validFrom: string;
	validUntil: string;
	isActive: boolean;
};

const emptyForm = (): CouponFormState => ({
	code: "",
	description: "",
	discountType: "percentage",
	discountValue: "",
	maxDiscountAmount: "",
	minPurchaseAmount: "0",
	applicablePlanIds: null,
	maxUses: "",
	maxUsesPerBusiness: "1",
	validFrom: "",
	validUntil: "",
	isActive: true,
});

function getErrorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"data" in error &&
		typeof error.data === "object" &&
		error.data !== null &&
		"detail" in error.data
	) {
		const detail = error.data.detail;
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
				.filter((message): message is string => message !== null);
			if (messages.length > 0) return messages.join(", ");
		}
	}
	if (error instanceof Error) return error.message;
	return fallback;
}

function formatDateTime(value?: string | null): string {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return format(date, "MMM d, yyyy HH:mm");
}

function toLocalDateTimeInput(value?: string | null): string {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function parseLocalDateTime(value: string): Date | undefined {
	if (!value) return undefined;
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
	if (!match) return undefined;
	const [, year, month, day, hour, minute] = match;
	const date = new Date(
		Number(year),
		Number(month) - 1,
		Number(day),
		Number(hour),
		Number(minute),
	);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

function updateDatePart(value: string, selectedDate: Date): string {
	const existingDate = parseLocalDateTime(value);
	const hour = existingDate?.getHours() ?? 0;
	const minute = existingDate?.getMinutes() ?? 0;
	const nextDate = new Date(
		selectedDate.getFullYear(),
		selectedDate.getMonth(),
		selectedDate.getDate(),
		hour,
		minute,
	);
	const pad = (part: number) => String(part).padStart(2, "0");
	return `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}-${pad(nextDate.getDate())}T${pad(hour)}:${pad(minute)}`;
}

function updateTimePart(value: string, time: string): string {
	const date = parseLocalDateTime(value);
	if (!date || !time) return value;
	const [hour, minute] = time.split(":").map(Number);
	date.setHours(hour, minute, 0, 0);
	const pad = (part: number) => String(part).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(value: string): string | null {
	const date = parseLocalDateTime(value);
	return date ? date.toISOString() : null;
}

function formFromCoupon(coupon: CouponOutput): CouponFormState {
	return {
		code: coupon.code,
		description: coupon.description ?? "",
		discountType: coupon.discount_type,
		discountValue: coupon.discount_value,
		maxDiscountAmount: coupon.max_discount_amount ?? "",
		minPurchaseAmount: coupon.min_purchase_amount,
		applicablePlanIds: coupon.applicable_plan_ids ?? null,
		maxUses: coupon.max_uses?.toString() ?? "",
		maxUsesPerBusiness: coupon.max_uses_per_business.toString(),
		validFrom: toLocalDateTimeInput(coupon.valid_from),
		validUntil: toLocalDateTimeInput(coupon.valid_until),
		isActive: coupon.is_active,
	};
}

function buildCreateBody(form: CouponFormState): CouponCreateRequest {
	return {
		code: form.code.trim(),
		description: form.description.trim() || null,
		discount_type: form.discountType,
		discount_value: form.discountValue,
		max_discount_amount: form.maxDiscountAmount || null,
		min_purchase_amount: form.minPurchaseAmount || "0",
		applicable_plan_ids: form.applicablePlanIds,
		max_uses: form.maxUses ? Number(form.maxUses) : null,
		max_uses_per_business: Number(form.maxUsesPerBusiness),
		valid_from: toIsoDateTime(form.validFrom),
		valid_until: toIsoDateTime(form.validUntil),
		is_active: form.isActive,
	};
}

function buildUpdateBody(form: CouponFormState): CouponUpdateRequest {
	return {
		description: form.description.trim() || null,
		discount_type: form.discountType,
		discount_value: form.discountValue,
		max_discount_amount: form.maxDiscountAmount || null,
		min_purchase_amount: form.minPurchaseAmount || "0",
		applicable_plan_ids: form.applicablePlanIds,
		max_uses: form.maxUses ? Number(form.maxUses) : null,
		max_uses_per_business: Number(form.maxUsesPerBusiness),
		valid_from: toIsoDateTime(form.validFrom),
		valid_until: toIsoDateTime(form.validUntil),
		is_active: form.isActive,
	};
}

export default function CouponsPage() {
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState<PageSize>(25);
	const [formMode, setFormMode] = useState<CouponFormMode | null>(null);
	const [formCouponId, setFormCouponId] = useState<string | null>(null);
	const [form, setForm] = useState<CouponFormState>(emptyForm);
	const [formError, setFormError] = useState("");
	const [detailCouponId, setDetailCouponId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<CouponOutput | null>(null);
	const [deleteError, setDeleteError] = useState("");

	const {
		data: couponPage,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useListCouponsQuery({
		isActive:
			statusFilter === "all" ? undefined : statusFilter === "active",
		page,
		limit,
	});
	const {
		data: subscriptionPlans,
		isLoading: plansLoading,
		error: plansError,
		refetch: refetchPlans,
	} = useListSubscriptionPlansQuery();
	const {
		currentData: detailCoupon,
		isLoading: detailLoading,
		error: detailError,
		refetch: refetchDetail,
	} = useGetCouponQuery(
		{ couponId: detailCouponId ?? "" },
		{ skip: detailCouponId === null },
	);
	const [createCoupon, createState] = useCreateCouponMutation();
	const [updateCoupon, updateState] = useUpdateCouponMutation();
	const [deleteCoupon, deleteState] = useDeleteCouponMutation();

	const totalPages = Math.max(
		1,
		Math.ceil((couponPage?.total_count ?? 0) / limit),
	);
	const formBusy = createState.isLoading || updateState.isLoading;

	function openCreate() {
		setForm(emptyForm());
		setFormCouponId(null);
		setFormError("");
		setFormMode("create");
	}

	function openEdit(coupon: CouponOutput) {
		setForm(formFromCoupon(coupon));
		setFormCouponId(coupon.id);
		setFormError("");
		setFormMode("edit");
		setDetailCouponId(null);
	}

	function closeForm() {
		if (formBusy) return;
		setFormMode(null);
		setFormCouponId(null);
		setForm(emptyForm());
		setFormError("");
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFormError("");
		try {
			if (formMode === "create") {
				await createCoupon(buildCreateBody(form)).unwrap();
			} else if (formMode === "edit" && formCouponId) {
				await updateCoupon({
					couponId: formCouponId,
					body: buildUpdateBody(form),
				}).unwrap();
			} else {
				return;
			}
			closeForm();
		} catch (submitError) {
			setFormError(
				getErrorMessage(
					submitError,
					formMode === "create"
						? "Failed to create coupon."
						: "Failed to update coupon.",
				),
			);
		}
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		setDeleteError("");
		try {
			await deleteCoupon({ couponId: deleteTarget.id }).unwrap();
			setDeleteTarget(null);
			if (couponPage?.items.length === 1 && page > 1) {
				setPage(page - 1);
			}
		} catch (deleteFailure) {
			setDeleteError(getErrorMessage(deleteFailure, "Failed to delete coupon."));
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Coupons"
				description="Create and manage promotional discounts."
				actions={
					<Button type="button" size="sm" onClick={openCreate}>
						<PlusIcon data-icon="inline-start" aria-hidden />
						Add coupon
					</Button>
				}
			/>

			<Card>
				<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle>
						{statusFilter === "all"
							? "All coupons"
							: statusFilter === "active"
								? "Active coupons"
								: "Inactive coupons"}
						{couponPage ? (
							<span className="ml-2 text-sm font-normal text-muted-foreground">
								{couponPage.total_count.toLocaleString()} total
							</span>
						) : null}
					</CardTitle>
					<div className="flex flex-wrap items-center gap-2">
						<Select
							value={statusFilter}
							onValueChange={(value) => {
								if (
									value === "all" ||
									value === "active" ||
									value === "inactive"
								) {
									setStatusFilter(value);
									setPage(1);
								}
							}}
						>
							<SelectTrigger aria-label="Filter coupons by status">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="all">All statuses</SelectItem>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="inactive">Inactive</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
						<Select
							value={String(limit)}
							onValueChange={(value) => {
								const nextLimit = Number(value);
								if (isPageSize(nextLimit)) {
									setLimit(nextLimit);
									setPage(1);
								}
							}}
						>
							<SelectTrigger aria-label="Coupons per page">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{PAGE_SIZE_OPTIONS.map((option) => (
										<SelectItem key={option} value={String(option)}>
											{option} per page
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => void refetch()}
							disabled={isFetching}
							aria-label="Refresh coupons"
						>
							<RefreshCwIcon className={isFetching ? "animate-spin" : ""} />
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{error ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load coupons</AlertTitle>
							<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<span>{getErrorMessage(error, "Request failed.")}</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => void refetch()}
								>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : isLoading ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 5 }).map((_, index) => (
								<Skeleton key={index} className="h-14 w-full" />
							))}
						</div>
					) : couponPage?.items.length ? (
						<>
							<div className="overflow-x-auto rounded-lg border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Coupon</TableHead>
											<TableHead>Discount</TableHead>
											<TableHead>Usage</TableHead>
											<TableHead>Validity</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="w-32 text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{couponPage.items.map((coupon) => (
											<TableRow key={coupon.id}>
												<TableCell>
													<div className="flex flex-col gap-0.5">
														<span className="font-semibold">{coupon.code}</span>
														<span className="max-w-64 truncate text-xs text-muted-foreground">
															{coupon.description || "No description"}
														</span>
													</div>
												</TableCell>
												<TableCell>
													<div className="flex flex-col gap-0.5">
														<span className="font-medium">
															{coupon.discount_type === "percentage"
																? `${coupon.discount_value}%`
																: `${coupon.discount_value} ETB`}
														</span>
														<span className="text-xs text-muted-foreground">
															Min. {coupon.min_purchase_amount} ETB
														</span>
													</div>
												</TableCell>
												<TableCell className="tabular-nums">
													{coupon.used_count.toLocaleString()}
													<span className="text-muted-foreground">
														{" "}
														/ {coupon.max_uses?.toLocaleString() ?? "∞"}
													</span>
												</TableCell>
												<TableCell className="whitespace-nowrap text-sm text-muted-foreground">
													{coupon.valid_from || coupon.valid_until ? (
														<>
															{formatDateTime(coupon.valid_from)}
															<span className="px-1">–</span>
															{formatDateTime(coupon.valid_until)}
														</>
													) : (
														"No expiry"
													)}
												</TableCell>
												<TableCell>
													<Badge
														variant={coupon.is_active ? "default" : "secondary"}
													>
														{coupon.is_active ? "Active" : "Inactive"}
													</Badge>
												</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-1">
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															onClick={() => setDetailCouponId(coupon.id)}
															aria-label={`View ${coupon.code}`}
														>
															<ViewIcon aria-hidden />
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															onClick={() => openEdit(coupon)}
															aria-label={`Edit ${coupon.code}`}
														>
															<PencilIcon aria-hidden />
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															onClick={() => {
																setDeleteError("");
																setDeleteTarget(coupon);
															}}
															aria-label={`Delete ${coupon.code}`}
														>
															<Trash2Icon className="text-destructive" aria-hidden />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
							<div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-sm text-muted-foreground" aria-live="polite">
									Page {page} of {totalPages}
									{isFetching ? " · Refreshing…" : ""}
								</p>
								<div className="flex gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setPage((current) => Math.max(1, current - 1))}
										disabled={page <= 1 || isFetching}
									>
										Previous
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() =>
											setPage((current) => Math.min(totalPages, current + 1))
										}
										disabled={page >= totalPages || isFetching}
									>
										Next
									</Button>
								</div>
							</div>
						</>
					) : (
						<div className="flex flex-col items-center gap-3 py-12 text-center">
							<p className="text-sm text-muted-foreground">
								{statusFilter === "all"
									? "No coupons yet. Create a coupon to offer promotional discounts."
									: `No ${statusFilter} coupons found.`}
							</p>
							{statusFilter === "all" ? (
								<Button type="button" variant="outline" onClick={openCreate}>
									<PlusIcon data-icon="inline-start" aria-hidden />
									Create coupon
								</Button>
							) : null}
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={formMode !== null}
				onOpenChange={(open) => {
					if (!open) closeForm();
				}}
			>
				<DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<DialogHeader>
							<DialogTitle>
								{formMode === "edit" ? "Edit coupon" : "Create coupon"}
							</DialogTitle>
							<DialogDescription>
								Configure the discount, eligibility, and validity period.
							</DialogDescription>
						</DialogHeader>
						<CouponFormFields
							form={form}
							setForm={setForm}
							mode={formMode ?? "create"}
							plans={subscriptionPlans ?? []}
							plansLoading={plansLoading}
							plansError={plansError}
							onRetryPlans={() => void refetchPlans()}
						/>
						{formError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not save coupon</AlertTitle>
								<AlertDescription>{formError}</AlertDescription>
							</Alert>
						) : null}
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={closeForm}
								disabled={formBusy}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={formBusy || plansLoading || Boolean(plansError)}
							>
								{formBusy ? (
									<Loader2Icon
										className="animate-spin"
										data-icon="inline-start"
										aria-hidden
									/>
								) : null}
								{formMode === "edit" ? "Save changes" : "Create coupon"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={detailCouponId !== null}
				onOpenChange={(open) => {
					if (!open) setDetailCouponId(null);
				}}
			>
				<DialogContent className="sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>
							{detailCoupon?.code ?? "Coupon details"}
						</DialogTitle>
						<DialogDescription>
							Full coupon configuration and usage information.
						</DialogDescription>
					</DialogHeader>
					{detailLoading ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 5 }).map((_, index) => (
								<Skeleton key={index} className="h-8 w-full" />
							))}
						</div>
					) : detailError ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load coupon</AlertTitle>
							<AlertDescription className="flex flex-col gap-2">
								<span>{getErrorMessage(detailError, "Request failed.")}</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => void refetchDetail()}
								>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : detailCoupon ? (
						<CouponDetails coupon={detailCoupon} />
					) : null}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setDetailCouponId(null)}
						>
							Close
						</Button>
						<Button
							type="button"
							disabled={!detailCoupon || detailLoading}
							onClick={() => {
								if (detailCoupon) openEdit(detailCoupon);
							}}
						>
							<PencilIcon data-icon="inline-start" aria-hidden />
							Edit coupon
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
						setDeleteError("");
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete coupon?</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently deletes the coupon{" "}
							<strong>{deleteTarget?.code}</strong>. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deleteError ? (
						<p className="text-sm text-destructive" role="alert">
							{deleteError}
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteState.isLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								event.preventDefault();
								void handleDelete();
							}}
							disabled={deleteState.isLoading}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{deleteState.isLoading ? "Deleting…" : "Delete coupon"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function CouponFormFields({
	form,
	setForm,
	mode,
	plans,
	plansLoading,
	plansError,
	onRetryPlans,
}: {
	form: CouponFormState;
	setForm: React.Dispatch<React.SetStateAction<CouponFormState>>;
	mode: CouponFormMode;
	plans: SubscriptionPlanOutput[];
	plansLoading: boolean;
	plansError: unknown;
	onRetryPlans: () => void;
}) {
	const prefix = `coupon-${mode}`;
	const update = <K extends keyof CouponFormState>(
		field: K,
		value: CouponFormState[K],
	) => setForm((current) => ({ ...current, [field]: value }));
	const allPlansSelected =
		form.applicablePlanIds === null ||
		(plans.length > 0 &&
			plans.every((plan) => form.applicablePlanIds?.includes(plan.id) ?? false));

	return (
		<FieldGroup className="grid gap-4 py-2 sm:grid-cols-2">
			<Field>
				<RequiredFieldLabel htmlFor={`${prefix}-code`}>
					Coupon code
				</RequiredFieldLabel>
				<Input
					id={`${prefix}-code`}
					value={form.code}
					onChange={(event) => update("code", event.target.value.toUpperCase())}
					placeholder="WELCOME10"
					minLength={2}
					maxLength={64}
					required
					disabled={mode === "edit"}
				/>
				{mode === "edit" ? (
					<FieldDescription>Coupon codes cannot be changed.</FieldDescription>
				) : null}
			</Field>
			<Field>
				<FieldLabel htmlFor={`${prefix}-description`}>Description</FieldLabel>
				<Input
					id={`${prefix}-description`}
					value={form.description}
					onChange={(event) => update("description", event.target.value)}
					maxLength={255}
					placeholder="Optional description"
				/>
			</Field>
			<Field>
				<RequiredFieldLabel htmlFor={`${prefix}-discount-type`}>
					Discount type
				</RequiredFieldLabel>
				<Select
					value={form.discountType}
					onValueChange={(value) => {
						if (value === "percentage" || value === "fixed") {
							update("discountType", value);
						}
					}}
				>
					<SelectTrigger id={`${prefix}-discount-type`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value="percentage">Percentage</SelectItem>
							<SelectItem value="fixed">Fixed amount</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</Field>
			<Field>
				<RequiredFieldLabel htmlFor={`${prefix}-discount-value`}>
					{form.discountType === "percentage"
						? "Discount percentage"
						: "Discount amount (ETB)"}
				</RequiredFieldLabel>
				<Input
					id={`${prefix}-discount-value`}
					type="number"
					min="0.01"
					step="any"
					value={form.discountValue}
					onChange={(event) => update("discountValue", event.target.value)}
					required
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={`${prefix}-max-discount`}>
					Maximum discount (ETB)
				</FieldLabel>
				<Input
					id={`${prefix}-max-discount`}
					type="number"
					min="0.01"
					step="any"
					value={form.maxDiscountAmount}
					onChange={(event) =>
						update("maxDiscountAmount", event.target.value)
					}
					placeholder="No cap"
				/>
				<FieldDescription>
					For percentage discounts, leave blank for no cap.
				</FieldDescription>
			</Field>
			<Field>
				<FieldLabel htmlFor={`${prefix}-minimum`}>
					Minimum purchase (ETB)
				</FieldLabel>
				<Input
					id={`${prefix}-minimum`}
					type="number"
					min="0"
					step="any"
					value={form.minPurchaseAmount}
					onChange={(event) => update("minPurchaseAmount", event.target.value)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={`${prefix}-max-uses`}>Total usage limit</FieldLabel>
				<Input
					id={`${prefix}-max-uses`}
					type="number"
					min="1"
					step="1"
					value={form.maxUses}
					onChange={(event) => update("maxUses", event.target.value)}
					placeholder="Unlimited"
				/>
			</Field>
			<Field>
				<RequiredFieldLabel htmlFor={`${prefix}-max-per-business`}>
					Uses per business
				</RequiredFieldLabel>
				<Input
					id={`${prefix}-max-per-business`}
					type="number"
					min="1"
					step="1"
					value={form.maxUsesPerBusiness}
					onChange={(event) =>
						update("maxUsesPerBusiness", event.target.value)
					}
					required
				/>
			</Field>
			<FieldSet className="sm:col-span-2">
				<FieldLegend variant="label">Applicable subscription plans</FieldLegend>
				<FieldDescription>
					Choose which plans can use this coupon.
				</FieldDescription>
				<Field orientation="horizontal">
					<Checkbox
						id={`${prefix}-all-plans`}
						checked={allPlansSelected}
						onCheckedChange={(checked) =>
							update("applicablePlanIds", checked === true ? null : [])
						}
						disabled={
							plansLoading || Boolean(plansError) || plans.length === 0
						}
					/>
					<FieldLabel htmlFor={`${prefix}-all-plans`} className="font-normal">
						All plans
					</FieldLabel>
				</Field>
				{plansLoading ? (
					<div className="flex flex-col gap-2">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
					</div>
				) : plansError ? (
					<Alert variant="destructive">
						<AlertTitle>Failed to load subscription plans</AlertTitle>
						<AlertDescription className="flex flex-col gap-2">
							<span>{getErrorMessage(plansError, "Request failed.")}</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={onRetryPlans}
							>
								Try again
							</Button>
						</AlertDescription>
					</Alert>
				) : plans.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No subscription plans are available.
					</p>
				) : form.applicablePlanIds !== null ? (
					<FieldGroup className="max-h-48 overflow-y-auto rounded-md border p-3">
						{plans.map((plan) => {
							const checked =
								form.applicablePlanIds?.includes(plan.id) ?? false;
							return (
								<Field key={plan.id} orientation="horizontal">
									<Checkbox
										id={`${prefix}-plan-${plan.id}`}
										checked={checked}
										onCheckedChange={(nextChecked) => {
											setForm((current) => {
												const selected =
													current.applicablePlanIds === null
														? plans.map((item) => item.id)
														: current.applicablePlanIds;
												const next = nextChecked
													? [...new Set([...selected, plan.id])]
													: selected.filter((id) => id !== plan.id);
												return { ...current, applicablePlanIds: next };
											});
										}}
									/>
									<FieldLabel
										htmlFor={`${prefix}-plan-${plan.id}`}
										className="min-w-0 flex-1 font-normal"
									>
										<span className="truncate">{plan.name}</span>
										<span className="shrink-0 text-muted-foreground">
											{plan.price} ETB
										</span>
									</FieldLabel>
								</Field>
							);
						})}
					</FieldGroup>
				) : null}
				{form.applicablePlanIds !== null &&
				form.applicablePlanIds.some(
					(id) => !plans.some((plan) => plan.id === id),
				) ? (
					<FieldDescription>
						Some saved plan selections are no longer available and will be
						preserved when you save.
					</FieldDescription>
				) : null}
			</FieldSet>
			<Field>
				<FieldLabel htmlFor={`${prefix}-valid-from`}>
					Valid from
				</FieldLabel>
				<CouponDateTimePicker
					id={`${prefix}-valid-from`}
					value={form.validFrom}
					onChange={(value) => update("validFrom", value)}
					label="valid from"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={`${prefix}-valid-until`}>
					Valid until
				</FieldLabel>
				<CouponDateTimePicker
					id={`${prefix}-valid-until`}
					value={form.validUntil}
					onChange={(value) => update("validUntil", value)}
					label="valid until"
				/>
			</Field>
			<Field
				orientation="horizontal"
				className="items-center sm:col-span-2"
			>
				<Checkbox
					id={`${prefix}-active`}
					checked={form.isActive}
					onCheckedChange={(checked) => update("isActive", checked === true)}
				/>
				<FieldLabel htmlFor={`${prefix}-active`} className="font-normal">
					Coupon is active
				</FieldLabel>
			</Field>
		</FieldGroup>
	);
}

function CouponDetails({ coupon }: { coupon: CouponOutput }) {
	const details = [
		["Description", coupon.description || "—"],
		[
			"Discount",
			coupon.discount_type === "percentage"
				? `${coupon.discount_value}%`
				: `${coupon.discount_value} ETB`,
		],
		["Maximum discount", coupon.max_discount_amount ?? "No cap"],
		["Minimum purchase", `${coupon.min_purchase_amount} ETB`],
		[
			"Applicable plans",
			coupon.applicable_plan_ids?.join(", ") || "All plans",
		],
		["Usage", `${coupon.used_count} / ${coupon.max_uses ?? "Unlimited"}`],
		["Uses per business", coupon.max_uses_per_business],
		["Valid from", formatDateTime(coupon.valid_from)],
		["Valid until", formatDateTime(coupon.valid_until)],
		["Status", coupon.is_active ? "Active" : "Inactive"],
		["Created", formatDateTime(coupon.created_at)],
		["Updated", formatDateTime(coupon.updated_at)],
	] as const;

	return (
		<dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
			{details.map(([label, value]) => (
				<div key={label} className="flex flex-col gap-1 rounded-lg border p-3">
					<dt className="text-xs text-muted-foreground">{label}</dt>
					<dd className="break-words text-sm font-medium">{value}</dd>
				</div>
			))}
		</dl>
	);
}

function RequiredFieldLabel({
	children,
	...props
}: React.ComponentProps<typeof FieldLabel>) {
	return (
		<FieldLabel {...props}>
			{children}
			<span className="text-destructive" aria-hidden="true">
				{" "}
				*
			</span>
			<span className="sr-only"> required</span>
		</FieldLabel>
	);
}

function CouponDateTimePicker({
	id,
	value,
	onChange,
	label,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	label: string;
}) {
	const [open, setOpen] = useState(false);
	const selectedDate = parseLocalDateTime(value);
	const timeValue = selectedDate
		? `${String(selectedDate.getHours()).padStart(2, "0")}:${String(selectedDate.getMinutes()).padStart(2, "0")}`
		: "";

	return (
		<div className="flex gap-2">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							id={id}
							type="button"
							variant="outline"
							className="min-w-0 flex-1 justify-start font-normal"
							aria-label={`${label} date`}
						/>
					}
				>
					<CalendarIcon data-icon="inline-start" aria-hidden />
					<span className={selectedDate ? "" : "text-muted-foreground"}>
						{selectedDate ? format(selectedDate, "PPP") : "Select date"}
					</span>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={selectedDate}
						onSelect={(date) => {
							if (date) {
								onChange(updateDatePart(value, date));
								setOpen(false);
							}
						}}
					/>
					{selectedDate ? (
						<>
							<Separator />
							<div className="flex justify-end p-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => {
									onChange("");
									setOpen(false);
								}}
							>
								<XIcon data-icon="inline-start" aria-hidden />
								Clear date
							</Button>
							</div>
						</>
					) : null}
				</PopoverContent>
			</Popover>
			<Input
				type="time"
				value={timeValue}
				onChange={(event) => onChange(updateTimePart(value, event.target.value))}
				disabled={!selectedDate}
				aria-label={`${label} time`}
				className="w-32 shrink-0"
			/>
		</div>
	);
}
