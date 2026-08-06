import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	AnalyticsSummaryOutput,
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

export const analyticsApi = createApi({
	reducerPath: "analyticsApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["AnalyticsSummary", "UserAcquisition"],
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

		/** `GET /api/v1/analytics/user-acquisition` — new signups for a range. */
		getUserAcquisition: builder.query<
			UserAcquisitionOutput,
			{ startDate: string; endDate: string }
		>({
			query: ({ startDate, endDate }) => ({
				url: "/api/v1/analytics/user-acquisition",
				params: {
					start_date: startDate,
					end_date: endDate,
				},
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "UserAcquisition" as const, id: "SERIES" }],
		}),
	}),
});

export const {
	useGetAnalyticsSummaryQuery,
	useGetUserAcquisitionQuery,
} = analyticsApi;
