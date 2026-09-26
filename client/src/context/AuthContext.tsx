import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, getMe, login as loginRequest, logout as logoutRequest, refreshSession, signup as signupRequest, updateProfile as updateProfileRequest } from "../lib/api";
import type { PublicUser, SignupInput } from "../types";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  signup: (input: SignupInput) => Promise<string>;
  updateProfile: (input: SignupInput) => Promise<void>;
  refreshUser: () => Promise<PublicUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const me = await getMe();
        if (!cancelled) setUser(me.user);
      } catch (error) {
        if (error instanceof ApiError && error.code === "UNAUTHENTICATED") {
          try {
            const refreshed = await refreshSession();
            if (!cancelled) setUser(refreshed.user);
          } catch {
            if (!cancelled) setUser(null);
          }
        } else if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onSessionLost() {
      setUser(null);
    }
    window.addEventListener("sika:session-lost", onSessionLost);
    return () => window.removeEventListener("sika:session-lost", onSessionLost);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const result = await loginRequest(email, password);
        setUser(result.user);
        return result.user;
      },
      async signup(input) {
        const result = await signupRequest(input);
        return result.message;
      },
      async updateProfile(input) {
        const result = await updateProfileRequest(input);
        setUser(result.user);
      },
      async refreshUser() {
        try {
          const me = await getMe();
          setUser(me.user);
          return me.user;
        } catch {
          return user;
        }
      },
      async logout() {
        try {
          await logoutRequest();
        } finally {
          setUser(null);
        }
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
