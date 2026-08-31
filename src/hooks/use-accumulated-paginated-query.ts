"use client";

import { useState } from "react";

import { ADMIN_LIST_PAGE_SIZE } from "@/services/paginatedFetch";

type PaginatedPage<TItem> = {
	items: TItem[];
	total_count: number;
	offset: number;
	limit: number;
	returned_count: number;
};

type PageQueryArg = {
	offset: number;
	limit: number;
};

type PageQueryResult<TPage> = {
	data?: TPage;
	isLoading: boolean;
	isFetching: boolean;
	error?: unknown;
};

type AccumState<TItem> = {
	resetKey: string;
	offset: number;
	items: TItem[];
	complete: boolean;
	lastProcessedOffset: number | null;
};

function mergeItems<TItem extends { id: string }>(
	prev: TItem[],
	incoming: TItem[],
): TItem[] {
	if (incoming.length === 0) return prev;
	const byId = new Map(prev.map((item) => [item.id, item]));
	for (const item of incoming) {
		byId.set(item.id, item);
	}
	return [...byId.values()];
}

function createInitialState<TItem>(resetKey: string): AccumState<TItem> {
	return {
		resetKey,
		offset: 0,
		items: [],
		complete: false,
		lastProcessedOffset: null,
	};
}

/**
 * Loads a paginated RTK Query endpoint one small page at a time, merging results
 * so the UI can render partial data while the rest streams in.
 */
export function useAccumulatedPaginatedQuery<TItem extends { id: string }, TPage extends PaginatedPage<TItem>>(
	usePageQuery: (arg: PageQueryArg) => PageQueryResult<TPage>,
	queryKey: string,
	pageSize: number = ADMIN_LIST_PAGE_SIZE,
) {
	const resetKey = `${queryKey}:${pageSize}`;
	const [accum, setAccum] = useState<AccumState<TItem>>(() =>
		createInitialState(resetKey),
	);

	const { data, isLoading, isFetching, error } = usePageQuery({
		offset: accum.offset,
		limit: pageSize,
	});

	if (accum.resetKey !== resetKey) {
		setAccum(createInitialState(resetKey));
	} else if (data && data.offset !== accum.lastProcessedOffset) {
		const merged = mergeItems(accum.items, data.items);
		const loadedThrough = data.offset + data.returned_count;
		const isComplete =
			loadedThrough >= data.total_count || data.items.length === 0;

		setAccum({
			resetKey,
			items: merged,
			lastProcessedOffset: data.offset,
			complete: isComplete,
			offset: isComplete ? accum.offset : data.offset + data.limit,
		});
	}

	return {
		data: accum.items,
		isLoading: isLoading && accum.items.length === 0,
		isFetchingMore: isFetching && !accum.complete,
		isComplete: accum.complete,
		error,
		totalCount: data?.total_count ?? null,
	};
}
