import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabaseClient';

export interface Payment {
  id: string;
  table_id: string;
  branch_id: string;
  waiter_id?: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  telebirr_transaction_id?: string;
  created_at: string;
  updated_at: string;
}

interface PaymentsState {
  payments: Payment[];
  selectedPayment: Payment | null;
  loading: boolean;
  error: string | null;
  filters: {
    branchId?: string;
    tableId?: string;
    waiterId?: string;
    status?: Payment['status'];
    dateFrom?: string;
    dateTo?: string;
  };
}

const initialState: PaymentsState = {
  payments: [],
  selectedPayment: null,
  loading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchPayments = createAsyncThunk(
  'payments/fetchAll',
  async (filters?: PaymentsState['filters']) => {
    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.branchId) {
      query = query.eq('branch_id', filters.branchId);
    }
    if (filters?.tableId) {
      query = query.eq('table_id', filters.tableId);
    }
    if (filters?.waiterId) {
      query = query.eq('waiter_id', filters.waiterId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data as Payment[];
  }
);

export const fetchPaymentById = createAsyncThunk(
  'payments/fetchById',
  async (id: string) => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Payment;
  }
);

export const createPayment = createAsyncThunk(
  'payments/create',
  async (data: Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'status' | 'telebirr_transaction_id'>) => {
    const { data: newPayment, error } = await supabase
      .from('payments')
      .insert([{ ...data, status: 'PENDING' }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return newPayment as Payment;
  }
);

export const processPayment = createAsyncThunk(
  'payments/process',
  async ({ paymentId, telebirrTransactionId }: { paymentId: string; telebirrTransactionId: string }) => {
    const { data, error } = await supabase
      .from('payments')
      .update({
        telebirr_transaction_id: telebirrTransactionId,
        status: 'SUCCESS',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Payment;
  }
);

export const updatePaymentStatus = createAsyncThunk(
  'payments/updateStatus',
  async ({ id, status }: { id: string; status: Payment['status'] }) => {
    const { data, error } = await supabase
      .from('payments')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Payment;
  }
);

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setSelectedPayment: (state, action: PayloadAction<Payment | null>) => {
      state.selectedPayment = action.payload;
    },
    setFilters: (state, action: PayloadAction<PaymentsState['filters']>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch payments';
      })
      // Fetch by ID
      .addCase(fetchPaymentById.fulfilled, (state, action) => {
        state.selectedPayment = action.payload;
      })
      // Create
      .addCase(createPayment.fulfilled, (state, action) => {
        state.payments.unshift(action.payload);
      })
      // Process payment
      .addCase(processPayment.fulfilled, (state, action) => {
        const index = state.payments.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
        if (state.selectedPayment?.id === action.payload.id) {
          state.selectedPayment = action.payload;
        }
      })
      // Update status
      .addCase(updatePaymentStatus.fulfilled, (state, action) => {
        const index = state.payments.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
        if (state.selectedPayment?.id === action.payload.id) {
          state.selectedPayment = action.payload;
        }
      });
  },
});

export const { setSelectedPayment, setFilters, clearFilters, clearError } = paymentsSlice.actions;
export default paymentsSlice.reducer;

