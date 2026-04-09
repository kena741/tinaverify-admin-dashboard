"use client";

import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
	useLazyReadMeQuery,
	useLoginUserMutation,
} from "../../services/auth/authApi";
import type { UserOutput } from "../../services/types";

type UserRole = "system_admin" | "branch_admin";

interface User {
	id: string;
	name: string;
	email: string | null;
	role: UserRole;
	branchId?: string;
	branchName?: string;
}

interface AuthContextType {
	user: User | null;
	login: (email: string, password: string) => Promise<boolean>;
	logout: () => void;
	isSystemAdmin: () => boolean;
	isBranchAdmin: () => boolean;
	loading: boolean;
	error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_STORAGE_KEY = "zuludine_access_token";

const backendUserToUser = (u: UserOutput): User => {
	const first = u.user_information?.first_name?.trim() || "";
	const last = u.user_information?.last_name?.trim() || "";
	const name = `${first} ${last}`.trim() || u.username || u.phone_number;

	return {
		id: u.id,
		name,
		email: u.email,
		role: u.is_superuser ? "system_admin" : "branch_admin",
	};
};

export function AuthProvider({ children }: { children: ReactNode }) {
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loginUser, { isLoading: isLoggingIn }] = useLoginUserMutation();
	const [readMe, { isFetching: isReadingMe }] = useLazyReadMeQuery();

	// Check for existing session on mount
	useEffect(() => {
		const checkSession = async () => {
			try {
				const token =
					typeof window !== "undefined"
						? localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
						: null;
				if (!token) {
					setUser(null);
					return;
				}

				const me = await readMe({ accessToken: token }).unwrap();
				setUser(backendUserToUser(me));
			} catch (e) {
				if (typeof window !== "undefined") {
					localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
				}
				setUser(null);
			}
		};
		checkSession();
	}, [readMe]);

	const login = async (email: string, password: string): Promise<boolean> => {
		try {
			setError(null);

			const auth = await loginUser({ username: email, password }).unwrap();
			if (typeof window !== "undefined") {
				localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, auth.access_token);
			}
			setUser(backendUserToUser(auth.user));
			return true;
		} catch (e: unknown) {
			const err = e as {
				data?: { detail?: string; message?: string };
				error?: string;
				message?: string;
			};
			setError(
				err.data?.detail ||
					err.data?.message ||
					err.error ||
					err.message ||
					"Login failed",
			);
			return false;
		}
	};

	const logout = async () => {
		try {
			setError(null);
			if (typeof window !== "undefined") {
				localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
			}
			setUser(null);
			router.push("/login");
		} catch (error) {
			console.error("Logout error:", error);
			// Still clear local state even if logout fails
			if (typeof window !== "undefined") {
				localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
			}
			setUser(null);
			router.push("/login");
		}
	};

	const isSystemAdmin = () => user?.role === "system_admin";
	const isBranchAdmin = () => user?.role === "branch_admin";
	const loading = isLoggingIn || isReadingMe;

	return (
		<AuthContext.Provider
			value={{
				user,
				login,
				logout,
				isSystemAdmin,
				isBranchAdmin,
				loading,
				error,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
