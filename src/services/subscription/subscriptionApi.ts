import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	AdminGrantCreditsRequest,
	AdminSubscriptionOutput,
	CustomCheckoutRequest,
	ExchangeRateOutput,
	ExchangeRateUpdateRequest,
	SubscriptionCheckoutResponse,
	SubscriptionOutput,
	SubscriptionStatus,
	TransactionLogOutput,
	TransactionLogStatus,
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
		"SubscriptionUsage",
		"SubscriptionTransactions",
		"ExchangeRate",
		"TransactionLogs",
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
			transformResponse: (response: unknown) => {
				if (Array.isArray(response)) {
					return response as AdminSubscriptionOutput[];
				}
				if (
					typeof response === "object" &&
					response !== null &&
					"items" in response &&
					Array.isArray((response as { items: unknown }).items)
				) {
					return (response as { items: AdminSubscriptionOutput[] }).items;
				}
				return [];
			},
			providesTags: [{ type: "SubscriptionTransactions" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/subscriptions/usage` — 404 when no active subscription → null */
		getSubscriptionUsage: builder.query<UsageOutput | null, { businessId: string }>({
			async queryFn({ businessId }, _api, _extra, baseQuery) {
				const result = await baseQuery({
					url: "/api/v1/subscriptions/usage",
					params: { business_id: businessId },
					headers: bearerHeaders(),
				});
				if (result.error) {
					const status =
						typeof result.error === "object" &&
						result.error !== null &&
						"status" in result.error
							? (result.error as { status: unknown }).status
							: undefined;
					if (status === 404) return { data: null };
					return { error: result.error };
				}
				return { data: result.data as UsageOutput };
			},
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
				{ type: "SubscriptionUsage" as const, id: businessId },
				{ type: "SubscriptionTransactions" as const, id: "LIST" },
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
				{ type: "SubscriptionUsage" as const, id: businessId },
				{ type: "SubscriptionTransactions" as const, id: "LIST" },
			],
		}),

		/**
		 * `POST /api/v1/subscriptions/grant-credits`
		 * Multipart: `credits`, `file`.
		 */
		grantSubscriptionCredits: builder.mutation<
			SubscriptionOutput,
			{ businessId: string; body: AdminGrantCreditsRequest }
		>({
			query: ({ businessId, body }) => {
				const formData = new FormData();
				formData.append("credits", String(body.credits));
				if (body.file) {
					formData.append("file", body.file);
				}
				return {
					url: "/api/v1/subscriptions/grant-credits",
					method: "POST",
					params: { business_id: businessId },
					body: formData,
					headers: bearerHeaders(),
				};
			},
			invalidatesTags: (_result, _err, { businessId }) => [
				{ type: "Subscription" as const, id: businessId },
				{ type: "SubscriptionUsage" as const, id: businessId },
				{ type: "SubscriptionTransactions" as const, id: "LIST" },
				{ type: "TransactionLogs" as const, id: "LIST" },
			],
		}),

		/** `GET /api/v1/subscriptions/exchange-rate` */
		getExchangeRate: builder.query<ExchangeRateOutput, void>({
			query: () => ({
				url: "/api/v1/subscriptions/exchange-rate",
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "ExchangeRate" as const, id: "CURRENT" }],
		}),

		/** `PUT /api/v1/subscriptions/exchange-rate` */
		updateExchangeRate: builder.mutation<
			ExchangeRateOutput,
			ExchangeRateUpdateRequest
		>({
			query: (body) => ({
				url: "/api/v1/subscriptions/exchange-rate",
				method: "PUT",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: [{ type: "ExchangeRate" as const, id: "CURRENT" }],
		}),

		/** `GET /api/v1/subscriptions/transaction-logs` — Chapa payment logs (admin) */
		listSubscriptionTransactionLogs: builder.query<
			TransactionLogOutput[],
			{
				status?: TransactionLogStatus | null;
				limit?: number;
				offset?: number;
			} | void
		>({
			query: (arg) => {
				const params: Record<string, string | number> = {};
				if (arg?.status) params.status = arg.status;
				if (arg?.limit != null) params.limit = arg.limit;
				if (arg?.offset != null) params.offset = arg.offset;
				return {
					url: "/api/v1/subscriptions/transaction-logs",
					params: Object.keys(params).length > 0 ? params : undefined,
					headers: bearerHeaders(),
				};
			},
			providesTags: [{ type: "TransactionLogs" as const, id: "LIST" }],
		}),
	}),
});

export const {
	useGetActiveSubscriptionQuery,
	useListAdminSubscriptionTransactionsQuery,
	useGetSubscriptionUsageQuery,
	useCheckoutSubscriptionMutation,
	useCheckoutSubscriptionCustomMutation,
	useGrantSubscriptionCreditsMutation,
	useGetExchangeRateQuery,
	useUpdateExchangeRateMutation,
	useListSubscriptionTransactionLogsQuery,
} = subscriptionApi;
