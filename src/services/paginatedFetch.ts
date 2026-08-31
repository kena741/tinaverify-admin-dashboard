import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

/** Default page size for admin list endpoints (`/api/v1/business`, `/api/v1/users/all`). */
export const ADMIN_LIST_PAGE_SIZE = 50;

type PaginatedSlice<TItem> = {
	items: TItem[];
	total_count: number;
	limit?: number;
	returned_count?: number;
};

type BaseQueryArg = {
	url: string;
	method?: string;
	params?: Record<string, string | number>;
	headers?: Record<string, string>;
};

type BaseQueryResult = {
	data?: unknown;
	error?: unknown;
};

/** Fetches every page sequentially using a small `limit` per request. */
export async function fetchAllPaginatedItems<TItem>(
	baseQuery: (arg: BaseQueryArg) => BaseQueryResult | Promise<BaseQueryResult>,
	url: string,
	headers: Record<string, string>,
	pageSize: number = ADMIN_LIST_PAGE_SIZE,
): Promise<{ data: TItem[] } | { error: FetchBaseQueryError }> {
	const first = await baseQuery({
		url,
		method: "GET",
		params: { offset: 0, limit: pageSize },
		headers,
	});
	if (first.error) {
		return { error: first.error as FetchBaseQueryError };
	}

	const firstPage = first.data as PaginatedSlice<TItem>;
	const firstBatch = Array.isArray(firstPage?.items) ? firstPage.items : [];
	if (firstBatch.length === 0) {
		return { data: [] };
	}

	const resolvedPageSize = Math.max(
		1,
		Number(firstPage?.limit) ||
			Number(firstPage?.returned_count) ||
			firstBatch.length,
	);
	const total = Number(firstPage.total_count);
	const items: TItem[] = [...firstBatch];

	if (Number.isFinite(total) && total > items.length) {
		for (let offset = resolvedPageSize; offset < total; offset += resolvedPageSize) {
			const res = await baseQuery({
				url,
				method: "GET",
				params: { offset, limit: resolvedPageSize },
				headers,
			});
			if (res.error) {
				return { error: res.error as FetchBaseQueryError };
			}
			const page = res.data as PaginatedSlice<TItem>;
			const batch = Array.isArray(page?.items) ? page.items : [];
			items.push(...batch);
		}
	} else if (!Number.isFinite(total) && firstBatch.length >= resolvedPageSize) {
		let offset = resolvedPageSize;
		for (;;) {
			const res = await baseQuery({
				url,
				method: "GET",
				params: { offset, limit: resolvedPageSize },
				headers,
			});
			if (res.error) {
				return { error: res.error as FetchBaseQueryError };
			}
			const page = res.data as PaginatedSlice<TItem>;
			const batch = Array.isArray(page?.items) ? page.items : [];
			if (batch.length === 0) break;
			items.push(...batch);
			if (batch.length < resolvedPageSize) break;
			offset += resolvedPageSize;
		}
	}

	return { data: items };
}
