"use client";

import { type ReactNode, useEffect } from "react";

import {
	getStoredAccessToken,
	getStoredRefreshToken,
	onSessionCleared,
} from "../services/authTokens";
import { authApi } from "../services/auth/authApi";
import {
	initializeAuthSession,
	selectAuthUser,
	sessionExpired,
} from "./authSlice";
import { useAppDispatch, useAppSelector } from "./hooks";

/** Restore auth from stored tokens; retry when the tab wakes after idle. */
export function AuthBootstrap({ children }: { children: ReactNode }) {
	const dispatch = useAppDispatch();
	const user = useAppSelector(selectAuthUser);

	useEffect(() => {
		void dispatch(initializeAuthSession());
	}, [dispatch]);

	useEffect(() => {
		return onSessionCleared(() => {
			dispatch(sessionExpired());
			dispatch(authApi.util.resetApiState());
		});
	}, [dispatch]);

	useEffect(() => {
		function onVisible() {
			if (document.visibilityState !== "visible") return;
			if (user) return;
			if (!getStoredAccessToken() && !getStoredRefreshToken()) return;
			void dispatch(initializeAuthSession());
		}
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, [dispatch, user]);

	return <>{children}</>;
}
