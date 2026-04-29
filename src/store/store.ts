import { configureStore, combineReducers, AnyAction } from "@reduxjs/toolkit";
import { resetStore } from "./resetActions";
import { authApi } from "../services/auth/authApi";
import { bankAccountsApi } from "../services/bank-accounts/bankAccountsApi";
import { branchManagementApi } from "../services/branch-management/branchManagementApi";
import { menuApi } from "../services/menu/menuApi";
import { ordersApi } from "../services/orders/ordersApi";
import { roleApi } from "../services/role/roleApi";
import { tablesApi } from "../services/tables/tablesApi";
import { subscriptionApi } from "../services/subscription/subscriptionApi";

// Import all reducers
import authReducer from "../features/auth/authSlice";
import signupReducer from "../features/auth/signupSlice";
import restaurantsReducer from "../features/restaurants/restaurantsSlice";
import staffReducer from "../features/staff/staffSlice";
import tablesReducer from "../features/tables/tablesSlice";
import ordersReducer from "../features/orders/ordersSlice";
import paymentsReducer from "../features/payments/paymentsSlice";
import customersReducer from "../features/customers/customersSlice";
import menuReducer from "../features/menu/menuSlice";

// Combine all reducers
const appReducer = combineReducers({
	auth: authReducer,
	signup: signupReducer,
	restaurants: restaurantsReducer,
	staff: staffReducer,
	tables: tablesReducer,
	orders: ordersReducer,
	payments: paymentsReducer,
	customers: customersReducer,
	menu: menuReducer,
	[authApi.reducerPath]: authApi.reducer,
	[bankAccountsApi.reducerPath]: bankAccountsApi.reducer,
	[branchManagementApi.reducerPath]: branchManagementApi.reducer,
	[menuApi.reducerPath]: menuApi.reducer,
	[ordersApi.reducerPath]: ordersApi.reducer,
	[roleApi.reducerPath]: roleApi.reducer,
	[tablesApi.reducerPath]: tablesApi.reducer,
	[subscriptionApi.reducerPath]: subscriptionApi.reducer,
});

// Reset the store when resetStore action is dispatched
const RESET_TYPE = resetStore.type;
const rootReducer = (
	state: ReturnType<typeof appReducer> | undefined,
	action: AnyAction,
) => {
	if (action && action.type === RESET_TYPE) {
		state = undefined;
	}
	return appReducer(state, action);
};

export const store = configureStore({
	reducer: rootReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				// Ignore these action types if needed
				ignoredActions: [resetStore.type],
			},
		}).concat(
			authApi.middleware,
			bankAccountsApi.middleware,
			branchManagementApi.middleware,
			menuApi.middleware,
			ordersApi.middleware,
			roleApi.middleware,
			tablesApi.middleware,
			subscriptionApi.middleware,
		),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
