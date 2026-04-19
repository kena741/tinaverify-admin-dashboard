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
import {
	clearStoredTokens,
	getStoredAccessToken,
	getStoredRefreshToken,
	setStoredTokens,
	refreshAccessToken,
} from "../../services/authTokens";

interface User {
	id: string;
	name: string;
	email: string | null;
	isSuperuser: boolean;
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

const backendUserToUser = (u: UserOutput): User => {
	const first = u.user_information?.first_name?.trim() || "";
	const last = u.user_information?.last_name?.trim() || "";
	const name = `${first} ${last}`.trim() || u.username || u.phone_number;

	return {
		id: u.id,
		name,
		email: u.email,
		isSuperuser: u.is_superuser,
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
				if (typeof window === "undefined") return;

				const hasAccess = Boolean(getStoredAccessToken());
				const hasRefresh = Boolean(getStoredRefreshToken());
				if (!hasAccess && !hasRefresh) {
					setUser(null);
					return;
				}
				if (!hasAccess && hasRefresh) {
					const ok = await refreshAccessToken();
					if (!ok) {
						setUser(null);
						return;
					}
				}

				const me = await readMe().unwrap();
				setUser(backendUserToUser(me));
			} catch {
				clearStoredTokens();
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
				setStoredTokens(auth.access_token, auth.refresh_token);
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
			clearStoredTokens();
			setUser(null);
			router.push("/login");
		} catch (error) {
			console.error("Logout error:", error);
			clearStoredTokens();
			setUser(null);
			router.push("/login");
		}
	};

	const isSystemAdmin = () => Boolean(user?.isSuperuser);
	const isBranchAdmin = () => Boolean(user && !user.isSuperuser);
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
