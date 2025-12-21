import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabaseClient';

export interface PlatformAdmin {
  id?: string; // Primary key (optional if using user_id as identifier)
  user_id: string; // Foreign key to auth.users.id
  name: string;
  email: string;
  role: 'SYSTEM_ADMIN' | 'BRANCH_ADMIN';
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  admin: PlatformAdmin | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  admin: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Helper function to check if input is a phone number
const isPhoneNumber = (input: string): boolean => {
  // Check if input contains digits and common phone characters, but not @ (email)
  const phonePattern = /^[\d\s\+\-\(\)]+$/;
  return phonePattern.test(input.trim()) && !input.includes('@') && input.trim().length >= 10;
};

// Async thunks
export const loginAdmin = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    let loginEmail = credentials.email;
    
    // Step 0: If input looks like a phone number, find the associated email
    if (isPhoneNumber(credentials.email)) {
      const phoneNumber = credentials.email.trim();
      
      // Search in staff table for phone number
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('user_id, phone, email')
        .eq('phone', phoneNumber)
        .single();

      if (staffData && !staffError) {
        // If staff has email stored, use it
        if (staffData.email) {
          loginEmail = staffData.email;
        } else if (staffData.user_id) {
          // If no email in staff but has user_id, we need to get email from auth user
          // Since we can't query auth.users directly, we'll need to construct email from phone
          // The email format we used when creating: phone@staff.local
          const phoneEmail = phoneNumber.replace(/[\s\+\-\(\)]/g, '') + '@staff.local';
          loginEmail = phoneEmail;
        } else {
          throw new Error('Phone number found but no email associated. Please contact support.');
        }
      } else {
        // Phone not found in staff table
        throw new Error('Phone number not found. Please use your registered email to login.');
      }
    }

    // Step 1: Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: credentials.password,
    });

    if (authError) {
      // Log error details for debugging
      console.error('Supabase Auth Error:', {
        message: authError.message,
        status: authError.status,
        name: authError.name,
        email: credentials.email, // Log email for debugging (not password)
      });

      // Provide more helpful error messages
      if (authError.message.includes('Invalid login credentials') || authError.status === 400) {
        throw new Error('Invalid email/phone or password. Please check your credentials and try again.');
      }
      throw new Error(authError.message || 'Invalid credentials');
    }

    // Log successful auth for debugging
    console.log('Auth successful:', {
      userId: authData.user?.id,
      email: authData.user?.email,
    });

    if (!authData.user) {
      throw new Error('Authentication failed - no user data returned');
    }

    // Step 2: Fetch platform admin details using the auth user ID
    // The platform_admins.user_id is a foreign key to auth.users.id
    const { data: adminData, error: adminError } = await supabase
      .from('platform_admins')
      .select('*')
      .eq('user_id', authData.user.id) // Use auth user ID to fetch admin record
      .single();

    if (adminError) {
      // If admin record not found, sign out the auth session
      await supabase.auth.signOut();
      throw new Error(adminError.message || 'Admin record not found');
    }

    if (!adminData) {
      await supabase.auth.signOut();
      throw new Error('Admin not found');
    }

    // Step 3: Update last_login
    await supabase
      .from('platform_admins')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', authData.user.id);

    return adminData as PlatformAdmin;
  }
);

export const logoutAdmin = createAsyncThunk('auth/logout', async () => {
  // Clear session if using Supabase Auth
  await supabase.auth.signOut();
});

export const getCurrentAdmin = createAsyncThunk('auth/getCurrent', async () => {
  // Get current Supabase Auth session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.user) {
    throw new Error('No active session');
  }

  // Fetch platform admin using the auth user ID (foreign key to auth.users.id)
  const { data: adminData, error: adminError } = await supabase
    .from('platform_admins')
    .select('*')
    .eq('user_id', session.user.id) // Use auth user ID to fetch admin record
    .single();

  if (adminError) {
    throw new Error(adminError.message || 'Admin record not found');
  }

  if (!adminData) {
    throw new Error('Admin not found');
  }

  return adminData as PlatformAdmin;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAdmin: (state, action: PayloadAction<PlatformAdmin>) => {
      state.admin = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.admin = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Logout
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.admin = null;
        state.isAuthenticated = false;
      })
      // Get current admin
      .addCase(getCurrentAdmin.fulfilled, (state, action) => {
        state.admin = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentAdmin.rejected, (state) => {
        state.admin = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setAdmin } = authSlice.actions;
export default authSlice.reducer;

