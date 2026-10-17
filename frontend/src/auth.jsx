import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "./api.js";
import { clearAuthToken, getAuthToken, setAuthToken } from "./authToken.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getAuthToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    if (!token) { setUser(null); setLoading(false); return () => { active = false; }; }
    setLoading(true);
    api.getMe().then(({ user: currentUser }) => {
      if (active) setUser(currentUser);
    }).catch(() => {
      if (active) { clearAuthToken(); setToken(null); setUser(null); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const login = useCallback(async (email, password) => {
    const result = await api.login(email, password);
    setAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ token, user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }

export function ProtectedRoute({ children, admin = false }) {
  const { token, user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="container page-shell"><div className="empty-state">Đang kiểm tra phiên đăng nhập...</div></main>;
  if (!token || !user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (admin && user.role !== "admin") return <main className="container page-shell"><div className="empty-state">Tài khoản này không có quyền quản trị.</div></main>;
  return children;
}
