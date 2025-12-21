import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabaseClient';

export interface Customer {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerPayment {
  id: string;
  customer_id: string;
  payment_id: string;
  created_at: string;
}

interface CustomersState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  customerPayments: CustomerPayment[];
  loading: boolean;
  error: string | null;
}

const initialState: CustomersState = {
  customers: [],
  selectedCustomer: null,
  customerPayments: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchCustomers = createAsyncThunk('customers/fetchAll', async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Customer[];
});

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchById',
  async (id: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Customer;
  }
);

export const createCustomer = createAsyncThunk(
  'customers/create',
  async (data: { name?: string; phone?: string; email?: string }) => {
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert([data])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return newCustomer as Customer;
  }
);

export const updateCustomer = createAsyncThunk(
  'customers/update',
  async ({ id, data }: { id: string; data: Partial<Customer> }) => {
    const { data: updatedCustomer, error } = await supabase
      .from('customers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updatedCustomer as Customer;
  }
);

export const linkCustomerToPayment = createAsyncThunk(
  'customers/linkPayment',
  async ({ customerId, paymentId }: { customerId: string; paymentId: string }) => {
    const { data, error } = await supabase
      .from('customer_payments')
      .insert([{ customer_id: customerId, payment_id: paymentId }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as CustomerPayment;
  }
);

export const fetchCustomerPayments = createAsyncThunk(
  'customers/fetchPayments',
  async (customerId: string) => {
    const { data, error } = await supabase
      .from('customer_payments')
      .select('*')
      .eq('customer_id', customerId);

    if (error) throw new Error(error.message);
    return data as CustomerPayment[];
  }
);

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setSelectedCustomer: (state, action: PayloadAction<Customer | null>) => {
      state.selectedCustomer = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch customers';
      })
      // Fetch by ID
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.selectedCustomer = action.payload;
      })
      // Create
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.customers.push(action.payload);
      })
      // Update
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const index = state.customers.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
        if (state.selectedCustomer?.id === action.payload.id) {
          state.selectedCustomer = action.payload;
        }
      })
      // Link to payment
      .addCase(linkCustomerToPayment.fulfilled, (state, action) => {
        state.customerPayments.push(action.payload);
      })
      // Fetch customer payments
      .addCase(fetchCustomerPayments.fulfilled, (state, action) => {
        state.customerPayments = action.payload;
      });
  },
});

export const { setSelectedCustomer, clearError } = customersSlice.actions;
export default customersSlice.reducer;

