"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export type ConfirmCreditActionPayload = {
	referenceImage: File;
	isInternal: boolean;
};

type ConfirmCreditActionDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	summary: string;
	confirmLabel: string;
	isPending?: boolean;
	/** Label for the internal-teams checkbox (defaults to grant/assign wording). */
	internalLabel?: string;
	onConfirm: (payload: ConfirmCreditActionPayload) => void | Promise<void>;
};

export function ConfirmCreditActionDialog({
	open,
	onOpenChange,
	title,
	summary,
	confirmLabel,
	isPending = false,
	internalLabel = "This is for internal teams",
	onConfirm,
}: ConfirmCreditActionDialogProps) {
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isInternal, setIsInternal] = useState(false);
	const [localError, setLocalError] = useState("");

	useEffect(() => {
		if (open) return;
		setFile(null);
		setIsInternal(false);
		setLocalError("");
		setPreviewUrl((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return null;
		});
	}, [open]);

	useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	}, [previewUrl]);

	async function handleConfirm() {
		if (!file) {
			setLocalError("Attach a reference image to continue.");
			return;
		}
		setLocalError("");
		await onConfirm({ referenceImage: file, isInternal });
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (isPending) return;
				onOpenChange(next);
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{summary}</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					<Field>
						<FieldLabel htmlFor="credit-action-reference-image">
							Reference image
						</FieldLabel>
						<Input
							id="credit-action-reference-image"
							type="file"
							accept="image/*"
							required
							disabled={isPending}
							onChange={(e) => {
								const next = e.target.files?.[0] ?? null;
								setFile(next);
								setLocalError("");
								setPreviewUrl((prev) => {
									if (prev) URL.revokeObjectURL(prev);
									return next ? URL.createObjectURL(next) : null;
								});
							}}
						/>
						<FieldDescription>
							Required. Attach a receipt or payment proof before confirming.
						</FieldDescription>
					</Field>

					{previewUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={previewUrl}
							alt="Reference preview"
							className="max-h-40 max-w-full rounded-md border bg-muted object-contain"
						/>
					) : null}

					<Field orientation="horizontal" className="items-start">
						<Checkbox
							id="credit-action-is-internal"
							checked={isInternal}
							disabled={isPending}
							onCheckedChange={(v) => setIsInternal(v === true)}
							aria-describedby="credit-action-is-internal-desc"
						/>
						<div className="flex flex-col gap-0.5">
							<FieldLabel
								htmlFor="credit-action-is-internal"
								className="cursor-pointer"
							>
								{internalLabel}
							</FieldLabel>
							<p
								id="credit-action-is-internal-desc"
								className="text-xs text-muted-foreground"
							>
								Check this when the credits or plan are for internal team use,
								not a paying customer.
							</p>
						</div>
					</Field>

					{localError ? (
						<p className="text-sm text-destructive">{localError}</p>
					) : null}
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={isPending}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={isPending || !file}
						onClick={() => void handleConfirm()}
					>
						{isPending ? (
							<Loader2Icon
								data-icon="inline-start"
								className="animate-spin"
								aria-hidden
							/>
						) : null}
						{isPending ? "Working…" : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
