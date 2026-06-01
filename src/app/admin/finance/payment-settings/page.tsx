"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import {
	defaultPaymentGatewaySettings,
	loadPaymentGatewaySettings,
	savePaymentGatewaySettings,
	type PaymentGatewayKey,
	type PaymentGatewaySettings,
} from "@/lib/payment-gateway-settings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";

const gateways: {
	key: PaymentGatewayKey;
	title: string;
	description: string;
}[] = [
	{
		key: "chapa",
		title: "Chapa",
		description:
			"Card and mobile checkout for subscriptions and payments. When disabled, Chapa checkout is hidden.",
	},
	{
		key: "telebirr",
		title: "Telebirr",
		description:
			"Telebirr receipt verification and merchant payments. When disabled, Telebirr flows are unavailable.",
	},
];

export default function PaymentSettingsPage() {
	const [settings, setSettings] = useState<PaymentGatewaySettings | null>(null);
	const [savingKey, setSavingKey] = useState<PaymentGatewayKey | null>(null);
	const [banner, setBanner] = useState<{
		variant: "default" | "destructive";
		message: string;
	} | null>(null);

	useEffect(() => {
		setSettings(loadPaymentGatewaySettings());
	}, []);

	const setGatewayEnabled = useCallback(
		async (key: PaymentGatewayKey, enabled: boolean) => {
			setSavingKey(key);
			setBanner(null);

			const previous = settings ?? defaultPaymentGatewaySettings;
			const next: PaymentGatewaySettings = {
				...previous,
				[key]: { enabled },
			};

			setSettings(next);

			try {
				savePaymentGatewaySettings(next);
				setBanner({
					variant: "default",
					message: `${key === "chapa" ? "Chapa" : "Telebirr"} ${enabled ? "enabled" : "disabled"}.`,
				});
			} catch {
				setSettings(previous);
				setBanner({
					variant: "destructive",
					message: "Could not save payment settings. Try again.",
				});
			} finally {
				setSavingKey(null);
			}
		},
		[settings],
	);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Payment settings"
				description="Enable or disable payment providers used across the platform."
			/>

			{banner ? (
				<Alert variant={banner.variant === "destructive" ? "destructive" : "default"}>
					<AlertTitle>
						{banner.variant === "destructive" ? "Save failed" : "Settings updated"}
					</AlertTitle>
					<AlertDescription>{banner.message}</AlertDescription>
				</Alert>
			) : null}

			<Alert>
				<AlertTitle>Local configuration</AlertTitle>
				<AlertDescription>
					Gateway toggles are stored in this browser until the admin payment-settings
					API is available on the backend.
				</AlertDescription>
			</Alert>

			<div className="grid gap-4 lg:grid-cols-2">
				{settings === null
					? Array.from({ length: 2 }).map((_, i) => (
							<Skeleton key={i} className="h-40 w-full" />
						))
					: gateways.map((gateway) => {
							const enabled = settings[gateway.key].enabled;
							const isSaving = savingKey === gateway.key;

							return (
								<Card key={gateway.key}>
									<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
										<div className="flex flex-col gap-1">
											<CardTitle>{gateway.title}</CardTitle>
											<CardDescription>{gateway.description}</CardDescription>
										</div>
										<Badge variant={enabled ? "default" : "secondary"}>
											{enabled ? "Enabled" : "Disabled"}
										</Badge>
									</CardHeader>
									<CardContent>
										<Field
											orientation="horizontal"
											className="items-center justify-between rounded-lg border bg-muted/30 p-4"
										>
											<FieldContent>
												<FieldLabel htmlFor={`${gateway.key}-enabled`}>
													Enable {gateway.title}
												</FieldLabel>
												<FieldDescription>
													{enabled
														? "This provider is active for new payments."
														: "This provider is turned off."}
												</FieldDescription>
											</FieldContent>
											<div className="flex items-center gap-2">
												{isSaving ? (
													<Loader2Icon
														className="size-4 animate-spin text-muted-foreground"
														aria-hidden
													/>
												) : null}
												<Checkbox
													id={`${gateway.key}-enabled`}
													checked={enabled}
													disabled={isSaving}
													onCheckedChange={(checked) => {
														void setGatewayEnabled(
															gateway.key,
															checked === true,
														);
													}}
												/>
											</div>
										</Field>
									</CardContent>
								</Card>
							);
						})}
			</div>
		</div>
	);
}
