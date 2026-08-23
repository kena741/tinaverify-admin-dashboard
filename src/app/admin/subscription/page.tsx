"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDownIcon, Loader2Icon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { useListAllBusinessesQuery } from "../../../services/branch-management/branchManagementApi";
import {
	useCheckoutSubscriptionCustomMutation,
	useCheckoutSubscriptionMutation,
	useGetActiveSubscriptionQuery,
	useGetSubscriptionUsageQuery,
	useGrantSubscriptionCreditsMutation,
} from "../../../services/subscription/subscriptionApi";
import { useAdminAssignSubscriptionMutation } from "../../../services/admin/adminApi";
import { useListSubscriptionPlansQuery } from "../../../services/subscription-plan/subscriptionPlanApi";
import type { BusinessOutput, SubscriptionOutput } from "../../../services/types";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	FieldGroup,
	FieldLabel,
	FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function moneyLabel(price: string) {
	const n = Number(price);
	if (!Number.isFinite(n)) return price;
	return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Safe display for usage counters — API may omit fields or send strings. */
function usageMetricLabel(value: unknown): string {
	if (value === null || value === undefined) return "—";
	if (typeof value === "number" && Number.isFinite(value)) {
		return value.toLocaleString();
	}
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number(value);
		if (Number.isFinite(n)) return n.toLocaleString();
		return value;
	}
	return "—";
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

/** Parses a positive amount; strips spaces and common currency noise (e.g. "$", "ETB"). */
function parseAmount(raw: string): number | null {
	const s = String(raw).trim();
	if (!s) return null;
	const normalized = s.replace(/[^\d.,\-]/g, "").replace(/,/g, "");
	if (!normalized || normalized === "-") return null;
	const n = Number(normalized);
	if (!Number.isFinite(n) || n <= 0) return null;
	return n;
}

type ActionTab = "standard" | "custom" | "grant" | "manual";

export default function SubscriptionPage() {
	const [businessPopoverOpen, setBusinessPopoverOpen] = useState(false);
	const [businessSearch, setBusinessSearch] = useState("");
	const [businessId, setBusinessId] = useState("");
	/** List-price checkout (`POST …/checkout`) — plan only */
	const [standardPlanId, setStandardPlanId] = useState("");
	const [actionTab, setActionTab] = useState<ActionTab>("standard");
	const [customAmount, setCustomAmount] = useState("");
	const [grantCreditsInput, setGrantCreditsInput] = useState("");
	const [manualPlanId, setManualPlanId] = useState("");
	const [manualAmount, setManualAmount] = useState("");
	const [actionError, setActionError] = useState<string | null>(null);
	const [grantSuccess, setGrantSuccess] = useState<SubscriptionOutput | null>(null);
	const [manualSuccess, setManualSuccess] = useState<SubscriptionOutput | null>(
		null,
	);

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

	const {
		data: usage,
		isFetching: usageFetching,
		isError: usageError,
	} = useGetSubscriptionUsageQuery({ businessId }, { skip: !businessId });

	const {
		data: activeSubscription,
		isFetching: activeSubFetching,
	} = useGetActiveSubscriptionQuery(
		{ businessId },
		{ skip: !businessId },
	);

	const selectedBusiness = useMemo(
		() => businesses.find((b) => b.id === businessId) ?? null,
		[businessId, businesses],
	);

	const filteredBusinesses = useMemo(() => {
		const q = businessSearch.trim().toLowerCase();
		const rows = businesses.filter((b) => Boolean(b.id));
		if (!q) return rows;
		return rows.filter((b) => {
			const name = (b.name ?? "").toLowerCase();
			const tin = (b.tin_number ?? "").toLowerCase();
			return name.includes(q) || tin.includes(q) || b.id.toLowerCase().includes(q);
		});
	}, [businessSearch, businesses]);

	const plansById = useMemo(() => {
		const m = new Map<string, (typeof plans)[number]>();
		for (const p of plans) m.set(p.id, p);
		return m;
	}, [plans]);

	const [checkoutSubscription, { isLoading: paying }] =
		useCheckoutSubscriptionMutation();
	const [checkoutSubscriptionCustom, { isLoading: customPaying }] =
		useCheckoutSubscriptionCustomMutation();
	const [grantSubscriptionCredits, { isLoading: granting }] =
		useGrantSubscriptionCreditsMutation();
	const [assignSubscription, { isLoading: assigning }] =
		useAdminAssignSubscriptionMutation();

	const amountParsed = parseAmount(customAmount);
	const manualAmountParsed = parseAmount(manualAmount);
	const creditsParsed = Number.parseInt(grantCreditsInput.trim(), 10);
	const canStandardCheckout =
		Boolean(businessId && standardPlanId) &&
		!paying &&
		!customPaying &&
		!granting &&
		!assigning;

	const canCustomCheckout =
		Boolean(businessId && amountParsed !== null) &&
		!paying &&
		!customPaying &&
		!granting &&
		!assigning;

	const canGrantCredits =
		Boolean(businessId) &&
		Number.isFinite(creditsParsed) &&
		creditsParsed >= 1 &&
		!paying &&
		!customPaying &&
		!granting &&
		!assigning;

	const canManualAssign =
		Boolean(businessId && manualPlanId) &&
		!paying &&
		!customPaying &&
		!granting &&
		!assigning;

	const onStandardCheckout = async () => {
		setActionError(null);
		setGrantSuccess(null);
		if (!businessId) {
			setActionError("Select a business first.");
			return;
		}
		if (!standardPlanId) {
			setActionError("Select a subscription plan.");
			return;
		}

		try {
			const res = await checkoutSubscription({
				businessId,
				planId: standardPlanId,
			}).unwrap();

			if (typeof window !== "undefined") {
				window.location.assign(res.checkout_url);
			}
		} catch (e: unknown) {
			setActionError(getErrorMessage(e, "Checkout failed."));
		}
	};

	const onCustomCheckout = async () => {
		setActionError(null);
		setGrantSuccess(null);
		if (!businessId) {
			setActionError("Select a business first.");
			return;
		}
		const amt = parseAmount(customAmount);
		if (amt === null) {
			setActionError("Enter a valid amount greater than zero.");
			return;
		}

		try {
			const res = await checkoutSubscriptionCustom({
				businessId,
				body: {
					amount: amt,
				},
			}).unwrap();

			if (typeof window !== "undefined") {
				window.location.assign(res.checkout_url);
			}
		} catch (e: unknown) {
			setActionError(getErrorMessage(e, "Custom checkout failed."));
		}
	};

	const onGrantCredits = async () => {
		setActionError(null);
		setGrantSuccess(null);
		setManualSuccess(null);
		if (!businessId) {
			setActionError("Select a business first.");
			return;
		}
		const n = Number.parseInt(grantCreditsInput.trim(), 10);
		if (!Number.isFinite(n) || n < 1) {
			setActionError("Enter a whole number of credits (at least 1).");
			return;
		}

		try {
			const out = await grantSubscriptionCredits({
				businessId,
				body: { credits: n },
			}).unwrap();
			setGrantSuccess(out);
			setGrantCreditsInput("");
		} catch (e: unknown) {
			setActionError(getErrorMessage(e, "Could not grant credits."));
		}
	};

	const onManualAssign = async () => {
		setActionError(null);
		setGrantSuccess(null);
		setManualSuccess(null);
		if (!businessId) {
			setActionError("Select a business first.");
			return;
		}
		if (!manualPlanId) {
			setActionError("Select a subscription plan.");
			return;
		}
		try {
			const out = await assignSubscription({
				body: {
					business_id: businessId,
					plan_id: manualPlanId,
					amount: manualAmountParsed,
				},
			}).unwrap();
			setManualSuccess(out);
			setManualAmount("");
		} catch (e: unknown) {
			setActionError(getErrorMessage(e, "Could not assign subscription."));
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Subscription"
				description="Choose a business, then subscribe at a plan's list price, open checkout, grant credits, or assign a subscription manually."
			/>

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
				<CardContent className="pt-6">
					<Field>
						<FieldLabel id="subscription-business-label">Business</FieldLabel>
						<Popover
							open={businessPopoverOpen}
							onOpenChange={(open) => {
								setBusinessPopoverOpen(open);
								if (!open) setBusinessSearch("");
							}}
						>
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
										selectedBusiness.name || "Untitled business"
									) : (
										<span className="text-muted-foreground">
											Select a business…
										</span>
									)}
								</span>
								<ChevronsUpDownIcon data-icon="inline-end" aria-hidden />
							</PopoverTrigger>
							<PopoverContent
								className="w-(--anchor-width) min-w-72 p-0"
								align="start"
							>
								{/* ponytail: explicit filter — cmdk auto-filter is flaky with nested item labels */}
								<Command shouldFilter={false}>
									<CommandInput
										placeholder="Search by name or TIN…"
										aria-label="Search businesses"
										value={businessSearch}
										onValueChange={setBusinessSearch}
									/>
									<CommandList>
										<CommandEmpty>No business found.</CommandEmpty>
										<CommandGroup heading="Businesses">
											{filteredBusinesses.map((b: BusinessOutput) => (
												<CommandItem
													key={b.id}
													value={b.id}
													onSelect={() => {
														setBusinessId(b.id);
														setStandardPlanId("");
														setCustomAmount("");
														setGrantCreditsInput("");
														setActionError(null);
														setGrantSuccess(null);
														setBusinessPopoverOpen(false);
														setBusinessSearch("");
													}}
													className="[&>svg:last-child]:hidden"
												>
													<span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
														<span className="truncate font-medium">
															{b.name || "Untitled business"}
														</span>
														<span className="truncate text-xs text-muted-foreground">
															TIN {b.tin_number || "—"}
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
							Choose the business you want to manage billing or credits for.
						</FieldDescription>
					</Field>
				</CardContent>
			</Card>

			{businessId ? (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Current usage</CardTitle>
					</CardHeader>
					<CardContent className="text-sm">
						{(usageFetching || activeSubFetching) && !usage ? (
							<p className="text-muted-foreground">Loading usage…</p>
						) : usageError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not load usage</AlertTitle>
								<AlertDescription>
									Check your connection and try selecting the business again.
								</AlertDescription>
							</Alert>
						) : usage ? (
							<dl className="grid gap-2 sm:grid-cols-3">
								<div>
									<dt className="text-muted-foreground">Limit</dt>
									<dd className="tabular-nums font-medium">
										{usageMetricLabel(usage.credits_limit)}
									</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">Used</dt>
									<dd className="tabular-nums font-medium">
										{usageMetricLabel(usage.credits_used)}
									</dd>
								</div>
								<div>
									<dt className="text-muted-foreground">Remaining</dt>
									<dd className="tabular-nums font-medium">
										{usageMetricLabel(usage.remaining_credits)}
									</dd>
								</div>
							</dl>
						) : (
							<div className="flex flex-col gap-1">
								<p className="text-muted-foreground">
									No active subscription for this business — usage is
									unavailable until they have a plan.
								</p>
								{activeSubscription ? (
									<p className="text-xs text-muted-foreground">
										Latest status: {activeSubscription.status}
									</p>
								) : null}
							</div>
						)}
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader className="pb-0">
					<CardTitle className="text-base">Actions</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<Tabs
						value={actionTab}
						onValueChange={(v) => {
							const next = v as ActionTab;
							setActionTab(next);
							setActionError(null);
							if (next !== "grant") setGrantSuccess(null);
							if (next !== "manual") setManualSuccess(null);
						}}
						className="flex w-full flex-col gap-4"
					>
						<TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-4">
							<TabsTrigger value="standard">Plan price</TabsTrigger>
							<TabsTrigger value="custom">Custom amount</TabsTrigger>
							<TabsTrigger value="grant">Grant credits</TabsTrigger>
							<TabsTrigger value="manual">Manual assign</TabsTrigger>
						</TabsList>

						<TabsContent
							value="standard"
							className="flex flex-col gap-4 outline-none"
						>
							<p className="text-sm text-muted-foreground">
								Check out through Chapa at the plan&apos;s configured list price.
								No manual amount — pick a plan and continue.
							</p>
							{plansError ? (
								<Alert variant="destructive">
									<AlertTitle>Couldn’t load plans</AlertTitle>
									<AlertDescription>Please try again later.</AlertDescription>
								</Alert>
							) : null}
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="subscription-plan-standard">Plan</FieldLabel>
									<Select
										value={standardPlanId}
										onValueChange={(value) => {
											setStandardPlanId(value ?? "");
											setActionError(null);
											setGrantSuccess(null);
										}}
										disabled={!businessId || plansLoading || plansFetching}
									>
										<SelectTrigger id="subscription-plan-standard" className="w-full">
											<SelectValue placeholder="Select a plan…">
												{standardPlanId
													? plansById.get(standardPlanId)?.name
													: undefined}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{plans
													.filter((p) => !p.is_archived)
													.map((p) => (
														<SelectItem key={p.id} value={p.id}>
															{p.name} • {moneyLabel(p.price)} • {p.duration_days}{" "}
															days
														</SelectItem>
													))}
											</SelectGroup>
										</SelectContent>
									</Select>
									<FieldDescription>
										{standardPlanId
											? `You will pay ${moneyLabel(plansById.get(standardPlanId)?.price ?? "0")} at checkout. Monthly transaction limit: ${
													plansById.get(standardPlanId)
														?.monthly_transaction_limit ?? "—"
												}`
											: "Pick the tier to bill at its catalog price."}
									</FieldDescription>
								</Field>
							</FieldGroup>
							{actionError && actionTab === "standard" ? (
								<p className="text-sm text-destructive">{actionError}</p>
							) : null}
							<div className="flex justify-end">
								<Button
									onClick={onStandardCheckout}
									disabled={!canStandardCheckout}
									title={
										!businessId
											? "Select a business first"
											: !standardPlanId
												? "Select a plan"
												: undefined
									}
								>
									{paying ? (
										<Loader2Icon className="animate-spin" aria-hidden="true" />
									) : null}
									{paying ? "Redirecting…" : "Subscribe at plan price"}
								</Button>
							</div>
						</TabsContent>

						<TabsContent
							value="custom"
							className="flex flex-col gap-4 outline-none"
						>
							<p className="text-sm text-muted-foreground">
								Enter the payment amount only — no plan is required. The API opens
								checkout for this business at your chosen amount.
							</p>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="custom-amount">Payment amount</FieldLabel>
									<Input
										id="custom-amount"
										name="amount"
										type="text"
										inputMode="decimal"
										autoComplete="off"
										placeholder="e.g. 1499.99…"
										value={customAmount}
										onChange={(e) => {
											setCustomAmount(e.target.value);
											setActionError(null);
										}}
										disabled={!businessId}
									/>
									<FieldDescription>
										Must be greater than zero. Currency symbols are stripped before
										sending.
									</FieldDescription>
								</Field>
							</FieldGroup>
							{!canCustomCheckout &&
							businessId &&
							amountParsed === null &&
							customAmount.trim() !== "" ? (
								<p className="text-sm text-destructive">
									Enter a valid positive number for the amount.
								</p>
							) : null}
							{actionError && actionTab === "custom" ? (
								<p className="text-sm text-destructive">{actionError}</p>
							) : null}
							<div className="flex justify-end">
								<Button
									onClick={onCustomCheckout}
									disabled={!canCustomCheckout}
									title={
										!businessId
											? "Select a business first"
											: amountParsed === null
												? "Enter a valid amount"
												: undefined
									}
								>
									{customPaying ? (
										<Loader2Icon className="animate-spin" aria-hidden="true" />
									) : null}
									{customPaying
										? "Redirecting…"
										: "Checkout with custom amount"}
								</Button>
							</div>
						</TabsContent>

						<TabsContent
							value="grant"
							className="flex flex-col gap-4 outline-none"
						>
							<p className="text-sm text-muted-foreground">
								Add credits to the selected business&apos;s subscription usage
								without going through checkout.
							</p>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="grant-credits">
										Credits to grant
									</FieldLabel>
									<Input
										id="grant-credits"
										name="credits"
										type="text"
										inputMode="numeric"
										autoComplete="off"
										placeholder="e.g. 500…"
										value={grantCreditsInput}
										onChange={(e) => {
											setGrantCreditsInput(e.target.value);
											setActionError(null);
											setGrantSuccess(null);
										}}
										disabled={!businessId}
									/>
									<FieldDescription>
										Whole number, minimum 1. Requires an authenticated admin
										context on the API.
									</FieldDescription>
								</Field>
							</FieldGroup>
							{grantSuccess ? (
								<Alert>
									<AlertTitle>Subscription updated</AlertTitle>
									<AlertDescription className="space-y-1">
										<p>
											Status: <strong>{grantSuccess.status}</strong>
										</p>
										<p className="font-mono text-xs text-muted-foreground">
											Subscription ID: {grantSuccess.id}
										</p>
									</AlertDescription>
								</Alert>
							) : null}
							{actionError && actionTab === "grant" ? (
								<p className="text-sm text-destructive">{actionError}</p>
							) : null}
							<div className="flex justify-end">
								<Button onClick={onGrantCredits} disabled={!canGrantCredits}>
									{granting ? (
										<Loader2Icon className="animate-spin" aria-hidden="true" />
									) : null}
									{granting ? "Granting…" : "Grant credits"}
								</Button>
							</div>
						</TabsContent>

						<TabsContent
							value="manual"
							className="flex flex-col gap-4 outline-none"
						>
							<p className="text-sm text-muted-foreground">
								Assign a plan to this business without Chapa checkout (admin
								manual subscription).
							</p>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="manual-plan">Plan</FieldLabel>
									<Select
										value={manualPlanId}
										onValueChange={(value) => {
											setManualPlanId(value ?? "");
											setActionError(null);
											setManualSuccess(null);
										}}
										disabled={!businessId || plansLoading || plansFetching}
									>
										<SelectTrigger id="manual-plan" className="w-full">
											<SelectValue placeholder="Select a plan…">
												{manualPlanId
													? plansById.get(manualPlanId)?.name
													: undefined}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{plans
													.filter((p) => !p.is_archived)
													.map((p) => (
														<SelectItem key={p.id} value={p.id}>
															{p.name} • {moneyLabel(p.price)} •{" "}
															{p.duration_days} days
														</SelectItem>
													))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<Field>
									<FieldLabel htmlFor="manual-amount">
										Amount (optional)
									</FieldLabel>
									<Input
										id="manual-amount"
										type="text"
										inputMode="decimal"
										placeholder="Leave blank for plan list price"
										value={manualAmount}
										onChange={(e) => {
											setManualAmount(e.target.value);
											setActionError(null);
											setManualSuccess(null);
										}}
										disabled={!businessId}
									/>
								</Field>
							</FieldGroup>
							{manualSuccess ? (
								<Alert>
									<AlertTitle>Subscription assigned</AlertTitle>
									<AlertDescription className="space-y-1">
										<p>
											Status: <strong>{manualSuccess.status}</strong>
										</p>
										<p className="font-mono text-xs text-muted-foreground">
											Subscription ID: {manualSuccess.id}
										</p>
									</AlertDescription>
								</Alert>
							) : null}
							{actionError && actionTab === "manual" ? (
								<p className="text-sm text-destructive">{actionError}</p>
							) : null}
							<div className="flex justify-end">
								<Button
									onClick={() => void onManualAssign()}
									disabled={!canManualAssign}
								>
									{assigning ? (
										<Loader2Icon className="animate-spin" aria-hidden="true" />
									) : null}
									{assigning ? "Assigning…" : "Assign subscription"}
								</Button>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}
