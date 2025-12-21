import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabaseClient';

export interface Restaurant {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
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

// Async thunks
export const fetchRestaurants = createAsyncThunk('restaurants/fetchAll', async () => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Restaurant[];
});

export const fetchRestaurantById = createAsyncThunk(
  'restaurants/fetchById',
  async (id: string) => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Restaurant;
  }
);

export const createRestaurant = createAsyncThunk(
  'restaurants/create',
  async (data: { name: string; status?: 'ACTIVE' | 'INACTIVE' }) => {
    const { data: newRestaurant, error } = await supabase
      .from('restaurants')
      .insert([{ name: data.name, status: data.status || 'ACTIVE' }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return newRestaurant as Restaurant;
  }
);

export const updateRestaurant = createAsyncThunk(
  'restaurants/update',
  async ({ id, data }: { id: string; data: Partial<Restaurant> }) => {
    const { data: updatedRestaurant, error } = await supabase
      .from('restaurants')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updatedRestaurant as Restaurant;
  }
);

export const deleteRestaurant = createAsyncThunk(
  'restaurants/delete',
  async (id: string) => {
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return id;
  }
);

const restaurantsSlice = createSlice({
  name: 'restaurants',
  initialState,
  reducers: {
    setSelectedRestaurant: (state, action: PayloadAction<Restaurant | null>) => {
      state.selectedRestaurant = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
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
        state.error = action.error.message || 'Failed to fetch restaurants';
      })
      // Fetch by ID
      .addCase(fetchRestaurantById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRestaurantById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedRestaurant = action.payload;
      })
      // Create
      .addCase(createRestaurant.fulfilled, (state, action) => {
        state.restaurants.push(action.payload);
      })
      // Update
      .addCase(updateRestaurant.fulfilled, (state, action) => {
        const index = state.restaurants.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.restaurants[index] = action.payload;
        }
        if (state.selectedRestaurant?.id === action.payload.id) {
          state.selectedRestaurant = action.payload;
        }
      })
      // Delete
      .addCase(deleteRestaurant.fulfilled, (state, action) => {
        state.restaurants = state.restaurants.filter((r) => r.id !== action.payload);
        if (state.selectedRestaurant?.id === action.payload) {
          state.selectedRestaurant = null;
        }
      });
  },
});

export const { setSelectedRestaurant, clearError } = restaurantsSlice.actions;
export default restaurantsSlice.reducer;

