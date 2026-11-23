import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
	PLAN_FILTER_ALL,
	type SubscriptionStatusFilter,
} from "@/lib/subscription-filters";

type DebouncedSearch = {
	businessName: string;
	ownerName: string;
	ownerPhone: string;
};

export type OwnersFiltersState = DebouncedSearch & {
	planId: string;
	statusFilter: SubscriptionStatusFilter;
	dateFrom: string;
	dateTo: string;
	debouncedSearch: DebouncedSearch;
};

const initialState: OwnersFiltersState = {
	businessName: "",
	ownerName: "",
	ownerPhone: "",
	planId: PLAN_FILTER_ALL,
	statusFilter: "all",
	dateFrom: "",
	dateTo: "",
	debouncedSearch: {
		businessName: "",
		ownerName: "",
		ownerPhone: "",
	},
};

const ownersFiltersSlice = createSlice({
	name: "ownersFilters",
	initialState,
	reducers: {
		updateOwnersFilters(
			state,
			action: PayloadAction<Partial<OwnersFiltersState>>,
		) {
			Object.assign(state, action.payload);
		},
		clearOwnersFilters: () => initialState,
	},
});

export const { updateOwnersFilters, clearOwnersFilters } =
	ownersFiltersSlice.actions;
export default ownersFiltersSlice.reducer;
