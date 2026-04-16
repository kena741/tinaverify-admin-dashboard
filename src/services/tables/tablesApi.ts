import { createApi } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "../authTokens";
import { backendBaseQuery } from "../baseQuery";
import type {
	TableInputRequest,
	TableResponse,
	TableUpdateRequest,
} from "../types";

function bearerHeaders(accessToken?: string | null) {
	const token =
		accessToken !== undefined &&
		accessToken !== null &&
		accessToken !== ""
			? accessToken
			: getStoredAccessToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export const tablesApi = createApi({
	reducerPath: "tablesApi",
	baseQuery: backendBaseQuery,
	tagTypes: ["Table"],
	endpoints: (builder) => ({
		/** `GET /api/v1/branches/{branch_id}/tables` */
		listBranchTables: builder.query<TableResponse[], { branchId: string }>({
			query: ({ branchId }) => ({
				url: `/api/v1/branches/${branchId}/tables`,
				headers: bearerHeaders(),
			}),
			providesTags: (result, _err, { branchId }) =>
				result
					? [
							{ type: "Table" as const, id: `BRANCH_${branchId}` },
							...result.map((table) => ({
								type: "Table" as const,
								id: table.id,
							})),
						]
					: [{ type: "Table" as const, id: `BRANCH_${branchId}` }],
		}),

		/** `GET /api/v1/tables/{table_id}` */
		getTable: builder.query<TableResponse, { tableId: string }>({
			query: ({ tableId }) => ({
				url: `/api/v1/tables/${tableId}`,
				headers: bearerHeaders(),
			}),
			providesTags: (_result, _err, { tableId }) => [
				{ type: "Table" as const, id: tableId },
			],
		}),

		/** `POST /api/v1/tables` */
		createTable: builder.mutation<TableResponse, TableInputRequest>({
			query: (body) => ({
				url: "/api/v1/tables",
				method: "POST",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_result, _err, arg) => [
				{ type: "Table" as const, id: `BRANCH_${arg.branch_id}` },
			],
		}),

		/** `PUT /api/v1/tables/{table_id}` */
		updateTable: builder.mutation<
			TableResponse,
			{ tableId: string; branchId: string; body: TableUpdateRequest }
		>({
			query: ({ tableId, body }) => ({
				url: `/api/v1/tables/${tableId}`,
				method: "PUT",
				body,
				headers: {
					"Content-Type": "application/json",
					...bearerHeaders(),
				},
			}),
			invalidatesTags: (_result, _err, { tableId, branchId }) => [
				{ type: "Table" as const, id: tableId },
				{ type: "Table" as const, id: `BRANCH_${branchId}` },
			],
		}),

		/** `DELETE /api/v1/tables/{table_id}` — archive */
		deleteTable: builder.mutation<void, { tableId: string; branchId: string }>({
			query: ({ tableId }) => ({
				url: `/api/v1/tables/${tableId}`,
				method: "DELETE",
				headers: bearerHeaders(),
			}),
			invalidatesTags: (_result, _err, { tableId, branchId }) => [
				{ type: "Table" as const, id: tableId },
				{ type: "Table" as const, id: `BRANCH_${branchId}` },
			],
		}),
	}),
});

export const {
	useListBranchTablesQuery,
	useLazyGetTableQuery,
	useCreateTableMutation,
	useUpdateTableMutation,
	useDeleteTableMutation,
} = tablesApi;
