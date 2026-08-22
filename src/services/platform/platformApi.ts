"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	PlatformAssignPermissionsRequest,
	PlatformPermissionCreateRequest,
	PlatformPermissionOutput,
	PlatformRoleCreateRequest,
	PlatformRoleOutput,
	PlatformRoleUpdateRequest,
	PlatformStaffCreateRequest,
	PlatformStaffOutput,
	PlatformStaffUpdateRequest,
} from "../types";

function bearerHeaders(accessToken?: string | null) {
	const token =
		accessToken !== undefined && accessToken !== null && accessToken !== ""
			? accessToken
			: getStoredAccessToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export const platformApi = createApi({
	reducerPath: "platformApi",
	baseQuery: backendBaseQuery,
	tagTypes: [
		"PlatformRole",
		"PlatformRolePermissions",
		"PlatformPermission",
		"PlatformStaff",
	],
	endpoints: (builder) => ({
		/** `GET /api/v1/platform/roles` */
		listPlatformRoles: builder.query<
			PlatformRoleOutput[],
			{ includeInactive?: boolean } | void
		>({
			query: (arg) => ({
				url: "/api/v1/platform/roles",
				params: {
					include_inactive: arg?.includeInactive ?? false,
				},
				headers: bearerHeaders(),
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "PlatformRole" as const, id: "LIST" },
							...result.map((r) => ({
								type: "PlatformRole" as const,
								id: r.id,
							})),
						]
					: [{ type: "PlatformRole" as const, id: "LIST" }],
		}),

		/** `POST /api/v1/platform/roles` */
		createPlatformRole: builder.mutation<
			PlatformRoleOutput,
			{ body: PlatformRoleCreateRequest }
		>({
			query: ({ body }) => ({
				url: "/api/v1/platform/roles",
				method: "POST",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: [{ type: "PlatformRole", id: "LIST" }],
		}),

		/** `GET /api/v1/platform/roles/{role_id}` */
		getPlatformRole: builder.query<PlatformRoleOutput, { roleId: string }>({
			query: ({ roleId }) => ({
				url: `/api/v1/platform/roles/${roleId}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { roleId }) => [
				{ type: "PlatformRole" as const, id: roleId },
			],
		}),

		/** `PATCH /api/v1/platform/roles/{role_id}` */
		updatePlatformRole: builder.mutation<
			PlatformRoleOutput,
			{ roleId: string; body: PlatformRoleUpdateRequest }
		>({
			query: ({ roleId, body }) => ({
				url: `/api/v1/platform/roles/${roleId}`,
				method: "PATCH",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { roleId }) => [
				{ type: "PlatformRole" as const, id: "LIST" },
				{ type: "PlatformRole" as const, id: roleId },
			],
		}),

		/** `DELETE /api/v1/platform/roles/{role_id}` */
		deletePlatformRole: builder.mutation<void, { roleId: string }>({
			query: ({ roleId }) => ({
				url: `/api/v1/platform/roles/${roleId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { roleId }) => [
				{ type: "PlatformRole" as const, id: "LIST" },
				{ type: "PlatformRole" as const, id: roleId },
				{ type: "PlatformRolePermissions" as const, id: roleId },
			],
		}),

		/** `GET /api/v1/platform/roles/{role_id}/permissions` */
		listPlatformRolePermissions: builder.query<
			PlatformPermissionOutput[],
			{ roleId: string }
		>({
			query: ({ roleId }) => ({
				url: `/api/v1/platform/roles/${roleId}/permissions`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { roleId }) => [
				{ type: "PlatformRolePermissions" as const, id: roleId },
			],
		}),

		/** `POST /api/v1/platform/roles/{role_id}/permissions` */
		assignPlatformRolePermissions: builder.mutation<
			PlatformPermissionOutput[],
			{ roleId: string; body: PlatformAssignPermissionsRequest }
		>({
			query: ({ roleId, body }) => ({
				url: `/api/v1/platform/roles/${roleId}/permissions`,
				method: "POST",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { roleId }) => [
				{ type: "PlatformRolePermissions" as const, id: roleId },
			],
		}),

		/** `DELETE /api/v1/platform/roles/{role_id}/permissions/{permission_id}` */
		removePlatformRolePermission: builder.mutation<
			void,
			{ roleId: string; permissionId: string }
		>({
			query: ({ roleId, permissionId }) => ({
				url: `/api/v1/platform/roles/${roleId}/permissions/${permissionId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { roleId }) => [
				{ type: "PlatformRolePermissions" as const, id: roleId },
			],
		}),

		/** `GET /api/v1/platform/permissions` */
		listPlatformPermissions: builder.query<PlatformPermissionOutput[], void>({
			query: () => ({
				url: "/api/v1/platform/permissions",
				headers: bearerHeaders(),
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "PlatformPermission" as const, id: "LIST" },
							...result.map((p) => ({
								type: "PlatformPermission" as const,
								id: p.id,
							})),
						]
					: [{ type: "PlatformPermission" as const, id: "LIST" }],
		}),

		/** `POST /api/v1/platform/permissions` */
		createPlatformPermission: builder.mutation<
			PlatformPermissionOutput,
			{ body: PlatformPermissionCreateRequest }
		>({
			query: ({ body }) => ({
				url: "/api/v1/platform/permissions",
				method: "POST",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: [{ type: "PlatformPermission", id: "LIST" }],
		}),

		/** `DELETE /api/v1/platform/permissions/{permission_id}` */
		deletePlatformPermission: builder.mutation<void, { permissionId: string }>({
			query: ({ permissionId }) => ({
				url: `/api/v1/platform/permissions/${permissionId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { permissionId }) => [
				{ type: "PlatformPermission" as const, id: "LIST" },
				{ type: "PlatformPermission" as const, id: permissionId },
			],
		}),

		/** `GET /api/v1/platform/staff` */
		listPlatformStaff: builder.query<PlatformStaffOutput[], void>({
			query: () => ({
				url: "/api/v1/platform/staff",
				headers: bearerHeaders(),
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "PlatformStaff" as const, id: "LIST" },
							...result.map((s) => ({
								type: "PlatformStaff" as const,
								id: s.id,
							})),
						]
					: [{ type: "PlatformStaff" as const, id: "LIST" }],
		}),

		/** `POST /api/v1/platform/staff` */
		createPlatformStaff: builder.mutation<
			PlatformStaffOutput,
			{ body: PlatformStaffCreateRequest }
		>({
			query: ({ body }) => ({
				url: "/api/v1/platform/staff",
				method: "POST",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: [{ type: "PlatformStaff", id: "LIST" }],
		}),

		/** `GET /api/v1/platform/staff/{staff_id}` */
		getPlatformStaff: builder.query<PlatformStaffOutput, { staffId: string }>({
			query: ({ staffId }) => ({
				url: `/api/v1/platform/staff/${staffId}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { staffId }) => [
				{ type: "PlatformStaff" as const, id: staffId },
			],
		}),

		/** `PATCH /api/v1/platform/staff/{staff_id}` */
		updatePlatformStaff: builder.mutation<
			PlatformStaffOutput,
			{ staffId: string; body: PlatformStaffUpdateRequest }
		>({
			query: ({ staffId, body }) => ({
				url: `/api/v1/platform/staff/${staffId}`,
				method: "PATCH",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { staffId }) => [
				{ type: "PlatformStaff" as const, id: "LIST" },
				{ type: "PlatformStaff" as const, id: staffId },
			],
		}),

		/** `DELETE /api/v1/platform/staff/{staff_id}` */
		deletePlatformStaff: builder.mutation<void, { staffId: string }>({
			query: ({ staffId }) => ({
				url: `/api/v1/platform/staff/${staffId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { staffId }) => [
				{ type: "PlatformStaff" as const, id: "LIST" },
				{ type: "PlatformStaff" as const, id: staffId },
			],
		}),
	}),
});

export const {
	useListPlatformRolesQuery,
	useCreatePlatformRoleMutation,
	useGetPlatformRoleQuery,
	useUpdatePlatformRoleMutation,
	useDeletePlatformRoleMutation,
	useListPlatformRolePermissionsQuery,
	useAssignPlatformRolePermissionsMutation,
	useRemovePlatformRolePermissionMutation,
	useListPlatformPermissionsQuery,
	useCreatePlatformPermissionMutation,
	useDeletePlatformPermissionMutation,
	useListPlatformStaffQuery,
	useCreatePlatformStaffMutation,
	useGetPlatformStaffQuery,
	useUpdatePlatformStaffMutation,
	useDeletePlatformStaffMutation,
} = platformApi;
