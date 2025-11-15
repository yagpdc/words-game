import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { WORDS_ENDPOINTS } from "../api/words";
import { AuthContext } from "./auth-context";
import type { User } from "./auth-context";

const AUTH_STORAGE_KEY = "wordsAuth";

const setAuthHeader = (header?: string) => {
  if (header) {
    axios.defaults.headers.common.Authorization = header;
    return;
  }

  delete axios.defaults.headers.common.Authorization;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setAuthHeader(undefined);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const login = useCallback((userData: User, authHeader: string) => {
    setUser(userData);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTH_STORAGE_KEY, authHeader);
    }
    setAuthHeader(authHeader);
  }, []);

  const updateUser = useCallback((partialUser: Partial<User>) => {
    setUser((previous) => {
      if (!previous) {
        return previous;
      }

      return { ...previous, ...partialUser };
    });
  }, []);

  const restoreSession = useCallback(async () => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    const storedHeader = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedHeader) {
      setIsLoading(false);
      return;
    }

    setAuthHeader(storedHeader);

    try {
      const { data } = await axios.get<User>(WORDS_ENDPOINTS.profile);
      setUser(data);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      updateUser,
    }),
    [isLoading, login, logout, updateUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
