import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	BannerOutput,
	CreateBannerRequest,
	UpdateBannerRequest,
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

function appendBannerFormData(
	formData: FormData,
	fields: {
		redirect_url?: string;
		is_active?: boolean;
		image?: File;
	},
) {
	if (fields.redirect_url !== undefined) {
		formData.append("redirect_url", fields.redirect_url);
	}
	if (fields.is_active !== undefined) {
		formData.append("is_active", String(fields.is_active));
	}
	if (fields.image) {
		formData.append("image", fields.image);
	}
}

export const bannersApi = createApi({
	reducerPath: "bannersApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Banners"],
	endpoints: (builder) => ({
		/** `GET /api/v1/banners` — optional `active_only` query (default false). */
		listBanners: builder.query<
			BannerOutput[],
			{ activeOnly?: boolean } | void
		>({
			query: (arg) => ({
				url: "/api/v1/banners",
				params: arg?.activeOnly ? { active_only: true } : undefined,
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "Banners" as const, id: "LIST" }],
		}),

		/** `POST /api/v1/banners` — multipart: `redirect_url`, `image`, `is_active` */
		createBanner: builder.mutation<BannerOutput, CreateBannerRequest>({
			query: ({ redirect_url, is_active, image }) => {
				const formData = new FormData();
				appendBannerFormData(formData, { redirect_url, is_active, image });
				return {
					url: "/api/v1/banners",
					method: "POST",
					body: formData,
					headers: bearerHeaders(),
				};
			},
			invalidatesTags: [{ type: "Banners" as const, id: "LIST" }],
		}),

		/** `PATCH /api/v1/banners/{banner_id}` — multipart: `redirect_url`, `is_active`, `image` */
		updateBanner: builder.mutation<
			BannerOutput,
			{ bannerId: string; body: UpdateBannerRequest }
		>({
			query: ({ bannerId, body }) => {
				const formData = new FormData();
				appendBannerFormData(formData, body);
				return {
					url: `/api/v1/banners/${bannerId}`,
					method: "PATCH",
					body: formData,
					headers: bearerHeaders(),
				};
			},
			invalidatesTags: (_result, _err, { bannerId }) => [
				{ type: "Banners" as const, id: "LIST" },
				{ type: "Banners" as const, id: bannerId },
			],
		}),

		/** `DELETE /api/v1/banners/{banner_id}` — 204 No Content */
		deleteBanner: builder.mutation<void, { bannerId: string }>({
			query: ({ bannerId }) => ({
				url: `/api/v1/banners/${bannerId}`,
				method: "DELETE",
				headers: bearerHeaders(),
				responseHandler: async (response) => {
					if (response.status === 204) return null;
					const text = await response.text();
					return text ? JSON.parse(text) : null;
				},
			}),
			invalidatesTags: (_result, _err, { bannerId }) => [
				{ type: "Banners" as const, id: "LIST" },
				{ type: "Banners" as const, id: bannerId },
			],
		}),
	}),
});

export const {
	useListBannersQuery,
	useCreateBannerMutation,
	useUpdateBannerMutation,
	useDeleteBannerMutation,
} = bannersApi;
