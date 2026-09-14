"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
	BanknoteIcon,
	Loader2Icon,
	PercentIcon,
	PlusIcon,
	TrendingUpIcon,
	UserPlusIcon,
	UsersIcon,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { useListAllUsersQuery } from "@/services/auth/authApi";
import { useListAllBusinessesQuery } from "@/services/branch-management/branchManagementApi";
import {
	useCreateReferralCampaignMutation,
	useGetReferralCommissionRateQuery,
	useListReferralPerformanceQuery,
	useToggleReferralCodeStatusMutation,
	useUpdateReferralCommissionRateMutation,
} from "@/services/referrals/referralsApi";
import type { ReferralPerformance, UserOutput } from "@/services/types";
import { formatPlatformLabel, formatUserDisplayName } from "@/lib/userDisplay";
import { cn } from "@/lib/utils";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

type CreatorFilter = "all" | "admin" | "user";

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

function isUserGeneratedReferral(type: string): boolean {
	const t = type.trim().toLowerCase();
	return t === "user" || t === "personal";
}

function referralTypeLabel(type: string): string {
	if (isUserGeneratedReferral(type)) return "User";
	const t = type.trim().toLowerCase();
	if (t === "campaign" || t === "admin") return "Admin";
	return formatPlatformLabel(type) || "—";
}

function resolveUser(
	createdBy: string,
	usersById: Map<string, UserOutput>,
	usersByUsername: Map<string, UserOutput>,
): UserOutput | undefined {
	const key = createdBy.trim();
	if (!key) return undefined;
	return usersById.get(key) ?? usersByUsername.get(key.toLowerCase());
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
	} = useListReferralPerformanceQuery();

	const { data: users } = useListAllUsersQuery();
	const { data: businesses } = useListAllBusinessesQuery();

	const {
		data: commissionRateData,
		isLoading: commissionLoading,
		error: commissionError,
		refetch: refetchCommission,
	} = useGetReferralCommissionRateQuery(undefined, { skip: embedded });

	const [createCampaign, createCampaignState] = useCreateReferralCampaignMutation();
	const [updateCommissionRate, updateCommissionState] =
		useUpdateReferralCommissionRateMutation();
	const [toggleCodeStatus, toggleCodeStatusState] =
		useToggleReferralCodeStatusMutation();
	const [activatingCode, setActivatingCode] = useState<string | null>(null);

	const [creatorFilter, setCreatorFilter] = useState<CreatorFilter>("all");
	const [deactivateTarget, setDeactivateTarget] =
		useState<ReferralPerformance | null>(null);

	const [addOpen, setAddOpen] = useState(false);
	const [campaignCode, setCampaignCode] = useState("");
	const [campaignDescription, setCampaignDescription] = useState("");
	const [formError, setFormError] = useState("");

	const [commissionEditOpen, setCommissionEditOpen] = useState(false);
	const [commissionPercentInput, setCommissionPercentInput] = useState("");
	const [commissionFormError, setCommissionFormError] = useState("");

	const usersById = useMemo(() => {
		const map = new Map<string, UserOutput>();
		for (const user of users ?? []) map.set(user.id, user);
		return map;
	}, [users]);

	const usersByUsername = useMemo(() => {
		const map = new Map<string, UserOutput>();
		for (const user of users ?? []) {
			const username = user.username?.trim().toLowerCase();
			if (username) map.set(username, user);
		}
		return map;
	}, [users]);

	const businessIdByOwnerId = useMemo(() => {
		const map = new Map<string, string>();
		const grouped = new Map<string, { id: string; name: string }[]>();
		for (const business of businesses ?? []) {
			if (!business.owner_id) continue;
			const list = grouped.get(business.owner_id) ?? [];
			list.push({ id: business.id, name: business.name || "" });
			grouped.set(business.owner_id, list);
		}
		for (const [ownerId, list] of grouped) {
			list.sort((a, b) => a.name.localeCompare(b.name));
			map.set(ownerId, list[0]!.id);
		}
		return map;
	}, [businesses]);

	function openCommissionEdit() {
		if (commissionRateData) {
			setCommissionPercentInput(
				String(commissionRateData.commission_rate * 100),
			);
		}
		setCommissionFormError("");
		setCommissionEditOpen(true);
	}

	const filteredRows = useMemo(() => {
		const rows = [...(performance ?? [])];
		rows.sort((a, b) => {
			if (b.total_revenue !== a.total_revenue) {
				return b.total_revenue - a.total_revenue;
			}
			return a.code.localeCompare(b.code);
		});
		if (creatorFilter === "all") return rows;
		return rows.filter((row) => {
			const isUser = isUserGeneratedReferral(row.type);
			return creatorFilter === "user" ? isUser : !isUser;
		});
	}, [performance, creatorFilter]);

	const stats = useMemo(() => {
		const rows = filteredRows;
		return {
			codes: rows.length,
			totalSignups: rows.reduce((sum, r) => sum + r.total_signups, 0),
			activeSubscriptions: rows.reduce(
				(sum, r) => sum + r.active_subscriptions,
				0,
			),
			totalRevenue: rows.reduce((sum, r) => sum + r.total_revenue, 0),
		};
	}, [filteredRows]);

	const filterCounts = useMemo(() => {
		const rows = performance ?? [];
		let admin = 0;
		let user = 0;
		for (const row of rows) {
			if (isUserGeneratedReferral(row.type)) user += 1;
			else admin += 1;
		}
		return { all: rows.length, admin, user };
	}, [performance]);

	async function handleActivate(code: string) {
		setActivatingCode(code);
		try {
			await toggleCodeStatus({
				code,
				body: { is_active: true },
			}).unwrap();
		} finally {
			setActivatingCode(null);
		}
	}

	async function handleConfirmDeactivate() {
		if (!deactivateTarget) return;
		try {
			await toggleCodeStatus({
				code: deactivateTarget.code,
				body: { is_active: false },
			}).unwrap();
			setDeactivateTarget(null);
		} catch {
			/* keep dialog open; mutation error surfaces via RTK */
		}
	}

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
							Admin campaigns and user referral codes, with creator, signups,
							subscriptions, and revenue.
						</p>
					</div>
					{addCampaignButton}
				</div>
			) : (
				<PageHeader
					title="Referrals"
					description="View all admin and user referral codes, who created them, and the signups, subscriptions, and revenue they generated."
					actions={addCampaignButton}
				/>
			)}

			{!embedded ? (
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
							onClick={openCommissionEdit}
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
								{formatCommissionPercent(
									commissionRateData?.commission_rate ?? 0,
								)}
							</p>
						)}
					</CardContent>
				</Card>
			) : null}

			<div
				role="tablist"
				aria-label="Filter by creator type"
				className="flex w-fit flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1"
			>
				{(
					[
						["all", "All", filterCounts.all],
						["admin", "Admin", filterCounts.admin],
						["user", "Users", filterCounts.user],
					] as const
				).map(([id, label, count]) => (
					<button
						key={id}
						type="button"
						role="tab"
						aria-selected={creatorFilter === id}
						onClick={() => setCreatorFilter(id)}
						className={cn(
							"h-8 rounded-md px-3 text-sm motion-safe:transition-colors",
							creatorFilter === id
								? "bg-background font-medium text-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{label}
						<span className="ml-1.5 font-mono text-xs tabular-nums text-muted-foreground">
							{count}
						</span>
					</button>
				))}
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Referral codes"
					value={isLoading ? null : stats.codes.toLocaleString()}
					icon={TrendingUpIcon}
					loading={isLoading}
				/>
				<StatCard
					label="Total signups"
					value={isLoading ? null : stats.totalSignups.toLocaleString()}
					icon={UserPlusIcon}
					loading={isLoading}
					hint="Users who signed up with these codes"
				/>
				<StatCard
					label="Subscriptions"
					value={isLoading ? null : stats.activeSubscriptions.toLocaleString()}
					icon={UsersIcon}
					loading={isLoading}
					hint="Active subscriptions from referred users"
				/>
				<StatCard
					label="Revenue"
					value={
						isLoading
							? null
							: stats.totalRevenue.toLocaleString(undefined, {
									maximumFractionDigits: 2,
								})
					}
					icon={BanknoteIcon}
					loading={isLoading}
					hint="Revenue from referred users"
				/>
			</div>

			<Card className="shadow-sm">
				<CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
					<div className="flex flex-col gap-1">
						<CardTitle>All referral codes</CardTitle>
						<p className="text-sm text-muted-foreground">
							Codes created by admins and users, with creator and performance.
						</p>
					</div>
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
						<div className="overflow-x-auto">
							<Table aria-label="All referral codes">
								<TableHeader>
									<TableRow>
										<TableHead>Code</TableHead>
										<TableHead>Created by</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Signups</TableHead>
										<TableHead className="text-right">Subscriptions</TableHead>
										<TableHead className="text-right">Revenue</TableHead>
										<TableHead className="w-28">
											<span className="sr-only">Actions</span>
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredRows.length === 0 ? (
										<TableRow>
											<TableCell
												colSpan={8}
												className="py-10 text-center text-muted-foreground"
											>
												{creatorFilter === "all"
													? "No referral codes yet. Add a campaign to get started."
													: `No ${creatorFilter === "user" ? "user" : "admin"} referral codes.`}
											</TableCell>
										</TableRow>
									) : (
										filteredRows.map((row) => {
											const creator = resolveUser(
												row.created_by,
												usersById,
												usersByUsername,
											);
											const displayName = creator
												? formatUserDisplayName(creator)
												: row.created_by || "—";
											const ownerBusinessId = creator
												? businessIdByOwnerId.get(creator.id)
												: undefined;
											const isUserCode = isUserGeneratedReferral(row.type);
											const isActivating = activatingCode === row.code;

											return (
												<TableRow key={row.code}>
													<TableCell>
														<div className="flex min-w-0 flex-col gap-0.5">
															<span className="font-mono font-medium">
																{row.code}
															</span>
															{row.description ? (
																<span className="max-w-56 truncate text-xs text-muted-foreground">
																	{row.description}
																</span>
															) : null}
														</div>
													</TableCell>
													<TableCell className="max-w-48">
														{ownerBusinessId && isUserCode ? (
															<Link
																href={`/admin/business/${ownerBusinessId}`}
																className="font-medium text-foreground underline-offset-4 hover:underline"
															>
																{displayName}
															</Link>
														) : (
															<span
																className={cn(
																	"truncate",
																	isUserCode
																		? "text-foreground"
																		: "text-muted-foreground",
																)}
																title={row.created_by}
															>
																{displayName}
															</span>
														)}
													</TableCell>
													<TableCell>
														<Badge
															variant={isUserCode ? "secondary" : "outline"}
															className="font-normal"
														>
															{referralTypeLabel(row.type)}
														</Badge>
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
													<TableCell className="text-right font-mono tabular-nums">
														{row.total_revenue.toLocaleString(undefined, {
															maximumFractionDigits: 2,
														})}
													</TableCell>
													<TableCell>
														{row.is_active ? (
															<Button
																type="button"
																variant="outline"
																size="sm"
																disabled={toggleCodeStatusState.isLoading}
																onClick={() => setDeactivateTarget(row)}
															>
																Deactivate
															</Button>
														) : (
															<Button
																type="button"
																variant="outline"
																size="sm"
																disabled={isActivating}
																onClick={() => void handleActivate(row.code)}
															>
																{isActivating ? (
																	<Loader2Icon
																		className="animate-spin"
																		aria-hidden
																	/>
																) : null}
																Activate
															</Button>
														)}
													</TableCell>
												</TableRow>
											);
										})
									)}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<AlertDialog
				open={deactivateTarget !== null}
				onOpenChange={(open) => {
					if (!open && !toggleCodeStatusState.isLoading) {
						setDeactivateTarget(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate referral code?</AlertDialogTitle>
						<AlertDialogDescription>
							{deactivateTarget
								? `“${deactivateTarget.code}” will stop accepting new signups. Existing referred users are not affected.`
								: null}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={toggleCodeStatusState.isLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={toggleCodeStatusState.isLoading}
							onClick={(e) => {
								e.preventDefault();
								void handleConfirmDeactivate();
							}}
						>
							{toggleCodeStatusState.isLoading ? (
								<Loader2Icon className="animate-spin" aria-hidden />
							) : null}
							{toggleCodeStatusState.isLoading ? "Deactivating…" : "Deactivate"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

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
							Create an admin referral code businesses and users can sign up
							with.
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

			{!embedded ? (
				<Dialog
					open={commissionEditOpen}
					onOpenChange={(open) => {
						if (open) {
							openCommissionEdit();
							return;
						}
						setCommissionEditOpen(false);
						setCommissionFormError("");
					}}
				>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Update commission rate</DialogTitle>
							<DialogDescription>
								Set the percentage of the subscription amount awarded to the
								referrer.
							</DialogDescription>
						</DialogHeader>

						<form
							onSubmit={handleUpdateCommission}
							className="flex flex-col gap-4"
						>
							{commissionFormError ? (
								<Alert variant="destructive">
									<AlertTitle>Could not update rate</AlertTitle>
									<AlertDescription>{commissionFormError}</AlertDescription>
								</Alert>
							) : null}

							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="commission-percent">
										Commission (%)
									</FieldLabel>
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
										For example, enter 10 for a 10% commission on each
										subscription.
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
			) : null}
		</div>
	);
}
