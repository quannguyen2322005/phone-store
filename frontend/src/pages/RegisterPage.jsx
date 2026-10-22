import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const destination = location.state?.from || (user?.role === "admin" ? "/admin" : "/");
  if (user) return <Navigate to={destination} replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    try {
      await api.register(name.trim(), email.trim(), password);
      const authenticatedUser = await login(email.trim(), password);
      navigate(location.state?.from || (authenticatedUser.role === "admin" ? "/admin" : "/"), { replace: true });
    } catch (registerError) {
      setError(registerError.message || "Không thể tạo tài khoản. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="container page-shell"><section className="auth-card"><Link className="logo" to="/"><span className="logo-mark">QN</span>QN-Mobiles</Link><h1>Tạo tài khoản</h1><p>Đăng ký để mua sắm thuận tiện hơn.</p><form onSubmit={submit}><label>Họ và tên<input type="text" autoComplete="name" maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Mật khẩu<input type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} /><small>Tối thiểu 8 ký tự.</small></label><label>Nhập lại mật khẩu<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>{error && <div className="auth-error" role="alert">{error}</div>}<button className="button" type="submit" disabled={busy}>{busy ? "Đang tạo tài khoản..." : "Đăng ký"}</button></form><p className="auth-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p><Link className="auth-back" to="/">Quay lại cửa hàng</Link></section></main>;
}
