import { configureStore, combineReducers, AnyAction } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import { resetStore } from "./resetActions";
import { authApi } from "../services/auth/authApi";
import { bankAccountsApi } from "../services/bank-accounts/bankAccountsApi";
import { branchManagementApi } from "../services/branch-management/branchManagementApi";
import { roleApi } from "../services/role/roleApi";
import { subscriptionApi } from "../services/subscription/subscriptionApi";
import { subscriptionPlanApi } from "../services/subscription-plan/subscriptionPlanApi";
import { referralsApi } from "../services/referrals/referralsApi";
import { smsApi } from "../services/sms/smsApi";
import { transactionsApi } from "../services/transactions/transactionsApi";
import { bannersApi } from "../services/banners/bannersApi";
import { analyticsApi } from "../services/analytics/analyticsApi";
import { globalSettingsApi } from "../services/global-settings/globalSettingsApi";
import { contactMessagesApi } from "../services/contact-messages/contactMessagesApi";
import { platformApi } from "../services/platform/platformApi";
import { adminApi } from "../services/admin/adminApi";

// Combine all reducers
const appReducer = combineReducers({
	auth: authReducer,
	[authApi.reducerPath]: authApi.reducer,
	[bankAccountsApi.reducerPath]: bankAccountsApi.reducer,
	[branchManagementApi.reducerPath]: branchManagementApi.reducer,
	[roleApi.reducerPath]: roleApi.reducer,
	[platformApi.reducerPath]: platformApi.reducer,
	[adminApi.reducerPath]: adminApi.reducer,
	[subscriptionApi.reducerPath]: subscriptionApi.reducer,
	[subscriptionPlanApi.reducerPath]: subscriptionPlanApi.reducer,
	[referralsApi.reducerPath]: referralsApi.reducer,
	[smsApi.reducerPath]: smsApi.reducer,
	[transactionsApi.reducerPath]: transactionsApi.reducer,
	[bannersApi.reducerPath]: bannersApi.reducer,
	[analyticsApi.reducerPath]: analyticsApi.reducer,
	[globalSettingsApi.reducerPath]: globalSettingsApi.reducer,
	[contactMessagesApi.reducerPath]: contactMessagesApi.reducer,
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
			roleApi.middleware,
			platformApi.middleware,
			adminApi.middleware,
			subscriptionApi.middleware,
			subscriptionPlanApi.middleware,
			referralsApi.middleware,
			smsApi.middleware,
			transactionsApi.middleware,
			bannersApi.middleware,
			analyticsApi.middleware,
			globalSettingsApi.middleware,
			contactMessagesApi.middleware,
		),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
