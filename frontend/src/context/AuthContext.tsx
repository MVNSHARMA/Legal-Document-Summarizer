import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  clearToken,
  setToken,
  type AuthUser,
  API_BASE,
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /** Fetch user profile from backend */
  const fetchUser = async (savedToken: string): Promise<AuthUser> => {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${savedToken}` },
    });
    if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
    return response.json();
  };

  /** Persist token + fetch user profile. Never throws — always resolves. */
  const login = useCallback(async (newToken: string): Promise<void> => {
    localStorage.setItem("lex_token", newToken);
    setToken(newToken);
    setTokenState(newToken);
    setIsAuthenticated(true); // mark authenticated immediately
    try {
      const userData = await fetchUser(newToken);
      setUser(userData);
    } catch (error) {
      console.error("Auth context login error:", error);
      // Keep authenticated — token is valid even if profile fetch fails
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  /** On mount: restore session from localStorage */
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem("lex_token");
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await fetchUser(savedToken);
        setTokenState(savedToken);
        setToken(savedToken);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth init error:", error);
        // Token may be expired — clear it
        localStorage.removeItem("lex_token");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
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
