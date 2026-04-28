"use client";

import { useMemo, useState } from "react";

import { useListMyBusinessesQuery } from "../../../services/branch-management/branchManagementApi";
import {
	useGetCurrentSubscriptionQuery,
	useListSubscriptionPlansQuery,
	usePaySubscriptionMutation,
} from "../../../services/subscription/subscriptionApi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldDescription,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

function moneyLabel(price: string) {
	const n = Number(price);
	if (!Number.isFinite(n)) return price;
	return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function SubscriptionPage() {
	const [businessId, setBusinessId] = useState("");
	const [selectedPlanId, setSelectedPlanId] = useState("");
	const [actionError, setActionError] = useState<string | null>(null);

	const { data: businesses = [], isLoading: businessesLoading } =
		useListMyBusinessesQuery();

	const {
		data: plans = [],
		isLoading: plansLoading,
		isFetching: plansFetching,
		error: plansError,
	} = useListSubscriptionPlansQuery();

	const {
		data: currentSubscription,
		isLoading: currentLoading,
		isFetching: currentFetching,
		error: currentError,
	} = useGetCurrentSubscriptionQuery(
		{ businessId },
		{ skip: !businessId },
	);

	const selectedBusiness = useMemo(
		() => businesses.find((b) => b.id === businessId) ?? null,
		[businessId, businesses],
	);

	const plansById = useMemo(() => {
		const m = new Map<string, (typeof plans)[number]>();
		for (const p of plans) m.set(p.id, p);
		return m;
	}, [plans]);

	const currentPlan = useMemo(() => {
		if (!currentSubscription) return null;
		return plansById.get(currentSubscription.plan_id) ?? null;
	}, [currentSubscription, plansById]);

	const [paySubscription, { isLoading: paying }] = usePaySubscriptionMutation();

	const canSubscribe = Boolean(businessId && selectedPlanId) && !paying;

	const onSubscribe = async () => {
		setActionError(null);
		if (!businessId) {
			setActionError("Select a business first.");
			return;
		}
		if (!selectedPlanId) {
			setActionError("Select a subscription plan.");
			return;
		}

		try {
			const res = await paySubscription({
				businessId,
				planId: selectedPlanId,
			}).unwrap();

			if (typeof window !== "undefined") {
				window.location.assign(res.checkout_url);
			}
		} catch (e: unknown) {
			const err = e as { data?: { detail?: string; message?: string }; message?: string };
			setActionError(err.data?.detail || err.data?.message || err.message || "Payment failed");
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Subscription</h1>
				<p className="text-muted-foreground">
					Choose a plan and proceed to checkout to activate your subscription.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Business</CardTitle>
					<CardDescription>
						Subscriptions are managed per business (tenant).
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field>
							<FieldLabel htmlFor="subscription-business">Business</FieldLabel>
							<Select
								value={businessId}
								onValueChange={(value) => {
									setBusinessId(value ?? "");
									setSelectedPlanId("");
									setActionError(null);
								}}
								disabled={businessesLoading}
							>
								<SelectTrigger id="subscription-business" className="w-full">
									<SelectValue placeholder="Select a business">
										{selectedBusiness?.name}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{businesses.map((b) => (
											<SelectItem key={b.id} value={b.id}>
												{b.name}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
							<FieldDescription>
								Select the business you want to subscribe for.
							</FieldDescription>
						</Field>

						<Field>
							<FieldLabel>Current Subscription</FieldLabel>
							<div className="flex min-h-10 items-center gap-2 rounded-md border px-3">
								{!businessId ? (
									<span className="text-muted-foreground">Select a business</span>
								) : currentLoading || currentFetching ? (
									<span className="text-muted-foreground">Loading…</span>
								) : currentSubscription ? (
									<div className="flex items-center gap-2">
										<Badge variant="secondary">
											{currentPlan?.name ?? "Subscribed"}
										</Badge>
										<span className="text-sm text-muted-foreground">
											Status: {currentSubscription.status}
										</span>
									</div>
								) : (
									<span className="text-muted-foreground">No active subscription</span>
								)}
							</div>
						</Field>
					</FieldGroup>

					{currentError ? (
						<p className="mt-3 text-sm text-destructive">
							Failed to load current subscription.
						</p>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Plans</CardTitle>
					<CardDescription>
						Select a plan and continue to the checkout page.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{plansError ? (
						<Alert variant="destructive">
							<AlertTitle>Couldn’t load plans</AlertTitle>
							<AlertDescription>
								Please try again later.
							</AlertDescription>
						</Alert>
					) : null}

					<Field>
						<FieldLabel htmlFor="subscription-plan">Plan</FieldLabel>
						<Select
							value={selectedPlanId}
							onValueChange={(value) => {
								setSelectedPlanId(value ?? "");
								setActionError(null);
							}}
							disabled={plansLoading || plansFetching}
						>
							<SelectTrigger id="subscription-plan" className="w-full">
								<SelectValue placeholder="Select a plan">
									{selectedPlanId ? plansById.get(selectedPlanId)?.name : undefined}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{plans
										.filter((p) => !p.is_archived)
										.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name} • {moneyLabel(p.price)} • {p.duration_days} days
											</SelectItem>
										))}
								</SelectGroup>
							</SelectContent>
						</Select>
						<FieldDescription>
							{selectedPlanId
								? `Monthly transaction limit: ${
										plansById.get(selectedPlanId)?.monthly_transaction_limit ?? "—"
									}`
								: "Pick a plan to see details."}
						</FieldDescription>
					</Field>

					{actionError ? (
						<p className="text-sm text-destructive">{actionError}</p>
					) : null}

					<div className="flex items-center justify-end gap-2">
						<Button onClick={onSubscribe} disabled={!canSubscribe}>
							{paying ? "Redirecting…" : "Subscribe"}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

