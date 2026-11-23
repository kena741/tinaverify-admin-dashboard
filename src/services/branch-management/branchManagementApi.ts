import { createApi } from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import {
	ADMIN_LIST_MAX_PAGE_SIZE,
	ADMIN_LIST_PAGE_SIZE,
	fetchAllPaginatedItems,
} from "../paginatedFetch";
import type {
	BranchCreateRequest,
	BranchOutput,
	BranchUpdateRequest,
	BusinessOutput,
	CreateEmployeeUserRequest,
	CreateEmployeeUserResponse,
	DeactivateBusinessRequest,
	EmployeeOutput,
	PaginatedBusinessResponse,
	UpdateEmployeeRequest,
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

export type ListAllUserBranchesResult = {
	branches: BranchOutput[];
	myBusinesses: { id: string; name: string }[];
};

/** `GET /api/v1/business` query — pagination + server filters. */
export type ListBusinessesParams = {
	offset?: number;
	limit?: number;
	owner_id?: string | null;
	owner_name?: string | null;
	business_name?: string | null;
	phone?: string | null;
	plan_id?: string | null;
	plan_name?: string | null;
	subscription_status?: string | null;
	subscription_type?: string | null;
	is_active?: boolean | null;
	min_amount?: number | null;
	max_amount?: number | null;
	min_credits?: number | null;
	max_credits?: number | null;
	from_date?: string | null;
	to_date?: string | null;
};

function listBusinessesQueryParams(
	arg: ListBusinessesParams,
): Record<string, string | number | boolean> {
	const params: Record<string, string | number | boolean> = {
		offset: arg.offset ?? 0,
		limit: arg.limit ?? ADMIN_LIST_PAGE_SIZE,
	};
	const ownerId = arg.owner_id?.trim();
	const ownerName = arg.owner_name?.trim();
	const businessName = arg.business_name?.trim();
	const phone = arg.phone?.trim();
	const planId = arg.plan_id?.trim();
	const planName = arg.plan_name?.trim();
	const subscriptionStatus = arg.subscription_status?.trim();
	const subscriptionType = arg.subscription_type?.trim();
	const fromDate = arg.from_date?.trim();
	const toDate = arg.to_date?.trim();
	if (ownerId) params.owner_id = ownerId;
	if (ownerName) params.owner_name = ownerName;
	if (businessName) params.business_name = businessName;
	if (phone) params.phone = phone;
	if (planId) params.plan_id = planId;
	if (planName) params.plan_name = planName;
	if (subscriptionStatus) params.subscription_status = subscriptionStatus;
	if (subscriptionType) params.subscription_type = subscriptionType;
	if (arg.is_active === true || arg.is_active === false) {
		params.is_active = arg.is_active;
	}
	if (arg.min_amount != null && Number.isFinite(arg.min_amount)) {
		params.min_amount = arg.min_amount;
	}
	if (arg.max_amount != null && Number.isFinite(arg.max_amount)) {
		params.max_amount = arg.max_amount;
	}
	if (arg.min_credits != null && Number.isFinite(arg.min_credits)) {
		params.min_credits = arg.min_credits;
	}
	if (arg.max_credits != null && Number.isFinite(arg.max_credits)) {
		params.max_credits = arg.max_credits;
	}
	if (fromDate) params.from_date = fromDate;
	if (toDate) params.to_date = toDate;
	return params;
}

export const branchManagementApi = createApi({
	reducerPath: "branchManagementApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Branch", "MyBusinesses", "Business", "Employee"],
	endpoints: (builder) => ({
		/** `GET /api/v1/business` — one paginated slice. */
		listBusinesses: builder.query<PaginatedBusinessResponse, ListBusinessesParams>(
			{
				query: (arg) => ({
					url: "/api/v1/business",
					method: "GET",
					params: listBusinessesQueryParams(arg),
					headers: bearerHeaders(),
				}),
				providesTags: (result) =>
					result
						? [
								{ type: "Business" as const, id: "LIST" },
								...result.items.map((b) => ({
									type: "Business" as const,
									id: b.id,
								})),
							]
						: [{ type: "Business" as const, id: "LIST" }],
			},
		),

		/**
		 * `GET /api/v1/business` — loads every page sequentially in small batches.
		 * Prefer `listBusinesses` + `useAccumulatedPaginatedQuery` for progressive UI.
		 */
		listAllBusinesses: builder.query<BusinessOutput[], ListBusinessesParams | void>({
			async queryFn(arg, _api, _extraOptions, baseQuery) {
				const params = listBusinessesQueryParams(arg ?? {});
				delete params.offset;
				delete params.limit;
				return fetchAllPaginatedItems<BusinessOutput>(
					baseQuery as (arg: {
						url: string;
						method?: string;
						params?: Record<string, string | number>;
						headers?: Record<string, string>;
					}) => Promise<{ data?: unknown; error?: unknown }>,
					"/api/v1/business",
					bearerHeaders() as Record<string, string>,
					ADMIN_LIST_MAX_PAGE_SIZE,
					params as Record<string, string | number>,
				);
			},
			providesTags: (result) =>
				result
					? [
							{ type: "Business" as const, id: "LIST" },
							...result.map((b) => ({
								type: "Business" as const,
								id: b.id,
							})),
						]
					: [{ type: "Business" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/business/{business_id}` */
		getBusiness: builder.query<BusinessOutput, { businessId: string }>({
			query: ({ businessId }) => ({
				url: `/api/v1/business/${businessId}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { businessId }) => [
				{ type: "Business" as const, id: businessId },
			],
		}),

		/** `DELETE /api/v1/business/{business_id}` */
		deleteBusiness: builder.mutation<void, { businessId: string }>({
			query: ({ businessId }) => ({
				url: `/api/v1/business/${businessId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { businessId }) => [
				{ type: "Business", id: "LIST" },
				{ type: "Business", id: businessId },
				{ type: "Branch", id: "LIST" },
				{ type: "Employee", id: businessId },
			],
		}),

		/** `PATCH /api/v1/business/{business_id}/deactivate` */
		setBusinessActive: builder.mutation<
			void,
			{ businessId: string; body: DeactivateBusinessRequest }
		>({
			query: ({ businessId, body }) => ({
				url: `/api/v1/business/${businessId}/deactivate`,
				method: "PATCH",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { businessId }) => [
				{ type: "Business", id: "LIST" },
				{ type: "Business", id: businessId },
			],
		}),

		listMyBusinesses: builder.query<BusinessOutput[], void>({
			query: () => ({
				url: "/api/v1/users/me/business",
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "MyBusinesses", id: "LIST" }],
		}),

		/**
		 * `GET /api/v1/users/me/business`, then `GET /api/v1/business/{business_id}/branches` per business.
		 */
		listAllUserBranches: builder.query<ListAllUserBranchesResult, void>({
			async queryFn(_arg, _api, _extraOptions, baseQuery) {
				const bizRes = await baseQuery({
					url: "/api/v1/users/me/business",
					headers: bearerHeaders(),
				});
				if (bizRes.error) {
					return { error: bizRes.error as FetchBaseQueryError };
				}
				const businesses = bizRes.data as BusinessOutput[];
				if (businesses.length === 0) {
					return { data: { branches: [], myBusinesses: [] } };
				}
				const branchResults = await Promise.all(
					businesses.map((b) =>
						baseQuery({
							url: `/api/v1/business/${b.id}/branches`,
							headers: bearerHeaders(),
						}),
					),
				);
				for (const r of branchResults) {
					if (r.error) {
						return { error: r.error as FetchBaseQueryError };
					}
				}
				const branches = branchResults.flatMap(
					(r) => r.data as BranchOutput[],
				);
				return {
					data: {
						branches,
						myBusinesses: businesses.map((b) => ({
							id: b.id,
							name: b.name,
						})),
					},
				};
			},
			providesTags: (result) =>
				result
					? [
							{ type: "Branch" as const, id: "LIST" },
							...result.branches.map((b) => ({
								type: "Branch" as const,
								id: b.id,
							})),
						]
					: [{ type: "Branch" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/business/{business_id}/employees` */
		listBusinessEmployees: builder.query<EmployeeOutput[], { businessId: string }>({
			query: ({ businessId }) => ({
				url: `/api/v1/business/${businessId}/employees`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { businessId }) => [
				{ type: "Employee" as const, id: businessId },
			],
		}),

		/** `PUT /api/v1/business/{business_id}/employees/{employee_id}` */
		updateEmployeeRole: builder.mutation<
			EmployeeOutput,
			{ businessId: string; employeeId: string; body: UpdateEmployeeRequest }
		>({
			query: ({ businessId, employeeId, body }) => ({
				url: `/api/v1/business/${businessId}/employees/${employeeId}`,
				method: "PUT",
				body,
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { businessId }) => [
				{ type: "Employee", id: businessId },
			],
		}),

		createEmployee: builder.mutation<
			CreateEmployeeUserResponse,
			{ body: CreateEmployeeUserRequest }
		>({
			query: ({ body }) => ({
				url: "/api/v1/business/employees/create-user",
				method: "POST",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_result, _err, { body }) => [
				{ type: "Employee", id: body.business_id },
			],
		}),

		deleteEmployee: builder.mutation<
			void,
			{ businessId: string; employeeId: string }
		>({
			query: ({ businessId, employeeId }) => ({
				url: `/api/v1/business/${businessId}/employees/${employeeId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { businessId }) => [
				{ type: "Employee", id: businessId },
			],
		}),

		listBusinessBranches: builder.query<
			BranchOutput[],
			{ businessId: string; accessToken?: string | null }
		>({
			query: ({ businessId, accessToken }) => ({
				url: `/api/v1/business/${businessId}/branches`,
				headers: bearerHeaders(accessToken),
			}),
			providesTags: (result, _err, { businessId }) =>
				result
					? [
							{ type: "Branch" as const, id: "LIST" },
							{ type: "Branch" as const, id: `BUSINESS_${businessId}` },
							...result.map((b) => ({
								type: "Branch" as const,
								id: b.id,
							})),
						]
					: [
							{ type: "Branch" as const, id: "LIST" },
							{ type: "Branch" as const, id: `BUSINESS_${businessId}` },
						],
		}),

		getBranch: builder.query<
			BranchOutput,
			{ branchId: string; accessToken?: string | null }
		>({
			query: ({ branchId, accessToken }) => ({
				url: `/api/v1/branches/${branchId}`,
				headers: bearerHeaders(accessToken),
			}),
			providesTags: (_result, _err, { branchId }) => [
				{ type: "Branch" as const, id: branchId },
			],
		}),

		createBranch: builder.mutation<
			BranchOutput,
			{ body: BranchCreateRequest; accessToken: string }
		>({
			query: ({ body, accessToken }) => ({
				url: "/api/v1/branches",
				method: "POST",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(accessToken),
				},
			}),
			invalidatesTags: [
				{ type: "Branch", id: "LIST" },
				{ type: "MyBusinesses", id: "LIST" },
			],
		}),

		updateBranch: builder.mutation<
			BranchOutput,
			{ branchId: string; body: BranchUpdateRequest; accessToken?: string | null }
		>({
			query: ({ branchId, body, accessToken }) => ({
				url: `/api/v1/branches/${branchId}`,
				method: "PUT",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(accessToken),
				},
			}),
			invalidatesTags: (_result, _err, { branchId }) => [
				{ type: "Branch", id: branchId },
				{ type: "Branch", id: "LIST" },
			],
		}),

		deleteBranch: builder.mutation<
			void,
			{ branchId: string; accessToken?: string | null }
		>({
			query: ({ branchId, accessToken }) => ({
				url: `/api/v1/branches/${branchId}`,
				method: "DELETE",
				headers: bearerHeaders(accessToken),
			}),
			invalidatesTags: (_result, _err, { branchId }) => [
				{ type: "Branch", id: branchId },
				{ type: "Branch", id: "LIST" },
			],
		}),
	}),
});

export const {
	useListBusinessesQuery,
	useListAllBusinessesQuery,
	useGetBusinessQuery,
	useLazyGetBusinessQuery,
	useDeleteBusinessMutation,
	useSetBusinessActiveMutation,
	useListMyBusinessesQuery,
	useListAllUserBranchesQuery,
	useListBusinessEmployeesQuery,
	useUpdateEmployeeRoleMutation,
	useCreateEmployeeMutation,
	useDeleteEmployeeMutation,
	useCreateBranchMutation,
	useListBusinessBranchesQuery,
	useGetBranchQuery,
	useUpdateBranchMutation,
	useDeleteBranchMutation,
} = branchManagementApi;
