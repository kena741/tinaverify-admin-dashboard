"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import {
	useGetExchangeRateQuery,
	useUpdateExchangeRateMutation,
} from "@/services/subscription/subscriptionApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function getErrorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"data" in error &&
		(error as { data?: { detail?: unknown; message?: unknown } }).data
	) {
		const data = (error as { data: { detail?: unknown; message?: unknown } }).data;
		if (typeof data.detail === "string") return data.detail;
		if (typeof data.message === "string") return data.message;
	}
	if (error instanceof Error) return error.message;
	return fallback;
}

export default function PaymentSettingsPage() {
	const {
		data: exchangeRate,
		isLoading: rateLoading,
		isError: rateIsError,
		error: rateError,
		refetch: refetchRate,
	} = useGetExchangeRateQuery();
	const [updateExchangeRate, rateUpdateState] = useUpdateExchangeRateMutation();
	const [creditsDraft, setCreditsDraft] = useState("");
	const [banner, setBanner] = useState<{
		variant: "default" | "destructive";
		message: string;
	} | null>(null);

	useEffect(() => {
		if (exchangeRate?.credits_per_etb == null) return;
		setCreditsDraft(String(exchangeRate.credits_per_etb));
	}, [exchangeRate?.credits_per_etb]);

	const saveExchangeRate = useCallback(async () => {
		const credits_per_etb = Number(creditsDraft);
		if (!Number.isFinite(credits_per_etb) || credits_per_etb <= 0) {
			setBanner({
				variant: "destructive",
				message: "Enter a positive number of credits per 1 ETB.",
			});
			return;
		}
		setBanner(null);
		try {
			await updateExchangeRate({ credits_per_etb }).unwrap();
			setBanner({
				variant: "default",
				message: `Exchange rate saved: 1 ETB → ${credits_per_etb} credits.`,
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				message: getErrorMessage(err, "Could not save exchange rate."),
			});
		}
	}, [creditsDraft, updateExchangeRate]);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Payment settings"
				description="ETB → credits exchange rate. Payment providers are coming soon."
			/>

			{banner ? (
				<Alert variant={banner.variant === "destructive" ? "destructive" : "default"}>
					<AlertTitle>
						{banner.variant === "destructive" ? "Save failed" : "Settings updated"}
					</AlertTitle>
					<AlertDescription>{banner.message}</AlertDescription>
				</Alert>
			) : null}

			{rateIsError ? (
				<Alert variant="destructive">
					<AlertTitle>Could not load exchange rate</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(rateError, "Request failed.")}</span>
						<button
							type="button"
							className="text-sm font-medium underline"
							onClick={() => void refetchRate()}
						>
							Try again
						</button>
					</AlertDescription>
				</Alert>
			) : null}

			<div className="grid gap-4 lg:grid-cols-2">
				{[
					{
						title: "Chapa",
						description: "Card and mobile checkout for subscriptions and payments.",
					},
					{
						title: "Telebirr",
						description:
							"Telebirr receipt verification and merchant payments.",
					},
				].map((gateway) => (
					<Card key={gateway.title}>
						<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
							<div className="flex flex-col gap-1">
								<CardTitle>{gateway.title}</CardTitle>
								<CardDescription>{gateway.description}</CardDescription>
							</div>
							<Badge variant="secondary">Coming soon</Badge>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground">
								Provider enable/disable will be available here once the API is
								ready.
							</p>
						</CardContent>
					</Card>
				))}
			</div>

			{rateLoading ? (
				<Skeleton className="h-40 w-full max-w-xl" />
			) : (
				<Card className="max-w-xl">
					<CardHeader>
						<CardTitle>Exchange rate</CardTitle>
						<CardDescription>
							For every 1 ETB paid, how many credits to grant.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<Field>
							<FieldLabel htmlFor="credits-per-etb">Credits per 1 ETB</FieldLabel>
							<FieldContent>
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-sm text-muted-foreground">1 ETB →</span>
									<Input
										id="credits-per-etb"
										type="number"
										min={0}
										step="any"
										inputMode="decimal"
										className="max-w-40"
										value={creditsDraft}
										disabled={rateUpdateState.isLoading}
										onChange={(e) => setCreditsDraft(e.target.value)}
									/>
									<span className="text-sm text-muted-foreground">credits</span>
								</div>
								<FieldDescription>
									Used when converting payment amounts into subscription credits.
								</FieldDescription>
							</FieldContent>
						</Field>
						<div>
							<Button
								type="button"
								disabled={rateUpdateState.isLoading || rateIsError}
								onClick={() => void saveExchangeRate()}
							>
								{rateUpdateState.isLoading ? (
									<>
										<Loader2Icon className="size-4 animate-spin" aria-hidden />
										Saving…
									</>
								) : (
									"Save exchange rate"
								)}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
