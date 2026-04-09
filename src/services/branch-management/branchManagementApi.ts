import { createApi } from "@reduxjs/toolkit/query/react";
import { backendBaseQuery } from "../baseQuery";
import type {
	BranchCreateRequest,
	BranchOutput,
	BusinessCreateRequest,
	BusinessOutput,
} from "../types";

export const branchManagementApi = createApi({
	reducerPath: "branchManagementApi",
	baseQuery: backendBaseQuery,
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
					Authorization: `Bearer ${accessToken}`,
				},
			}),
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
					Authorization: `Bearer ${accessToken}`,
				},
			}),
		}),
	}),
});

export const { useCreateBusinessMutation, useCreateBranchMutation } =
	branchManagementApi;
