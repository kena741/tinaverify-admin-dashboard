import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { backendFetchJson } from "../../services/backendFetch";
import type {
	BranchCreateRequest,
	BranchOutput,
	BranchUpdateRequest,
	BusinessOutput,
} from "../../services/types";

/** UI branch model; `restaurant_id` matches OpenAPI `business_id` for tenant scoping. */
export interface Branch {
	id: string;
	restaurant_id: string;
	name: string;
	address?: string | null;
	is_head_quarter: boolean;
	active: boolean;
	telebirr_merchant_id?: string;
	telebirr_app_key?: string;
	telebirr_public_key?: string;
	telebirr_shortcode?: string;
	created_at: string;
	updated_at: string;
}

function mapBranchOutput(b: BranchOutput): Branch {
	return {
		id: b.id,
		restaurant_id: b.business_id,
		name: b.name,
		address: b.address,
		is_head_quarter: b.is_head_quarter,
		active: !b.is_archived,
		created_at: b.created_at,
		updated_at: b.updated_at,
	};
}

export type MyBusinessRef = { id: string; name: string };

export type FetchBranchesResult = {
	branches: Branch[];
	/** Set when listing all branches via `GET /api/v1/users/me/business`; omit when scoping to one `businessId`. */
	myBusinesses?: MyBusinessRef[];
};

interface BranchesState {
	branches: Branch[];
	/** Businesses from `GET /api/v1/users/me/business` for labels/filters when listing all branches. */
	myBusinesses: MyBusinessRef[];
	selectedBranch: Branch | null;
	loading: boolean;
	error: string | null;
}

const initialState: BranchesState = {
	branches: [],
	myBusinesses: [],
	selectedBranch: null,
	loading: false,
	error: null,
};

/**
 * Loads branches from `GET /api/v1/business/{business_id}/branches` (OpenAPI).
 * - With `businessId`: fetch that business only.
 * - Without: `GET /api/v1/users/me/business`, then one branches list per business.
 */
export const fetchBranches = createAsyncThunk(
	"branches/fetchAll",
	async (businessId: string | undefined): Promise<FetchBranchesResult> => {
		if (businessId) {
			const rows = await backendFetchJson<BranchOutput[]>(
				`/api/v1/business/${businessId}/branches`,
				{ method: "GET" },
			);
			return { branches: rows.map(mapBranchOutput) };
		}
		const businesses = await backendFetchJson<BusinessOutput[]>(
			"/api/v1/users/me/business",
			{ method: "GET" },
		);
		if (businesses.length === 0) {
			return { branches: [], myBusinesses: [] };
		}
		const lists = await Promise.all(
			businesses.map((b) =>
				backendFetchJson<BranchOutput[]>(
					`/api/v1/business/${b.id}/branches`,
					{ method: "GET" },
				),
			),
		);
		return {
			branches: lists.flat().map(mapBranchOutput),
			myBusinesses: businesses.map((b) => ({ id: b.id, name: b.name })),
		};
	},
);

export const fetchBranchById = createAsyncThunk(
	"branches/fetchById",
	async (id: string) => {
		const row = await backendFetchJson<BranchOutput>(`/api/v1/branches/${id}`, {
			method: "GET",
		});
		return mapBranchOutput(row);
	},
);

export const createBranch = createAsyncThunk(
	"branches/create",
	async (data: Omit<Branch, "id" | "created_at" | "updated_at">) => {
		const body: BranchCreateRequest = {
			business_id: data.restaurant_id,
			name: data.name,
			address: data.address ?? null,
			is_head_quarter: false,
		};
		const row = await backendFetchJson<BranchOutput>("/api/v1/branches", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		return mapBranchOutput(row);
	},
);

export const updateBranch = createAsyncThunk(
	"branches/update",
	async ({ id, data }: { id: string; data: Partial<Branch> }) => {
		const body: BranchUpdateRequest = {};
		if (data.name !== undefined) body.name = data.name;
		if (data.address !== undefined) body.address = data.address;
		if (data.active !== undefined) body.is_archived = !data.active;

		const row = await backendFetchJson<BranchOutput>(`/api/v1/branches/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		return mapBranchOutput(row);
	},
);

export const deleteBranch = createAsyncThunk("branches/delete", async (id: string) => {
	await backendFetchJson<void>(`/api/v1/branches/${id}`, { method: "DELETE" });
	return id;
});

const branchesSlice = createSlice({
	name: "branches",
	initialState,
	reducers: {
		setSelectedBranch: (state, action: PayloadAction<Branch | null>) => {
			state.selectedBranch = action.payload;
		},
		clearError: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(fetchBranches.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchBranches.fulfilled, (state, action) => {
				state.loading = false;
				state.branches = action.payload.branches;
				if (action.payload.myBusinesses !== undefined) {
					state.myBusinesses = action.payload.myBusinesses;
				}
			})
			.addCase(fetchBranches.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch branches";
			})
			.addCase(fetchBranchById.pending, (state) => {
				state.loading = true;
				state.error = null;
			})
			.addCase(fetchBranchById.fulfilled, (state, action) => {
				state.loading = false;
				state.selectedBranch = action.payload;
			})
			.addCase(fetchBranchById.rejected, (state, action) => {
				state.loading = false;
				state.error = action.error.message || "Failed to fetch branch";
			})
			.addCase(createBranch.fulfilled, (state, action) => {
				state.branches.push(action.payload);
			})
			.addCase(updateBranch.fulfilled, (state, action) => {
				const index = state.branches.findIndex((b) => b.id === action.payload.id);
				if (index !== -1) {
					state.branches[index] = action.payload;
				}
				if (state.selectedBranch?.id === action.payload.id) {
					state.selectedBranch = action.payload;
				}
			})
			.addCase(deleteBranch.fulfilled, (state, action) => {
				state.branches = state.branches.filter((b) => b.id !== action.payload);
				if (state.selectedBranch?.id === action.payload) {
					state.selectedBranch = null;
				}
			});
	},
});

export const { setSelectedBranch, clearError } = branchesSlice.actions;
export default branchesSlice.reducer;
