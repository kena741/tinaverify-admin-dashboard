"use client";

import { type ReactNode, useEffect } from "react";

import { getStoredAccessToken, getStoredRefreshToken } from "../services/authTokens";
import { initializeAuthSession, selectAuthUser } from "./authSlice";
import { useAppDispatch, useAppSelector } from "./hooks";

/** Restore auth from stored tokens; retry when the tab wakes after idle. */
export function AuthBootstrap({ children }: { children: ReactNode }) {
	const dispatch = useAppDispatch();
	const user = useAppSelector(selectAuthUser);

	useEffect(() => {
		void dispatch(initializeAuthSession());
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
