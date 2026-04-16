import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { backendFetchJson } from "../../services/backendFetch";
import {
	addStoredBusinessId,
	getStoredBusinessIds,
	removeStoredBusinessId,
	setStoredBusinessIds,
} from "../../services/branch-management/businessIdsStorage";
import type { BusinessOutput } from "../../services/types";

/** UI model; maps to OpenAPI `BusinessOutputSchema` (tenant / “restaurant”). */
export interface Restaurant {
	id: string;
	name: string;
	status: "ACTIVE" | "INACTIVE";
	/** Not returned by the business API; optional for display fallbacks. */
	created_at?: string;
	updated_at?: string;
	/** From API when available */
	tin_number?: string;
}

function mapBusinessOutput(b: BusinessOutput): Restaurant {
	return {
		id: b.id,
		name: b.name,
		tin_number: b.tin_number,
		status: b.is_archived ? "INACTIVE" : "ACTIVE",
	};
}

/**
 * Optional ids returned by `/api/v1/users/me` before OpenAPI is updated.
 */
function mergeBusinessIdsFromMePayload(me: Record<string, unknown>): string[] {
	const out: string[] = [];
	const candidates = [
		me.business_ids,
		me.owned_business_ids,
		me.businesses,
	] as unknown[];
	for (const c of candidates) {
		if (!Array.isArray(c)) continue;
		for (const item of c) {
			if (typeof item === "string") out.push(item);
			else if (item && typeof item === "object" && "id" in item) {
				const id = (item as { id: unknown }).id;
				if (typeof id === "string") out.push(id);
			}
		}
	}
	return out;
}

async function collectBusinessIdsForFetch(): Promise<string[]> {
	const fromStorage = getStoredBusinessIds();
	let fromMe: string[] = [];
	try {
		const me = await backendFetchJson<Record<string, unknown>>(
			"/api/v1/users/me",
			{
				method: "GET",
			},
		);
		fromMe = mergeBusinessIdsFromMePayload(me);
	} catch {
		/* unauthenticated or network */
	}
	const merged = [...new Set([...fromStorage, ...fromMe])];
	if (merged.length !== fromStorage.length || fromMe.length > 0) {
		setStoredBusinessIds(merged);
	}
	return merged;
}

interface RestaurantsState {
	restaurants: Restaurant[];
	selectedRestaurant: Restaurant | null;
	loading: boolean;
	error: string | null;
}

const initialState: RestaurantsState = {
	restaurants: [],
	selectedRestaurant: null,
	loading: false,
	error: null,
};

export const fetchRestaurants = createAsyncThunk(
	"restaurants/fetchAll",
	async () => {
		const ids = await collectBusinessIdsForFetch();
		if (ids.length === 0) {
			return [] as Restaurant[];
		}
		const results = await Promise.all(
			ids.map(async (id) => {
				try {
					return await backendFetchJson<BusinessOutput>(
						`/api/v1/business/${id}`,
						{ method: "GET" },
					);
				} catch {
					removeStoredBusinessId(id);
					return null;
				}
			}),
		);
		return results
			.filter((r): r is BusinessOutput => r !== null)
			.map(mapBusinessOutput);
	},
);

export const fetchRestaurantById = createAsyncThunk(
	"restaurants/fetchById",
	async (id: string) => {
		const row = await backendFetchJson<BusinessOutput>(
			`/api/v1/business/${id}`,
			{
				method: "GET",
			},
		);
		addStoredBusinessId(row.id);
		return mapBusinessOutput(row);
	},
);

export const createRestaurant = createAsyncThunk(
	"restaurants/create",
	async (data: { name: string; tin_number: string }) => {
		const row = await backendFetchJson<BusinessOutput>("/api/v1/business", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: data.name, tin_number: data.tin_number }),
		});
		addStoredBusinessId(row.id);
		return mapBusinessOutput(row);
	},
);

export const updateRestaurant = createAsyncThunk(
	"restaurants/update",
	async (_payload: { id: string; data: Partial<Restaurant> }) => {
		throw new Error(
			"Updating a business is not available in the published API (no PATCH/PUT for /api/v1/business/{id}).",
		);
	},
);

export const deleteRestaurant = createAsyncThunk(
	"restaurants/delete",
	async (_id: string) => {
		throw new Error(
			"Deleting a business is not available in the published API (no DELETE for /api/v1/business/{id}).",
		);
	},
);

const restaurantsSlice = createSlice({
	name: "restaurants",
	initialState,
	reducers: {
		setSelectedRestaurant: (
			state,
			action: PayloadAction<Restaurant | null>,
		) => {
			state.selectedRestaurant = action.payload;
		},
		clearError: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchRestaurants.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchRestaurants.fulfilled, (state, action) => {
				state.loading = false;
				state.restaurants = action.payload;
			})
			.addCase(fetchRestaurants.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch restaurants";
			})
			.addCase(fetchRestaurantById.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchRestaurantById.fulfilled, (state, action) => {
				state.loading = false;
				state.selectedRestaurant = action.payload;
			})
			.addCase(fetchRestaurantById.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch restaurant";
			})
			.addCase(createRestaurant.fulfilled, (state, action) => {
				state.restaurants.push(action.payload);
			});
	},
});

export const { setSelectedRestaurant, clearError } = restaurantsSlice.actions;
export default restaurantsSlice.reducer;
