import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL!;

const baseUrl = BACKEND_BASE_URL.replace(/\/$/, "");

export type RegisterUserRequest = {
  phone_number: string;
  password: string;
  user_information: {
    first_name: string;
    last_name: string;
  };
  email?: string | null;
  username?: string | null;
};

export type UserOutput = {
  id: string;
  phone_number: string;
  username: string | null;
  email: string | null;
  is_superuser: boolean;
  is_active: boolean;
  user_information?: {
    first_name: string;
    last_name: string;
  } | null;
};

export type UserAuthResponse = {
  access_token: string;
  token_type: string;
  user: UserOutput;
};

export type BusinessCreateRequest = {
  name: string;
  tin_number: string;
};

export type BusinessOutput = {
  id: string;
  name: string;
  tin_number: string;
  owner_id: string;
  is_archived: boolean;
};

export type BranchCreateRequest = {
  business_id: string;
  name: string;
  address?: string | null;
  is_head_quarter?: boolean;
};

export type BranchOutput = {
  id: string;
  name: string;
  business_id: string;
  is_head_quarter: boolean;
  address: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export const backendApi = createApi({
  reducerPath: "backendApi",
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      headers.set("Accept", "application/json");
      return headers;
    },
  }),
  endpoints: (builder) => ({
    registerUser: builder.mutation<UserAuthResponse, RegisterUserRequest>({
      query: (body) => ({
        url: "/api/v1/users",
        method: "POST",
        body,
      }),
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

export const {
  useRegisterUserMutation,
  useCreateBusinessMutation,
  useCreateBranchMutation,
} = backendApi;

