import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	UpdateTransactionStatusRequest,
	VerifiedTransactionOutput,
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

export const transactionsApi = createApi({
	reducerPath: "transactionsApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Transaction"],
	endpoints: (builder) => ({
		/** `GET /api/v1/transactions/{transaction_id}` */
		getTransaction: builder.query<
			VerifiedTransactionOutput,
			{ transactionId: string }
		>({
			query: ({ transactionId }) => ({
				url: `/api/v1/transactions/${transactionId}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { transactionId }) => [
				{ type: "Transaction" as const, id: transactionId },
			],
		}),

		/** `PATCH /api/v1/transactions/{transaction_id}/status` */
		updateTransactionStatus: builder.mutation<
			VerifiedTransactionOutput,
			{
				transactionId: string;
				body: UpdateTransactionStatusRequest;
			}
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
			invalidatesTags: (_result, _err, { transactionId }) => [
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
			providesTags: (result) =>
				result
					? [
							{ type: "Transaction" as const, id: "LIST" },
							...result.map((t) => ({
								type: "Transaction" as const,
								id: t.id,
							})),
						]
					: [{ type: "Transaction" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/transactions/branch/{branch_id}` */
		listTransactionsByBranch: builder.query<
			VerifiedTransactionOutput[],
			{
				branchId: string;
				businessId: string;
				startDate: string;
				endDate: string;
			}
		>({
			query: ({ branchId, businessId, startDate, endDate }) => ({
				url: `/api/v1/transactions/branch/${branchId}`,
				params: {
					business_id: businessId,
					start_date: startDate,
					end_date: endDate,
				},
				headers: bearerHeaders(),
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "Transaction" as const, id: "LIST" },
							...result.map((t) => ({
								type: "Transaction" as const,
								id: t.id,
							})),
						]
					: [{ type: "Transaction" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/transactions/me` */
		listMyTransactions: builder.query<
			VerifiedTransactionOutput[],
			{
				businessId: string;
				startDate: string;
				endDate: string;
			}
		>({
			query: ({ businessId, startDate, endDate }) => ({
				url: "/api/v1/transactions/me",
				params: {
					business_id: businessId,
					start_date: startDate,
					end_date: endDate,
				},
				headers: bearerHeaders(),
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "Transaction" as const, id: "LIST" },
							...result.map((t) => ({
								type: "Transaction" as const,
								id: t.id,
							})),
						]
					: [{ type: "Transaction" as const, id: "LIST" }],
		}),
	}),
});

export const {
	useGetTransactionQuery,
	useLazyGetTransactionQuery,
	useUpdateTransactionStatusMutation,
	useListTransactionsByBusinessQuery,
	useListTransactionsByBranchQuery,
	useListMyTransactionsQuery,
} = transactionsApi;
