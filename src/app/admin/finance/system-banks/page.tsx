"use client";

import { useMemo, useState } from "react";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
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
	useAdminCreateSystemBankMutation,
	useAdminDeleteSystemBankMutation,
	useAdminListSystemBanksQuery,
	useAdminUpdateSystemBankMutation,
} from "@/services/admin/adminApi";
import type { SystemBankAccountOutput } from "@/services/types";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type BankFormState = {
	bank_name: string;
	account_number: string;
	is_active: boolean;
};

const emptyBankForm = (): BankFormState => ({
	bank_name: "",
	account_number: "",
	is_active: true,
});

function getErrorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"data" in error &&
		(error as { data?: { detail?: unknown; message?: unknown } }).data
	) {
		const data = (error as { data: { detail?: unknown; message?: unknown } })
			.data;
		if (typeof data.detail === "string") return data.detail;
		if (typeof data.message === "string") return data.message;
	}
	if (error instanceof Error) return error.message;
	return fallback;
}

export default function TinaverifySystemBanksPage() {
	const [form, setForm] = useState<BankFormState>(emptyBankForm());
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingForm, setEditingForm] =
		useState<BankFormState>(emptyBankForm());
	const [bankPendingDelete, setBankPendingDelete] =
		useState<SystemBankAccountOutput | null>(null);
	const [banner, setBanner] = useState<{
		variant: "default" | "destructive";
		message: string;
	} | null>(null);

	const {
		data: banks = [],
		isLoading,
		isError,
		error,
		refetch,
	} = useAdminListSystemBanksQuery();
	const [createBank, createState] = useAdminCreateSystemBankMutation();
	const [updateBank, updateState] = useAdminUpdateSystemBankMutation();
	const [deleteBank, deleteState] = useAdminDeleteSystemBankMutation();

	const activeCount = useMemo(
		() => banks.filter((bank) => bank.is_active).length,
		[banks],
	);

	const handleCreate = async () => {
		const bank_name = form.bank_name.trim();
		const account_number = form.account_number.trim();
		if (!bank_name || !account_number) {
			setBanner({
				variant: "destructive",
				message: "Bank name and account number are required.",
			});
			return;
		}

		try {
			await createBank({
				body: {
					bank_name,
					account_number,
					is_active: form.is_active,
				},
			}).unwrap();
			setForm(emptyBankForm());
			setBanner({
				variant: "default",
				message: "Bank account saved successfully.",
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				message: getErrorMessage(err, "Could not create bank account."),
			});
		}
	};

	const startEditing = (bank: SystemBankAccountOutput) => {
		setEditingId(bank.id);
		setEditingForm({
			bank_name: bank.bank_name,
			account_number: bank.account_number,
			is_active: bank.is_active,
		});
	};

	const handleUpdate = async (bankId: string) => {
		const bank_name = editingForm.bank_name.trim();
		const account_number = editingForm.account_number.trim();
		if (!bank_name || !account_number) {
			setBanner({
				variant: "destructive",
				message: "Bank name and account number are required.",
			});
			return;
		}

		try {
			await updateBank({
				bankId,
				body: {
					bank_name,
					account_number,
					is_active: editingForm.is_active,
				},
			}).unwrap();
			setEditingId(null);
			setBanner({
				variant: "default",
				message: "Bank account updated successfully.",
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				message: getErrorMessage(err, "Could not update bank account."),
			});
		}
	};

	const handleDeleteConfirm = async () => {
		if (!bankPendingDelete) return;
		try {
			await deleteBank({ bankId: bankPendingDelete.id }).unwrap();
			if (editingId === bankPendingDelete.id) setEditingId(null);
			setBankPendingDelete(null);
			setBanner({
				variant: "default",
				message: "Bank account deleted successfully.",
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				message: getErrorMessage(err, "Could not delete bank account."),
			});
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<AlertDialog
				open={bankPendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) setBankPendingDelete(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete bank account?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently remove{" "}
							<strong>{bankPendingDelete?.bank_name}</strong> from the list of
							Tinaverify bank accounts. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteState.isLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={deleteState.isLoading}
							onClick={(event) => {
								event.preventDefault();
								void handleDeleteConfirm();
							}}
						>
							{deleteState.isLoading ? "Deleting…" : "Delete account"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<PageHeader
				title="Tinaverify bank accounts"
				description="Manage the banks users can transfer money to for subscription requests."
			/>

			{banner ? (
				<Alert
					variant={banner.variant === "destructive" ? "destructive" : "default"}
				>
					<AlertTitle>
						{banner.variant === "destructive" ? "Action failed" : "Updated"}
					</AlertTitle>
					<AlertDescription>{banner.message}</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Add bank account</CardTitle>
					<CardDescription>
						This is the list Tinaverify accepts for manual subscription
						payments.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-[1.2fr_1fr_auto] items-end">
					<Field>
						<FieldLabel htmlFor="bank-name">Bank name</FieldLabel>
						<Input
							id="bank-name"
							value={form.bank_name}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									bank_name: event.target.value,
								}))
							}
							placeholder="Commercial Bank of Ethiopia"
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="account-number">Account number</FieldLabel>
						<Input
							id="account-number"
							value={form.account_number}
							onChange={(event) =>
								setForm((current) => ({
									...current,
									account_number: event.target.value,
								}))
							}
							placeholder="1000000000"
						/>
					</Field>
					<Field className="min-w-0">
						<FieldLabel htmlFor="is-active">Status</FieldLabel>
						<label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
							<Checkbox
								id="is-active"
								checked={form.is_active}
								onCheckedChange={(checked) =>
									setForm((current) => ({
										...current,
										is_active: checked === true,
									}))
								}
							/>
							<span className="text-sm text-muted-foreground">
								{form.is_active ? "Active" : "Inactive"}
							</span>
						</label>
					</Field>
					<Button
						type="button"
						onClick={() => void handleCreate()}
						disabled={createState.isLoading}
					>
						{createState.isLoading ? (
							<>
								<Loader2Icon className="size-4 animate-spin" aria-hidden />
								Saving…
							</>
						) : (
							<>
								<PlusIcon className="size-4" aria-hidden />
								Add account
							</>
						)}
					</Button>
				</CardContent>
			</Card>

			{isError ? (
				<Alert variant="destructive">
					<AlertTitle>Could not load bank accounts</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(error, "Request failed.")}</span>
						<button
							type="button"
							className="text-sm font-medium underline"
							onClick={() => void refetch()}
						>
							Try again
						</button>
					</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-3">
					<div>
						<CardTitle>Allowed accounts</CardTitle>
						<CardDescription>
							{activeCount} active account{activeCount === 1 ? "" : "s"}
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex flex-col gap-2">
							<div className="h-10 animate-pulse rounded-md bg-muted" />
							<div className="h-10 animate-pulse rounded-md bg-muted" />
							<div className="h-10 animate-pulse rounded-md bg-muted" />
						</div>
					) : banks.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No bank accounts have been added yet.
						</p>
					) : (
						<div className="overflow-x-auto rounded-xl border border-border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Bank</TableHead>
										<TableHead>Account number</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Updated</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{banks.map((bank) => {
										const isEditing = editingId === bank.id;
										return (
											<TableRow key={bank.id}>
												<TableCell className="font-medium">
													{isEditing ? (
														<Input
															value={editingForm.bank_name}
															onChange={(event) =>
																setEditingForm((current) => ({
																	...current,
																	bank_name: event.target.value,
																}))
															}
														/>
													) : (
														bank.bank_name
													)}
												</TableCell>
												<TableCell>
													{isEditing ? (
														<Input
															value={editingForm.account_number}
															onChange={(event) =>
																setEditingForm((current) => ({
																	...current,
																	account_number: event.target.value,
																}))
															}
														/>
													) : (
														bank.account_number
													)}
												</TableCell>
												<TableCell>
													{isEditing ? (
														<label className="inline-flex items-center gap-2 text-sm">
															<Checkbox
																checked={editingForm.is_active}
																onCheckedChange={(checked) =>
																	setEditingForm((current) => ({
																		...current,
																		is_active: checked === true,
																	}))
																}
															/>
															<span>
																{editingForm.is_active ? "Active" : "Inactive"}
															</span>
														</label>
													) : (
														<Badge
															variant={bank.is_active ? "default" : "secondary"}
														>
															{bank.is_active ? "Active" : "Inactive"}
														</Badge>
													)}
												</TableCell>
												<TableCell className="text-sm text-muted-foreground">
													{bank.updated_at
														? new Date(bank.updated_at).toLocaleDateString()
														: "—"}
												</TableCell>
												<TableCell className="text-right">
													{isEditing ? (
														<div className="flex justify-end gap-2">
															<Button
																type="button"
																size="sm"
																onClick={() => void handleUpdate(bank.id)}
																disabled={updateState.isLoading}
															>
																{updateState.isLoading ? "Saving…" : "Save"}
															</Button>
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={() => setEditingId(null)}
															>
																Cancel
															</Button>
														</div>
													) : (
														<div className="flex justify-end gap-2">
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={() => startEditing(bank)}
															>
																<PencilIcon className="size-3.5" aria-hidden />
																Edit
															</Button>
															<Button
																type="button"
																variant="destructive"
																size="sm"
																onClick={() => setBankPendingDelete(bank)}
																disabled={deleteState.isLoading}
															>
																<Trash2Icon className="size-3.5" aria-hidden />
																Delete
															</Button>
														</div>
													)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
