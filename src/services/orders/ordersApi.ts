import { createApi } from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	OrderResponse,
	OrderTransactionSummaryResponse,
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

function mergeTransactionSummaryRows(
	batches: OrderTransactionSummaryResponse[][],
): OrderTransactionSummaryResponse[] {
	const map = new Map<string, OrderTransactionSummaryResponse>();
	for (const batch of batches) {
		for (const row of batch) {
			const key = `${row.order_id}\0${row.transaction_id}`;
			map.set(key, row);
		}
	}
	return Array.from(map.values());
}

export type OrderTransactionsSummaryQueryArg = {
	businessId: string;
	startDate: string;
	endDate: string;
	branchId?: string | null;
	/** User IDs (waiters). Empty means no filter. Multiple IDs merge API results. */
	createdByUserIds: string[];
};

export const ordersApi = createApi({
	reducerPath: "ordersApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Order", "OrderTransactionsSummary"],
	endpoints: (builder) => ({
		/** `GET /api/v1/orders/{order_id}` */
		getOrder: builder.query<OrderResponse, { orderId: string }>({
			query: ({ orderId }) => ({
				url: `/api/v1/orders/${orderId}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { orderId }) => [
				{ type: "Order" as const, id: orderId },
			],
		}),

		/** `GET /api/v1/tables/{table_id}/orders` */
		listTableOrders: builder.query<OrderResponse[], { tableId: string }>({
			query: ({ tableId }) => ({
				url: `/api/v1/tables/${tableId}/orders`,
				headers: bearerHeaders(),
			}),
			providesTags: (result, _err, { tableId }) =>
				result
					? [
							{ type: "Order" as const, id: `TABLE_${tableId}` },
							...result.map((order) => ({
								type: "Order" as const,
								id: order.id,
							})),
						]
					: [{ type: "Order" as const, id: `TABLE_${tableId}` }],
		}),

		/** `GET /api/v1/businesses/{business_id}/orders/transactions-summary` */
		listOrderTransactionsSummary: builder.query<
			OrderTransactionSummaryResponse[],
			OrderTransactionsSummaryQueryArg
		>({
			async queryFn(arg, _api, _extraOptions, baseQuery) {
				const { businessId, startDate, endDate, branchId, createdByUserIds } =
					arg;
				const url = `/api/v1/businesses/${businessId}/orders/transactions-summary`;
				const commonParams = {
					start_date: startDate,
					end_date: endDate,
					branch_id: branchId || undefined,
				};
				const ids = createdByUserIds.filter(Boolean);

				if (ids.length === 0) {
					const res = await baseQuery({
						url,
						params: commonParams,
						headers: bearerHeaders(),
					});
					if (res.error) {
						return { error: res.error as FetchBaseQueryError };
					}
					return { data: res.data as OrderTransactionSummaryResponse[] };
				}

				if (ids.length === 1) {
					const res = await baseQuery({
						url,
						params: { ...commonParams, created_by: ids[0] },
						headers: bearerHeaders(),
					});
					if (res.error) {
						return { error: res.error as FetchBaseQueryError };
					}
					return { data: res.data as OrderTransactionSummaryResponse[] };
				}

				const results = await Promise.all(
					ids.map((created_by) =>
						baseQuery({
							url,
							params: { ...commonParams, created_by },
							headers: bearerHeaders(),
						}),
					),
				);
				for (const r of results) {
					if (r.error) {
						return { error: r.error as FetchBaseQueryError };
					}
				}
				const merged = mergeTransactionSummaryRows(
					results.map((r) => r.data as OrderTransactionSummaryResponse[]),
				);
				return { data: merged };
			},
			providesTags: (_result, _err, { businessId }) => [
				{ type: "OrderTransactionsSummary" as const, id: `BUSINESS_${businessId}` },
			],
		}),
	}),
});

export const {
	useLazyGetOrderQuery,
	useListTableOrdersQuery,
	useListOrderTransactionsSummaryQuery,
} = ordersApi;
