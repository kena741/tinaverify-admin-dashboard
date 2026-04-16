import { createApi } from "@reduxjs/toolkit/query/react";
import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	MenuInputRequest,
	MenuResponse,
	MenuUpdateRequest,
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

export const menuApi = createApi({
	reducerPath: "menuApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Menu"],
	endpoints: (builder) => ({
		/** `GET /api/v1/branches/{branch_id}/menus` */
		listBranchMenus: builder.query<MenuResponse[], { branchId: string }>({
			query: ({ branchId }) => ({
				url: `/api/v1/branches/${branchId}/menus`,
				headers: bearerHeaders(),
			}),
			providesTags: (result, _err, { branchId }) =>
				result
					? [
							{ type: "Menu" as const, id: `BRANCH_${branchId}` },
							...result.map((m) => ({
								type: "Menu" as const,
								id: m.id,
							})),
						]
					: [{ type: "Menu" as const, id: `BRANCH_${branchId}` }],
		}),

		/** `GET /api/v1/menus/{menu_id}` */
		getMenu: builder.query<MenuResponse, { menuId: string }>({
			query: ({ menuId }) => ({
				url: `/api/v1/menus/${menuId}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { menuId }) => [
				{ type: "Menu" as const, id: menuId },
			],
		}),

		/** `POST /api/v1/menus` */
		createMenu: builder.mutation<MenuResponse, MenuInputRequest>({
			query: (body) => ({
				url: "/api/v1/menus",
				method: "POST",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_result, _err, arg) => [
				{ type: "Menu" as const, id: `BRANCH_${arg.branch_id}` },
			],
		}),

		/** `PUT /api/v1/menus/{menu_id}` */
		updateMenu: builder.mutation<
			MenuResponse,
			{ menuId: string; branchId: string; body: MenuUpdateRequest }
		>({
			query: ({ menuId, body }) => ({
				url: `/api/v1/menus/${menuId}`,
				method: "PUT",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_result, _err, { menuId, branchId }) => [
				{ type: "Menu" as const, id: menuId },
				{ type: "Menu" as const, id: `BRANCH_${branchId}` },
			],
		}),

		/** `DELETE /api/v1/menus/{menu_id}` — archive */
		deleteMenu: builder.mutation<void, { menuId: string; branchId: string }>({
			query: ({ menuId }) => ({
				url: `/api/v1/menus/${menuId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { menuId, branchId }) => [
				{ type: "Menu" as const, id: menuId },
				{ type: "Menu" as const, id: `BRANCH_${branchId}` },
			],
		}),
	}),
});

export const {
	useListBranchMenusQuery,
	useLazyListBranchMenusQuery,
	useGetMenuQuery,
	useCreateMenuMutation,
	useUpdateMenuMutation,
	useDeleteMenuMutation,
} = menuApi;
