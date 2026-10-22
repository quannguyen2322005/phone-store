import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const destination = location.state?.from || (user?.role === "admin" ? "/admin" : "/");
  if (user) return <Navigate to={destination} replace />;
  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const authenticatedUser = await login(email.trim(), password);
      navigate(location.state?.from || (authenticatedUser.role === "admin" ? "/admin" : "/"), { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="container page-shell"><section className="auth-card"><Link className="logo" to="/"><span className="logo-mark">QN</span>QN-Mobiles</Link><h1>Đăng nhập</h1><p>Đăng nhập để tiếp tục mua sắm.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Mật khẩu<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <div className="auth-error" role="alert">{error}</div>}<button className="button" type="submit" disabled={busy}>{busy ? "Đang đăng nhập..." : "Đăng nhập"}</button></form><p className="auth-switch">Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p><Link className="auth-back" to="/">Quay lại cửa hàng</Link></section></main>;
}
