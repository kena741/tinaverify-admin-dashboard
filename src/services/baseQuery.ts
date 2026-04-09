import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL!;

export const backendBaseUrl = BACKEND_BASE_URL.replace(/\/$/, "");

export const backendBaseQuery = fetchBaseQuery({
  baseUrl: backendBaseUrl,
  prepareHeaders: (headers) => {
    headers.set("Accept", "application/json");
    return headers;
  },
});

