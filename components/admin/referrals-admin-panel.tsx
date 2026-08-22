"use client";

import { useEffect, useMemo, useState } from "react";
import {
	Loader2Icon,
	PercentIcon,
	PlusIcon,
	TrendingUpIcon,
	UserPlusIcon,
	UsersIcon,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import {
	useCreateReferralCampaignMutation,
	useGetReferralCommissionRateQuery,
	useGetReferralPerformanceQuery,
	useUpdateReferralCommissionRateMutation,
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
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
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

function formatCommissionPercent(rate: number): string {
	return `${(rate * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

type ReferralsAdminPanelProps = {
	embedded?: boolean;
};

export function ReferralsAdminPanel({ embedded = false }: ReferralsAdminPanelProps) {
	const {
		data: performance,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useGetReferralPerformanceQuery();

	const {
		data: commissionRateData,
		isLoading: commissionLoading,
		error: commissionError,
		refetch: refetchCommission,
	} = useGetReferralCommissionRateQuery();

	const [createCampaign, createCampaignState] = useCreateReferralCampaignMutation();
	const [updateCommissionRate, updateCommissionState] =
		useUpdateReferralCommissionRateMutation();

	const [addOpen, setAddOpen] = useState(false);
	const [campaignCode, setCampaignCode] = useState("");
	const [campaignDescription, setCampaignDescription] = useState("");
	const [formError, setFormError] = useState("");

	const [commissionEditOpen, setCommissionEditOpen] = useState(false);
	const [commissionPercentInput, setCommissionPercentInput] = useState("");
	const [commissionFormError, setCommissionFormError] = useState("");

	useEffect(() => {
		if (commissionEditOpen && commissionRateData) {
			setCommissionPercentInput(String(commissionRateData.commission_rate * 100));
		}
	}, [commissionEditOpen, commissionRateData]);

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

	const handleUpdateCommission = async (e: React.FormEvent) => {
		e.preventDefault();
		setCommissionFormError("");

		const parsed = Number.parseFloat(commissionPercentInput);
		if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
			setCommissionFormError("Enter a percentage between 0 and 100.");
			return;
		}

		try {
			await updateCommissionRate({
				body: { commission_rate: parsed / 100 },
			}).unwrap();
			setCommissionEditOpen(false);
		} catch (err) {
			setCommissionFormError(
				getErrorMessage(err, "Failed to update commission rate."),
			);
		}
	};

	const addCampaignButton = (
		<Button type="button" size="sm" onClick={() => setAddOpen(true)}>
			<PlusIcon data-icon="inline-start" aria-hidden />
			Add campaign
		</Button>
	);

	return (
		<div className="flex flex-col gap-6">
			{embedded ? (
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-1">
						<h2 className="text-lg font-semibold tracking-tight">
							Referral performance
						</h2>
						<p className="text-sm text-muted-foreground">
							Campaign signups and active subscriptions across the platform.
						</p>
					</div>
					{addCampaignButton}
				</div>
			) : (
				<PageHeader
					title="Referrals"
					description="Manage referral campaigns, track signups, and configure the commission rate awarded to referrers."
					actions={addCampaignButton}
				/>
			)}

			<Card className="shadow-sm">
				<CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
					<div className="flex items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-brand-ink">
							<PercentIcon className="size-5" aria-hidden />
						</div>
						<div>
							<CardTitle>Commission rate</CardTitle>
							<p className="text-sm text-muted-foreground">
								Percentage of subscription revenue awarded to referrers.
							</p>
						</div>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setCommissionEditOpen(true)}
						disabled={commissionLoading}
					>
						Edit rate
					</Button>
				</CardHeader>
				<CardContent>
					{commissionError ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load commission rate</AlertTitle>
							<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<span className="wrap-break-word">
									{getErrorMessage(commissionError, "Request failed.")}
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => refetchCommission()}
								>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : commissionLoading ? (
						<Skeleton className="h-10 w-32" />
					) : (
						<p className="text-3xl font-semibold tabular-nums">
							{formatCommissionPercent(commissionRateData?.commission_rate ?? 0)}
						</p>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-4 sm:grid-cols-3">
				<StatCard
					label="Campaigns"
					value={isLoading ? null : stats.campaigns.toLocaleString()}
					icon={TrendingUpIcon}
					loading={isLoading}
				/>
				<StatCard
					label="Total signups"
					value={isLoading ? null : stats.totalSignups.toLocaleString()}
					icon={UserPlusIcon}
					loading={isLoading}
				/>
				<StatCard
					label="Active subscriptions"
					value={isLoading ? null : stats.activeSubscriptions.toLocaleString()}
					icon={UsersIcon}
					loading={isLoading}
				/>
			</div>

			<Card className="shadow-sm">
				<CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
					<CardTitle>Campaign performance</CardTitle>
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

			<Dialog
				open={commissionEditOpen}
				onOpenChange={(open) => {
					setCommissionEditOpen(open);
					if (!open) setCommissionFormError("");
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Update commission rate</DialogTitle>
						<DialogDescription>
							Set the percentage of the subscription amount awarded to the referrer.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleUpdateCommission} className="flex flex-col gap-4">
						{commissionFormError ? (
							<Alert variant="destructive">
								<AlertTitle>Could not update rate</AlertTitle>
								<AlertDescription>{commissionFormError}</AlertDescription>
							</Alert>
						) : null}

						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="commission-percent">Commission (%)</FieldLabel>
								<Input
									id="commission-percent"
									type="number"
									min={0}
									max={100}
									step={0.1}
									value={commissionPercentInput}
									onChange={(e) => setCommissionPercentInput(e.target.value)}
									placeholder="10"
									required
									autoFocus
								/>
								<FieldDescription>
									For example, enter 10 for a 10% commission on each subscription.
								</FieldDescription>
							</Field>
						</FieldGroup>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setCommissionEditOpen(false)}
								disabled={updateCommissionState.isLoading}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={updateCommissionState.isLoading}>
								{updateCommissionState.isLoading && (
									<Loader2Icon
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
								)}
								{updateCommissionState.isLoading ? "Saving…" : "Save rate"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
