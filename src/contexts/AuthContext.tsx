import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getStoredToken,
  getStoredUser,
  storeAuth,
  clearAuth,
} from "@/lib/defarm-api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const token = getStoredToken();
    const storedUser = getStoredUser();
    
    if (token && storedUser) {
      setUser(storedUser);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (data: LoginRequest) => {
    const response: AuthResponse = await apiLogin(data);
    
    const userData: User = {
      id: response.user_id,
      username: data.username,
      email: data.username,
      workspace_id: response.workspace_id,
    };
    
    storeAuth(response.access_token, userData, response.refresh_token);
    setUser(userData);
  };

  const register = async (data: RegisterRequest) => {
    const response: AuthResponse = await apiRegister(data);
    
    const userData: User = {
      id: response.user_id,
      username: data.username,
      email: data.email,
      workspace_id: response.workspace_id,
    };
    
    storeAuth(response.access_token, userData, response.refresh_token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      clearAuth();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // During HMR or before provider mounts, return a safe default
    // This prevents crashes during hot reload
    console.warn("useAuth called outside AuthProvider - returning default state");
    return {
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: async () => { throw new Error("AuthProvider not available"); },
      register: async () => { throw new Error("AuthProvider not available"); },
      logout: async () => { throw new Error("AuthProvider not available"); },
    };
  }
  return context;
}
