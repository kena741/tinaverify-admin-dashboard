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
			{ limit?: number } | void
		>({
			query: (arg) => ({
				url: "/api/v1/analytics/credit-usage",
				params:
					arg?.limit != null
						? { limit: Math.min(100, Math.max(1, arg.limit)) }
						: undefined,
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
