import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type { AnalyticsSummaryOutput } from "../types";

function bearerHeaders(accessToken?: string | null) {
	const token =
		accessToken !== undefined &&
		accessToken !== null &&
		accessToken !== ""
			? accessToken
			: getStoredAccessToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export const analyticsApi = createApi({
	reducerPath: "analyticsApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["AnalyticsSummary"],
	endpoints: (builder) => ({
		/** `GET /api/v1/analytics/summary` — optional `start_date`, `end_date` (ISO). */
		getAnalyticsSummary: builder.query<
			AnalyticsSummaryOutput,
			{ startDate?: string; endDate?: string } | void
		>({
			query: (arg) => {
				const params: Record<string, string> = {};
				if (arg?.startDate) params.start_date = arg.startDate;
				if (arg?.endDate) params.end_date = arg.endDate;
				return {
					url: "/api/v1/analytics/summary",
					params: Object.keys(params).length > 0 ? params : undefined,
					headers: bearerHeaders(),
				};
			},
			providesTags: [{ type: "AnalyticsSummary" as const, id: "SUMMARY" }],
		}),
	}),
});

export const { useGetAnalyticsSummaryQuery } = analyticsApi;
