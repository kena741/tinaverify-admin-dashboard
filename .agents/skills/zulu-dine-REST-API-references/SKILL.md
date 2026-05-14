# Cursor Skill: Sync OpenAPI to RTK Query

This skill allows Cursor to automatically fetch the latest `openapi.json` from a remote server and synchronize your TypeScript types and Redux Toolkit Query (RTKQ) endpoints.

## Context
Use this skill when the backend API changes or when initializing new API features. It ensures that the frontend remains type-safe and consistent with the backend specification.

## Workflow

### 1. Fetching the Specification
Whenever I ask to "sync the API" or "update types," perform the following:
* **Action:** Run the `fetch-openai-json.sh` script.
* **Output:** The script will update the `@/src/services/openapi.json` file.

### 2. Type Generation
After fetching the JSON, generate or update the TypeScript interfaces:
* **Output:** Update the types in the `@/src/services/types.ts` file if they are changed in the `openapi.json` file.

### 3. RTK Query Integration
Update the Redux Toolkit Query base API or specific injected endpoints:
* **Path:** `@/src/services/baseQuery.ts`
* **Logic:** Map new endpoints from the OpenAPI paths.
    * Ensure `providesTags` and `invalidatesTags` are updated for cache consistency.
    * Use the generated types for `QueryArg` and `ResultType`.

## Guidelines for Cursor
* **Validation:** If the fetched `openapi.json` is invalid or unreachable, stop and report the error instead of deleting existing code.
* **Incremental Updates:** When updating `baseQuery.ts`, try to use `injectEndpoints` to keep the file modular rather than rewriting one giant file.
* **Naming Convention:** Follow `camelCase` for hooks (e.g., `useGetUsersQuery`) and `PascalCase` for types.