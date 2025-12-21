import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabaseClient';

export interface RestaurantTable {
  id: string;
  branch_id: string;
  table_number: string;
  capacity: number;
  nfc_qr_id?: string;
  status: 'FREE' | 'ASSIGNED' | 'PAID';
  assigned_waiter_id?: string;
  created_at: string;
  updated_at: string;
}

interface TablesState {
  tables: RestaurantTable[];
  selectedTable: RestaurantTable | null;
  loading: boolean;
  error: string | null;
}

const initialState: TablesState = {
  tables: [],
  selectedTable: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchTables = createAsyncThunk(
  'tables/fetchAll',
  async (branchId?: string) => {
    let query = supabase
      .from('restaurant_tables')
      .select('*')
      .order('table_number', { ascending: true });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data as RestaurantTable[];
  }
);

export const fetchTableById = createAsyncThunk(
  'tables/fetchById',
  async (id: string) => {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as RestaurantTable;
  }
);

export const createTable = createAsyncThunk(
  'tables/create',
  async (data: Omit<RestaurantTable, 'id' | 'created_at' | 'updated_at'>) => {
    const { data: newTable, error } = await supabase
      .from('restaurant_tables')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return newTable as RestaurantTable;
  }
);

export const updateTable = createAsyncThunk(
  'tables/update',
  async ({ id, data }: { id: string; data: Partial<RestaurantTable> }) => {
    const { data: updatedTable, error } = await supabase
      .from('restaurant_tables')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updatedTable as RestaurantTable;
  }
);

export const deleteTable = createAsyncThunk(
  'tables/delete',
  async (id: string) => {
    const { error } = await supabase
      .from('restaurant_tables')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return id;
  }
);

export const assignTableToWaiter = createAsyncThunk(
  'tables/assignWaiter',
  async ({ tableId, waiterId }: { tableId: string; waiterId: string }) => {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update({
        assigned_waiter_id: waiterId,
        status: 'ASSIGNED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tableId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as RestaurantTable;
  }
);

export const freeTable = createAsyncThunk(
  'tables/free',
  async (tableId: string) => {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update({
        status: 'FREE',
        assigned_waiter_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tableId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as RestaurantTable;
  }
);

const tablesSlice = createSlice({
  name: 'tables',
  initialState,
  reducers: {
    setSelectedTable: (state, action: PayloadAction<RestaurantTable | null>) => {
      state.selectedTable = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchTables.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTables.fulfilled, (state, action) => {
        state.loading = false;
        state.tables = action.payload;
      })
      .addCase(fetchTables.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch tables';
      })
      // Fetch by ID
      .addCase(fetchTableById.fulfilled, (state, action) => {
        state.selectedTable = action.payload;
      })
      // Create
      .addCase(createTable.fulfilled, (state, action) => {
        state.tables.push(action.payload);
      })
      // Update
      .addCase(updateTable.fulfilled, (state, action) => {
        const index = state.tables.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.tables[index] = action.payload;
        }
        if (state.selectedTable?.id === action.payload.id) {
          state.selectedTable = action.payload;
        }
      })
      // Delete
      .addCase(deleteTable.fulfilled, (state, action) => {
        state.tables = state.tables.filter((t) => t.id !== action.payload);
        if (state.selectedTable?.id === action.payload) {
          state.selectedTable = null;
        }
      })
      // Assign waiter
      .addCase(assignTableToWaiter.fulfilled, (state, action) => {
        const index = state.tables.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.tables[index] = action.payload;
        }
      })
      // Free table
      .addCase(freeTable.fulfilled, (state, action) => {
        const index = state.tables.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.tables[index] = action.payload;
        }
      });
  },
});

export const { setSelectedTable, clearError } = tablesSlice.actions;
export default tablesSlice.reducer;

