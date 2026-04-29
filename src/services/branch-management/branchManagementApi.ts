import { createApi } from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	BranchCreateRequest,
	BranchOutput,
	BranchUpdateRequest,
	BusinessCreateRequest,
	BusinessOutput,
	EmployeeOutput,
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

export type ListAllUserBranchesResult = {
	branches: BranchOutput[];
	myBusinesses: { id: string; name: string }[];
};

export const branchManagementApi = createApi({
	reducerPath: "branchManagementApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Branch", "MyBusinesses", "Business", "Employee", "Role"],
	endpoints: (builder) => ({
		/** `GET /api/v1/business` */
		listAllBusinesses: builder.query<BusinessOutput[], void>({
			query: () => ({
				url: "/api/v1/business",
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "Business", id: "LIST" }],
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

		createBusiness: builder.mutation<
			BusinessOutput,
			{ body: BusinessCreateRequest; accessToken: string }
		>({
			query: ({ body, accessToken }) => ({
				url: "/api/v1/business",
				method: "POST",
				body,
				headers: {
					...bearerHeaders(accessToken),
				},
			}),
			invalidatesTags: [
				{ type: "MyBusinesses", id: "LIST" },
				{ type: "Business", id: "LIST" },
				{ type: "Branch", id: "LIST" },
			],
		}),

		/** `GET /api/v1/business/roles?business_id=` */
		listBusinessRoles: builder.query<RoleOutput[], { businessId: string }>({
			query: ({ businessId }) => ({
				url: "/api/v1/business/roles",
				params: { business_id: businessId },
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { businessId }) => [
				{ type: "Role" as const, id: businessId },
			],
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
	useListAllBusinessesQuery,
	useListMyBusinessesQuery,
	useListAllUserBranchesQuery,
	useListBusinessRolesQuery,
	useListBusinessEmployeesQuery,
	useCreateBusinessMutation,
	useCreateBranchMutation,
	useListBusinessBranchesQuery,
	useLazyListBusinessBranchesQuery,
	useGetBranchQuery,
	useLazyGetBranchQuery,
	useUpdateBranchMutation,
	useDeleteBranchMutation,
} = branchManagementApi;
