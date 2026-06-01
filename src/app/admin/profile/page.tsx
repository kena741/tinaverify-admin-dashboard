"use client";

import Link from "next/link";
import { ShieldIcon, UserIcon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import {
	useGetMyBranchQuery,
	useListMyBusinessesQuery,
	useReadMeQuery,
} from "@/services/auth/authApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatUserDisplayName } from "@/lib/userDisplay";
import { useAuth } from "@/store/useAuth";

function getErrorMessage(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"data" in error &&
		(error as { data?: { detail?: unknown } }).data?.detail
	) {
		const detail = (error as { data: { detail: unknown } }).data.detail;
		if (typeof detail === "string") return detail;
	}
	if (error instanceof Error) return error.message;
	return fallback;
}

function DetailField({
	label,
	value,
	className,
}: {
	label: string;
	value: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`flex flex-col gap-1 ${className ?? ""}`}>
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="font-medium break-all">{value}</span>
		</div>
	);
}

export default function AdminProfilePage() {
	const { isSystemAdmin } = useAuth();
	const {
		data: user,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useReadMeQuery();

	const { data: businesses } = useListMyBusinessesQuery(undefined, {
		skip: isSystemAdmin(),
	});
	const { data: branch } = useGetMyBranchQuery(undefined, {
		skip: isSystemAdmin(),
	});

	if (isLoading) {
		return (
			<div className="flex flex-col gap-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (error || !user) {
		return (
			<div className="flex flex-col gap-6">
				<PageHeader title="My account" />
				<Alert variant="destructive">
					<AlertTitle>Failed to load profile</AlertTitle>
					<AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<span>{getErrorMessage(error, "Request failed.")}</span>
						<Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
							Try again
						</Button>
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const displayName = formatUserDisplayName(user);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="My account"
				description="Your admin profile and account details."
				actions={
					isFetching ? (
						<span className="text-sm text-muted-foreground">Refreshing…</span>
					) : null
				}
			/>

			<Card>
				<CardHeader className="flex flex-row items-start gap-4 space-y-0">
					<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
						{user.is_superuser ? (
							<ShieldIcon className="size-6" aria-hidden />
						) : (
							<UserIcon className="size-6" aria-hidden />
						)}
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<CardTitle className="text-xl">{displayName}</CardTitle>
							{user.is_superuser ? (
								<Badge variant="default">System admin</Badge>
							) : (
								<Badge variant="secondary">Branch staff</Badge>
							)}
							{user.is_active ? (
								<Badge variant="outline">Active</Badge>
							) : (
								<Badge variant="destructive">Inactive</Badge>
							)}
						</div>
						{user.role ? (
							<p className="text-sm text-muted-foreground">Role: {user.role}</p>
						) : null}
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<DetailField label="User ID" value={user.id} />
						<DetailField
							label="Phone number"
							value={
								<span className="tabular-nums">{user.phone_number}</span>
							}
						/>
						<DetailField label="Username" value={user.username ?? "—"} />
						<DetailField label="Email" value={user.email ?? "—"} />
						<DetailField
							label="First name"
							value={user.user_information?.first_name ?? "—"}
						/>
						<DetailField
							label="Last name"
							value={user.user_information?.last_name ?? "—"}
						/>
					</div>
				</CardContent>
			</Card>

			{!isSystemAdmin() && branch ? (
				<Card>
					<CardHeader>
						<CardTitle>Assigned branch</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 sm:grid-cols-2">
							<DetailField label="Branch" value={branch.name} />
							<DetailField label="Address" value={branch.address ?? "—"} />
							<DetailField
								label="Headquarters"
								value={branch.is_head_quarter ? "Yes" : "No"}
							/>
						</div>
					</CardContent>
				</Card>
			) : null}

			{!isSystemAdmin() && (businesses?.length ?? 0) > 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>My businesses</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>TIN</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{businesses!.map((b) => (
									<TableRow key={b.id}>
										<TableCell className="font-medium">{b.name}</TableCell>
										<TableCell className="tabular-nums">{b.tin_number}</TableCell>
										<TableCell>
											{b.is_active ? (
												<Badge variant="secondary">Active</Badge>
											) : (
												<Badge variant="outline">Inactive</Badge>
											)}
										</TableCell>
										<TableCell className="text-right">
											<Button
												type="button"
												variant="link"
												size="sm"
												className="h-auto p-0"
												render={<Link href={`/admin/business/${b.id}`} />}
											>
												View
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
