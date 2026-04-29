import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	SubscriptionCheckoutResponse,
	SubscriptionOutput,
	SubscriptionPlanOutput,
	UsageOutput,
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
	tagTypes: [
		"SubscriptionPlans",
		"Subscription",
		"SubscriptionHistory",
		"SubscriptionUsage",
	],
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

		/** `GET /api/v1/subscriptions/me` */
		getActiveSubscription: builder.query<
			SubscriptionOutput | null,
			{ businessId: string }
		>({
			query: ({ businessId }) => ({
				url: "/api/v1/subscriptions/me",
				params: { business_id: businessId },
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { businessId }) => [
				{ type: "Subscription" as const, id: businessId },
			],
		}),

		/** `GET /api/v1/subscriptions/history` */
		listSubscriptionHistory: builder.query<
			SubscriptionOutput[],
			{ businessId: string }
		>({
			query: ({ businessId }) => ({
				url: "/api/v1/subscriptions/history",
				params: { business_id: businessId },
				headers: bearerHeaders(),
			}),
			providesTags: (result, _err, { businessId }) =>
				result
					? [
							{ type: "SubscriptionHistory" as const, id: businessId },
							...result.map((s) => ({
								type: "SubscriptionHistory" as const,
								id: `${businessId}_${s.id}`,
							})),
						]
					: [{ type: "SubscriptionHistory" as const, id: businessId }],
		}),

		/** `GET /api/v1/subscriptions/usage` */
		getSubscriptionUsage: builder.query<UsageOutput, { businessId: string }>({
			query: ({ businessId }) => ({
				url: "/api/v1/subscriptions/usage",
				params: { business_id: businessId },
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { businessId }) => [
				{ type: "SubscriptionUsage" as const, id: businessId },
			],
		}),

		/**
		 * `POST /api/v1/subscriptions/checkout`
		 * Body: `{ plan_id }` per `SubscriptionCheckoutSchema`.
		 */
		checkoutSubscription: builder.mutation<
			SubscriptionCheckoutResponse,
			{ businessId: string; planId: string }
		>({
			query: ({ businessId, planId }) => ({
				url: "/api/v1/subscriptions/checkout",
				method: "POST",
				params: { business_id: businessId },
				body: { plan_id: planId },
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_result, _err, { businessId }) => [
				{ type: "Subscription" as const, id: businessId },
				{ type: "SubscriptionHistory" as const, id: businessId },
				{ type: "SubscriptionUsage" as const, id: businessId },
			],
		}),
	}),
});

export const {
	useListSubscriptionPlansQuery,
	useGetActiveSubscriptionQuery,
	useLazyGetActiveSubscriptionQuery,
	useListSubscriptionHistoryQuery,
	useGetSubscriptionUsageQuery,
	useLazyGetSubscriptionUsageQuery,
	useCheckoutSubscriptionMutation,
} = subscriptionApi;
