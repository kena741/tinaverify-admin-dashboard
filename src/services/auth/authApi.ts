import { createApi } from "@reduxjs/toolkit/query/react";
import { backendBaseQuery } from "../baseQuery";
import { getStoredAccessToken } from "../authTokens";
import type {
	BranchOutput,
	BusinessOutput,
	LoginRequest,
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
			invalidatesTags: (_r, _e, { userId }) => [{ type: "User" as const, id: userId }],
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
	useGetUserByIdQuery,
	useLazyGetUserByIdQuery,
	useUpdateUserMutation,
	useDeleteUserMutation,
	useUpdateMyPasswordMutation,
} = authApi;
