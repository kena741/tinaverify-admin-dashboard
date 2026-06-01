"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, MessageSquareIcon } from "lucide-react";

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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

type SendBusinessSmsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	businessName: string;
	phoneNumber?: string | null;
};

export function SendBusinessSmsDialog({
	open,
	onOpenChange,
	businessName,
	phoneNumber,
}: SendBusinessSmsDialogProps) {
	const [sendSms, sendSmsState] = useSendCustomSmsMutation();
	const [message, setMessage] = useState("");
	const [formError, setFormError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	useEffect(() => {
		if (!open) {
			setMessage("");
			setFormError("");
			setSuccessMessage("");
		}
	}, [open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setFormError("");
		setSuccessMessage("");

		const phone = phoneNumber?.trim() ?? "";
		const text = message.trim();

		if (!phone) {
			setFormError("No phone number is available for this business owner.");
			return;
		}
		if (!text) {
			setFormError("Message is required.");
			return;
		}

		try {
			const result = await sendSms({ body: { phone, message: text } }).unwrap();
			setSuccessMessage(
				result.status === "ok" || !result.status
					? "SMS sent successfully."
					: `SMS sent (${result.status}).`,
			);
			setMessage("");
		} catch (err) {
			setFormError(getErrorMessage(err, "Failed to send SMS."));
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Send custom SMS</DialogTitle>
					<DialogDescription>
						Send a message to the owner of <strong>{businessName}</strong> via
						SMS.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					{formError ? (
						<Alert variant="destructive">
							<AlertTitle>Could not send SMS</AlertTitle>
							<AlertDescription>{formError}</AlertDescription>
						</Alert>
					) : null}

					{successMessage ? (
						<Alert>
							<AlertTitle>Message sent</AlertTitle>
							<AlertDescription>{successMessage}</AlertDescription>
						</Alert>
					) : null}

					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="sms-phone">Phone number</FieldLabel>
							<Input
								id="sms-phone"
								value={phoneNumber ?? ""}
								readOnly
								placeholder="Owner phone not available"
								className="bg-muted/50"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="sms-message">Message</FieldLabel>
							<Textarea
								id="sms-message"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Type your message…"
								rows={5}
								required
								autoFocus
							/>
						</Field>
					</FieldGroup>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={sendSmsState.isLoading}
						>
							{successMessage ? "Close" : "Cancel"}
						</Button>
						<Button
							type="submit"
							disabled={
								sendSmsState.isLoading || !phoneNumber?.trim() || !!successMessage
							}
						>
							{sendSmsState.isLoading ? (
								<>
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
									Sending…
								</>
							) : (
								<>
									<MessageSquareIcon data-icon="inline-start" aria-hidden />
									Send SMS
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
