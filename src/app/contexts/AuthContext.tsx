"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loginAdmin, logoutAdmin, getCurrentAdmin, PlatformAdmin } from "../../features/auth/authSlice";

type UserRole = "system_admin" | "branch_admin";

interface User {
  id: string;
  name: string;
  email: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert PlatformAdmin to User
const platformAdminToUser = (admin: PlatformAdmin): User => {
  return {
    id: admin.user_id || admin.id || '', // Use user_id as the primary identifier
    name: admin.name,
    email: admin.email,
    role: admin.role.toLowerCase() as UserRole,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { admin, isAuthenticated, loading, error } = useAppSelector((state: any) => state.auth);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // Sync Redux admin state to local user state
  useEffect(() => {
    if (admin) {
      setUser(platformAdminToUser(admin));
    } else {
      setUser(null);
    }
  }, [admin]);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        await dispatch(getCurrentAdmin()).unwrap();
      } catch (error) {
        // No active session, clear any stored data
        setUser(null);
      }
    };
    checkSession();
  }, [dispatch]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await dispatch(loginAdmin({ email, password })).unwrap();
      return true;
    } catch (error: any) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await dispatch(logoutAdmin()).unwrap();
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if logout fails
      setUser(null);
      router.push("/login");
    }
  };

  const isSystemAdmin = () => user?.role === "system_admin";
  const isBranchAdmin = () => user?.role === "branch_admin";

  return (
    <AuthContext.Provider value={{ user, login, logout, isSystemAdmin, isBranchAdmin }}>
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

