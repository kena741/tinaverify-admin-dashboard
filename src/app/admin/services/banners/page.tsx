"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
	ExternalLinkIcon,
	Loader2Icon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";

import { BannerImage } from "@/components/admin/banner-image";
import { PageHeader } from "@/components/admin/page-header";
import { useBannerImageSrc } from "@/hooks/use-banner-image-src";
import { formatShortUrl } from "@/lib/banner";
import {
	useCreateBannerMutation,
	useDeleteBannerMutation,
	useListBannersQuery,
	useUpdateBannerMutation,
} from "@/services/banners/bannersApi";
import type { BannerOutput } from "@/services/types";
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
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
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
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "—";
	return format(d, "MMM d, yyyy HH:mm");
}

function isValidRedirectUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

type BannerFormState = {
	redirectUrl: string;
	isActive: boolean;
	imageFile: File | null;
};

const emptyForm = (): BannerFormState => ({
	redirectUrl: "",
	isActive: true,
	imageFile: null,
});

type ActiveFilter = "all" | "active_only";

export default function ServiceBannersPage() {
	const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
	const { data: banners, isLoading, isFetching, error, refetch } =
		useListBannersQuery({
			activeOnly: activeFilter === "active_only",
		});
	const [createBanner, createState] = useCreateBannerMutation();
	const [updateBanner, updateState] = useUpdateBannerMutation();
	const [deleteBanner, deleteState] = useDeleteBannerMutation();

	const [createOpen, setCreateOpen] = useState(false);
	const [editBanner, setEditBanner] = useState<BannerOutput | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<BannerOutput | null>(null);
	const [form, setForm] = useState<BannerFormState>(emptyForm);
	const [formError, setFormError] = useState("");
	const [deleteError, setDeleteError] = useState("");

	const stats = useMemo(() => {
		const rows = banners ?? [];
		return {
			total: rows.length,
			active: rows.filter((b) => b.is_active).length,
			clicks: rows.reduce((sum, b) => sum + b.click_count, 0),
		};
	}, [banners]);

	const resetForm = () => {
		setForm(emptyForm());
		setFormError("");
	};

	const openCreate = () => {
		resetForm();
		setCreateOpen(true);
	};

	const openEdit = (banner: BannerOutput) => {
		setForm({
			redirectUrl: banner.redirect_url ?? "",
			isActive: banner.is_active,
			imageFile: null,
		});
		setFormError("");
		setEditBanner(banner);
	};

	const validateForm = (
		requireImage: boolean,
		requireRedirect: boolean,
	): string | null => {
		const redirectUrl = form.redirectUrl.trim();
		if (requireRedirect && !redirectUrl) {
			return "Redirect URL is required.";
		}
		if (redirectUrl && !isValidRedirectUrl(redirectUrl)) {
			return "Enter a valid http or https redirect URL.";
		}
		if (requireImage && !form.imageFile) {
			return "Banner image is required.";
		}
		return null;
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		const validationError = validateForm(true, true);
		if (validationError) {
			setFormError(validationError);
			return;
		}
		if (!form.imageFile) return;

		try {
			await createBanner({
				redirect_url: form.redirectUrl.trim(),
				is_active: form.isActive,
				image: form.imageFile,
			}).unwrap();
			setCreateOpen(false);
			resetForm();
		} catch (err) {
			setFormError(getErrorMessage(err, "Failed to create banner."));
		}
	};

	const handleUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editBanner) return;
		setFormError("");

		const validationError = validateForm(false, false);
		if (validationError) {
			setFormError(validationError);
			return;
		}

		try {
			await updateBanner({
				bannerId: editBanner.id,
				body: {
					redirect_url: form.redirectUrl.trim(),
					is_active: form.isActive,
					...(form.imageFile ? { image: form.imageFile } : {}),
				},
			}).unwrap();
			setEditBanner(null);
			resetForm();
		} catch (err) {
			setFormError(getErrorMessage(err, "Failed to update banner."));
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setDeleteError("");
		try {
			await deleteBanner({ bannerId: deleteTarget.id }).unwrap();
			setDeleteTarget(null);
		} catch (err) {
			setDeleteError(getErrorMessage(err, "Failed to delete banner."));
		}
	};

	const listBusy = isLoading || isFetching;
	const formBusy = createState.isLoading || updateState.isLoading;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Banners"
				actions={
					<Button type="button" size="sm" onClick={openCreate}>
						<PlusIcon data-icon="inline-start" aria-hidden />
						Add banner
					</Button>
				}
			/>

			<div className="grid gap-4 sm:grid-cols-3">
				<StatCard label="Total banners" value={stats.total} loading={listBusy} />
				<StatCard label="Active" value={stats.active} loading={listBusy} />
				<StatCard label="Total clicks" value={stats.clicks} loading={listBusy} />
			</div>

			<Card>
				<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
					<CardTitle>
						{activeFilter === "active_only" ? "Active banners" : "All banners"}
					</CardTitle>
					<div className="flex flex-wrap items-center gap-3">
						<Select
							value={activeFilter}
							onValueChange={(v) => {
								if (v === "all" || v === "active_only") setActiveFilter(v);
							}}
						>
							<SelectTrigger className="h-9 w-44">
								<span className="flex flex-1 truncate text-left">
									{activeFilter === "active_only" ? "Active only" : "All"}
								</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="active_only">Active only</SelectItem>
							</SelectContent>
						</Select>
						{isFetching && !isLoading ? (
							<span className="text-sm text-muted-foreground">Refreshing…</span>
						) : null}
					</div>
				</CardHeader>
				<CardContent>
					{error ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load banners</AlertTitle>
							<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<span>{getErrorMessage(error, "Request failed.")}</span>
								<Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : listBusy ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-14 w-full" />
							))}
						</div>
					) : (banners ?? []).length === 0 ? (
						<p className="py-10 text-center text-sm text-muted-foreground">
							{activeFilter === "active_only"
								? "No active banners match this filter."
								: "No banners yet. Add one to show promotional content in the app."}
						</p>
					) : (
						<div className="overflow-x-auto rounded-lg border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Banner</TableHead>
										<TableHead>Redirect URL</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Clicks</TableHead>
										<TableHead>Updated</TableHead>
										<TableHead className="w-28 text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(banners ?? []).map((banner) => (
										<BannerTableRow
											key={banner.id}
											banner={banner}
											onEdit={() => openEdit(banner)}
											onDelete={() => {
												setDeleteError("");
												setDeleteTarget(banner);
											}}
										/>
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
					setCreateOpen(open);
					if (!open) resetForm();
				}}
			>
				<DialogContent className="sm:max-w-md">
					<form onSubmit={handleCreate}>
						<DialogHeader>
							<DialogTitle>Add banner</DialogTitle>
						</DialogHeader>
						<BannerFormFields
							key="create-banner"
							form={form}
							setForm={setForm}
							mode="create"
						/>
						{formError ? (
							<p className="text-sm text-destructive" role="alert">
								{formError}
							</p>
						) : null}
						<DialogFooter className="gap-2 sm:gap-0">
							<Button
								type="button"
								variant="outline"
								onClick={() => setCreateOpen(false)}
								disabled={formBusy}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={formBusy}>
								{formBusy ? (
									<Loader2Icon className="size-4 animate-spin" aria-hidden />
								) : null}
								Create
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={editBanner !== null}
				onOpenChange={(open) => {
					if (!open) {
						setEditBanner(null);
						resetForm();
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<form onSubmit={handleUpdate}>
						<DialogHeader>
							<DialogTitle>Edit banner</DialogTitle>
						</DialogHeader>
						<BannerFormFields
							key={editBanner?.id ?? "edit-banner"}
							form={form}
							setForm={setForm}
							mode="edit"
							previewBanner={editBanner ?? undefined}
						/>
						{formError ? (
							<p className="text-sm text-destructive" role="alert">
								{formError}
							</p>
						) : null}
						<DialogFooter className="gap-2 sm:gap-0">
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditBanner(null)}
								disabled={formBusy}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={formBusy}>
								{formBusy ? (
									<Loader2Icon className="size-4 animate-spin" aria-hidden />
								) : null}
								Save
							</Button>
						</DialogFooter>
					</form>
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
						<AlertDialogTitle>Delete banner?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the banner from the app. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deleteError ? (
						<p className="text-sm text-destructive" role="alert">
							{deleteError}
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteState.isLoading}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								void handleDelete();
							}}
							disabled={deleteState.isLoading}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{deleteState.isLoading ? "Deleting…" : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function BannerFormFields({
	form,
	setForm,
	mode,
	previewBanner,
}: {
	form: BannerFormState;
	setForm: React.Dispatch<React.SetStateAction<BannerFormState>>;
	mode: "create" | "edit";
	previewBanner?: BannerOutput;
}) {
	const isCreate = mode === "create";
	const idPrefix = isCreate ? "banner-create" : "banner-edit";
	const { src: savedPreviewSrc } = useBannerImageSrc(
		isCreate ? null : previewBanner,
	);
	const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

	const previewSrc =
		uploadPreviewUrl ?? (isCreate ? null : savedPreviewSrc || null);

	useEffect(() => {
		return () => {
			if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl);
		};
	}, [uploadPreviewUrl]);

	return (
		<FieldGroup className="py-4">
			{previewSrc ? (
				<Field>
					<FieldLabel>{isCreate ? "Preview" : "Current banner"}</FieldLabel>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={previewSrc}
						alt="Banner preview"
						className="max-h-40 max-w-full rounded-md border bg-muted object-contain"
						referrerPolicy="no-referrer"
					/>
				</Field>
			) : null}
			<Field>
				<FieldLabel htmlFor={`${idPrefix}-image`}>
					Banner image{isCreate ? "" : " (optional)"}
				</FieldLabel>
				<Input
					id={`${idPrefix}-image`}
					type="file"
					accept="image/*"
					required={isCreate}
					onChange={(e) => {
						const file = e.target.files?.[0] ?? null;
						setForm((prev) => ({ ...prev, imageFile: file }));
						setUploadPreviewUrl((prev) => {
							if (prev) URL.revokeObjectURL(prev);
							return file ? URL.createObjectURL(file) : null;
						});
					}}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={`${idPrefix}-redirect-url`}>Redirect URL</FieldLabel>
				<Input
					id={`${idPrefix}-redirect-url`}
					type="url"
					placeholder="https://example.com/promo"
					value={form.redirectUrl}
					onChange={(e) =>
						setForm((prev) => ({ ...prev, redirectUrl: e.target.value }))
					}
					required={isCreate}
				/>
				<FieldDescription>
					Where users go when they tap the banner (not the image file).
				</FieldDescription>
			</Field>
			<Field orientation="horizontal">
				<Checkbox
					id={`${idPrefix}-active`}
					checked={form.isActive}
					onCheckedChange={(checked) =>
						setForm((prev) => ({ ...prev, isActive: checked === true }))
					}
				/>
				<FieldLabel htmlFor={`${idPrefix}-active`} className="font-normal">
					Active (shown in the app)
				</FieldLabel>
			</Field>
		</FieldGroup>
	);
}

function BannerTableRow({
	banner,
	onEdit,
	onDelete,
}: {
	banner: BannerOutput;
	onEdit: () => void;
	onDelete: () => void;
}) {
	return (
		<TableRow>
			<TableCell>
				<BannerImage
					banner={banner}
					className="h-20 max-h-24 w-auto max-w-56 rounded-md border bg-muted object-contain"
					fallbackClassName="h-20 w-36"
				/>
			</TableCell>
			<TableCell className="max-w-[14rem]">
				{banner.redirect_url ? (
					<a
						href={banner.redirect_url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex max-w-full items-center gap-1 text-sm text-brand-ink hover:underline"
						title={banner.redirect_url}
					>
						<span className="truncate">
							{formatShortUrl(banner.redirect_url)}
						</span>
						<ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden />
					</a>
				) : (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
			<TableCell>
				<Badge variant={banner.is_active ? "default" : "secondary"}>
					{banner.is_active ? "Active" : "Inactive"}
				</Badge>
			</TableCell>
			<TableCell className="text-right tabular-nums">
				{banner.click_count.toLocaleString()}
			</TableCell>
			<TableCell className="whitespace-nowrap text-muted-foreground">
				{formatDateTime(banner.updated_at)}
			</TableCell>
			<TableCell className="text-right">
				<div className="flex justify-end gap-1">
					<Button type="button" variant="ghost" size="icon-sm" onClick={onEdit}>
						<PencilIcon className="size-4" aria-hidden />
						<span className="sr-only">Edit</span>
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onDelete}
					>
						<Trash2Icon className="size-4 text-destructive" aria-hidden />
						<span className="sr-only">Delete</span>
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}

function StatCard({
	label,
	value,
	loading,
}: {
	label: string;
	value: number;
	loading: boolean;
}) {
	return (
		<Card>
			<CardContent className="flex flex-col gap-0.5 p-4">
				<span className="text-sm text-muted-foreground">{label}</span>
				{loading ? (
					<Skeleton className="mt-1 h-8 w-16" />
				) : (
					<span className="text-2xl font-semibold tabular-nums">
						{value.toLocaleString()}
					</span>
				)}
			</CardContent>
		</Card>
	);
}
