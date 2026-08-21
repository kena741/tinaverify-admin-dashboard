import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	ContactMessageOutput,
	ContactMessageStatusUpdateRequest,
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

export const contactMessagesApi = createApi({
	reducerPath: "contactMessagesApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["ContactMessage"],
	endpoints: (builder) => ({
		/** `GET /api/v1/contact-messages` */
		listContactMessages: builder.query<ContactMessageOutput[], void>({
			query: () => ({
				url: "/api/v1/contact-messages",
				headers: bearerHeaders(),
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "ContactMessage" as const, id: "LIST" },
							...result.map((m) => ({
								type: "ContactMessage" as const,
								id: m.id,
							})),
						]
					: [{ type: "ContactMessage" as const, id: "LIST" }],
		}),

		/** `PATCH /api/v1/contact-messages/{message_id}/status` */
		updateContactMessageStatus: builder.mutation<
			ContactMessageOutput,
			{ messageId: string; body: ContactMessageStatusUpdateRequest }
		>({
			query: ({ messageId, body }) => ({
				url: `/api/v1/contact-messages/${messageId}/status`,
				method: "PATCH",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_r, _e, { messageId }) => [
				{ type: "ContactMessage" as const, id: messageId },
				{ type: "ContactMessage" as const, id: "LIST" },
			],
		}),
	}),
});

export const {
	useListContactMessagesQuery,
	useUpdateContactMessageStatusMutation,
} = contactMessagesApi;
