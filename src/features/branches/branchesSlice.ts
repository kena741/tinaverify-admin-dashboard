import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabaseClient';

export interface Branch {
  id: string;
  restaurant_id: string;
  name: string;
  address?: string;
  active: boolean;
  telebirr_merchant_id?: string;
  telebirr_app_key?: string;
  telebirr_public_key?: string;
  telebirr_shortcode?: string;
  created_at: string;
  updated_at: string;
}

interface BranchesState {
  branches: Branch[];
  selectedBranch: Branch | null;
  loading: boolean;
  error: string | null;
}

const initialState: BranchesState = {
  branches: [],
  selectedBranch: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchBranches = createAsyncThunk(
  'branches/fetchAll',
  async (restaurantId?: string) => {
    let query = supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false });

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data as Branch[];
  }
);

export const fetchBranchById = createAsyncThunk(
  'branches/fetchById',
  async (id: string) => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Branch;
  }
);

export const createBranch = createAsyncThunk(
  'branches/create',
  async (data: Omit<Branch, 'id' | 'created_at' | 'updated_at'>) => {
    const { data: newBranch, error } = await supabase
      .from('branches')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return newBranch as Branch;
  }
);

export const updateBranch = createAsyncThunk(
  'branches/update',
  async ({ id, data }: { id: string; data: Partial<Branch> }) => {
    const { data: updatedBranch, error } = await supabase
      .from('branches')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updatedBranch as Branch;
  }
);

export const deleteBranch = createAsyncThunk(
  'branches/delete',
  async (id: string) => {
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return id;
  }
);

const branchesSlice = createSlice({
  name: 'branches',
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
      // Fetch all
      .addCase(fetchBranches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.loading = false;
        state.branches = action.payload;
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch branches';
      })
      // Fetch by ID
      .addCase(fetchBranchById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBranchById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedBranch = action.payload;
      })
      // Create
      .addCase(createBranch.fulfilled, (state, action) => {
        state.branches.push(action.payload);
      })
      // Update
      .addCase(updateBranch.fulfilled, (state, action) => {
        const index = state.branches.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) {
          state.branches[index] = action.payload;
        }
        if (state.selectedBranch?.id === action.payload.id) {
          state.selectedBranch = action.payload;
        }
      })
      // Delete
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

