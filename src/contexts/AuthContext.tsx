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
import { createCircuit, getCircuits } from "@/lib/api/circuits";

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

  // Ensure the user has at least one circuit (required for RBAC permissions)
  const ensureDefaultCircuit = async (userId: string) => {
    try {
      // Try listing circuits first
      const circuits = await getCircuits();
      if (circuits.length > 0) {
        console.log("[DeFarm Auth] User already has circuits, skipping creation");
        return;
      }
    } catch (err) {
      // 403 is expected when user has no circuit yet — proceed to create one
      console.log("[DeFarm Auth] getCircuits failed (expected if no circuit yet), creating default...");
    }

    // Create a default circuit so the user gets RBAC permissions
    try {
      await createCircuit({
        name: "Meu Circuito",
        description: "Circuito padrão criado automaticamente",
        circuit_type: "private",
        visibility: "private",
        owner_id: userId,
      });
      console.log("[DeFarm Auth] Default circuit created ✅");
    } catch (createErr) {
      console.warn("[DeFarm Auth] Could not create default circuit:", createErr);
    }
  };

  const login = async (data: LoginRequest) => {
    const response: AuthResponse = await apiLogin(data);
    const respAny = response as any;
    
    const userData: User = {
      id: respAny.user?.id || response.user_id || "unknown",
      username: respAny.user?.username || respAny.user?.full_name || data.email,
      email: respAny.user?.email || data.email,
      workspace_id: respAny.user?.workspace_id || response.workspace_id || "default",
    };
    
    const token = response.access_token || respAny.token;
    const refresh = response.refresh_token || respAny.refresh_token;
    storeAuth(token, userData, refresh);

    // Ensure circuit exists BEFORE setting user (which triggers Dashboard mount)
    await ensureDefaultCircuit(userData.id);
    setUser(userData);
  };

  const register = async (data: RegisterRequest) => {
    const response: AuthResponse = await apiRegister(data);
    const respAny = response as any;
    
    const userData: User = {
      id: respAny.user?.id || response.user_id || "unknown",
      username: respAny.user?.username || data.full_name || data.email,
      email: respAny.user?.email || data.email,
      workspace_id: respAny.user?.workspace_id || response.workspace_id || "default",
    };
    
    const token = response.access_token || respAny.token;
    const refresh = response.refresh_token || respAny.refresh_token;
    storeAuth(token, userData, refresh);

    // Ensure circuit exists BEFORE setting user (which triggers Dashboard mount)
    await ensureDefaultCircuit(userData.id);
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
