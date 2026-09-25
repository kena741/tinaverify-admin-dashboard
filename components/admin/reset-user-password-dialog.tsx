"use client";

import { useState } from "react";
import { KeyRoundIcon, Loader2Icon } from "lucide-react";

import { useForgotPasswordMutation } from "@/services/auth/authApi";
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
	const [errorMessage, setErrorMessage] = useState("");
	const [hasReset, setHasReset] = useState(false);

	const resetDialogOpen = (nextOpen: boolean) => {
		if (!nextOpen) {
			setErrorMessage("");
			setHasReset(false);
		}
		onOpenChange(nextOpen);
	};

	const handleReset = async () => {
		setErrorMessage("");
		try {
			if (!phoneNumber?.trim()) {
				throw new Error("No phone number is available for this user.");
			}

			await forgotPassword({
				body: { phone_number: phoneNumber.trim() },
			}).unwrap();
			setHasReset(true);
		} catch (error) {
			setErrorMessage(
				getErrorMessage(
					error,
					"The password reset request failed. Please try again.",
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
							? `Request a password reset for ${userName} in ${contextLabel}.`
							: `Request a password reset for ${userName}.`}
					</DialogDescription>
				</DialogHeader>

				{hasReset ? (
					<div className="space-y-4">
						{errorMessage ? (
							<Alert variant="destructive">
								<AlertTitle>Password reset failed</AlertTitle>
								<AlertDescription>{errorMessage}</AlertDescription>
							</Alert>
						) : (
							<Alert>
								<AlertTitle>Password reset request sent</AlertTitle>
								<AlertDescription>
									The reset request was submitted successfully. The user will
									receive a temporary password by SMS.
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
							This will send a password reset request for the mobile number on
							file. The backend will generate and send a temporary password.
						</div>
					</div>
				)}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => resetDialogOpen(false)}
						disabled={forgotPasswordState.isLoading}
					>
						{hasReset ? "Close" : "Cancel"}
					</Button>
					{!hasReset ? (
						<Button
							type="button"
							onClick={handleReset}
							disabled={forgotPasswordState.isLoading}
						>
							{forgotPasswordState.isLoading ? (
								<>
									<Loader2Icon className="animate-spin" aria-hidden />
									Sending reset…
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
