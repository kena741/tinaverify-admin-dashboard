"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";

import { useListAllBusinessesQuery } from "../../../services/branch-management/branchManagementApi";
import {
	useCheckoutSubscriptionMutation,
	useListSubscriptionPlansQuery,
} from "../../../services/subscription/subscriptionApi";
import type { BusinessOutput } from "../../../services/types";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
} from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Field,
	FieldLabel,
	FieldDescription,
} from "@/components/ui/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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

export default function SubscriptionPage() {
	const [businessPopoverOpen, setBusinessPopoverOpen] = useState(false);
	const [businessId, setBusinessId] = useState("");
	const [selectedPlanId, setSelectedPlanId] = useState("");
	const [actionError, setActionError] = useState<string | null>(null);

	const {
		data: businesses = [],
		isLoading: businessesLoading,
		error: businessesError,
		refetch: refetchBusinesses,
	} = useListAllBusinessesQuery();

	const {
		data: plans = [],
		isLoading: plansLoading,
		isFetching: plansFetching,
		error: plansError,
	} = useListSubscriptionPlansQuery();

	const selectedBusiness = useMemo(
		() => businesses.find((b) => b.id === businessId) ?? null,
		[businessId, businesses],
	);

	const plansById = useMemo(() => {
		const m = new Map<string, (typeof plans)[number]>();
		for (const p of plans) m.set(p.id, p);
		return m;
	}, [plans]);

	const [checkoutSubscription, { isLoading: paying }] =
		useCheckoutSubscriptionMutation();

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
			const res = await checkoutSubscription({
				businessId,
				planId: selectedPlanId,
			}).unwrap();

			if (typeof window !== "undefined") {
				window.location.assign(res.checkout_url);
			}
		} catch (e: unknown) {
			const err = e as {
				data?: { detail?: string; message?: string };
				message?: string;
			};
			setActionError(
				err.data?.detail ||
					err.data?.message ||
					err.message ||
					"Payment failed",
			);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Subscription</h1>
				<p className="text-muted-foreground">
					Choose a business to view usage and history, pick a plan, then proceed to
					checkout.
				</p>
			</div>

			{businessesError ? (
				<Alert variant="destructive">
					<AlertTitle>Couldn’t load businesses</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span className="wrap-break-word">
							{getErrorMessage(businessesError, "Request failed.")}
						</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => refetchBusinesses()}
						>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardContent>
					<Field>
						<FieldLabel id="subscription-business-label">Business</FieldLabel>
						<Popover open={businessPopoverOpen} onOpenChange={setBusinessPopoverOpen}>
							<PopoverTrigger
								render={
									<Button
										type="button"
										variant="outline"
										disabled={businessesLoading}
										className="h-10 w-full justify-between font-normal"
										aria-labelledby="subscription-business-label"
									/>
								}
							>
								<span className="truncate text-left">
									{businessesLoading ? (
										<span className="text-muted-foreground">Loading…</span>
									) : selectedBusiness ? (
										selectedBusiness.name
									) : (
										<span className="text-muted-foreground">Select a business…</span>
									)}
								</span>
								<ChevronsUpDownIcon data-icon="inline-end" aria-hidden />
							</PopoverTrigger>
							<PopoverContent className="w-(--anchor-width) min-w-72 p-0" align="start">
								<Command>
									<CommandInput
										placeholder="Search by name or TIN…"
										aria-label="Search businesses"
									/>
									<CommandList>
										<CommandEmpty>No business found.</CommandEmpty>
										<CommandGroup heading="Businesses">
											{businesses.map((b: BusinessOutput) => (
												<CommandItem
													key={b.id}
													value={`${b.name} ${b.tin_number} ${b.id}`}
													onSelect={() => {
														setBusinessId(b.id);
														setSelectedPlanId("");
														setActionError(null);
														setBusinessPopoverOpen(false);
													}}
													className="[&>svg:last-child]:hidden"
												>
													<span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
														<span className="truncate font-medium">{b.name}</span>
														<span className="truncate text-xs text-muted-foreground">
															TIN {b.tin_number}
														</span>
													</span>
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
						<FieldDescription>
							Choose the business you want to activate a subscription for.
						</FieldDescription>
					</Field>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="flex flex-col gap-4">
					{plansError ? (
						<Alert variant="destructive">
							<AlertTitle>Couldn’t load plans</AlertTitle>
							<AlertDescription>Please try again later.</AlertDescription>
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
