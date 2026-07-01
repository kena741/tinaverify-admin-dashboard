"use client";

import { useState } from "react";
import {
	BarChart3Icon,
	DownloadIcon,
	FileTextIcon,
	TrendingUpIcon,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { SectionHeading } from "@/components/admin/section-heading";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const revenueData = [
	{
		restaurant: "Addis Café",
		branch: "Bole Branch",
		revenue: 1250000,
		transactions: 2847,
		successRate: 98.5,
	},
	{
		restaurant: "Blue Nile Hotel",
		branch: "Main Branch",
		revenue: 980000,
		transactions: 2156,
		successRate: 97.2,
	},
	{
		restaurant: "Kaldi's Coffee",
		branch: "Meskel Square",
		revenue: 750000,
		transactions: 1892,
		successRate: 96.8,
	},
	{
		restaurant: "Habesha Group",
		branch: "Main Branch",
		revenue: 620000,
		transactions: 1456,
		successRate: 95.4,
	},
	{
		restaurant: "Tomoca",
		branch: "Piazza Branch",
		revenue: 450000,
		transactions: 1234,
		successRate: 94.1,
	},
];

const monthlyRevenue = [
	{ month: "Jan", revenue: 2100000 },
	{ month: "Feb", revenue: 2350000 },
	{ month: "Mar", revenue: 2800000 },
	{ month: "Apr", revenue: 3200000 },
	{ month: "May", revenue: 3500000 },
	{ month: "Jun", revenue: 3800000 },
];

export default function ReportsPage() {
	const [dateRange, setDateRange] = useState("month");
	const [restaurantFilter, setRestaurantFilter] = useState("all");
	const [branchFilter, setBranchFilter] = useState("all");

	const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
	const totalTransactions = revenueData.reduce(
		(sum, item) => sum + item.transactions,
		0,
	);
	const avgSuccessRate =
		revenueData.reduce((sum, item) => sum + item.successRate, 0) /
		revenueData.length;

	const maxMonthlyRevenue = Math.max(...monthlyRevenue.map((d) => d.revenue));

	const exportReport = (format: string) => {
		console.log(`Exporting report as ${format}`);
		alert(`Exporting report as ${format}...`);
	};

	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title="Reports & analytics"
				description="Detailed reports and analytics for payment receipt verification."
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => exportReport("CSV")}
						>
							<DownloadIcon data-icon="inline-start" aria-hidden />
							Export CSV
						</Button>
						<Button type="button" size="sm" onClick={() => exportReport("PDF")}>
							<FileTextIcon data-icon="inline-start" aria-hidden />
							Export PDF
						</Button>
					</div>
				}
			/>

			<Card className="shadow-sm">
				<CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
					<Select
						value={dateRange}
						onValueChange={(v) => v && setDateRange(v)}
					>
						<SelectTrigger className="h-10 w-full bg-background">
							<span className="truncate text-left">
								{dateRange === "week"
									? "This week"
									: dateRange === "month"
										? "This month"
										: dateRange === "quarter"
											? "This quarter"
											: dateRange === "year"
												? "This year"
												: "Custom range"}
							</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="week">This week</SelectItem>
							<SelectItem value="month">This month</SelectItem>
							<SelectItem value="quarter">This quarter</SelectItem>
							<SelectItem value="year">This year</SelectItem>
							<SelectItem value="custom">Custom range</SelectItem>
						</SelectContent>
					</Select>
					<Select
						value={restaurantFilter}
						onValueChange={(v) => v && setRestaurantFilter(v)}
					>
						<SelectTrigger className="h-10 w-full bg-background">
							<span className="truncate text-left">
								{restaurantFilter === "all" ? "All businesses" : restaurantFilter}
							</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All businesses</SelectItem>
							<SelectItem value="addis">Addis Café</SelectItem>
							<SelectItem value="bluenile">Blue Nile Hotel</SelectItem>
							<SelectItem value="kaldi">Kaldi's Coffee</SelectItem>
							<SelectItem value="habesha">Habesha Group</SelectItem>
							<SelectItem value="tomoca">Tomoca</SelectItem>
						</SelectContent>
					</Select>
					<Select
						value={branchFilter}
						onValueChange={(v) => v && setBranchFilter(v)}
					>
						<SelectTrigger className="h-10 w-full bg-background">
							<span className="truncate text-left">
								{branchFilter === "all" ? "All branches" : branchFilter}
							</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All branches</SelectItem>
							<SelectItem value="bole">Bole Branch</SelectItem>
							<SelectItem value="meskel">Meskel Square</SelectItem>
							<SelectItem value="piazza">Piazza Branch</SelectItem>
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard
					label="Total revenue"
					value={`ETB ${totalRevenue.toLocaleString()}`}
					icon={TrendingUpIcon}
					hint="+12% from last period"
				/>
				<StatCard
					label="Total transactions"
					value={totalTransactions.toLocaleString()}
					icon={BarChart3Icon}
					hint="+8% from last period"
				/>
				<StatCard
					label="Avg. success rate"
					value={`${avgSuccessRate.toFixed(1)}%`}
					icon={BarChart3Icon}
					hint="+0.5% from last period"
				/>
			</div>

			<Card className="shadow-sm">
				<CardHeader>
					<SectionHeading title="Revenue by business / branch" />
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					{revenueData.map((item) => (
						<div key={`${item.restaurant}-${item.branch}`}>
							<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
								<div className="text-sm">
									<span className="font-medium text-foreground">
										{item.restaurant}
									</span>
									<span className="text-muted-foreground"> — {item.branch}</span>
								</div>
								<div className="text-right text-sm">
									<span className="font-semibold tabular-nums">
										ETB {item.revenue.toLocaleString()}
									</span>
									<span className="ml-2 text-xs text-muted-foreground">
										({item.transactions.toLocaleString()} transactions)
									</span>
								</div>
							</div>
							<div className="h-2.5 overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-primary transition-all"
									style={{ width: `${(item.revenue / totalRevenue) * 100}%` }}
								/>
							</div>
						</div>
					))}
				</CardContent>
			</Card>

			<Card className="shadow-sm">
				<CardHeader>
					<SectionHeading title="Monthly revenue trend" />
				</CardHeader>
				<CardContent>
					<div className="flex h-64 items-end justify-between gap-2">
						{monthlyRevenue.map((item) => (
							<div
								key={item.month}
								className="flex flex-1 flex-col items-center gap-2"
							>
								<div className="flex h-full w-full items-end">
									<div
										className="w-full rounded-t-md bg-primary/80 transition-colors hover:bg-primary"
										style={{
											height: `${(item.revenue / maxMonthlyRevenue) * 100}%`,
										}}
										title={`${item.month}: ETB ${item.revenue.toLocaleString()}`}
									/>
								</div>
								<span className="text-xs text-muted-foreground">{item.month}</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card className="shadow-sm">
				<CardHeader>
					<SectionHeading title="Payment success rate by branch" />
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					{revenueData.map((item) => (
						<div key={`success-${item.restaurant}-${item.branch}`}>
							<div className="mb-2 flex items-center justify-between gap-2 text-sm">
								<span className="font-medium text-foreground">
									{item.restaurant} — {item.branch}
								</span>
								<span className="font-semibold tabular-nums">
									{item.successRate}%
								</span>
							</div>
							<div className="h-2.5 overflow-hidden rounded-full bg-muted">
								<div
									className={cn(
										"h-full rounded-full transition-all",
										item.successRate >= 97
											? "bg-primary"
											: item.successRate >= 95
												? "bg-chart-3"
												: "bg-destructive",
									)}
									style={{ width: `${item.successRate}%` }}
								/>
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
