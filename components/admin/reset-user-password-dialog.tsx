"use client";

import { useState } from "react";
import { CopyIcon, KeyRoundIcon, Loader2Icon } from "lucide-react";

import { useForgotPasswordMutation } from "@/services/auth/authApi";
import { useSendCustomSmsMutation } from "@/services/sms/smsApi";
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

function generateTemporaryPassword(): string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
	let password = "";
	for (let i = 0; i < 10; i += 1) {
		password += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return password;
}

type ResetUserPasswordDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userName: string;
	phoneNumber?: string | null;
	email?: string | null;
	contextLabel?: string | null;
};

export function ResetUserPasswordDialog({
	open,
	onOpenChange,
	userName,
	phoneNumber,
	email,
	contextLabel,
}: ResetUserPasswordDialogProps) {
	const [forgotPassword, forgotPasswordState] = useForgotPasswordMutation();
	const [sendSms, sendSmsState] = useSendCustomSmsMutation();
	const [temporaryPassword, setTemporaryPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [smsSent, setSmsSent] = useState(false);
	const [hasReset, setHasReset] = useState(false);

	const resetDialogOpen = (nextOpen: boolean) => {
		if (!nextOpen) {
			setTemporaryPassword("");
			setErrorMessage("");
			setSmsSent(false);
			setHasReset(false);
		}
		onOpenChange(nextOpen);
	};

	const handleReset = async () => {
		setErrorMessage("");
		const fallbackPassword = generateTemporaryPassword();
		try {
			if (!phoneNumber?.trim()) {
				throw new Error("No phone number is available for this user.");
			}

			await forgotPassword({
				body: { phone_number: phoneNumber.trim() },
			}).unwrap();

			setTemporaryPassword(fallbackPassword);
			const smsMessage = `Hello ${userName}. Your temporary password is ${fallbackPassword}. Please change it to something you can remember.`;
			try {
				await sendSms({
					body: { phone: phoneNumber.trim(), message: smsMessage },
				}).unwrap();
				setSmsSent(true);
			} catch {
				setSmsSent(false);
			}
			setHasReset(true);
		} catch (error) {
			setTemporaryPassword(fallbackPassword);
			if (phoneNumber?.trim()) {
				try {
					await sendSms({
						body: {
							phone: phoneNumber.trim(),
							message: `Hello ${userName}. Your temporary password is ${fallbackPassword}. Please change it to something you can remember.`,
						},
					}).unwrap();
					setSmsSent(true);
				} catch {
					setSmsSent(false);
				}
			}
			setErrorMessage(
				getErrorMessage(
					error,
					"The password reset request failed, so a temporary password was generated locally instead.",
				),
			);
			setHasReset(true);
		}
	};

	const userDetails = [
		userName || "Unknown user",
		phoneNumber?.trim() || "No phone on file",
		email?.trim() || "No email on file",
	].join(" · ");

	return (
		<Dialog open={open} onOpenChange={resetDialogOpen}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<KeyRoundIcon className="size-4" aria-hidden />
						Reset password
					</DialogTitle>
					<DialogDescription>
						{contextLabel
							? `Generate a new temporary password for ${userName} in ${contextLabel}.`
							: `Generate a new temporary password for ${userName}.`}
					</DialogDescription>
				</DialogHeader>

				{hasReset ? (
					<div className="space-y-4">
						{errorMessage ? (
							<Alert variant="destructive">
								<AlertTitle>Password generated with a warning</AlertTitle>
								<AlertDescription>{errorMessage}</AlertDescription>
							</Alert>
						) : (
							<Alert>
								<AlertTitle>Temporary password created</AlertTitle>
								<AlertDescription>
									A new password was generated and the user details were
									recorded.
								</AlertDescription>
							</Alert>
						)}

						<div className="rounded-lg border border-border bg-muted/40 p-3">
							<p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
								User
							</p>
							<p className="mt-2 font-medium">{userName}</p>
							<p className="text-sm text-muted-foreground">{userDetails}</p>
						</div>

						<div className="rounded-lg border border-border bg-background p-3">
							<p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
								New password
							</p>
							<div className="mt-2 flex items-center gap-2">
								<code className="flex-1 rounded-md bg-muted px-2 py-2 font-mono text-sm">
									{temporaryPassword}
								</code>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => {
										if (temporaryPassword) {
											void navigator.clipboard.writeText(temporaryPassword);
										}
									}}
								>
									<CopyIcon className="size-4" aria-hidden />
									Copy
								</Button>
							</div>
						</div>

						<p className="text-sm text-muted-foreground">
							{phoneNumber?.trim()
								? smsSent
									? "An SMS with the new password was sent to the registered phone number."
									: "The phone number is on file, but the SMS could not be delivered automatically."
								: "No phone number is on file, so no SMS was sent."}
						</p>
					</div>
				) : (
					<div className="space-y-4">
						<div className="rounded-lg border border-border bg-muted/40 p-3">
							<p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
								User details
							</p>
							<p className="mt-2 font-medium">{userName}</p>
							<p className="text-sm text-muted-foreground">{userDetails}</p>
						</div>
						<div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
							A new temporary password will be generated and sent by SMS if a
							mobile number is on file. The user should change it to something
							they can remember.
						</div>
					</div>
				)}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => resetDialogOpen(false)}
						disabled={forgotPasswordState.isLoading || sendSmsState.isLoading}
					>
						{hasReset ? "Close" : "Cancel"}
					</Button>
					{!hasReset ? (
						<Button
							type="button"
							onClick={handleReset}
							disabled={forgotPasswordState.isLoading || sendSmsState.isLoading}
						>
							{forgotPasswordState.isLoading || sendSmsState.isLoading ? (
								<>
									<Loader2Icon className="animate-spin" aria-hidden />
									Generating…
								</>
							) : (
								<>
									<KeyRoundIcon className="size-4" aria-hidden />
									Reset password
								</>
							)}
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
