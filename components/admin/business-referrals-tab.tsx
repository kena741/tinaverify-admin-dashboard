"use client";

import { useMemo, useState } from "react";
import {
	Loader2Icon,
	PlusIcon,
	TrendingUpIcon,
	UserPlusIcon,
	UsersIcon,
} from "lucide-react";

import {
	useCreateReferralCampaignMutation,
	useGetReferralPerformanceQuery,
} from "@/services/referrals/referralsApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

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

export function BusinessReferralsTab() {
	const {
		data: performance,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useGetReferralPerformanceQuery();

	const [createCampaign, createCampaignState] = useCreateReferralCampaignMutation();

	const [addOpen, setAddOpen] = useState(false);
	const [campaignCode, setCampaignCode] = useState("");
	const [campaignDescription, setCampaignDescription] = useState("");
	const [formError, setFormError] = useState("");

	const stats = useMemo(() => {
		const rows = performance ?? [];
		return {
			campaigns: rows.length,
			totalSignups: rows.reduce((sum, r) => sum + r.total_signups, 0),
			activeSubscriptions: rows.reduce(
				(sum, r) => sum + r.active_subscriptions,
				0,
			),
		};
	}, [performance]);

	const handleCreateCampaign = async (e: React.FormEvent) => {
		e.preventDefault();
		setFormError("");

		const code = campaignCode.trim();
		const description = campaignDescription.trim();
		if (!code) {
			setFormError("Campaign code is required.");
			return;
		}
		if (!description) {
			setFormError("Description is required.");
			return;
		}

		try {
			await createCampaign({ body: { code, description } }).unwrap();
			setCampaignCode("");
			setCampaignDescription("");
			setAddOpen(false);
		} catch (err) {
			setFormError(getErrorMessage(err, "Failed to create campaign."));
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-col gap-1">
					<h2 className="text-lg font-semibold tracking-tight">
						Referral performance
					</h2>
					<p className="text-sm text-muted-foreground">
						Campaign signups and active subscriptions across the platform.
					</p>
				</div>
				<Button type="button" size="sm" onClick={() => setAddOpen(true)}>
					<PlusIcon data-icon="inline-start" aria-hidden />
					Add campaign
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardContent className="flex items-center gap-4 p-4">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<TrendingUpIcon className="size-5" aria-hidden />
						</div>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="text-sm text-muted-foreground">Campaigns</span>
							<span className="text-2xl font-semibold tabular-nums">
								{isLoading ? "—" : stats.campaigns.toLocaleString()}
							</span>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-4 p-4">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<UserPlusIcon className="size-5" aria-hidden />
						</div>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="text-sm text-muted-foreground">Total signups</span>
							<span className="text-2xl font-semibold tabular-nums">
								{isLoading ? "—" : stats.totalSignups.toLocaleString()}
							</span>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-4 p-4">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<UsersIcon className="size-5" aria-hidden />
						</div>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="text-sm text-muted-foreground">
								Active subscriptions
							</span>
							<span className="text-2xl font-semibold tabular-nums">
								{isLoading ? "—" : stats.activeSubscriptions.toLocaleString()}
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
					<CardTitle>Campaigns</CardTitle>
					{isFetching && !isLoading ? (
						<span className="text-sm text-muted-foreground">Refreshing…</span>
					) : null}
				</CardHeader>
				<CardContent>
					{error ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load referral performance</AlertTitle>
							<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<span className="wrap-break-word">
									{getErrorMessage(error, "Request failed.")}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => refetch()}
								>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : isLoading ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : (
						<Table aria-label="Referral campaign performance">
							<TableHeader>
								<TableRow>
									<TableHead>Code</TableHead>
									<TableHead>Description</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Total signups</TableHead>
									<TableHead className="text-right">
										Active subscriptions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(performance ?? []).length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="py-10 text-center text-muted-foreground"
										>
											No referral campaigns yet. Add one to get started.
										</TableCell>
									</TableRow>
								) : (
									(performance ?? []).map((row) => (
										<TableRow key={row.code}>
											<TableCell className="font-mono font-medium">
												{row.code}
											</TableCell>
											<TableCell className="max-w-[20rem] truncate">
												{row.description}
											</TableCell>
											<TableCell>
												{row.is_active ? (
													<Badge variant="default">Active</Badge>
												) : (
													<Badge variant="secondary">Inactive</Badge>
												)}
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{row.total_signups.toLocaleString()}
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{row.active_subscriptions.toLocaleString()}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={addOpen}
				onOpenChange={(open) => {
					setAddOpen(open);
					if (!open) {
						setCampaignCode("");
						setCampaignDescription("");
						setFormError("");
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add referral campaign</DialogTitle>
						<DialogDescription>
							Create a new referral code businesses and users can sign up with.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleCreateCampaign} className="flex flex-col gap-4">
						{formError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not create campaign</AlertTitle>
								<AlertDescription>{formError}</AlertDescription>
							</Alert>
						) : null}

						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="referral-code">Code</FieldLabel>
								<Input
									id="referral-code"
									value={campaignCode}
									onChange={(e) => setCampaignCode(e.target.value)}
									placeholder="e.g. SUMMER24"
									required
									autoFocus
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="referral-description">Description</FieldLabel>
								<Input
									id="referral-description"
									value={campaignDescription}
									onChange={(e) => setCampaignDescription(e.target.value)}
									placeholder="Summer promotion referral"
									required
								/>
							</Field>
						</FieldGroup>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setAddOpen(false)}
								disabled={createCampaignState.isLoading}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={createCampaignState.isLoading}>
								{createCampaignState.isLoading && (
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
								)}
								{createCampaignState.isLoading ? "Creating…" : "Create campaign"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
