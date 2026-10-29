import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	CouponCreateRequest,
	CouponOutput,
	CouponUpdateRequest,
	PaginatedCouponResponse,
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

export const couponsApi = createApi({
	reducerPath: "couponsApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Coupons"],
	endpoints: (builder) => ({
		/** `GET /api/v1/admin/coupons` */
		listCoupons: builder.query<
			PaginatedCouponResponse,
			{ isActive?: boolean; page?: number; limit?: number } | void
		>({
			query: (arg) => ({
				url: "/api/v1/admin/coupons",
				params: {
					...(arg?.isActive !== undefined
						? { is_active: arg.isActive }
						: {}),
					...(arg?.page !== undefined ? { page: arg.page } : {}),
					...(arg?.limit !== undefined ? { limit: arg.limit } : {}),
				},
				headers: bearerHeaders(),
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "Coupons" as const, id: "LIST" },
							...result.items.map((coupon) => ({
								type: "Coupons" as const,
								id: coupon.id,
							})),
						]
					: [{ type: "Coupons" as const, id: "LIST" }],
		}),

		/** `POST /api/v1/admin/coupons` */
		createCoupon: builder.mutation<CouponOutput, CouponCreateRequest>({
			query: (body) => ({
				url: "/api/v1/admin/coupons",
				method: "POST",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: [{ type: "Coupons" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/admin/coupons/{coupon_id}` */
		getCoupon: builder.query<CouponOutput, { couponId: string }>({
			query: ({ couponId }) => ({
				url: `/api/v1/admin/coupons/${encodeURIComponent(couponId)}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _error, { couponId }) => [
				{ type: "Coupons" as const, id: couponId },
			],
		}),

		/** `PATCH /api/v1/admin/coupons/{coupon_id}` */
		updateCoupon: builder.mutation<
			CouponOutput,
			{ couponId: string; body: CouponUpdateRequest }
		>({
			query: ({ couponId, body }) => ({
				url: `/api/v1/admin/coupons/${encodeURIComponent(couponId)}`,
				method: "PATCH",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _error, { couponId }) => [
				{ type: "Coupons" as const, id: "LIST" },
				{ type: "Coupons" as const, id: couponId },
			],
		}),

		/** `DELETE /api/v1/admin/coupons/{coupon_id}` — 204 No Content */
		deleteCoupon: builder.mutation<void, { couponId: string }>({
			query: ({ couponId }) => ({
				url: `/api/v1/admin/coupons/${encodeURIComponent(couponId)}`,
				method: "DELETE",
				headers: bearerHeaders(),
				responseHandler: async (response) => {
					if (response.status === 204) return null;
					const text = await response.text();
					return text ? JSON.parse(text) : null;
				},
			}),
			invalidatesTags: (_result, _error, { couponId }) => [
				{ type: "Coupons" as const, id: "LIST" },
				{ type: "Coupons" as const, id: couponId },
			],
		}),
	}),
});

export const {
	useListCouponsQuery,
	useCreateCouponMutation,
	useGetCouponQuery,
	useUpdateCouponMutation,
	useDeleteCouponMutation,
} = couponsApi;
