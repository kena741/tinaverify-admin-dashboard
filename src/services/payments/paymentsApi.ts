import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	PaymentGatewaysOutput,
	PaymentGatewaysUpdateRequest,
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

export const paymentsApi = createApi({
	reducerPath: "paymentsApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["PaymentGateways"],
	endpoints: (builder) => ({
		/** `GET /api/v1/payments/gateways` */
		getPaymentGateways: builder.query<PaymentGatewaysOutput, void>({
			query: () => ({
				url: "/api/v1/payments/gateways",
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "PaymentGateways" as const, id: "LIST" }],
		}),

		/** `PUT /api/v1/payments/gateways` */
		updatePaymentGateways: builder.mutation<
			PaymentGatewaysOutput,
			PaymentGatewaysUpdateRequest
		>({
			query: (body) => ({
				url: "/api/v1/payments/gateways",
				method: "PUT",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: [{ type: "PaymentGateways" as const, id: "LIST" }],
		}),
	}),
});

export const {
	useGetPaymentGatewaysQuery,
	useUpdatePaymentGatewaysMutation,
} = paymentsApi;
