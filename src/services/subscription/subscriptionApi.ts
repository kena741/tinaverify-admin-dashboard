import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	AdminGrantCreditsRequest,
	CustomCheckoutRequest,
	SubscriptionCheckoutResponse,
	SubscriptionOutput,
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
	tagTypes: ["Subscription", "SubscriptionHistory", "SubscriptionUsage"],
	endpoints: (builder) => ({
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

		/**
		 * `POST /api/v1/subscriptions/checkout/custom`
		 * Body: `{ amount?, credits? }` per `CustomCheckoutSchema`.
		 */
		checkoutSubscriptionCustom: builder.mutation<
			SubscriptionCheckoutResponse,
			{ businessId: string; body: CustomCheckoutRequest }
		>({
			query: ({ businessId, body }) => ({
				url: "/api/v1/subscriptions/checkout/custom",
				method: "POST",
				params: { business_id: businessId },
				body,
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

		/**
		 * `POST /api/v1/subscriptions/grant-credits`
		 * Body: `AdminGrantCreditsRequest` per `AdminGrantCreditsSchema`.
		 */
		grantSubscriptionCredits: builder.mutation<
			SubscriptionOutput,
			{ businessId: string; body: AdminGrantCreditsRequest }
		>({
			query: ({ businessId, body }) => ({
				url: "/api/v1/subscriptions/grant-credits",
				method: "POST",
				params: { business_id: businessId },
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_result, _err, { businessId }) => [
				{ type: "Subscription" as const, id: businessId },
				{ type: "SubscriptionUsage" as const, id: businessId },
			],
		}),
	}),
});

export const {
	useGetActiveSubscriptionQuery,
	useLazyGetActiveSubscriptionQuery,
	useListSubscriptionHistoryQuery,
	useGetSubscriptionUsageQuery,
	useLazyGetSubscriptionUsageQuery,
	useCheckoutSubscriptionMutation,
	useCheckoutSubscriptionCustomMutation,
	useGrantSubscriptionCreditsMutation,
} = subscriptionApi;
