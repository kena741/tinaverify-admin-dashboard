"use client";

import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	SubscriptionOutput,
	SubscriptionPayResponse,
	SubscriptionPlanOutput,
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

export const subscriptionApi = createApi({
	reducerPath: "subscriptionApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["SubscriptionPlans", "CurrentSubscription"],
	endpoints: (builder) => ({
		/** `GET /api/v1/subscription-plans` */
		listSubscriptionPlans: builder.query<
			SubscriptionPlanOutput[],
			{ includeArchived?: boolean } | void
		>({
			query: (arg) => ({
				url: "/api/v1/subscription-plans",
				params: arg?.includeArchived ? { include_archived: true } : undefined,
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "SubscriptionPlans" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/subscriptions/current?business_id=...` */
		getCurrentSubscription: builder.query<
			SubscriptionOutput | null,
			{ businessId: string }
		>({
			query: ({ businessId }) => ({
				url: "/api/v1/subscriptions/current",
				params: { business_id: businessId },
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { businessId }) => [
				{ type: "CurrentSubscription" as const, id: businessId },
			],
		}),

		/**
		 * `POST /api/v1/subscriptions/pay?business_id=...`
		 * Body: `{ plan_id }`
		 */
		paySubscription: builder.mutation<
			SubscriptionPayResponse,
			{ businessId: string; planId: string }
		>({
			query: ({ businessId, planId }) => ({
				url: "/api/v1/subscriptions/pay",
				method: "POST",
				params: { business_id: businessId },
				body: { plan_id: planId },
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_result, _err, { businessId }) => [
				{ type: "CurrentSubscription" as const, id: businessId },
			],
		}),
	}),
});

export const {
	useListSubscriptionPlansQuery,
	useGetCurrentSubscriptionQuery,
	usePaySubscriptionMutation,
} = subscriptionApi;

