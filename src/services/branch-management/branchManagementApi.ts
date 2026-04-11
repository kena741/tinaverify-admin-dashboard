import { createApi } from "@reduxjs/toolkit/query/react";
import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	BranchCreateRequest,
	BranchOutput,
	BranchUpdateRequest,
	BusinessCreateRequest,
	BusinessOutput,
} from "../types";

export const branchManagementApi = createApi({
	reducerPath: "branchManagementApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Branch"],
	endpoints: (builder) => ({
		createBusiness: builder.mutation<
			BusinessOutput,
			{ body: BusinessCreateRequest; accessToken: string }
		>({
			query: ({ body, accessToken }) => ({
				url: "/api/v1/business",
				method: "POST",
				body,
				headers: {
					Authorization: `Bearer ${accessToken ?? getStoredAccessToken() ?? ""}`,
				},
			}),
		}),

		listBusinessBranches: builder.query<
			BranchOutput[],
			{ businessId: string; accessToken: string }
		>({
			query: ({ businessId, accessToken }) => ({
				url: `/api/v1/business/${businessId}/branches`,
				headers: {
					Authorization: `Bearer ${accessToken ?? getStoredAccessToken() ?? ""}`,
				},
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "Branch" as const, id: "LIST" },
							...result.map((b) => ({ type: "Branch" as const, id: b.id })),
						]
					: [{ type: "Branch" as const, id: "LIST" }],
		}),

		getBranch: builder.query<
			BranchOutput,
			{ branchId: string; accessToken: string }
		>({
			query: ({ branchId, accessToken }) => ({
				url: `/api/v1/branches/${branchId}`,
				headers: {
					Authorization: `Bearer ${accessToken ?? getStoredAccessToken() ?? ""}`,
				},
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
					Authorization: `Bearer ${accessToken ?? getStoredAccessToken() ?? ""}`,
				},
			}),
			invalidatesTags: [{ type: "Branch", id: "LIST" }],
		}),

		updateBranch: builder.mutation<
			BranchOutput,
			{ branchId: string; body: BranchUpdateRequest; accessToken: string }
		>({
			query: ({ branchId, body, accessToken }) => ({
				url: `/api/v1/branches/${branchId}`,
				method: "PUT",
				body,
				headers: {
					Authorization: `Bearer ${accessToken ?? getStoredAccessToken() ?? ""}`,
				},
			}),
			invalidatesTags: (_result, _err, { branchId }) => [
				{ type: "Branch", id: branchId },
				{ type: "Branch", id: "LIST" },
			],
		}),

		deleteBranch: builder.mutation<
			void,
			{ branchId: string; accessToken: string }
		>({
			query: ({ branchId, accessToken }) => ({
				url: `/api/v1/branches/${branchId}`,
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${accessToken ?? getStoredAccessToken() ?? ""}`,
				},
			}),
			invalidatesTags: (_result, _err, { branchId }) => [
				{ type: "Branch", id: branchId },
				{ type: "Branch", id: "LIST" },
			],
		}),
	}),
});

export const {
	useCreateBusinessMutation,
	useCreateBranchMutation,
	useListBusinessBranchesQuery,
	useLazyListBusinessBranchesQuery,
	useGetBranchQuery,
	useLazyGetBranchQuery,
	useUpdateBranchMutation,
	useDeleteBranchMutation,
} = branchManagementApi;
