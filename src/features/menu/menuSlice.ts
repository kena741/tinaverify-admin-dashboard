import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabaseClient';

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  branch_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  branch_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  is_taxable: boolean;
  is_available: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

interface MenuState {
  categories: MenuCategory[];
  items: MenuItem[];
  selectedCategory: MenuCategory | null;
  selectedItem: MenuItem | null;
  loading: boolean;
  error: string | null;
}

const initialState: MenuState = {
  categories: [],
  items: [],
  selectedCategory: null,
  selectedItem: null,
  loading: false,
  error: null,
};

// Category thunks
export const fetchCategories = createAsyncThunk(
  'menu/fetchCategories',
  async (filters?: { restaurantId?: string; branchId?: string }) => {
    let query = supabase
      .from('menu_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (filters?.restaurantId) {
      query = query.eq('restaurant_id', filters.restaurantId);
    }
    if (filters?.branchId) {
      query = query.eq('branch_id', filters.branchId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data as MenuCategory[];
  }
);

export const createCategory = createAsyncThunk(
  'menu/createCategory',
  async (categoryData: Omit<MenuCategory, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('menu_categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as MenuCategory;
  }
);

export const updateCategory = createAsyncThunk(
  'menu/updateCategory',
  async ({ id, data }: { id: string; data: Partial<MenuCategory> }) => {
    const { data: updatedCategory, error } = await supabase
      .from('menu_categories')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updatedCategory as MenuCategory;
  }
);

export const deleteCategory = createAsyncThunk(
  'menu/deleteCategory',
  async (id: string) => {
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return id;
  }
);

// Menu item thunks
export const fetchMenuItems = createAsyncThunk(
  'menu/fetchMenuItems',
  async (filters?: { restaurantId?: string; branchId?: string; categoryId?: string }) => {
    let query = supabase
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.restaurantId) {
      query = query.eq('restaurant_id', filters.restaurantId);
    }
    if (filters?.branchId) {
      query = query.eq('branch_id', filters.branchId);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data as MenuItem[];
  }
);

export const createMenuItem = createAsyncThunk(
  'menu/createMenuItem',
  async (itemData: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('menu_items')
      .insert([{ ...itemData, updated_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as MenuItem;
  }
);

export const updateMenuItem = createAsyncThunk(
  'menu/updateMenuItem',
  async ({ id, data }: { id: string; data: Partial<MenuItem> }) => {
    const { data: updatedItem, error } = await supabase
      .from('menu_items')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updatedItem as MenuItem;
  }
);

export const deleteMenuItem = createAsyncThunk(
  'menu/deleteMenuItem',
  async (id: string) => {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return id;
  }
);

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setSelectedCategory: (state, action: PayloadAction<MenuCategory | null>) => {
      state.selectedCategory = action.payload;
    },
    setSelectedItem: (state, action: PayloadAction<MenuItem | null>) => {
      state.selectedItem = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch categories';
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.categories.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        if (state.selectedCategory?.id === action.payload.id) {
          state.selectedCategory = action.payload;
        }
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter((c) => c.id !== action.payload);
        if (state.selectedCategory?.id === action.payload) {
          state.selectedCategory = null;
        }
      })
      // Menu Items
      .addCase(fetchMenuItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch menu items';
      })
      .addCase(createMenuItem.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateMenuItem.fulfilled, (state, action) => {
        const index = state.items.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem = action.payload;
        }
      })
      .addCase(deleteMenuItem.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload);
        if (state.selectedItem?.id === action.payload) {
          state.selectedItem = null;
        }
      });
  },
});

export const { setSelectedCategory, setSelectedItem, clearError } = menuSlice.actions;
export default menuSlice.reducer;

