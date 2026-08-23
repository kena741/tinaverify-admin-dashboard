"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDownIcon, Loader2Icon } from "lucide-react";

import { useAdminCreateBusinessMutation } from "@/services/admin/adminApi";
import { useListAllUsersQuery } from "@/services/auth/authApi";
import type { UserOutput } from "@/services/types";
import { formatUserDisplayName } from "@/lib/userDisplay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

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

export function AdminCreateBusinessDialog({
	open,
	onOpenChange,
	defaultOwnerId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultOwnerId?: string | null;
}) {
	const { data: users, isLoading: usersLoading } = useListAllUsersQuery();
	const [createBusiness, { isLoading }] = useAdminCreateBusinessMutation();
	const [name, setName] = useState("");
	const [tin, setTin] = useState("");
	const [ownerId, setOwnerId] = useState(defaultOwnerId ?? "");
	const [ownerOpen, setOwnerOpen] = useState(false);
	const [ownerSearch, setOwnerSearch] = useState("");
	const [error, setError] = useState<string | null>(null);

	const selectedOwner = useMemo(
		() => users?.find((u) => u.id === ownerId) ?? null,
		[users, ownerId],
	);

	const filteredOwners = useMemo(() => {
		const list = users ?? [];
		const q = ownerSearch.trim().toLowerCase();
		if (!q) return list;
		return list.filter((u) => {
			const label = formatUserDisplayName(u).toLowerCase();
			return (
				label.includes(q) ||
				(u.email ?? "").toLowerCase().includes(q) ||
				u.phone_number.toLowerCase().includes(q)
			);
		});
	}, [users, ownerSearch]);

	function reset() {
		setName("");
		setTin("");
		setOwnerId(defaultOwnerId ?? "");
		setOwnerSearch("");
		setError(null);
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (!name.trim() || !ownerId) {
			setError("Business name and owner are required.");
			return;
		}
		try {
			await createBusiness({
				body: {
					name: name.trim(),
					owner_id: ownerId,
					tin_number: tin.trim() || null,
				},
			}).unwrap();
			reset();
			onOpenChange(false);
		} catch (err: unknown) {
			setError(getErrorMessage(err, "Could not create business."));
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Create business</DialogTitle>
					<DialogDescription>
						Creates a business for an existing user (superuser only).
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
					{error ? (
						<Alert variant="destructive">
							<AlertTitle>Create failed</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					) : null}
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="admin-biz-name">Name</FieldLabel>
							<Input
								id="admin-biz-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="admin-biz-tin">TIN (optional)</FieldLabel>
							<Input
								id="admin-biz-tin"
								value={tin}
								onChange={(e) => setTin(e.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel id="admin-biz-owner-label">Owner</FieldLabel>
							<Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
								<PopoverTrigger
									render={
										<Button
											type="button"
											variant="outline"
											disabled={usersLoading}
											className="h-10 w-full justify-between font-normal"
											aria-labelledby="admin-biz-owner-label"
										/>
									}
								>
									<span className="truncate text-left">
										{selectedOwner
											? formatUserDisplayName(selectedOwner)
											: "Select owner…"}
									</span>
									<ChevronsUpDownIcon data-icon="inline-end" aria-hidden />
								</PopoverTrigger>
								<PopoverContent
									className="w-(--anchor-width) min-w-72 p-0"
									align="start"
								>
									<Command shouldFilter={false}>
										<CommandInput
											placeholder="Search owners…"
											value={ownerSearch}
											onValueChange={setOwnerSearch}
										/>
										<CommandList>
											<CommandEmpty>No users found.</CommandEmpty>
											<CommandGroup>
												{filteredOwners.map((u: UserOutput) => (
													<CommandItem
														key={u.id}
														value={u.id}
														onSelect={() => {
															setOwnerId(u.id);
															setOwnerOpen(false);
															setOwnerSearch("");
														}}
													>
														<span className="flex flex-col">
															<span>{formatUserDisplayName(u)}</span>
															<span className="text-xs text-muted-foreground">
																{u.phone_number}
																{u.is_superuser ? " · staff" : ""}
															</span>
														</span>
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
						</Field>
					</FieldGroup>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? (
								<Loader2Icon
									data-icon="inline-start"
									className="animate-spin"
									aria-hidden
								/>
							) : null}
							{isLoading ? "Creating…" : "Create business"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
