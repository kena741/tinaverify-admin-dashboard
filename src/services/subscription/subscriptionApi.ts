import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	AdminGrantCreditsRequest,
	AdminSubscriptionOutput,
	CustomCheckoutRequest,
	SubscriptionCheckoutResponse,
	SubscriptionOutput,
	SubscriptionStatus,
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
		"Subscription",
		"SubscriptionHistory",
		"SubscriptionUsage",
		"SubscriptionTransactions",
	],
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

		/** `GET /api/v1/subscriptions/transactions` — admin subscription history */
		listAdminSubscriptionTransactions: builder.query<
			AdminSubscriptionOutput[],
			{
				businessId?: string | null;
				planId?: string | null;
				status?: SubscriptionStatus | null;
			} | void
		>({
			query: (arg) => {
				const params: Record<string, string> = {};
				if (arg?.businessId) params.business_id = arg.businessId;
				if (arg?.planId) params.plan_id = arg.planId;
				if (arg?.status) params.status = arg.status;
				return {
					url: "/api/v1/subscriptions/transactions",
					params: Object.keys(params).length > 0 ? params : undefined,
					headers: bearerHeaders(),
				};
			},
			serializeQueryArgs: ({ endpointName, queryArgs }) => {
				const arg = queryArgs ?? {};
				const businessId =
					"businessId" in arg ? arg.businessId : undefined;
				const planId = "planId" in arg ? arg.planId : undefined;
				const status = "status" in arg ? arg.status : undefined;
				const hasFilter =
					Boolean(businessId) || Boolean(planId) || Boolean(status);
				if (!hasFilter) return `${endpointName}(global)`;
				return `${endpointName}(${businessId ?? ""}|${planId ?? ""}|${status ?? ""})`;
			},
			providesTags: [{ type: "SubscriptionTransactions" as const, id: "LIST" }],
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
	useListAdminSubscriptionTransactionsQuery,
	useListSubscriptionHistoryQuery,
	useGetSubscriptionUsageQuery,
	useLazyGetSubscriptionUsageQuery,
	useCheckoutSubscriptionMutation,
	useCheckoutSubscriptionCustomMutation,
	useGrantSubscriptionCreditsMutation,
} = subscriptionApi;
