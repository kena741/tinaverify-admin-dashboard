import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabaseClient';

export interface OrderItem {
  id?: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  table_id: string;
  branch_id: string;
  waiter_id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  payment_id?: string;
  created_at: string;
  updated_at: string;
}

interface OrdersState {
  orders: Order[];
  activeOrders: Order[]; // Orders that are not paid
  selectedOrder: Order | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  orders: [],
  activeOrders: [],
  selectedOrder: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchAll',
  async ({ branchId, tableId, status }: { branchId?: string; tableId?: string; status?: Order['status'] } = {}) => {
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    if (tableId) {
      query = query.eq('table_id', tableId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []) as Order[];
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchById',
  async (id: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Order;
  }
);

export const createOrder = createAsyncThunk(
  'orders/create',
  async (data: {
    table_id: string;
    table_number: string;
    branch_id: string;
    waiter_id: string;
    restaurant_id?: string;
    items: Array<{
      menu_item_id: string;
      menu_item_name: string;
      quantity: number;
      price: number;
      base_price?: number;
      vat_amount?: number;
      is_taxable?: boolean;
    }>;
    subtotal: number;
    vat: number;
    total: number;
  }) => {
    // Prepare items as JSONB array
    const itemsJsonb = data.items.map(item => ({
      menu_item_id: item.menu_item_id,
      menu_item_name: item.menu_item_name,
      quantity: item.quantity,
      price: item.price,
      base_price: item.base_price || item.price,
      vat_amount: item.vat_amount || 0,
      is_taxable: item.is_taxable !== undefined ? item.is_taxable : true,
      total: item.price * item.quantity,
    }));

    // Create order in orders table
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        table_id: data.table_id,
        table_number: data.table_number,
        branch_id: data.branch_id,
        restaurant_id: data.restaurant_id,
        waiter_id: data.waiter_id,
        items: itemsJsonb, // Store as JSONB
        subtotal: data.subtotal,
        vat: data.vat,
        total: data.total,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (orderError) {
      throw new Error(orderError.message);
    }

    // Update table status to ASSIGNED
    const { error: tableError } = await supabase
      .from('restaurant_tables')
      .update({
        status: 'ASSIGNED',
        assigned_waiter_id: data.waiter_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.table_id);

    if (tableError) {
      console.error('Failed to update table status:', tableError);
      // Don't throw - order was created successfully
    }

    return {
      id: newOrder.id,
      table_id: newOrder.table_id,
      branch_id: newOrder.branch_id,
      waiter_id: newOrder.waiter_id || '',
      items: itemsJsonb,
      subtotal: data.subtotal,
      tax: data.vat,
      total: data.total,
      status: 'PENDING' as const,
      created_at: newOrder.created_at,
      updated_at: newOrder.updated_at,
    } as Order;
  }
);

export const updateOrder = createAsyncThunk(
  'orders/update',
  async ({ id, data }: { id: string; data: Partial<Order> }) => {
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updatedOrder as Order;
  }
);

export const addItemsToOrder = createAsyncThunk(
  'orders/addItems',
  async ({ orderId, items }: { orderId: string; items: Omit<OrderItem, 'id' | 'total'>[] }) => {
    // Fetch current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    // Prepare new items
    const newItems = items.map(item => ({
      ...item,
      total: item.price * item.quantity,
    }));

    // Merge with existing items
    const existingItems = (currentOrder.items || []) as OrderItem[];
    const updatedItems = [...existingItems, ...newItems];

    // Recalculate totals
    const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    const tax = updatedItems.reduce((sum, item) => {
      const itemVat = item.total - (item.total / 1.15); // Calculate VAT if taxable
      return sum + itemVat;
    }, 0);
    const total = subtotal + tax;

    // Update order
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({
        items: updatedItems,
        subtotal,
        vat: tax,
        total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return updatedOrder as Order;
  }
);

export const cancelOrder = createAsyncThunk(
  'orders/cancel',
  async (id: string) => {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Free the table
    const { data: orderData } = await supabase
      .from('orders')
      .select('table_id')
      .eq('id', id)
      .single();

    if (orderData?.table_id) {
      await supabase
        .from('restaurant_tables')
        .update({
          status: 'FREE',
          assigned_waiter_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderData.table_id);
    }

    return data as Order;
  }
);

export const markOrderAsPaid = createAsyncThunk(
  'orders/markPaid',
  async ({ orderId, paymentId }: { orderId: string; paymentId?: string }) => {
    // Update order status to PAID
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'PAID',
        payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Free the table
    if (data?.table_id) {
      await supabase
        .from('restaurant_tables')
        .update({
          status: 'FREE',
          assigned_waiter_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.table_id);
    }

    return data as Order;
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setSelectedOrder: (state, action: PayloadAction<Order | null>) => {
      state.selectedOrder = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
        state.activeOrders = action.payload.filter((o: Order) => o.status === 'PENDING');
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch orders';
      })
      // Fetch by ID
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.selectedOrder = action.payload;
      })
      // Create
      .addCase(createOrder.fulfilled, (state, action) => {
        state.orders.unshift(action.payload);
        if (action.payload.status === 'PENDING') {
          state.activeOrders.unshift(action.payload);
        }
      })
      // Update
      .addCase(updateOrder.fulfilled, (state, action) => {
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        // Update active orders
        const activeIndex = state.activeOrders.findIndex((o) => o.id === action.payload.id);
        if (action.payload.status === 'PENDING') {
          if (activeIndex === -1) {
            state.activeOrders.push(action.payload);
          } else {
            state.activeOrders[activeIndex] = action.payload;
          }
        } else {
          state.activeOrders = state.activeOrders.filter((o) => o.id !== action.payload.id);
        }
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      // Add items
      .addCase(addItemsToOrder.fulfilled, (state, action) => {
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      // Cancel
      .addCase(cancelOrder.fulfilled, (state, action) => {
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        state.activeOrders = state.activeOrders.filter((o) => o.id !== action.payload.id);
      })
      // Mark as paid
      .addCase(markOrderAsPaid.fulfilled, (state, action) => {
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        state.activeOrders = state.activeOrders.filter((o) => o.id !== action.payload.id);
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      });
  },
});

export const { setSelectedOrder, clearError } = ordersSlice.actions;
export default ordersSlice.reducer;

