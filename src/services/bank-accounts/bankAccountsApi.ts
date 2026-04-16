import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	BankAccountCreateRequest,
	BankAccountResponse,
	BankNameEnum,
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

export const bankAccountsApi = createApi({
	reducerPath: "bankAccountsApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["BankAccount"],
	endpoints: (builder) => ({
		/** `GET /api/v1/bank-accounts` */
		listBankAccounts: builder.query<BankAccountResponse[], { businessId: string }>({
			query: ({ businessId }) => ({
				url: "/api/v1/bank-accounts",
				params: { business_id: businessId },
				headers: bearerHeaders(),
			}),
			providesTags: (result, _err, { businessId }) =>
				result
					? [
							{ type: "BankAccount" as const, id: `BUSINESS_${businessId}` },
							...result.map((account) => ({
								type: "BankAccount" as const,
								id: account.account_number,
							})),
						]
					: [{ type: "BankAccount" as const, id: `BUSINESS_${businessId}` }],
		}),

		/** `GET /api/v1/bank-accounts/filter` */
		filterBankAccounts: builder.query<
			BankAccountResponse[],
			{ businessId: string; bankName: BankNameEnum }
		>({
			query: ({ businessId, bankName }) => ({
				url: "/api/v1/bank-accounts/filter",
				params: { business_id: businessId, bank_name: bankName },
				headers: bearerHeaders(),
			}),
			providesTags: (result, _err, { businessId, bankName }) =>
				result
					? [
							{ type: "BankAccount" as const, id: `BUSINESS_${businessId}` },
							{ type: "BankAccount" as const, id: `FILTER_${businessId}_${bankName}` },
							...result.map((account) => ({
								type: "BankAccount" as const,
								id: account.account_number,
							})),
						]
					: [
							{ type: "BankAccount" as const, id: `BUSINESS_${businessId}` },
							{ type: "BankAccount" as const, id: `FILTER_${businessId}_${bankName}` },
						],
		}),

		/** `GET /api/v1/bank-accounts/{account_number}` */
		getBankAccount: builder.query<BankAccountResponse, { accountNumber: string }>({
			query: ({ accountNumber }) => ({
				url: `/api/v1/bank-accounts/${accountNumber}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { accountNumber }) => [
				{ type: "BankAccount" as const, id: accountNumber },
			],
		}),

		/** `POST /api/v1/bank-accounts` */
		createBankAccount: builder.mutation<BankAccountResponse, BankAccountCreateRequest>({
			query: (body) => ({
				url: "/api/v1/bank-accounts",
				method: "POST",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_result, _err, arg) => [
				{ type: "BankAccount" as const, id: `BUSINESS_${arg.business_id}` },
				{ type: "BankAccount" as const, id: arg.account_number },
			],
		}),
	}),
});

export const {
	useListBankAccountsQuery,
	useFilterBankAccountsQuery,
	useLazyGetBankAccountQuery,
	useCreateBankAccountMutation,
} = bankAccountsApi;
