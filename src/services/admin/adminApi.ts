import { createApi } from "@reduxjs/toolkit/query/react";

import { authApi } from "../auth/authApi";
import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import { branchManagementApi } from "../branch-management/branchManagementApi";
import { subscriptionApi } from "../subscription/subscriptionApi";
import type {
	AdminBusinessCreateRequest,
	AdminManualSubscriptionRequest,
	AdminUserRegisterRequest,
	AuditLogOutput,
	BusinessOutput,
	ManualSubscriptionResponse,
	ManualSubscriptionStatus,
	PaginatedManualSubscriptionResponse,
	SubscriptionOutput,
	SystemBankAccountCreateRequest,
	SystemBankAccountOutput,
	SystemBankAccountUpdateRequest,
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
	tagTypes: ["AuditLog", "SystemBank", "ManualSubscription", "Subscription"],
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
				const query = (arg ?? {}) as {
					limit?: number;
					offset?: number;
					startDate?: string | null;
					endDate?: string | null;
					action?: string | null;
					adminId?: string | null;
				};
				const params: Record<string, string | number> = {
					limit: query.limit ?? 50,
					offset: query.offset ?? 0,
				};
				if (query.startDate) params.start_date = query.startDate;
				if (query.endDate) params.end_date = query.endDate;
				if (query.action) params.action = query.action;
				if (query.adminId) params.admin_id = query.adminId;
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
		adminRegisterUser: builder.mutation<
			UserOutput,
			{ body: AdminUserRegisterRequest }
		>({
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
		}),

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

		/**
		 * `POST /api/v1/admin/subscriptions`
		 * Query: `is_internal`. Multipart: `business_id`, `plan_id`, `amount?`, `file`.
		 */
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
				if (body.file) {
					formData.append("file", body.file);
				}
				return {
					url: "/api/v1/admin/subscriptions",
					method: "POST",
					params: {
						is_internal: body.is_internal === true,
					},
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

		/** `POST /api/v1/admin/system-banks` */
		adminCreateSystemBank: builder.mutation<
			SystemBankAccountOutput,
			{ body: SystemBankAccountCreateRequest }
		>({
			query: ({ body }) => ({
				url: "/api/v1/admin/system-banks",
				method: "POST",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: [{ type: "SystemBank" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/admin/system-banks` */
		adminListSystemBanks: builder.query<
			SystemBankAccountOutput[],
			{ isActive?: boolean | null } | void
		>({
			query: (arg) => {
				const query = (arg ?? {}) as { isActive?: boolean | null };
				return {
					url: "/api/v1/admin/system-banks",
					params:
						query.isActive != null ? { is_active: query.isActive } : undefined,
					headers: bearerHeaders(),
				};
			},
			transformResponse: (response: unknown) => {
				if (Array.isArray(response))
					return response as SystemBankAccountOutput[];
				return [];
			},
			providesTags: [{ type: "SystemBank" as const, id: "LIST" }],
		}),

		/** `PATCH /api/v1/admin/system-banks/{bank_id}` */
		adminUpdateSystemBank: builder.mutation<
			SystemBankAccountOutput,
			{ bankId: string; body: SystemBankAccountUpdateRequest }
		>({
			query: ({ bankId, body }) => ({
				url: `/api/v1/admin/system-banks/${bankId}`,
				method: "PATCH",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: [{ type: "SystemBank" as const, id: "LIST" }],
		}),

		/** `DELETE /api/v1/admin/system-banks/{bank_id}` */
		adminDeleteSystemBank: builder.mutation<void, { bankId: string }>({
			query: ({ bankId }) => ({
				url: `/api/v1/admin/system-banks/${bankId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: [{ type: "SystemBank" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/admin/manual-subscriptions` */
		listAdminManualSubscriptions: builder.query<
			PaginatedManualSubscriptionResponse,
			{
				reqStatus?: ManualSubscriptionStatus | null;
				limit?: number;
				offset?: number;
			} | void
		>({
			query: (arg) => {
				const query = (arg ?? {}) as {
					reqStatus?: ManualSubscriptionStatus | null;
					limit?: number;
					offset?: number;
				};
				const params: Record<string, string | number> = {};
				if (query.reqStatus) params.req_status = query.reqStatus;
				if (query.limit != null) params.limit = query.limit;
				if (query.offset != null) params.offset = query.offset;
				return {
					url: "/api/v1/admin/manual-subscriptions",
					params: Object.keys(params).length > 0 ? params : undefined,
					headers: bearerHeaders(),
				};
			},
			providesTags: [{ type: "ManualSubscription" as const, id: "LIST" }],
		}),

		/** `POST /api/v1/admin/manual-subscriptions/{request_id}/approve` */
		adminApproveManualSubscription: builder.mutation<
			SubscriptionOutput,
			{ requestId: string }
		>({
			query: ({ requestId }) => ({
				url: `/api/v1/admin/manual-subscriptions/${requestId}/approve`,
				method: "POST",
				headers: bearerHeaders(),
			}),
			invalidatesTags: [
				{ type: "ManualSubscription" as const, id: "LIST" },
				{ type: "Subscription" as const, id: "LIST" },
			],
		}),

		/** `POST /api/v1/admin/manual-subscriptions/{request_id}/reject` */
		adminRejectManualSubscription: builder.mutation<
			ManualSubscriptionResponse,
			{ requestId: string }
		>({
			query: ({ requestId }) => ({
				url: `/api/v1/admin/manual-subscriptions/${requestId}/reject`,
				method: "POST",
				headers: bearerHeaders(),
			}),
			invalidatesTags: [{ type: "ManualSubscription" as const, id: "LIST" }],
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
	useAdminCreateSystemBankMutation,
	useAdminListSystemBanksQuery,
	useAdminUpdateSystemBankMutation,
	useAdminDeleteSystemBankMutation,
	useListAdminManualSubscriptionsQuery,
	useAdminApproveManualSubscriptionMutation,
	useAdminRejectManualSubscriptionMutation,
	useAdminUpdateSuperuserMutation,
} = adminApi;
