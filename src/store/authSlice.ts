import {
	createSlice,
	createAsyncThunk,
} from "@reduxjs/toolkit";

import { authApi } from "../services/auth/authApi";
import type { UserOutput } from "../services/types";
import {
	clearStoredTokens,
	getStoredAccessToken,
	getStoredRefreshToken,
	setStoredTokens,
	refreshAccessToken,
} from "../services/authTokens";
import { BACKEND_HTML_RESPONSE_MESSAGE } from "../services/backendUrl";

/** UI user shape (matches former `AuthContext` model). */
export interface AuthUser {
	id: string;
	name: string;
	email: string | null;
	isSuperuser: boolean;
	branchId?: string;
	branchName?: string;
}

export interface AuthState {
	user: AuthUser | null;
	error: string | null;
	/** First load: refresh + readMe */
	sessionPending: boolean;
	/** Login mutation in flight */
	loginPending: boolean;
}

const initialState: AuthState = {
	user: null,
	error: null,
	sessionPending: true,
	loginPending: false,
};

export function backendUserToUser(u: UserOutput): AuthUser {
	const first = u.user_information?.first_name?.trim() || "";
	const last = u.user_information?.last_name?.trim() || "";
	const name = `${first} ${last}`.trim() || u.username || u.phone_number;

	return {
		id: u.id,
		name,
		email: u.email,
		isSuperuser: u.is_superuser,
	};
}

function messageFromLoginError(error: unknown): string {
	if (typeof error === "object" && error !== null) {
		const e = error as Record<string, unknown>;

		if (e.status === "PARSING_ERROR") {
			return BACKEND_HTML_RESPONSE_MESSAGE;
		}

		if (typeof e.data === "string" && e.data.length > 0) {
			return e.data;
		}

		if ("data" in e && e.data && typeof e.data === "object") {
			const data = e.data as { detail?: unknown; message?: unknown };
			if (typeof data.detail === "string") return data.detail;
			if (typeof data.message === "string") return data.message;
		}

		if (typeof e.error === "string" && e.error.length > 0) return e.error;
		if (typeof e.message === "string" && e.message.length > 0) return e.message;
	}

	if (error instanceof Error) {
		if (error.message.includes("<!DOCTYPE")) {
			return BACKEND_HTML_RESPONSE_MESSAGE;
		}
		return error.message;
	}

	return "Login failed";
}

/** Restore session from stored tokens (client only). */
export const initializeAuthSession = createAsyncThunk<
	UserOutput | null,
	void
>("auth/initializeSession", async (_, { dispatch, rejectWithValue }) => {
	if (typeof window === "undefined") return null;

	const hasAccess = Boolean(getStoredAccessToken());
	const hasRefresh = Boolean(getStoredRefreshToken());
	if (!hasAccess && !hasRefresh) return null;

	if (!hasAccess && hasRefresh) {
		const ok = await refreshAccessToken();
		if (!ok) return rejectWithValue(null);
	}

	const result = await dispatch(
		authApi.endpoints.readMe.initiate(undefined, { forceRefetch: true }),
	);

	if ("data" in result && result.data) return result.data;

	// Expired access while refresh still valid: baseQuery may already have
	// tried once; try an explicit refresh + /me again before forcing logout.
	if (getStoredRefreshToken()) {
		const ok = await refreshAccessToken();
		if (ok) {
			const retry = await dispatch(
				authApi.endpoints.readMe.initiate(undefined, { forceRefetch: true }),
			);
			if ("data" in retry && retry.data) return retry.data;
		}
	}

	clearStoredTokens();
	return rejectWithValue(null);
});

export const loginWithCredentials = createAsyncThunk<
	AuthUser,
	{ email: string; password: string },
	{ rejectValue: string }
>("auth/login", async ({ email, password }, { dispatch, rejectWithValue }) => {
	try {
		const result = await dispatch(
			authApi.endpoints.loginUser.initiate({
				username: email,
				password,
			}),
		).unwrap();

		if (typeof window !== "undefined") {
			setStoredTokens(result.access_token, result.refresh_token);
		}
		return backendUserToUser(result.user);
	} catch (e: unknown) {
		return rejectWithValue(messageFromLoginError(e));
	}
});

export const logoutUser = createAsyncThunk(
	"auth/logout",
	async (_, { dispatch }) => {
		clearStoredTokens();
		dispatch(authApi.util.resetApiState());
	},
);

const authSlice = createSlice({
	name: "auth",
	initialState,
	reducers: {
		clearAuthError(state) {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(initializeAuthSession.pending, (state) => {
				state.sessionPending = true;
				state.error = null;
			})
			.addCase(initializeAuthSession.fulfilled, (state, action) => {
				state.sessionPending = false;
				state.user = action.payload
					? backendUserToUser(action.payload)
					: null;
			})
			.addCase(initializeAuthSession.rejected, (state) => {
				state.sessionPending = false;
				state.user = null;
			})
			.addCase(loginWithCredentials.pending, (state) => {
				state.loginPending = true;
				state.error = null;
			})
			.addCase(loginWithCredentials.fulfilled, (state, action) => {
				state.loginPending = false;
				state.user = action.payload;
				state.error = null;
			})
			.addCase(loginWithCredentials.rejected, (state, action) => {
				state.loginPending = false;
				state.error =
					typeof action.payload === "string"
						? action.payload
						: "Login failed";
			})
			.addCase(logoutUser.fulfilled, (state) => {
				state.user = null;
				state.error = null;
			});
	},
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;

export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectAuthSessionPending = (state: { auth: AuthState }) =>
	state.auth.sessionPending;
export const selectAuthLoginPending = (state: { auth: AuthState }) =>
	state.auth.loginPending;
export const selectAuthLoading = (state: { auth: AuthState }) =>
	state.auth.sessionPending || state.auth.loginPending;

export const selectIsSystemAdmin = (state: { auth: AuthState }) =>
	Boolean(state.auth.user?.isSuperuser);
export const selectIsBranchAdmin = (state: { auth: AuthState }) =>
	Boolean(state.auth.user && !state.auth.user.isSuperuser);
