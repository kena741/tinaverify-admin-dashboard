import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type { VerifiedTransactionOutput } from "../types";

function bearerHeaders(accessToken?: string | null) {
	const token =
		accessToken !== undefined &&
		accessToken !== null &&
		accessToken !== ""
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
		if (Array.isArray(o.results)) return o.results as VerifiedTransactionOutput[];
		if (Array.isArray(o.data)) return o.data as VerifiedTransactionOutput[];
		const groups = Object.values(o).filter(Array.isArray) as VerifiedTransactionOutput[][];
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
		/** `GET /api/v1/transactions/business/{business_id}` */
		listTransactionsByBusiness: builder.query<
			VerifiedTransactionOutput[],
			{
				businessId: string;
				startDate: string;
				endDate: string;
				createdBy?: string | null;
			}
		>({
			query: ({ businessId, startDate, endDate, createdBy }) => ({
				url: `/api/v1/transactions/business/${businessId}`,
				params: {
					start_date: startDate,
					end_date: endDate,
					...(createdBy != null && createdBy !== ""
						? { created_by: createdBy }
						: {}),
				},
				headers: bearerHeaders(),
			}),
			transformResponse: (response: unknown) =>
				normalizeTransactionList(response),
			providesTags: (result) => transactionListTags(result),
		}),
	}),
});

export const { useListTransactionsByBusinessQuery } = transactionsApi;
