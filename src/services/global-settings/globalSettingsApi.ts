import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	GlobalSettingOutput,
	GlobalSettingWriteRequest,
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

export const globalSettingsApi = createApi({
	reducerPath: "globalSettingsApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["GlobalSetting"],
	endpoints: (builder) => ({
		/** `GET /api/v1/global-settings` */
		listGlobalSettings: builder.query<GlobalSettingOutput[], void>({
			query: () => ({
				url: "/api/v1/global-settings",
				headers: bearerHeaders(),
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "GlobalSetting" as const, id: "LIST" },
							...result.map((s) => ({
								type: "GlobalSetting" as const,
								id: s.id,
							})),
						]
					: [{ type: "GlobalSetting" as const, id: "LIST" }],
		}),

		/** `POST /api/v1/global-settings` */
		createGlobalSetting: builder.mutation<
			GlobalSettingOutput,
			GlobalSettingWriteRequest
		>({
			query: (body) => ({
				url: "/api/v1/global-settings",
				method: "POST",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: [{ type: "GlobalSetting", id: "LIST" }],
		}),

		/** `GET /api/v1/global-settings/{setting_id}` */
		getGlobalSetting: builder.query<
			GlobalSettingOutput,
			{ settingId: string }
		>({
			query: ({ settingId }) => ({
				url: `/api/v1/global-settings/${settingId}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_r, _e, { settingId }) => [
				{ type: "GlobalSetting" as const, id: settingId },
			],
		}),

		/** `PUT /api/v1/global-settings/{setting_id}` */
		updateGlobalSetting: builder.mutation<
			GlobalSettingOutput,
			{ settingId: string; body: GlobalSettingWriteRequest }
		>({
			query: ({ settingId, body }) => ({
				url: `/api/v1/global-settings/${settingId}`,
				method: "PUT",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_r, _e, { settingId }) => [
				{ type: "GlobalSetting" as const, id: settingId },
				{ type: "GlobalSetting" as const, id: "LIST" },
			],
		}),

		/** `DELETE /api/v1/global-settings/{setting_id}` */
		deleteGlobalSetting: builder.mutation<void, { settingId: string }>({
			query: ({ settingId }) => ({
				url: `/api/v1/global-settings/${settingId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_r, _e, { settingId }) => [
				{ type: "GlobalSetting" as const, id: settingId },
				{ type: "GlobalSetting" as const, id: "LIST" },
			],
		}),
	}),
});

export const {
	useListGlobalSettingsQuery,
	useCreateGlobalSettingMutation,
	useGetGlobalSettingQuery,
	useUpdateGlobalSettingMutation,
	useDeleteGlobalSettingMutation,
} = globalSettingsApi;
