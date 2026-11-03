import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import {
	ADMIN_LIST_MAX_PAGE_SIZE,
	fetchAllPaginatedItems,
} from "../paginatedFetch";
import type {
	AdminGrantCreditsRequest,
	AdminSubscriptionOutput,
	CustomCheckoutRequest,
	ExchangeRateOutput,
	ExchangeRateUpdateRequest,
	ManualSubscriptionRequest,
	SubscriptionCheckoutResponse,
	SubscriptionOutput,
	SubscriptionStatus,
	SystemBankAccountOutput,
	TransactionLogOutput,
	TransactionLogStatus,
	UsageOutput,
} from "../types";

function bearerHeaders(accessToken?: string | null) {
	const token =
		accessToken !== undefined && accessToken !== null && accessToken !== ""
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
		"SystemBank",
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

		/**
		 * `GET /api/v1/subscriptions/transactions` — admin subscription history.
		 * Prefer `businessId` / `businessIds` so callers don't pull the global ledger.
		 * Unscoped calls still walk pages (API default limit 100; max 1000).
		 */
		listAdminSubscriptionTransactions: builder.query<
			AdminSubscriptionOutput[],
			{
				businessId?: string | null;
				/** Parallel per-business fetches — use for a single UI page of businesses. */
				businessIds?: string[] | null;
				planId?: string | null;
				status?: SubscriptionStatus | null;
			} | void
		>({
			async queryFn(arg, _api, _extra, baseQuery) {
				const query = (arg ?? {}) as {
					businessId?: string | null;
					businessIds?: string[] | null;
					planId?: string | null;
					status?: SubscriptionStatus | null;
				};
				const bq = baseQuery as (arg: {
					url: string;
					method?: string;
					params?: Record<string, string | number>;
					headers?: Record<string, string>;
				}) => Promise<{ data?: unknown; error?: unknown }>;
				const headers = bearerHeaders() as Record<string, string>;

				const ids = [
					...new Set(
						(query.businessIds ?? [])
							.filter(Boolean)
							.concat(query.businessId ? [query.businessId] : []),
					),
				];

				// ponytail: page-scoped — one request per business, no global walk
				if (ids.length > 0) {
					const settled = await Promise.all(
						ids.map((businessId) => {
							const extraParams: Record<string, string | number> = {
								business_id: businessId,
							};
							if (query.planId) extraParams.plan_id = query.planId;
							if (query.status) extraParams.status = query.status;
							return fetchAllPaginatedItems<AdminSubscriptionOutput>(
								bq,
								"/api/v1/subscriptions/transactions",
								headers,
								ADMIN_LIST_MAX_PAGE_SIZE,
								extraParams,
							);
						}),
					);
					const merged: AdminSubscriptionOutput[] = [];
					for (const res of settled) {
						if ("error" in res && res.error) {
							return { error: res.error };
						}
						if ("data" in res && res.data) merged.push(...res.data);
					}
					return { data: merged };
				}

				const extraParams: Record<string, string | number> = {};
				if (query.planId) extraParams.plan_id = query.planId;
				if (query.status) extraParams.status = query.status;

				return fetchAllPaginatedItems<AdminSubscriptionOutput>(
					bq,
					"/api/v1/subscriptions/transactions",
					headers,
					ADMIN_LIST_MAX_PAGE_SIZE,
					extraParams,
				);
			},
			serializeQueryArgs: ({ endpointName, queryArgs }) => {
				const arg = (queryArgs ?? {}) as {
					businessId?: string | null;
					businessIds?: string[] | null;
					planId?: string | null;
					status?: SubscriptionStatus | null;
				};
				const ids = [
					...new Set(
						(arg.businessIds ?? [])
							.filter(Boolean)
							.concat(arg.businessId ? [arg.businessId] : []),
					),
				].sort();
				const planId = arg.planId;
				const status = arg.status;
				if (ids.length === 0 && !planId && !status) {
					return `${endpointName}(global)`;
				}
				return `${endpointName}(${ids.join(",")}|${planId ?? ""}|${status ?? ""})`;
			},
			keepUnusedDataFor: 60,
			providesTags: [{ type: "SubscriptionTransactions" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/subscriptions/usage` — 404 when no active subscription → null */
		getSubscriptionUsage: builder.query<
			UsageOutput | null,
			{ businessId: string }
		>({
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
		 * Query: `business_id`, `is_internal`. Multipart: `credits`, `file`.
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
					params: {
						business_id: businessId,
						is_internal: body.is_internal === true,
					},
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

		/** `GET /api/v1/subscriptions/system-banks` */
		listSystemBanks: builder.query<SystemBankAccountOutput[], void>({
			query: () => ({
				url: "/api/v1/subscriptions/system-banks",
				headers: bearerHeaders(),
			}),
			transformResponse: (response: unknown) => {
				if (Array.isArray(response))
					return response as SystemBankAccountOutput[];
				if (
					typeof response === "object" &&
					response !== null &&
					"items" in response &&
					Array.isArray((response as { items: unknown }).items)
				) {
					return (response as { items: SystemBankAccountOutput[] }).items;
				}
				return [];
			},
			providesTags: [{ type: "SystemBank" as const, id: "LIST" }],
		}),

		/** `POST /api/v1/subscriptions/manual-request` */
		createManualSubscriptionRequest: builder.mutation<
			unknown,
			{ body: ManualSubscriptionRequest }
		>({
			query: ({ body }) => {
				const formData = new FormData();
				formData.append("business_id", body.business_id);
				formData.append("plan_id", body.plan_id);
				formData.append("bank_name", body.bank_name);
				formData.append(
					"receiver_account_number",
					body.receiver_account_number,
				);
				formData.append("file", body.file);
				if (body.description != null) {
					formData.append("description", body.description);
				}
				return {
					url: "/api/v1/subscriptions/manual-request",
					method: "POST",
					body: formData,
					headers: bearerHeaders(),
				};
			},
			invalidatesTags: [
				{ type: "TransactionLogs" as const, id: "LIST" },
				{ type: "SubscriptionTransactions" as const, id: "LIST" },
			],
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
				const query = (arg ?? {}) as {
					status?: TransactionLogStatus | null;
					limit?: number;
					offset?: number;
				};
				const params: Record<string, string | number> = {};
				if (query.status) params.status = query.status;
				if (query.limit != null) params.limit = query.limit;
				if (query.offset != null) params.offset = query.offset;
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
	useListSystemBanksQuery,
	useCreateManualSubscriptionRequestMutation,
	useListSubscriptionTransactionLogsQuery,
} = subscriptionApi;
