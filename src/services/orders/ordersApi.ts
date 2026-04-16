import { createApi } from "@reduxjs/toolkit/query/react";

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

export type OrderTransactionsSummaryQueryArg = {
	businessId: string;
	startDate: string;
	endDate: string;
	branchId?: string | null;
	createdBy?: string | null;
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
			query: ({ businessId, startDate, endDate, branchId, createdBy }) => ({
				url: `/api/v1/businesses/${businessId}/orders/transactions-summary`,
				params: {
					start_date: startDate,
					end_date: endDate,
					branch_id: branchId || undefined,
					created_by: createdBy || undefined,
				},
				headers: bearerHeaders(),
			}),
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
