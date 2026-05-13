import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  clearToken,
  getCurrentUser,
  getToken,
  setToken,
  type AuthUser,
} from "../api/auth";

// ─── Shape ────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true until initial check done

  /** Persist token + fetch user profile. Never throws — always resolves. */
  const login = useCallback(async (newToken: string): Promise<void> => {
    localStorage.setItem("lex_token", newToken);
    setToken(newToken);
    setTokenState(newToken);
    try {
      const profile = await getCurrentUser(newToken);
      setUser(profile);
    } catch (error) {
      console.error("Auth context login error:", error);
      // Still mark as authenticated — token is saved, profile fetch can retry later
      setTokenState(newToken);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  /** On mount: restore session from localStorage */
  useEffect(() => {
    const savedToken = localStorage.getItem("lex_token");
    if (savedToken) {
      getCurrentUser(savedToken)
        .then((user) => {
          setTokenState(savedToken);
          setToken(savedToken);
          setUser(user);
        })
        .catch(() => {
          // Token expired or invalid — clear it
          localStorage.removeItem("lex_token");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
