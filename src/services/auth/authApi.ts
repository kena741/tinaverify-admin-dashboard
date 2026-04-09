import { createApi } from "@reduxjs/toolkit/query/react";
import { backendBaseQuery } from "../baseQuery";
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

		readMe: builder.query<UserOutput, { accessToken: string }>({
			query: ({ accessToken }) => ({
				url: "/api/v1/users/me",
				method: "GET",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}),
		}),
	}),
});

export const {
	useRegisterUserMutation,
	useLoginUserMutation,
	useLazyReadMeQuery,
} = authApi;
