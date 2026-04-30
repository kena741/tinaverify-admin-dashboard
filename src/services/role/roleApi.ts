"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	AssignPermissionRequest,
	PermissionOutput,
	RoleCreateRequest,
	RoleOutput,
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

export const roleApi = createApi({
	reducerPath: "roleApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Role", "RolePermissions"],
	endpoints: (builder) => ({
		/** `GET /api/v1/roles/admin` */
		listRoles: builder.query<RoleOutput[], void>({
			query: () => ({
				url: "/api/v1/roles/admin",
				headers: bearerHeaders(),
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "Role" as const, id: "LIST" },
							...result.map((r) => ({ type: "Role" as const, id: r.id })),
						]
					: [{ type: "Role" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/roles/list?business_id=...` */
		listRolesByBusiness: builder.query<RoleOutput[], { businessId: string }>({
			query: ({ businessId }) => ({
				url: "/api/v1/roles/list",
				params: { business_id: businessId },
				headers: bearerHeaders(),
			}),
			providesTags: (result, _err, { businessId }) =>
				result
					? [
							{ type: "Role" as const, id: `BUSINESS_${businessId}` },
							...result.map((r) => ({ type: "Role" as const, id: r.id })),
						]
					: [{ type: "Role" as const, id: `BUSINESS_${businessId}` }],
		}),

		/** `POST /api/v1/roles` */
		createRole: builder.mutation<RoleOutput, { body: RoleCreateRequest }>({
			query: ({ body }) => ({
				url: "/api/v1/roles",
				method: "POST",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: [{ type: "Role", id: "LIST" }],
		}),

		/** `GET /api/v1/roles/{role_id}` */
		getRole: builder.query<RoleOutput, { roleId: string }>({
			query: ({ roleId }) => ({
				url: `/api/v1/roles/${roleId}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { roleId }) => [
				{ type: "Role" as const, id: roleId },
			],
		}),

		/** `DELETE /api/v1/roles/{role_id}` */
		deleteRole: builder.mutation<void, { roleId: string }>({
			query: ({ roleId }) => ({
				url: `/api/v1/roles/${roleId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { roleId }) => [
				{ type: "Role" as const, id: "LIST" },
				{ type: "Role" as const, id: roleId },
				{ type: "RolePermissions" as const, id: roleId },
			],
		}),

		/** `GET /api/v1/roles/{role_id}/permissions` */
		getRolePermissions: builder.query<PermissionOutput[], { roleId: string }>({
			query: ({ roleId }) => ({
				url: `/api/v1/roles/${roleId}/permissions`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { roleId }) => [
				{ type: "RolePermissions" as const, id: roleId },
			],
		}),

		/** `POST /api/v1/roles/{role_id}/permissions` */
		assignPermissionsToRole: builder.mutation<
			Record<string, unknown>,
			{ roleId: string; body: AssignPermissionRequest }
		>({
			query: ({ roleId, body }) => ({
				url: `/api/v1/roles/${roleId}/permissions`,
				method: "POST",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { roleId }) => [
				{ type: "RolePermissions" as const, id: roleId },
			],
		}),

		/** `DELETE /api/v1/roles/{role_id}/permissions/{permission_id}` */
		removePermissionFromRole: builder.mutation<
			void,
			{ roleId: string; permissionId: string }
		>({
			query: ({ roleId, permissionId }) => ({
				url: `/api/v1/roles/${roleId}/permissions/${permissionId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { roleId }) => [
				{ type: "RolePermissions" as const, id: roleId },
			],
		}),
	}),
});

export const {
	useListRolesQuery,
	useListRolesByBusinessQuery,
	useCreateRoleMutation,
	useGetRoleQuery,
	useLazyGetRoleQuery,
	useDeleteRoleMutation,
	useGetRolePermissionsQuery,
	useLazyGetRolePermissionsQuery,
	useAssignPermissionsToRoleMutation,
	useRemovePermissionFromRoleMutation,
} = roleApi;

