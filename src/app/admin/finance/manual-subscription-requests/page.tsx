"use client";

import { useMemo, useState } from "react";
import {
	CheckCheckIcon,
	ExternalLinkIcon,
	Loader2Icon,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useGetUserByIdQuery } from "@/services/auth/authApi";
import {
	useAdminApproveManualSubscriptionMutation,
	useAdminRejectManualSubscriptionMutation,
	useListAdminManualSubscriptionsQuery,
} from "@/services/admin/adminApi";
import { useGetBusinessQuery } from "@/services/branch-management/branchManagementApi";
import { useListSubscriptionPlansQuery } from "@/services/subscription-plan/subscriptionPlanApi";
import type {
	ManualSubscriptionResponse,
	ManualSubscriptionStatus,
} from "@/services/types";

const PAGE_SIZE = 20;

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
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

function manualSubscriptionStatusVariant(
	status: string,
): "default" | "secondary" | "destructive" | "outline" {
	if (status === "pending") return "secondary";
	if (status === "approved") return "default";
	if (status === "rejected") return "destructive";
	return "outline";
}

function ManualSubscriptionRequestRow({
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
		<TableRow>
			<TableCell className="min-w-52">
				<p className="max-w-64 truncate font-medium">
					{business?.name ?? "Business"}
				</p>
				<p className="max-w-64 truncate text-xs text-muted-foreground">
					{ownerName}
				</p>
				<p className="max-w-64 truncate text-xs text-muted-foreground">
					{ownerEmail} 
				</p>
				<p className="max-w-64 truncate text-xs text-muted-foreground">
					{ownerPhone}
				</p>
			</TableCell>
			<TableCell className="min-w-36">
				<p className="font-medium">{planName}</p>
				{request.description ? (
					<p className="max-w-56 truncate text-xs text-muted-foreground">
						{request.description}
					</p>
				) : null}
			</TableCell>
			<TableCell className="min-w-44">
				<p className="font-medium">{request.bank_name || "—"}</p>
				<p className="font-mono text-xs text-muted-foreground">
					{request.receiver_account_number || "—"}
				</p>
			</TableCell>
			<TableCell className="min-w-40 whitespace-nowrap text-sm text-muted-foreground">
				{formatDate(request.created_at)}
			</TableCell>
			<TableCell>
				{request.file_receipt_url ? (
					<a
						href={request.file_receipt_url}
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
					>
						<ExternalLinkIcon data-icon="inline-end" aria-hidden="true" />
						View
					</a>
				) : (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
			<TableCell>
				<Badge
					variant={manualSubscriptionStatusVariant(request.status)}
					className="capitalize"
				>
					{request.status}
				</Badge>
			</TableCell>
			<TableCell className="text-right">
				{request.status === "pending" ? (
					<div className="flex items-center justify-end gap-1">
						<Button
							type="button"
							size="sm"
							onClick={() => void onApprove(request.id)}
							disabled={approving || declining}
						>
							{approving ? (
								<Loader2Icon
									data-icon="inline-start"
									className="animate-spin"
									aria-hidden="true"
								/>
							) : (
								<CheckCheckIcon data-icon="inline-start" aria-hidden="true" />
							)}
							{approving ? "Approving…" : "Approve"}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => void onDecline(request.id)}
							disabled={approving || declining}
							className="text-destructive hover:bg-destructive/10 hover:text-destructive"
						>
							{declining ? (
								<Loader2Icon
									data-icon="inline-start"
									className="animate-spin"
									aria-hidden="true"
								/>
							) : (
								<XIcon data-icon="inline-start" aria-hidden="true" />
							)}
							{declining ? "Declining…" : "Reject"}
						</Button>
					</div>
				) : (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
		</TableRow>
	);
}

export default function ManualSubscriptionRequestsPage() {
	const [banner, setBanner] = useState<{
		variant: "default" | "destructive";
		message: string;
	} | null>(null);
	const [statusFilter, setStatusFilter] = useState<
		ManualSubscriptionStatus
	>("pending");
	const [offset, setOffset] = useState(0);
	const [approveRequest, approveState] =
		useAdminApproveManualSubscriptionMutation();
	const [rejectRequest, rejectState] =
		useAdminRejectManualSubscriptionMutation();

	const {
		currentData: paginatedRequests,
		isLoading,
		isFetching,
		isError,
		error,
		refetch,
	} = useListAdminManualSubscriptionsQuery({
		reqStatus: statusFilter,
		limit: PAGE_SIZE,
		offset,
	});
	const requests = paginatedRequests?.items ?? [];
	const totalCount = paginatedRequests?.total_count ?? 0;
	const page = Math.floor(offset / PAGE_SIZE) + 1;
	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
	const canPreviousPage = offset > 0;
	const canNextPage = offset + requests.length < totalCount;
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
				title="Manual Subscription Requests"
				description="Review payment details and receipts, then approve or reject pending requests."
			/>

			{banner ? (
				<Alert
					variant={banner.variant === "destructive" ? "destructive" : "default"}
					aria-live="polite"
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
					<AlertTitle>Could not load subscription requests</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(error, "Request failed.")}</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void refetch()}
						>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			) : null}

			<Card>
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-1">
						<CardTitle>Requests</CardTitle>
						<CardDescription>
							{totalCount.toLocaleString()}{" "}
							{totalCount === 1 ? "request" : "requests"}
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Status</span>
						<Select
							value={statusFilter}
							onValueChange={(value) => {
								if (!value) return;
								setStatusFilter(value as ManualSubscriptionStatus);
								setOffset(0);
							}}
						>
							<SelectTrigger className="w-36" aria-label="Filter by status">
								<SelectValue placeholder="Select status" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="approved">Approved</SelectItem>
									<SelectItem value="rejected">Rejected</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				</CardHeader>
				<CardContent className="px-0">
					<div className="overflow-x-auto">
						<Table aria-label="Manual subscription requests">
							<TableHeader>
								<TableRow>
									<TableHead>Business / owner</TableHead>
									<TableHead>Plan</TableHead>
									<TableHead>Receiver account</TableHead>
									<TableHead>Submitted</TableHead>
									<TableHead>Receipt</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading ? (
									Array.from({ length: 5 }, (_, index) => (
										<TableRow key={index}>
											{Array.from({ length: 7 }, (_, cellIndex) => (
												<TableCell key={cellIndex}>
													<Skeleton className="h-4 w-24" />
												</TableCell>
											))}
										</TableRow>
									))
								) : requests.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={7}
											className="py-12 text-center text-sm text-muted-foreground"
										>
											{isError
												? "Requests are unavailable. Try loading them again."
												: `No ${statusFilter} subscription requests found.`}
										</TableCell>
									</TableRow>
								) : (
									requests.map((request) => (
										<ManualSubscriptionRequestRow
											key={request.id}
											request={request}
											planName={planMap[request.plan_id] ?? "Custom"}
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
									))
								)}
							</TableBody>
						</Table>
					</div>
					<div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground" aria-live="polite">
							{totalCount === 0
								? "Showing 0 requests"
								: `Showing ${offset + 1}–${Math.min(offset + requests.length, totalCount)} of ${totalCount}`}
							{isFetching && !isLoading ? " · Refreshing…" : ""}
						</p>
						<div className="flex items-center gap-2">
							<span className="mr-1 text-sm text-muted-foreground">
								Page {page} of {totalPages}
							</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!canPreviousPage || isFetching}
								onClick={() =>
									setOffset((current) => Math.max(0, current - PAGE_SIZE))
								}
							>
								Previous
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!canNextPage || isFetching}
								onClick={() => setOffset((current) => current + PAGE_SIZE)}
							>
								Next
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
