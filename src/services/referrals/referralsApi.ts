"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	CampaignCreateRequest,
	CampaignOutput,
	CommissionRateOutput,
	CommissionRateUpdateRequest,
	ReferralListItem,
	ReferralPerformance,
	ReferralStatusToggleRequest,
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

const REFERRAL_CODES_PAGE_SIZE = 50;

export const referralsApi = createApi({
	reducerPath: "referralsApi",
	baseQuery: backendBaseQuery,
	tagTypes: [
		"ReferralCampaigns",
		"ReferralCodes",
		"ReferralPerformance",
		"ReferralCommissionRate",
	],
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
				{ type: "ReferralCodes", id: "LIST" },
				{ type: "ReferralPerformance", id: "LIST" },
			],
		}),

		/**
		 * `GET /api/v1/admin/referrals/codes`
		 * One page of referral codes (campaign + user codes).
		 */
		listReferralCodes: builder.query<
			ReferralListItem[],
			{ offset?: number; limit?: number } | void
		>({
			query: (arg) => {
				const offset = arg?.offset ?? 0;
				const limit = arg?.limit ?? REFERRAL_CODES_PAGE_SIZE;
				return {
					url: "/api/v1/admin/referrals/codes",
					params: { offset, limit },
					headers: bearerHeaders(),
				};
			},
			providesTags: (result) =>
				result
					? [
							{ type: "ReferralCodes" as const, id: "LIST" },
							...result.map((c) => ({
								type: "ReferralCodes" as const,
								id: c.code,
							})),
						]
					: [{ type: "ReferralCodes" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/admin/referrals/codes/{code}/performance` */
		getReferralCodePerformance: builder.query<
			ReferralPerformance,
			{ code: string }
		>({
			query: ({ code }) => ({
				url: `/api/v1/admin/referrals/codes/${encodeURIComponent(code)}/performance`,
				headers: bearerHeaders(),
			}),
			providesTags: (_r, _e, { code }) => [
				{ type: "ReferralPerformance" as const, id: code },
			],
		}),

		/**
		 * Loads every referral code page, then fetches per-code performance.
		 * Replaces removed `GET /api/v1/admin/referrals/performance`.
		 */
		listReferralPerformance: builder.query<ReferralPerformance[], void>({
			async queryFn(_arg, _api, _extraOptions, baseQuery) {
				const headers = bearerHeaders();
				const codes: ReferralListItem[] = [];
				let offset = 0;

				for (;;) {
					const pageRes = await baseQuery({
						url: "/api/v1/admin/referrals/codes",
						params: { offset, limit: REFERRAL_CODES_PAGE_SIZE },
						headers,
					});
					if (pageRes.error) {
						return { error: pageRes.error as FetchBaseQueryError };
					}
					const batch = Array.isArray(pageRes.data)
						? (pageRes.data as ReferralListItem[])
						: [];
					codes.push(...batch);
					if (batch.length < REFERRAL_CODES_PAGE_SIZE) break;
					offset += REFERRAL_CODES_PAGE_SIZE;
				}

				if (codes.length === 0) {
					return { data: [] };
				}

				const performanceResults = await Promise.all(
					codes.map((item) =>
						baseQuery({
							url: `/api/v1/admin/referrals/codes/${encodeURIComponent(item.code)}/performance`,
							headers,
						}),
					),
				);

				const rows: ReferralPerformance[] = [];
				for (const res of performanceResults) {
					if (res.error) {
						return { error: res.error as FetchBaseQueryError };
					}
					rows.push(res.data as ReferralPerformance);
				}

				return { data: rows };
			},
			providesTags: (result) =>
				result
					? [
							{ type: "ReferralPerformance" as const, id: "LIST" },
							...result.map((row) => ({
								type: "ReferralPerformance" as const,
								id: row.code,
							})),
						]
					: [{ type: "ReferralPerformance" as const, id: "LIST" }],
		}),

		/** `PATCH /api/v1/admin/referrals/codes/{code}/status` */
		toggleReferralCodeStatus: builder.mutation<
			void,
			{ code: string; body: ReferralStatusToggleRequest }
		>({
			query: ({ code, body }) => ({
				url: `/api/v1/admin/referrals/codes/${encodeURIComponent(code)}/status`,
				method: "PATCH",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_r, _e, { code }) => [
				{ type: "ReferralCodes", id: "LIST" },
				{ type: "ReferralCodes", id: code },
				{ type: "ReferralPerformance", id: "LIST" },
				{ type: "ReferralPerformance", id: code },
				{ type: "ReferralCampaigns", id: "LIST" },
			],
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
	useListReferralCodesQuery,
	useGetReferralCodePerformanceQuery,
	useListReferralPerformanceQuery,
	useToggleReferralCodeStatusMutation,
	useGetReferralCommissionRateQuery,
	useUpdateReferralCommissionRateMutation,
} = referralsApi;
