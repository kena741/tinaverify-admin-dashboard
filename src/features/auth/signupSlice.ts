import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabaseClient';

export interface SignupData {
  // Owner/Admin info
  name: string;
  email: string;
  phone: string;
  password: string;
  // Restaurant info
  restaurantName: string;
  // Branch info
  branchName: string;
  branchAddress: string;
  // Telebirr credentials (optional for now)
  telebirrMerchantId?: string;
  telebirrAppKey?: string;
  telebirrPublicKey?: string;
  telebirrShortcode?: string;
}

export interface SignupResult {
  admin: {
    id: string; // user_id from platform_admins
    name: string;
    email: string;
    role: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
    restaurant_id: string;
  };
}

interface SignupState {
  loading: boolean;
  error: string | null;
  success: boolean;
  signupData: SignupResult | null;
  currentStep: number;
}

const initialState: SignupState = {
  loading: false,
  error: null,
  success: false,
  signupData: null,
  currentStep: 1,
};

// Async thunk for complete signup process
export const signupRestaurantOwner = createAsyncThunk(
  'signup/restaurantOwner',
  async (data: SignupData, { rejectWithValue }) => {
    try {
      // Step 1: Create Supabase Auth account first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            phone: data.phone,
          },
        },
      });

      if (authError) {
        // Provide more helpful error messages
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          throw new Error('This email is already registered. Please try logging in instead.');
        }
        throw new Error(authError.message || 'Failed to create auth account');
      }

      if (!authData.user) {
        throw new Error('User creation failed - no user data returned');
      }

      // Log user creation for debugging
      console.log('User created in Supabase Auth:', {
        id: authData.user.id,
        email: authData.user.email,
        email_confirmed: authData.user.email_confirmed_at,
      });

      const userId = authData.user.id;

      // Step 2: Create platform admin account using the auth user ID
      // Restaurant owners get SYSTEM_ADMIN role for full access to their restaurant
      // The id field should match auth.users.id (foreign key)
      const { data: adminData, error: adminError } = await supabase
        .from('platform_admins')
        .insert([{
          user_id: userId, // Use Supabase Auth user ID as foreign key to auth.users.id
          name: data.name,
          email: data.email,
          role: 'SYSTEM_ADMIN',
        }])
        .select()
        .single();

      if (adminError) {
        // Rollback: delete auth user if admin creation fails
        // Note: This requires admin API access, might need to handle differently
        await supabase.auth.admin.deleteUser(userId).catch(() => {
          // If admin API not available, log error
          console.error('Failed to rollback auth user');
        });
        throw new Error(adminError.message || 'Failed to create admin account');
      }

      // Step 3: Create restaurant
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .insert([{
          name: data.restaurantName,
          status: 'ACTIVE',
        }])
        .select()
        .single();

      if (restaurantError) {
        // Rollback: delete admin and auth user if restaurant creation fails
        await supabase.from('platform_admins').delete().eq('user_id', userId);
        await supabase.auth.admin.deleteUser(userId).catch(() => {
          console.error('Failed to rollback auth user');
        });
        throw new Error(restaurantError.message || 'Failed to create restaurant');
      }

      // Step 4: Create branch
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .insert([{
          restaurant_id: restaurantData.id,
          name: data.branchName,
          address: data.branchAddress,
          telebirr_merchant_id: data.telebirrMerchantId,
          telebirr_app_key: data.telebirrAppKey,
          telebirr_public_key: data.telebirrPublicKey,
          telebirr_shortcode: data.telebirrShortcode,
        }])
        .select()
        .single();

      if (branchError) {
        // Rollback: delete restaurant, admin, and auth user if branch creation fails
        await supabase.from('restaurants').delete().eq('id', restaurantData.id);
        await supabase.from('platform_admins').delete().eq('user_id', userId);
        await supabase.auth.admin.deleteUser(userId).catch(() => {
          console.error('Failed to rollback auth user');
        });
        throw new Error(branchError.message || 'Failed to create branch');
      }

      return {
        admin: {
          id: adminData.user_id || adminData.id, // Use user_id if available, fallback to id
          name: adminData.name,
          email: adminData.email,
          role: adminData.role,
        },
        restaurant: {
          id: restaurantData.id,
          name: restaurantData.name,
        },
        branch: {
          id: branchData.id,
          name: branchData.name,
          restaurant_id: branchData.restaurant_id,
        },
      } as SignupResult;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Signup failed');
    }
  }
);

// Check if email exists
// Since platform_admins.user_id is a foreign key to auth.users.id,
// checking platform_admins is sufficient
export const checkEmailExists = createAsyncThunk(
  'signup/checkEmail',
  async (email: string) => {
    const { data, error } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is what we want
      throw new Error(error.message);
    }

    return { exists: !!data };
  }
);

const signupSlice = createSlice({
  name: 'signup',
  initialState,
  reducers: {
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetSignup: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.signupData = null;
      state.currentStep = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // Signup
      .addCase(signupRestaurantOwner.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(signupRestaurantOwner.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.signupData = action.payload;
      })
      .addCase(signupRestaurantOwner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Signup failed';
        state.success = false;
      })
      // Check email
      .addCase(checkEmailExists.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to check email';
      });
  },
});

export const { setCurrentStep, clearError, resetSignup } = signupSlice.actions;
export default signupSlice.reducer;

