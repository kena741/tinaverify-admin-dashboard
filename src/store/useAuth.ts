"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import {
	clearAuthError,
	loginWithCredentials,
	logoutUser,
	selectAuthError,
	selectAuthLoading,
	selectAuthUser,
} from "./authSlice";
import { useAppDispatch, useAppSelector } from "./hooks";

/** Same surface as the former `AuthContext` hook. */
export function useAuth() {
	const dispatch = useAppDispatch();
	const router = useRouter();
	const user = useAppSelector(selectAuthUser);
	const loading = useAppSelector(selectAuthLoading);
	const error = useAppSelector(selectAuthError);

	const login = useCallback(
		async (email: string, password: string): Promise<boolean> => {
			dispatch(clearAuthError());
			const result = await dispatch(
				loginWithCredentials({ email, password }),
			);
			return loginWithCredentials.fulfilled.match(result);
		},
		[dispatch],
	);

	const logout = useCallback(() => {
		dispatch(logoutUser());
		router.push("/login");
	}, [dispatch, router]);

	const isSystemAdmin = useCallback(
		() => Boolean(user?.isSuperuser),
		[user?.isSuperuser],
	);

	const isBranchAdmin = useCallback(
		() => Boolean(user && !user.isSuperuser),
		[user],
	);

	return {
		user,
		login,
		logout,
		isSystemAdmin,
		isBranchAdmin,
		loading,
		error,
	};
}
