"use client";

import { useMemo } from "react";

import {
	type DashboardAnalyticsPreset,
	isoRangeForAnalyticsPreset,
	isoRangeFromLocalDates,
	parseAnalyticsCount,
	parseRevenueAmount,
} from "@/lib/analytics";
import { useGetAnalyticsSummaryQuery } from "@/services/analytics/analyticsApi";
import { useAuth } from "@/store/useAuth";

export type DashboardAnalyticsRange = {
	preset: DashboardAnalyticsPreset;
	customStart?: string;
	customEnd?: string;
};

export function useDashboardAnalytics(range: DashboardAnalyticsRange) {
	const { isSystemAdmin } = useAuth();
	const systemAdmin = isSystemAdmin();

	const { startDate, endDate, customRangeValid } = useMemo(() => {
		if (range.preset === "custom") {
			const custom = isoRangeFromLocalDates(
				range.customStart ?? "",
				range.customEnd ?? "",
			);
			if (custom) {
				return { ...custom, customRangeValid: true };
			}
			return {
				startDate: "",
				endDate: "",
				customRangeValid: false,
			};
		}
		const builtIn = isoRangeForAnalyticsPreset(range.preset);
		return { ...builtIn, customRangeValid: true };
	}, [range.preset, range.customStart, range.customEnd]);

	const {
		data: summary,
		isLoading,
		isFetching,
		error,
		refetch,
	} = useGetAnalyticsSummaryQuery(
		{ startDate, endDate },
		{ skip: !systemAdmin || !customRangeValid },
	);

	const periodRevenue = useMemo(
		() => parseRevenueAmount(summary?.revenue.custom),
		[summary],
	);

	const totalVerifiedAmount = useMemo(
		() => parseRevenueAmount(summary?.total_verified_amount),
		[summary],
	);

	const totalVerifiedTransactions = useMemo(
		() => parseAnalyticsCount(summary?.total_verified_transactions),
		[summary],
	);

	const totalFailedTransactions = useMemo(
		() => parseAnalyticsCount(summary?.total_failed_transactions),
		[summary],
	);

	const successRate = useMemo(() => {
		const total = totalVerifiedTransactions + totalFailedTransactions;
		if (total === 0) return 0;
		return Math.round((totalVerifiedTransactions / total) * 100);
	}, [totalVerifiedTransactions, totalFailedTransactions]);

	const errorMessage = useMemo(() => {
		if (!systemAdmin) {
			return "Platform analytics are available to system administrators only.";
		}
		if (range.preset === "custom" && !customRangeValid) {
			return "Choose a valid start and end date (start must be on or before end).";
		}
		if (!error) return null;
		if (
			typeof error === "object" &&
			error !== null &&
			"data" in error &&
			typeof (error as { data?: unknown }).data === "string"
		) {
			return (error as { data: string }).data;
		}
		if (
			typeof error === "object" &&
			error !== null &&
			"status" in error &&
			(error as { status: unknown }).status === 403
		) {
			return "You do not have permission to view platform analytics.";
		}
		return "Failed to load analytics.";
	}, [systemAdmin, range.preset, customRangeValid, error]);

	return {
		summary,
		periodRevenue,
		totalVerifiedAmount,
		totalVerifiedTransactions,
		totalFailedTransactions,
		successRate,
		isLoading: systemAdmin && customRangeValid && (isLoading || isFetching),
		error: errorMessage,
		refetch,
		isSystemAdmin: systemAdmin,
		customRangeValid,
		startDate,
		endDate,
	};
}
