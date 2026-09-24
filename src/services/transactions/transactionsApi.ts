import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	UpdateTransactionStatusRequest,
	VerifiedTransactionOutput,
} from "../types";

function bearerHeaders(accessToken?: string | null) {
	const token =
		accessToken !== undefined && accessToken !== null && accessToken !== ""
			? accessToken
			: getStoredAccessToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * OpenAPI returns either a bare array or `Record<string, VerifiedTransactionOutput[]>`
 * (bank / group keys). Also tolerate `{ items|transactions|results|data }`.
 */
export function normalizeTransactionList(
	data: unknown,
): VerifiedTransactionOutput[] {
	if (Array.isArray(data)) return data as VerifiedTransactionOutput[];
	if (data && typeof data === "object") {
		const o = data as Record<string, unknown>;
		if (Array.isArray(o.items)) return o.items as VerifiedTransactionOutput[];
		if (Array.isArray(o.transactions))
			return o.transactions as VerifiedTransactionOutput[];
		if (Array.isArray(o.results))
			return o.results as VerifiedTransactionOutput[];
		if (Array.isArray(o.data)) return o.data as VerifiedTransactionOutput[];
		const groups = Object.values(o).filter(
			Array.isArray,
		) as VerifiedTransactionOutput[][];
		if (groups.length > 0) return groups.flat();
	}
	return [];
}

function transactionListTags(result: VerifiedTransactionOutput[] | undefined) {
	const list = Array.isArray(result) ? result : [];
	return [
		{ type: "Transaction" as const, id: "LIST" },
		...list.map((t) => ({
			type: "Transaction" as const,
			id: t.id,
		})),
	];
}

export const transactionsApi = createApi({
	reducerPath: "transactionsApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Transaction"],
	endpoints: (builder) => ({
		/** `GET /api/v1/transactions/me` */
		listMyTransactions: builder.query<
			VerifiedTransactionOutput[],
			{
				startDate?: string | null;
				endDate?: string | null;
				businessId?: string | null;
				limit?: number | null;
				offset?: number | null;
			} | void
		>({
			query: (arg) => {
				const query = (arg ?? {}) as {
					startDate?: string | null;
					endDate?: string | null;
					businessId?: string | null;
					limit?: number | null;
					offset?: number | null;
				};
				const params: Record<string, string | number> = {};
				if (query.startDate) params.start_date = query.startDate;
				if (query.endDate) params.end_date = query.endDate;
				if (query.businessId) params.business_id = query.businessId;
				if (query.limit != null) params.limit = query.limit;
				if (query.offset != null) params.offset = query.offset;
				return {
					url: "/api/v1/transactions/me",
					params: Object.keys(params).length > 0 ? params : undefined,
					headers: bearerHeaders(),
				};
			},
			transformResponse: (response: unknown) =>
				normalizeTransactionList(response),
			providesTags: (result) => transactionListTags(result),
		}),

		/** `GET /api/v1/transactions/{transaction_id}` */
		getTransactionById: builder.query<
			VerifiedTransactionOutput | null,
			{ transactionId: string }
		>({
			query: ({ transactionId }) => ({
				url: `/api/v1/transactions/${transactionId}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _error, { transactionId }) => [
				{ type: "Transaction" as const, id: transactionId },
			],
		}),

		/** `PATCH /api/v1/transactions/{transaction_id}/status` */
		updateTransactionStatus: builder.mutation<
			VerifiedTransactionOutput,
			{ transactionId: string; body: UpdateTransactionStatusRequest }
		>({
			query: ({ transactionId, body }) => ({
				url: `/api/v1/transactions/${transactionId}/status`,
				method: "PATCH",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_result, _error, { transactionId }) => [
				{ type: "Transaction" as const, id: transactionId },
				{ type: "Transaction" as const, id: "LIST" },
			],
		}),

		/** `GET /api/v1/transactions/business/{business_id}` */
		listTransactionsByBusiness: builder.query<
			VerifiedTransactionOutput[],
			{
				businessId: string;
				startDate: string;
				endDate: string;
				createdBy?: string | null;
				bankFilter?: boolean;
			}
		>({
			query: ({ businessId, startDate, endDate, createdBy, bankFilter }) => ({
				url: `/api/v1/transactions/business/${businessId}`,
				params: {
					start_date: startDate,
					end_date: endDate,
					...(createdBy != null && createdBy !== ""
						? { created_by: createdBy }
						: {}),
					...(bankFilter != null ? { bank_filter: bankFilter } : {}),
				},
				headers: bearerHeaders(),
			}),
			transformResponse: (response: unknown) =>
				normalizeTransactionList(response),
			providesTags: (result) => transactionListTags(result),
		}),
	}),
});

export const {
	useListMyTransactionsQuery,
	useGetTransactionByIdQuery,
	useUpdateTransactionStatusMutation,
	useListTransactionsByBusinessQuery,
} = transactionsApi;
