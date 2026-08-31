import { createApi } from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { backendBaseQuery } from "../baseQuery";
import { getStoredAccessToken } from "../authTokens";
import {
	ADMIN_LIST_PAGE_SIZE,
	fetchAllPaginatedItems,
} from "../paginatedFetch";
import type {
	BranchOutput,
	BusinessOutput,
	LoginRequest,
	PaginatedUserResponse,
	UserAuthResponse,
	UserOutput,
} from "../types";

function bearerHeaders(accessToken?: string | null) {
	const token =
		accessToken !== undefined && accessToken !== null && accessToken !== ""
			? accessToken
			: getStoredAccessToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export const authApi = createApi({
	reducerPath: "authApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Me", "User", "MyBusinesses", "MyBranch"],
	endpoints: (builder) => ({
		loginUser: builder.mutation<UserAuthResponse, LoginRequest>({
			query: ({ username, password }) => {
				const body = new URLSearchParams();
				body.set("username", username);
				body.set("password", password);
				return {
					url: "/api/v1/users/login",
					method: "POST",
					body,
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
				};
			},
		}),

		readMe: builder.query<UserOutput, void>({
			query: () => ({
				url: "/api/v1/users/me",
				method: "GET",
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "Me" as const, id: "ME" }],
		}),

		/** `GET /api/v1/users/me/business` */
		listMyBusinesses: builder.query<BusinessOutput[], void>({
			query: () => ({
				url: "/api/v1/users/me/business",
				method: "GET",
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "MyBusinesses" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/users/me/branch` */
		getMyBranch: builder.query<BranchOutput | null, void>({
			query: () => ({
				url: "/api/v1/users/me/branch",
				method: "GET",
				headers: bearerHeaders(),
			}),
			providesTags: [{ type: "MyBranch" as const, id: "ME" }],
		}),

		/** `GET /api/v1/users/all` — one paginated slice. */
		listUsers: builder.query<
			PaginatedUserResponse,
			{ offset?: number; limit?: number }
		>({
			query: ({ offset = 0, limit = ADMIN_LIST_PAGE_SIZE }) => ({
				url: "/api/v1/users/all",
				method: "GET",
				params: { offset, limit },
				headers: bearerHeaders(),
			}),
			providesTags: (result) =>
				result
					? [
							{ type: "User" as const, id: "LIST" },
							...result.items.map((user) => ({
								type: "User" as const,
								id: user.id,
							})),
						]
					: [{ type: "User" as const, id: "LIST" }],
		}),

		/**
		 * `GET /api/v1/users/all` — loads every page sequentially in small batches.
		 * Prefer `listUsers` + `useAccumulatedPaginatedQuery` for progressive UI.
		 */
		listAllUsers: builder.query<UserOutput[], void>({
			async queryFn(_arg, _api, _extraOptions, baseQuery) {
				return fetchAllPaginatedItems<UserOutput>(
					baseQuery as (arg: {
						url: string;
						method?: string;
						params?: Record<string, string | number>;
						headers?: Record<string, string>;
					}) => Promise<{ data?: unknown; error?: unknown }>,
					"/api/v1/users/all",
					bearerHeaders() as Record<string, string>,
				);
			},
			keepUnusedDataFor: 300,
			providesTags: (result) =>
				result
					? [
							{ type: "User" as const, id: "LIST" },
							...result.map((user) => ({
								type: "User" as const,
								id: user.id,
							})),
						]
					: [{ type: "User" as const, id: "LIST" }],
		}),

		/** `GET /api/v1/users/{user_id}` */
		getUserById: builder.query<UserOutput, { userId: string }>({
			query: ({ userId }) => ({
				url: `/api/v1/users/${userId}`,
				method: "GET",
				headers: bearerHeaders(),
			}),
			providesTags: (_r, _e, { userId }) => [{ type: "User" as const, id: userId }],
		}),
	}),
});

export const {
	useReadMeQuery,
	useListMyBusinessesQuery,
	useGetMyBranchQuery,
	useListUsersQuery,
	useListAllUsersQuery,
	useGetUserByIdQuery,
} = authApi;
