"use client";

import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type { SendCustomSmsRequest, SendCustomSmsResponse } from "../types";

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
		/** `POST /api/v1/sms/geezsms/send` — send a custom SMS via GeezSMS */
		sendCustomSms: builder.mutation<
			SendCustomSmsResponse,
			{ body: SendCustomSmsRequest }
		>({
			query: ({ body }) => ({
				url: "/api/v1/sms/geezsms/send",
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
