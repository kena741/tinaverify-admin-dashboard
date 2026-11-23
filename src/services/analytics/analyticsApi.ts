import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	AnalyticsSummaryOutput,
	CreditUsageOutput,
	PayingShareOutput,
	PaymentVolume30dOutput,
	UserAcquisitionOutput,
} from "../types";

function bearerHeaders(accessToken?: string | null) {
	const token =
		accessToken !== undefined &&
		accessToken !== null &&
		accessToken !== ""
			? accessToken
			: getStoredAccessToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

function dateRangeParams(arg?: {
	startDate?: string;
	endDate?: string;
} | null): Record<string, string> | undefined {
	if (!arg) return undefined;
	const params: Record<string, string> = {};
	if (arg.startDate) params.start_date = arg.startDate;
	if (arg.endDate) params.end_date = arg.endDate;
	return Object.keys(params).length > 0 ? params : undefined;
}

export type CreditUsageSortBy =
	| "business_name"
	| "credits_used"
	| "credits_limit"
	| "available_credits"
	| "usage_percentage";

export type CreditUsageSortDir = "asc" | "desc";

/** `GET /api/v1/analytics/credit-usage` query params. */
export type CreditUsageQueryParams = {
	limit?: number;
	business_name?: string | null;
	plan_id?: string | null;
	min_usage_percentage?: number | null;
	max_usage_percentage?: number | null;
	min_credits_used?: number | null;
	max_credits_used?: number | null;
	min_credits_limit?: number | null;
	max_credits_limit?: number | null;
	sort_by?: CreditUsageSortBy | null;
	sort_dir?: CreditUsageSortDir | null;
};

function creditUsageParams(
	arg?: CreditUsageQueryParams | null,
): Record<string, string | number> | undefined {
	if (!arg) return undefined;
	const params: Record<string, string | number> = {};
	if (arg.limit != null) {
		params.limit = Math.min(100, Math.max(1, arg.limit));
	}
	const businessName = arg.business_name?.trim();
	const planId = arg.plan_id?.trim();
	if (businessName) params.business_name = businessName;
	if (planId) params.plan_id = planId;
	if (
		arg.min_usage_percentage != null &&
		Number.isFinite(arg.min_usage_percentage)
	) {
		params.min_usage_percentage = arg.min_usage_percentage;
	}
	if (
		arg.max_usage_percentage != null &&
		Number.isFinite(arg.max_usage_percentage)
	) {
		params.max_usage_percentage = arg.max_usage_percentage;
	}
	if (arg.min_credits_used != null && Number.isFinite(arg.min_credits_used)) {
		params.min_credits_used = arg.min_credits_used;
	}
	if (arg.max_credits_used != null && Number.isFinite(arg.max_credits_used)) {
		params.max_credits_used = arg.max_credits_used;
	}
	if (arg.min_credits_limit != null && Number.isFinite(arg.min_credits_limit)) {
		params.min_credits_limit = arg.min_credits_limit;
	}
	if (arg.max_credits_limit != null && Number.isFinite(arg.max_credits_limit)) {
		params.max_credits_limit = arg.max_credits_limit;
	}
	if (arg.sort_by) params.sort_by = arg.sort_by;
	if (arg.sort_dir) params.sort_dir = arg.sort_dir;
	return Object.keys(params).length > 0 ? params : undefined;
}

export const analyticsApi = createApi({
	reducerPath: "analyticsApi",
	baseQuery: backendBaseQuery,
	tagTypes: [
		"AnalyticsSummary",
		"UserAcquisition",
		"PaymentVolume",
		"PayingShare",
		"CreditUsage",
	],
	endpoints: (builder) => ({
		/** `GET /api/v1/analytics/summary` — optional `start_date`, `end_date` (ISO). */
		getAnalyticsSummary: builder.query<
			AnalyticsSummaryOutput,
			{ startDate?: string; endDate?: string } | void
		>({
			query: (arg) => ({
				url: "/api/v1/analytics/summary",
				params: dateRangeParams(arg ?? undefined),
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "AnalyticsSummary" as const, id: "SUMMARY" }],
		}),

		/** `GET /api/v1/analytics/user-acquisition` — new signups for a range. */
		getUserAcquisition: builder.query<
			UserAcquisitionOutput,
			{ startDate?: string; endDate?: string } | void
		>({
			query: (arg) => ({
				url: "/api/v1/analytics/user-acquisition",
				params: dateRangeParams(arg ?? undefined),
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "UserAcquisition" as const, id: "SERIES" }],
		}),

		/** `GET /api/v1/analytics/payment-volume-30d` — 5-day buckets over ~30 days. */
		getPaymentVolume30d: builder.query<
			PaymentVolume30dOutput,
			{ startDate?: string; endDate?: string } | void
		>({
			query: (arg) => ({
				url: "/api/v1/analytics/payment-volume-30d",
				params: dateRangeParams(arg ?? undefined),
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "PaymentVolume" as const, id: "30D" }],
		}),

		/** `GET /api/v1/analytics/paying-share` — currently paying vs not. */
		getPayingShare: builder.query<PayingShareOutput, void>({
			query: () => ({
				url: "/api/v1/analytics/paying-share",
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "PayingShare" as const, id: "SHARE" }],
		}),

		/** `GET /api/v1/analytics/credit-usage` — top businesses by usage %. */
		getCreditUsage: builder.query<
			CreditUsageOutput,
			CreditUsageQueryParams | void
		>({
			query: (arg) => ({
				url: "/api/v1/analytics/credit-usage",
				params: creditUsageParams(arg ?? undefined),
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "CreditUsage" as const, id: "TOP" }],
		}),
	}),
});

export const {
	useGetAnalyticsSummaryQuery,
	useGetUserAcquisitionQuery,
	useGetPaymentVolume30dQuery,
	useGetPayingShareQuery,
	useGetCreditUsageQuery,
} = analyticsApi;
