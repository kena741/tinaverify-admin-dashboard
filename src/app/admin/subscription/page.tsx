"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDownIcon } from "lucide-react";
import { format } from "date-fns";

import { useListAllBusinessesQuery } from "../../../services/branch-management/branchManagementApi";
import {
	useCheckoutSubscriptionMutation,
	useGetActiveSubscriptionQuery,
	useGetSubscriptionUsageQuery,
	useListSubscriptionHistoryQuery,
	useListSubscriptionPlansQuery,
} from "../../../services/subscription/subscriptionApi";
import type { BusinessOutput, SubscriptionOutput } from "../../../services/types";

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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

function moneyLabel(price: string) {
	const n = Number(price);
	if (!Number.isFinite(n)) return price;
	return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return "—";
	try {
		return format(new Date(iso), "MMM d, yyyy HH:mm");
	} catch {
		return iso;
	}
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

	const {
		data: currentSubscription,
		isLoading: currentLoading,
		isFetching: currentFetching,
		error: currentError,
	} = useGetActiveSubscriptionQuery({ businessId }, { skip: !businessId });

	const {
		data: subscriptionHistory,
		isLoading: historyLoading,
		isFetching: historyFetching,
		error: historyError,
		refetch: refetchHistory,
	} = useListSubscriptionHistoryQuery({ businessId }, { skip: !businessId });

	const {
		data: usage,
		isLoading: usageLoading,
		isFetching: usageFetching,
		error: usageError,
		refetch: refetchUsage,
	} = useGetSubscriptionUsageQuery({ businessId }, { skip: !businessId });

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

	const historyRows = subscriptionHistory ?? [];
	const usageBusy = usageLoading || usageFetching;
	const historyBusy = historyLoading || historyFetching;

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
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field>
							<FieldLabel id="subscription-business-label">Business</FieldLabel>
							<Popover
								open={businessPopoverOpen}
								onOpenChange={setBusinessPopoverOpen}
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
											selectedBusiness.name
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
						</Field>

						<Field>
							<FieldLabel>Current subscription</FieldLabel>
							<div className="flex min-h-10 items-center gap-2 rounded-md border px-3">
								{!businessId ? (
									<span className="text-muted-foreground">Select a business</span>
								) : currentLoading || currentFetching ? (
									<span className="text-muted-foreground">Loading…</span>
								) : currentSubscription ? (
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant="secondary">
											{currentPlan?.name ?? "Subscribed"}
										</Badge>
										<span className="text-sm text-muted-foreground">
											Status: {currentSubscription.status}
										</span>
									</div>
								) : (
									<span className="text-muted-foreground">
										No active subscription
									</span>
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

			{businessId ? (
				<Card>
					<CardHeader className="justify-end">
						{usageError ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => refetchUsage()}
							>
								Retry
							</Button>
						) : null}
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{usageError ? (
							<Alert variant="destructive">
								<AlertTitle>Couldn’t load usage</AlertTitle>
								<AlertDescription className="wrap-break-word">
									{getErrorMessage(usageError, "Request failed.")}
								</AlertDescription>
							</Alert>
						) : usageBusy ? (
							<div className="grid gap-3 sm:grid-cols-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={i} className="h-16 w-full" />
								))}
							</div>
						) : usage ? (
							<div className="grid gap-4 sm:grid-cols-3">
								<div className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-4 py-3">
									<span className="text-xs font-medium text-muted-foreground">
										Credits used
									</span>
									<span className="text-2xl font-semibold tabular-nums">
										{usage.credits_used}
									</span>
								</div>
								<div className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-4 py-3">
									<span className="text-xs font-medium text-muted-foreground">
										Credits remaining
									</span>
									<span className="text-2xl font-semibold tabular-nums">
										{usage.remaining_credits}
									</span>
								</div>
								<div className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-4 py-3">
									<span className="text-xs font-medium text-muted-foreground">
										Credits limit
									</span>
									<span className="text-2xl font-semibold tabular-nums">
										{usage.credits_limit}
									</span>
								</div>
								<p className="text-xs text-muted-foreground sm:col-span-3">
									Subscription ID:{" "}
									<code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8rem]">
										{usage.subscription_id}
									</code>
								</p>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">No usage data.</p>
						)}
					</CardContent>
				</Card>
			) : null}

			{businessId ? (
				<Card>
					<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex flex-col gap-1">
							<CardTitle>Subscription history</CardTitle>
							<CardDescription>
								Past and current subscription records for this business.
							</CardDescription>
						</div>
						{historyError ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => refetchHistory()}
							>
								Retry
							</Button>
						) : null}
					</CardHeader>
					<CardContent>
						{historyError ? (
							<Alert variant="destructive">
								<AlertTitle>Couldn’t load history</AlertTitle>
								<AlertDescription className="wrap-break-word">
									{getErrorMessage(historyError, "Request failed.")}
								</AlertDescription>
							</Alert>
						) : historyBusy ? (
							<div className="flex flex-col gap-2">
								{Array.from({ length: 5 }).map((_, i) => (
									<Skeleton key={i} className="h-10 w-full" />
								))}
							</div>
						) : (
							<div className="overflow-x-auto rounded-md border">
								<Table aria-label="Subscription history">
									<TableHeader>
										<TableRow>
											<TableHead>Plan</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Started</TableHead>
											<TableHead>Ended</TableHead>
											<TableHead className="hidden lg:table-cell">
												Chapa reference
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{historyRows.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={5}
													className="py-10 text-center text-muted-foreground"
												>
													No subscription history yet.
												</TableCell>
											</TableRow>
										) : (
											historyRows.map((row: SubscriptionOutput) => (
												<TableRow key={row.id}>
													<TableCell className="font-medium">
														{plansById.get(row.plan_id)?.name ?? row.plan_id}
													</TableCell>
													<TableCell>
														<Badge variant="outline">{row.status}</Badge>
													</TableCell>
													<TableCell className="text-sm whitespace-nowrap">
														{formatDateTime(row.started_at)}
													</TableCell>
													<TableCell className="text-sm whitespace-nowrap">
														{formatDateTime(row.ended_at)}
													</TableCell>
													<TableCell className="hidden max-w-48 truncate font-mono text-xs lg:table-cell">
														{row.chapa_transaction_reference ?? "—"}
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			) : null}

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
