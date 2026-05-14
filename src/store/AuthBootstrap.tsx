"use client";

import { type ReactNode, useEffect } from "react";

import { initializeAuthSession } from "./authSlice";
import { useAppDispatch } from "./hooks";

/** Runs once on the client to restore auth from stored tokens + `GET /api/v1/users/me`. */
export function AuthBootstrap({ children }: { children: ReactNode }) {
	const dispatch = useAppDispatch();

	useEffect(() => {
		void dispatch(initializeAuthSession());
	}, [dispatch]);

	return <>{children}</>;
}
