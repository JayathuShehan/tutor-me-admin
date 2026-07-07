"use client";

import { LoginSchema } from "@/components/auth/form-sign-in/schema";
import {
  useLazyMeQuery,
  useLoginMutation,
  useLogoutMutation,
} from "@/store/api/splits/auth";
import { AuthUserData } from "@/types/auth-types";
import { UserLoginResponse } from "@/types/response-types";
import { getErrorInApiResult } from "@/utils/api";
import { useRouter } from "next/navigation";
import { createContext, ReactNode, useEffect, useState } from "react";

const toAuthUserData = (user: UserLoginResponse["user"]): AuthUserData => ({
  id: user.id,
  role: user.role,
  name: user.name,
  email: user.email,
  status: user.status,
});

export type AuthProviderType = {
  user: AuthUserData | null;
  isAuthError: string | null;
  isLoading: boolean;
  isUserLoaded: boolean;
  isUserLogoutLoading: boolean;
  login: (credentials: LoginSchema) => void;
  logout: () => void;
  setIsAuthError: (error: string | null) => void;
};

interface AuthContextType {
  user: AuthUserData | null;
  isAuthError: string | null;
  isLoading: boolean;
  isUserLogoutLoading: boolean;
  isUserLoaded: boolean;
  login: (credentials: LoginSchema) => void;
  logout: () => void;
  setIsAuthError: (error: string | null) => void;
}

const authProvider = {
  user: null,
  isAuthError: null,
  isLoading: false,
  isUserLoaded: false,
  isUserLogoutLoading: false,
  login: () => {},
  logout: () => {},
  setIsAuthError: () => {},
};

const AuthContext = createContext<AuthContextType>(authProvider);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserData | null>(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [isAuthError, setIsAuthError] = useState<string | null>(null);
  const [handleUserLogin, { isLoading }] = useLoginMutation();
  const [handleUserLogout, { isLoading: isUserLogoutLoading }] =
    useLogoutMutation();
  const [fetchCurrentUser] = useLazyMeQuery();

  useEffect(() => {
    const bootstrapSession = async () => {
      const result = await fetchCurrentUser();
      if (result.data?.user && result.data.user.role === "admin") {
        setUser(toAuthUserData(result.data.user));
      }
      setIsUserLoaded(true);
    };
    bootstrapSession();
  }, [fetchCurrentUser]);

  const login = async (credentials: LoginSchema) => {
    const result = await handleUserLogin(credentials);
    const error = getErrorInApiResult(result);
    if (error) {
      setIsAuthError(error);
      return;
    }
    if (result.data) {
      await handleLoginSuccess(result.data);
    }
  };

  const handleLoginSuccess = async ({ user }: UserLoginResponse) => {
    if (user.role !== "admin") {
      // A session was established server-side even though this account can't
      // use the admin panel — destroy it rather than leaving it dangling.
      await handleUserLogout();
      setIsAuthError(
        "Access denied: You do not have permission to view this panel.",
      );
      return;
    }

    setUser(toAuthUserData(user));

    router.push("/");
  };

  const logout = async () => {
    await handleUserLogout();
    setUser(null);
    router.push("/signin");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthError,
        isLoading,
        login,
        logout,
        setIsAuthError,
        isUserLoaded,
        isUserLogoutLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
