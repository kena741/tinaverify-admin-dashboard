"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
	CheckCheckIcon,
	Clock3Icon,
	CreditCardIcon,
	ImageIcon,
	XIcon,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useGetUserByIdQuery } from "@/services/auth/authApi";
import {
	useAdminApproveManualSubscriptionMutation,
	useAdminRejectManualSubscriptionMutation,
	useListAdminManualSubscriptionsQuery,
} from "@/services/admin/adminApi";
import { useGetBusinessQuery } from "@/services/branch-management/branchManagementApi";
import { useListSubscriptionPlansQuery } from "@/services/subscription-plan/subscriptionPlanApi";
import type { ManualSubscriptionResponse } from "@/services/types";

function getErrorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"data" in error &&
		(error as { data?: { detail?: unknown; message?: unknown } }).data
	) {
		const data = (error as { data: { detail?: unknown; message?: unknown } })
			.data;
		if (typeof data.detail === "string") return data.detail;
		if (typeof data.message === "string") return data.message;
	}
	if (error instanceof Error) return error.message;
	return fallback;
}

function formatDate(value?: string | null) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString();
}

function ManualSubscriptionRequestCard({
	request,
	planName,
	approving,
	declining,
	onApprove,
	onDecline,
}: {
	request: ManualSubscriptionResponse;
	planName: string;
	approving: boolean;
	declining: boolean;
	onApprove: (requestId: string) => Promise<void>;
	onDecline: (requestId: string) => Promise<void>;
}) {
	const { data: business } = useGetBusinessQuery(
		{ businessId: request.business_id },
		{ skip: !request.business_id },
	);
	const { data: owner } = useGetUserByIdQuery(
		{ userId: business?.owner_id ?? "" },
		{ skip: !business?.owner_id },
	);

	const ownerName = owner?.user_information
		? `${owner.user_information.first_name ?? ""} ${owner.user_information.last_name ?? ""}`.trim() ||
			owner.username ||
			owner.phone_number
		: owner?.username || owner?.phone_number || "Unknown owner";

	const ownerEmail = owner?.email ?? "No email";
	const ownerPhone = owner?.phone_number ?? "No phone";

	return (
		<Card className="overflow-hidden border-border/80">
			<CardHeader className="border-b border-border/80 bg-muted/30">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div>
						<CardTitle className="text-lg">
							{business?.name ?? "Business"}
						</CardTitle>
						<CardDescription>Request #{request.id.slice(0, 8)}</CardDescription>
					</div>
					<Badge variant="secondary" className="w-fit">
						{request.status}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="grid gap-5 p-5">
				<div className="grid gap-5 lg:grid-cols-2">
					<div className="rounded-lg border border-border bg-background p-4">
						<div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
							<Clock3Icon className="size-4" aria-hidden />
							Owner information
						</div>
						<div className="space-y-2 text-sm">
							<p>
								<span className="font-medium text-foreground">Business:</span>{" "}
								{business?.name ?? "—"}
							</p>
							<p>
								<span className="font-medium text-foreground">Owner:</span>{" "}
								{ownerName}
							</p>
							<p>
								<span className="font-medium text-foreground">Email:</span>{" "}
								{ownerEmail}
							</p>
							<p>
								<span className="font-medium text-foreground">Phone:</span>{" "}
								{ownerPhone}
							</p>
						</div>
					</div>

					<div className="rounded-lg border border-border bg-background p-4">
						<div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
							<CreditCardIcon className="size-4" aria-hidden />
							Receiver account information
						</div>
						<div className="space-y-2 text-sm">
							<p>
								<span className="font-medium text-foreground">Bank:</span>{" "}
								{request.bank_name || "—"}
							</p>
							<p>
								<span className="font-medium text-foreground">Account:</span>{" "}
								{request.receiver_account_number || "—"}
							</p>
						</div>
					</div>
				</div>

				<div className="rounded-lg border border-border bg-background p-4">
					<div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Clock3Icon className="size-4" aria-hidden />
						Request information
					</div>
					<div className="grid gap-3 md:grid-cols-2 text-sm">
						<p>
							<span className="font-medium text-foreground">Plan:</span>{" "}
							{planName}
						</p>
						<p>
							<span className="font-medium text-foreground">Submitted:</span>{" "}
							{formatDate(request.created_at)}
						</p>
						<p className="md:col-span-2">
							<span className="font-medium text-foreground">Description:</span>{" "}
							{request.description || "No additional description provided."}
						</p>
					</div>
				</div>

				<div className="rounded-lg border border-border bg-background p-4">
					<div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<ImageIcon className="size-4" aria-hidden />
						Receipt proof
					</div>
					{request.file_receipt_url ? (
						<a
							href={request.file_receipt_url}
							target="_blank"
							rel="noreferrer"
							className="block overflow-hidden rounded-md border border-border"
						>
							<Image
								src={request.file_receipt_url}
								alt="Manual subscription receipt"
								width={1200}
								height={800}
								unoptimized
								className="h-72 w-full object-contain bg-muted/30"
							/>
						</a>
					) : (
						<p className="text-sm text-muted-foreground">
							No receipt attached.
						</p>
					)}
				</div>

				<div className="flex flex-wrap gap-3 pt-2">
					<Button
						type="button"
						onClick={() => void onApprove(request.id)}
						disabled={approving || declining}
					>
						<CheckCheckIcon className="size-4" aria-hidden />
						{approving ? "Approving…" : "Approve"}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => void onDecline(request.id)}
						disabled={approving || declining}
						className="border-destructive text-destructive hover:bg-destructive/10"
					>
						<XIcon className="size-4" aria-hidden />
						{declining ? "Declining…" : "Decline"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

export default function ManualSubscriptionRequestsPage() {
	const [banner, setBanner] = useState<{
		variant: "default" | "destructive";
		message: string;
	} | null>(null);
	const [statusFilter, setStatusFilter] = useState<
		"pending" | "approved" | "rejected"
	>("pending");
	const [approveRequest, approveState] =
		useAdminApproveManualSubscriptionMutation();
	const [rejectRequest, rejectState] =
		useAdminRejectManualSubscriptionMutation();

	const {
		data: paginatedRequests,
		isLoading,
		isError,
		error,
		refetch,
	} = useListAdminManualSubscriptionsQuery({ reqStatus: statusFilter });
	const requests = paginatedRequests?.items ?? [];
	const { data: plans = [] } = useListSubscriptionPlansQuery();

	const planMap = useMemo(
		() =>
			Object.fromEntries(plans.map((plan) => [plan.id, plan.name])) as Record<
				string,
				string
			>,
		[plans],
	);

	const handleApprove = async (requestId: string) => {
		try {
			await approveRequest({ requestId }).unwrap();
			setBanner({
				variant: "default",
				message: "Manual subscription request approved.",
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				message: getErrorMessage(err, "Could not approve this request."),
			});
		}
	};

	const handleDecline = async (requestId: string) => {
		try {
			await rejectRequest({ requestId }).unwrap();
			setBanner({
				variant: "default",
				message: "Manual subscription request declined.",
			});
		} catch (err) {
			setBanner({
				variant: "destructive",
				message: getErrorMessage(err, "Could not decline this request."),
			});
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Manual Subscrption Requests"
				description="Review pending manual subscription requests, confirm the receiver account, and approve or decline each one."
			/>

			<div className="flex justify-end">
				<Select
					value={statusFilter}
					onValueChange={(value) =>
						setStatusFilter(value as "pending" | "approved" | "rejected")
					}
				>
					<SelectTrigger className="w-52">
						<SelectValue placeholder="Select status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="pending">Pending</SelectItem>
						<SelectItem value="approved">Approved</SelectItem>
						<SelectItem value="rejected">Rejected</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{banner ? (
				<Alert
					variant={banner.variant === "destructive" ? "destructive" : "default"}
				>
					<AlertTitle>
						{banner.variant === "destructive"
							? "Request update failed"
							: "Request updated"}
					</AlertTitle>
					<AlertDescription>{banner.message}</AlertDescription>
				</Alert>
			) : null}

			{isError ? (
				<Alert variant="destructive">
					<AlertTitle>Could not load pending requests</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(error, "Request failed.")}</span>
						<button
							type="button"
							className="text-sm font-medium underline"
							onClick={() => void refetch()}
						>
							Try again
						</button>
					</AlertDescription>
				</Alert>
			) : null}

			{isLoading ? (
				<div className="flex flex-col gap-4">
					<div className="h-40 animate-pulse rounded-xl bg-muted" />
					<div className="h-40 animate-pulse rounded-xl bg-muted" />
				</div>
			) : requests.length === 0 ? (
				<Card>
					<CardContent className="p-6">
						<p className="text-sm text-muted-foreground">
							There are no pending manual subscription requests right now.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="flex flex-col gap-4">
					{requests.map((request) => (
						<ManualSubscriptionRequestCard
							key={request.id}
							request={request}
							planName={planMap[request.plan_id] ?? request.plan_id}
							approving={
								approveState.isLoading &&
								approveState.originalArgs?.requestId === request.id
							}
							declining={
								rejectState.isLoading &&
								rejectState.originalArgs?.requestId === request.id
							}
							onApprove={handleApprove}
							onDecline={handleDecline}
						/>
					))}
				</div>
			)}
		</div>
	);
}
