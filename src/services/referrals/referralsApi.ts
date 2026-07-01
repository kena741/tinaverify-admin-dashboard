"use client";

import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	CampaignCreateRequest,
	CampaignOutput,
	CommissionRateOutput,
	CommissionRateUpdateRequest,
	ReferralPerformance,
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

export const referralsApi = createApi({
	reducerPath: "referralsApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["ReferralCampaigns", "ReferralPerformance", "ReferralCommissionRate"],
	endpoints: (builder) => ({
		/** `GET /api/v1/admin/referrals/campaigns` */
		listReferralCampaigns: builder.query<CampaignOutput[], void>({
			query: () => ({
				url: "/api/v1/admin/referrals/campaigns",
				headers: bearerHeaders(),
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "ReferralCampaigns" as const, id: "LIST" },
							...result.map((c) => ({
								type: "ReferralCampaigns" as const,
								id: c.code,
							})),
						]
					: [{ type: "ReferralCampaigns" as const, id: "LIST" }],
		}),

		/** `POST /api/v1/admin/referrals/campaigns` */
		createReferralCampaign: builder.mutation<
			CampaignOutput,
			{ body: CampaignCreateRequest }
		>({
			query: ({ body }) => ({
				url: "/api/v1/admin/referrals/campaigns",
				method: "POST",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: [
				{ type: "ReferralCampaigns", id: "LIST" },
				{ type: "ReferralPerformance", id: "LIST" },
			],
		}),

		/** `GET /api/v1/admin/referrals/performance` */
		getReferralPerformance: builder.query<ReferralPerformance[], void>({
			query: () => ({
				url: "/api/v1/admin/referrals/performance",
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "ReferralPerformance" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/admin/referrals/commission-rate` */
		getReferralCommissionRate: builder.query<CommissionRateOutput, void>({
			query: () => ({
				url: "/api/v1/admin/referrals/commission-rate",
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "ReferralCommissionRate" as const, id: "CURRENT" }],
		}),

		/** `PUT /api/v1/admin/referrals/commission-rate` */
		updateReferralCommissionRate: builder.mutation<
			CommissionRateOutput,
			{ body: CommissionRateUpdateRequest }
		>({
			query: ({ body }) => ({
				url: "/api/v1/admin/referrals/commission-rate",
				method: "PUT",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: [{ type: "ReferralCommissionRate", id: "CURRENT" }],
		}),
	}),
});

export const {
	useListReferralCampaignsQuery,
	useCreateReferralCampaignMutation,
	useGetReferralPerformanceQuery,
	useGetReferralCommissionRateQuery,
	useUpdateReferralCommissionRateMutation,
} = referralsApi;
