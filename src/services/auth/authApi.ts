import { createApi } from "@reduxjs/toolkit/query/react";
import { backendBaseQuery } from "../baseQuery";
import { getStoredAccessToken } from "../authTokens";
import type {
	LoginRequest,
	RegisterUserRequest,
	UserAuthResponse,
	UserOutput,
} from "../types";

export const authApi = createApi({
	reducerPath: "authApi",
	baseQuery: backendBaseQuery,
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
			query: () => {
				const token = getStoredAccessToken();
				return {
					url: "/api/v1/users/me",
					method: "GET",
					headers: token
						? { Authorization: `Bearer ${token}` }
						: {},
				};
			},
		}),

		refreshToken: builder.mutation<UserAuthResponse, { refreshToken: string }>({
			query: ({ refreshToken }) => ({
				url: "/api/v1/users/refresh-token",
				method: "POST",
				params: { refresh_token: refreshToken },
			}),
		}),
	}),
});

export const {
	useRegisterUserMutation,
	useLoginUserMutation,
	useLazyReadMeQuery,
	useRefreshTokenMutation,
} = authApi;
