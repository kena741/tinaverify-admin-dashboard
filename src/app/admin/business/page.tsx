"use client";

import { useMemo, useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useListAllBusinessesQuery } from "../../../services/branch-management/branchManagementApi";
import type { BusinessOutput } from "../../../services/types";

type BusinessStatusFilter = "all" | "active" | "inactive" | "archived";

function businessMatchesFilter(business: BusinessOutput, filter: BusinessStatusFilter) {
	if (filter === "all") return true;
	if (filter === "archived") return business.is_archived;
	if (filter === "active") return business.is_active && !business.is_archived;
	return !business.is_active && !business.is_archived;
}

export default function BusinessesPage() {
	const { data, isLoading, isFetching, error, refetch } =
		useListAllBusinessesQuery();

	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<BusinessStatusFilter>("all");

	const filteredBusinesses = useMemo(() => {
		const businesses: BusinessOutput[] = data ?? [];
		const search = searchTerm.trim().toLowerCase();
		return businesses
			.filter((b: BusinessOutput) => businessMatchesFilter(b, statusFilter))
			.filter((b: BusinessOutput) =>
				search ? b.name.toLowerCase().includes(search) : true,
			);
	}, [data, searchTerm, statusFilter]);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">Businesses</h1>
				<p className="text-sm text-muted-foreground">
					List all businesses registered in the platform.
				</p>
			</div>

			<Card>
				<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle>All businesses</CardTitle>
					<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
						<Input
							aria-label="Search businesses by name"
							placeholder="Search by name…"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="sm:w-64"
						/>
						<Select
							value={statusFilter}
							onValueChange={(value) =>
								setStatusFilter(value as BusinessStatusFilter)
							}
						>
							<SelectTrigger aria-label="Filter businesses by status" className="sm:w-48">
								<SelectValue placeholder="Filter status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">Inactive</SelectItem>
								<SelectItem value="archived">Archived</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardHeader>

				<CardContent className="flex flex-col gap-4">
					{error ? (
						<Alert variant="destructive">
							<AlertTitle>Failed to load businesses</AlertTitle>
							<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<span className="wrap-break-word">
									{"status" in (error as object)
										? `Request failed.`
										: `Something went wrong.`}
								</span>
								<Button
									type="button"
									onClick={() => refetch()}
									variant="link"
									size="sm"
								>
									Try again
								</Button>
							</AlertDescription>
						</Alert>
					) : null}

					{isLoading ? (
						<div className="flex flex-col gap-3">
							<Skeleton className="h-6 w-48" />
							<Skeleton className="h-10 w-full" />
							<div className="flex flex-col gap-2">
								{Array.from({ length: 6 }).map((_, i) => (
									<Skeleton key={i} className="h-10 w-full" />
								))}
							</div>
						</div>
					) : (
						<>
							<div className="flex items-center justify-between">
								<p className="text-sm text-muted-foreground">
									{filteredBusinesses.length} result
									{filteredBusinesses.length === 1 ? "" : "s"}
									{isFetching ? " (updating…)" : ""}
								</p>
							</div>

							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>TIN</TableHead>
										<TableHead>Owner</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Archived</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredBusinesses.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5} className="py-10 text-center">
												<span className="text-sm text-muted-foreground">
													No businesses found.
												</span>
											</TableCell>
										</TableRow>
									) : (
										filteredBusinesses.map((b) => (
											<TableRow key={b.id}>
												<TableCell className="font-medium">{b.name}</TableCell>
												<TableCell className="text-muted-foreground">
													{b.tin_number}
												</TableCell>
												<TableCell className="text-muted-foreground">
													<span className="max-w-[18rem] truncate">{b.owner_id}</span>
												</TableCell>
												<TableCell>
													{b.is_active ? (
														<Badge variant="secondary">Active</Badge>
													) : (
														<Badge variant="outline">Inactive</Badge>
													)}
												</TableCell>
												<TableCell>
													{b.is_archived ? (
														<Badge variant="outline">Archived</Badge>
													) : (
														<span className="text-sm text-muted-foreground">—</span>
													)}
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

