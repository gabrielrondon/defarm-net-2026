import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  refreshToken as apiRefreshToken,
  getStoredToken,
  getStoredUser,
  storeAuth,
  clearAuth,
  getRefreshToken,
  storeTokens,
  getMe as apiGetMe,
  setStoredUser,
} from "@/lib/defarm-api";
import { createCircuit, getCircuits } from "@/lib/api/circuits";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUserData: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getWorkspace(response: AuthResponse) {
  return response.user?.workspace || {
    id: response.workspace_id || "default",
    name: "Workspace",
    slug: "workspace",
    tier: "free",
    workspace_type: "producer" as const,
    role: "viewer",
  };
}

function mapAuthUser(response: AuthResponse, fallbackName: string, fallbackEmail: string): User {
  const workspace = getWorkspace(response);
  return {
    id: response.user?.id || response.user_id || "unknown",
    username: response.user?.full_name || fallbackName,
    full_name: response.user?.full_name || fallbackName,
    avatar_url: response.user?.avatar_url || null,
    email: response.user?.email || fallbackEmail,
    workspace_id: workspace.id,
    workspace_name: workspace.name,
    workspace_slug: workspace.slug,
    workspace_type: workspace.workspace_type,
    role: workspace.role,
    is_admin: response.user?.is_admin || false,
    is_active: response.user?.is_active ?? true,
  };
}

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

      // Refresh token to pick up new RBAC permissions after circuit creation
      const currentRefresh = getRefreshToken();
      if (currentRefresh) {
        try {
          const refreshed = await apiRefreshToken(currentRefresh);
          storeTokens(refreshed.access_token, refreshed.refresh_token);
          console.log("[DeFarm Auth] Token refreshed with updated RBAC ✅");
        } catch (refreshErr) {
          console.warn("[DeFarm Auth] Token refresh after circuit creation failed:", refreshErr);
        }
      }
    } catch (createErr) {
      console.warn("[DeFarm Auth] Could not create default circuit:", createErr);
    }
  };

  const login = async (data: LoginRequest) => {
    const response: AuthResponse = await apiLogin(data);
    const userData = mapAuthUser(response, data.email, data.email);

    storeAuth(response.access_token, userData, response.refresh_token);

    // Ensure circuit exists BEFORE setting user (which triggers Dashboard mount)
    await ensureDefaultCircuit(userData.id);
    setUser(userData);
  };

  const register = async (data: RegisterRequest) => {
    const response: AuthResponse = await apiRegister(data);
    const userData = mapAuthUser(response, data.full_name || data.email, data.email);

    storeAuth(response.access_token, userData, response.refresh_token);

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

  const setUserData = (nextUser: User) => {
    setStoredUser(nextUser);
    setUser(nextUser);
  };

  const refreshUser = async () => {
    if (!getStoredToken()) return;
    const me = await apiGetMe();
    if (!user) return;
    const next: User = {
      ...user,
      id: me.id,
      email: me.email,
      username: me.full_name || user.username,
      full_name: me.full_name || undefined,
      avatar_url: me.avatar_url || null,
      is_admin: me.is_admin,
      is_active: me.is_active,
      workspace_id: me.workspace.id,
      workspace_name: me.workspace.name,
      workspace_slug: me.workspace.slug,
      workspace_type: me.workspace.workspace_type,
      role: me.workspace.role,
    };
    setUserData(next);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.is_admin || false,
        isLoading,
        login,
        register,
        logout,
        setUserData,
        refreshUser,
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
      isAdmin: false,
      isLoading: true,
      login: async () => { throw new Error("AuthProvider not available"); },
      register: async () => { throw new Error("AuthProvider not available"); },
      logout: async () => { throw new Error("AuthProvider not available"); },
      setUserData: () => { throw new Error("AuthProvider not available"); },
      refreshUser: async () => { throw new Error("AuthProvider not available"); },
    };
  }
  return context;
}
