import { createApi } from "@reduxjs/toolkit/query/react";

import { authApi } from "../auth/authApi";
import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import { branchManagementApi } from "../branch-management/branchManagementApi";
import { subscriptionApi } from "../subscription/subscriptionApi";
import type {
	AdminBusinessCreateRequest,
	AdminManualSubscriptionRequest,
	AuditLogOutput,
	BusinessOutput,
	RegisterUserRequest,
	SubscriptionOutput,
	UpdateSuperuserRequest,
	UserOutput,
} from "../types";

function bearerHeaders(accessToken?: string | null) {
	const token =
		accessToken !== undefined && accessToken !== null && accessToken !== ""
			? accessToken
			: getStoredAccessToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export const adminApi = createApi({
	reducerPath: "adminApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["AuditLog"],
	endpoints: (builder) => ({
		/** `GET /api/v1/admin/audit-logs` */
		listAdminAuditLogs: builder.query<
			AuditLogOutput[],
			{
				limit?: number;
				offset?: number;
				startDate?: string | null;
				endDate?: string | null;
				action?: string | null;
				adminId?: string | null;
			} | void
		>({
			query: (arg) => {
				const params: Record<string, string | number> = {
					limit: arg?.limit ?? 50,
					offset: arg?.offset ?? 0,
				};
				if (arg?.startDate) params.start_date = arg.startDate;
				if (arg?.endDate) params.end_date = arg.endDate;
				if (arg?.action) params.action = arg.action;
				if (arg?.adminId) params.admin_id = arg.adminId;
				return {
					url: "/api/v1/admin/audit-logs",
					params,
					headers: bearerHeaders(),
				};
			},
			providesTags: (result) =>
				result
					? [
							{ type: "AuditLog" as const, id: "LIST" },
							...result.map((row) => ({
								type: "AuditLog" as const,
								id: row.id,
							})),
						]
					: [{ type: "AuditLog" as const, id: "LIST" }],
		}),

		/** `POST /api/v1/admin/users/register` */
		adminRegisterUser: builder.mutation<UserOutput, { body: RegisterUserRequest }>(
			{
				query: ({ body }) => ({
					url: "/api/v1/admin/users/register",
					method: "POST",
					body,
					headers: {
						"Content-Type": "application/json",
						...bearerHeaders(),
					},
				}),
				invalidatesTags: [{ type: "AuditLog", id: "LIST" }],
				async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
					try {
						const { data: user } = await queryFulfilled;
						dispatch(
							authApi.util.updateQueryData("listAllUsers", undefined, (draft) => {
								if (!draft.some((u) => u.id === user.id)) draft.push(user);
							}),
						);
					} catch {
						/* keep cache */
					}
				},
			},
		),

		/** `POST /api/v1/admin/businesses` */
		adminCreateBusiness: builder.mutation<
			BusinessOutput,
			{ body: AdminBusinessCreateRequest }
		>({
			query: ({ body }) => ({
				url: "/api/v1/admin/businesses",
				method: "POST",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: [{ type: "AuditLog", id: "LIST" }],
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(
						branchManagementApi.util.invalidateTags([
							{ type: "Business", id: "LIST" },
						]),
					);
				} catch {
					/* keep cache */
				}
			},
		}),

		/** `POST /api/v1/admin/subscriptions` — multipart: `business_id`, `plan_id`, `amount?`, `file` */
		adminAssignSubscription: builder.mutation<
			SubscriptionOutput,
			{ body: AdminManualSubscriptionRequest }
		>({
			query: ({ body }) => {
				const formData = new FormData();
				formData.append("business_id", body.business_id);
				formData.append("plan_id", body.plan_id);
				if (body.amount != null) {
					formData.append("amount", String(body.amount));
				}
				formData.append("file", body.file);
				return {
					url: "/api/v1/admin/subscriptions",
					method: "POST",
					body: formData,
					headers: bearerHeaders(),
				};
			},
			invalidatesTags: [{ type: "AuditLog", id: "LIST" }],
			async onQueryStarted({ body }, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(
						subscriptionApi.util.invalidateTags([
							{ type: "Subscription", id: body.business_id },
							{ type: "SubscriptionUsage", id: body.business_id },
							{ type: "SubscriptionTransactions", id: "LIST" },
							{ type: "TransactionLogs", id: "LIST" },
						]),
					);
				} catch {
					/* keep cache */
				}
			},
		}),

		/** `PATCH /api/v1/admin/users/{user_id}/superuser` */
		adminUpdateSuperuser: builder.mutation<
			UserOutput,
			{ userId: string; body: UpdateSuperuserRequest }
		>({
			query: ({ userId, body }) => ({
				url: `/api/v1/admin/users/${userId}/superuser`,
				method: "PATCH",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: [{ type: "AuditLog", id: "LIST" }],
			async onQueryStarted({ userId }, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(
						authApi.util.invalidateTags([
							{ type: "User", id: "LIST" },
							{ type: "User", id: userId },
						]),
					);
				} catch {
					/* keep cache */
				}
			},
		}),
	}),
});

export const {
	useListAdminAuditLogsQuery,
	useAdminRegisterUserMutation,
	useAdminCreateBusinessMutation,
	useAdminAssignSubscriptionMutation,
	useAdminUpdateSuperuserMutation,
} = adminApi;
