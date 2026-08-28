"use client";

import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type { AdminSendSmsRequest, AdminSendSmsResponse } from "../types";

function bearerHeaders(accessToken?: string | null) {
	const token =
		accessToken !== undefined &&
		accessToken !== null &&
		accessToken !== ""
			? accessToken
			: getStoredAccessToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export const smsApi = createApi({
	reducerPath: "smsApi",
	baseQuery: backendBaseQuery,
	endpoints: (builder) => ({
		/** `POST /api/v1/sms/send` — send an SMS to a phone number (admin only) */
		sendCustomSms: builder.mutation<
			AdminSendSmsResponse,
			{ body: AdminSendSmsRequest }
		>({
			query: ({ body }) => ({
				url: "/api/v1/sms/send",
				method: "POST",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
		}),
	}),
});

export const { useSendCustomSmsMutation } = smsApi;
