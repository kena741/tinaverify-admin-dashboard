import { configureStore, combineReducers, AnyAction } from '@reduxjs/toolkit';
import { resetStore } from './resetActions';

// Import all reducers
import authReducer from '../features/auth/authSlice';
import signupReducer from '../features/auth/signupSlice';
import restaurantsReducer from '../features/restaurants/restaurantsSlice';
import branchesReducer from '../features/branches/branchesSlice';
import staffReducer from '../features/staff/staffSlice';
import tablesReducer from '../features/tables/tablesSlice';
import ordersReducer from '../features/orders/ordersSlice';
import paymentsReducer from '../features/payments/paymentsSlice';
import customersReducer from '../features/customers/customersSlice';
import menuReducer from '../features/menu/menuSlice';

// Combine all reducers
const appReducer = combineReducers({
  auth: authReducer,
  signup: signupReducer,
  restaurants: restaurantsReducer,
  branches: branchesReducer,
  staff: staffReducer,
  tables: tablesReducer,
  orders: ordersReducer,
  payments: paymentsReducer,
  customers: customersReducer,
  menu: menuReducer,
});

// Reset the store when resetStore action is dispatched
const RESET_TYPE = resetStore.type;
const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: AnyAction) => {
  if (action && action.type === RESET_TYPE) {
    state = undefined;
  }
  return appReducer(state as any, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types if needed
        ignoredActions: [resetStore.type],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
