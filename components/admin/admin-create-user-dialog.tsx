"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { useAdminRegisterUserMutation } from "@/services/admin/adminApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

export function AdminCreateUserDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [registerUser, { isLoading }] = useAdminRegisterUserMutation();
	const [phone, setPhone] = useState("");
	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [error, setError] = useState<string | null>(null);

	function reset() {
		setPhone("");
		setPassword("");
		setEmail("");
		setUsername("");
		setFirstName("");
		setLastName("");
		setError(null);
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		const phoneNumber = phone.trim();
		if (!phoneNumber || !password) {
			setError("Phone and password are required.");
			return;
		}
		try {
			await registerUser({
				body: {
					phone_number: phoneNumber,
					password,
					email: email.trim() || null,
					username: username.trim() || null,
					user_information:
						firstName.trim() || lastName.trim()
							? {
									first_name: firstName.trim() || "—",
									last_name: lastName.trim() || "—",
								}
							: null,
				},
			}).unwrap();
			reset();
			onOpenChange(false);
		} catch (err: unknown) {
			setError(getErrorMessage(err, "Could not create user."));
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
					<DialogTitle>Create user</DialogTitle>
					<DialogDescription>
						Registers a user as a platform admin (superuser only).
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
							<FieldLabel htmlFor="admin-user-phone">Phone</FieldLabel>
							<Input
								id="admin-user-phone"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								placeholder="+251…"
								required
								autoComplete="tel"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="admin-user-password">Password</FieldLabel>
							<Input
								id="admin-user-password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="new-password"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="admin-user-email">Email (optional)</FieldLabel>
							<Input
								id="admin-user-email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								autoComplete="email"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="admin-user-username">
								Username (optional)
							</FieldLabel>
							<Input
								id="admin-user-username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</Field>
						<div className="grid grid-cols-2 gap-3">
							<Field>
								<FieldLabel htmlFor="admin-user-first">First name</FieldLabel>
								<Input
									id="admin-user-first"
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="admin-user-last">Last name</FieldLabel>
								<Input
									id="admin-user-last"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
								/>
							</Field>
						</div>
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
							{isLoading ? "Creating…" : "Create user"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
