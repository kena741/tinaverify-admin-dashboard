import { createApi } from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { backendBaseQuery } from "../baseQuery";
import { getStoredAccessToken } from "../authTokens";
import type {
	BranchOutput,
	BusinessOutput,
	LoginRequest,
	PaginatedUserResponse,
	RegisterUserRequest,
	UserPasswordUpdateRequest,
	UserAuthResponse,
	UserOutput,
	UserUpdateRequest,
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
		registerUser: builder.mutation<UserAuthResponse, RegisterUserRequest>({
			query: (body) => ({
				url: "/api/v1/users",
				method: "POST",
				body,
			}),
		}),

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

		refreshToken: builder.mutation<UserAuthResponse, { refreshToken: string }>({
			query: ({ refreshToken }) => ({
				url: "/api/v1/users/refresh-token",
				method: "POST",
				params: { refresh_token: refreshToken },
			}),
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

		/**
		 * `GET /api/v1/users/all` — pages until all users are loaded.
		 * Used for admin owner lists (join onto business.owner_id).
		 * Prefer getUserById when you only need a few users (e.g. platform staff).
		 */
		listAllUsers: builder.query<UserOutput[], void>({
			async queryFn(_arg, _api, _extraOptions, baseQuery) {
				const requestedLimit = 500;
				const first = await baseQuery({
					url: "/api/v1/users/all",
					method: "GET",
					params: { offset: 0, limit: requestedLimit },
					headers: bearerHeaders(),
				});
				if (first.error) {
					return { error: first.error as FetchBaseQueryError };
				}
				const firstPage = first.data as PaginatedUserResponse;
				const firstBatch = Array.isArray(firstPage?.items)
					? firstPage.items
					: [];
				if (firstBatch.length === 0) {
					return { data: [] };
				}

				// ponytail: API may clamp limit below requested; use what we actually got
				const pageSize = Math.max(
					1,
					Number(firstPage?.limit) ||
						Number(firstPage?.returned_count) ||
						firstBatch.length,
				);
				const total = Number(firstPage?.total_count);
				const items: UserOutput[] = [...firstBatch];

				if (Number.isFinite(total) && total > items.length) {
					const offsets: number[] = [];
					for (let offset = pageSize; offset < total; offset += pageSize) {
						offsets.push(offset);
					}
					const pages = await Promise.all(
						offsets.map((offset) =>
							baseQuery({
								url: "/api/v1/users/all",
								method: "GET",
								params: { offset, limit: pageSize },
								headers: bearerHeaders(),
							}),
						),
					);
					for (const res of pages) {
						if (res.error) {
							return { error: res.error as FetchBaseQueryError };
						}
						const page = res.data as PaginatedUserResponse;
						const batch = Array.isArray(page?.items) ? page.items : [];
						items.push(...batch);
					}
				} else if (!Number.isFinite(total) && firstBatch.length >= pageSize) {
					let offset = pageSize;
					for (;;) {
						const res = await baseQuery({
							url: "/api/v1/users/all",
							method: "GET",
							params: { offset, limit: pageSize },
							headers: bearerHeaders(),
						});
						if (res.error) {
							return { error: res.error as FetchBaseQueryError };
						}
						const page = res.data as PaginatedUserResponse;
						const batch = Array.isArray(page?.items) ? page.items : [];
						if (batch.length === 0) break;
						items.push(...batch);
						if (batch.length < pageSize) break;
						offset += pageSize;
					}
				}

				return { data: items };
			},
			keepUnusedDataFor: 300,
			providesTags: () => [{ type: "User" as const, id: "LIST" }],
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

		/** `PATCH /api/v1/users/{user_id}` */
		updateUser: builder.mutation<
			UserOutput,
			{ userId: string; body: UserUpdateRequest }
		>({
			query: ({ userId, body }) => ({
				url: `/api/v1/users/${userId}`,
				method: "PATCH",
				body,
				headers: { "Content-Type": "application/json", ...bearerHeaders() },
			}),
			invalidatesTags: (_r, _e, { userId }) => [
				{ type: "User" as const, id: userId },
				{ type: "User" as const, id: "LIST" },
				{ type: "Me" as const, id: "ME" },
			],
		}),

		/** `DELETE /api/v1/users/{user_id}` */
		deleteUser: builder.mutation<void, { userId: string }>({
			query: ({ userId }) => ({
				url: `/api/v1/users/${userId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_r, _e, { userId }) => [
				{ type: "User" as const, id: userId },
				{ type: "User" as const, id: "LIST" },
			],
		}),

		/** `PATCH /api/v1/users/me/password?user_id=...` */
		updateMyPassword: builder.mutation<
			void,
			{ userId: string; body: UserPasswordUpdateRequest }
		>({
			query: ({ userId, body }) => ({
				url: "/api/v1/users/me/password",
				method: "PATCH",
				params: { user_id: userId },
				body,
				headers: { "Content-Type": "application/json", ...bearerHeaders() },
			}),
		}),
	}),
});

export const {
	useRegisterUserMutation,
	useLoginUserMutation,
	useReadMeQuery,
	useLazyReadMeQuery,
	useRefreshTokenMutation,
	useListMyBusinessesQuery,
	useGetMyBranchQuery,
	useListAllUsersQuery,
	useGetUserByIdQuery,
	useLazyGetUserByIdQuery,
	useUpdateUserMutation,
	useDeleteUserMutation,
	useUpdateMyPasswordMutation,
} = authApi;
