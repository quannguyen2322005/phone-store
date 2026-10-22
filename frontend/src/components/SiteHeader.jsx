import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { BRANDS } from "../lib/store.js";
import { CartIcon, SearchIcon, UserIcon } from "./icons.jsx";

export default function SiteHeader({ cartCount, onOpenCart, searchValue = "" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSearchParams] = useSearchParams();
  const { user, loading, logout } = useAuth();
  const [search, setSearch] = useState(searchValue);
  useEffect(() => setSearch(searchValue), [searchValue]);
  function submitSearch(event) {
    event.preventDefault();
    const next = new URLSearchParams();
    ["brand", "ram", "storage", "minPrice", "maxPrice", "sort"].forEach((key) => {
      const value = currentSearchParams.get(key);
      if (value) next.set(key, value);
    });
    if (search.trim()) next.set("search", search.trim());
    navigate({ pathname: "/", search: next.toString() ? `?${next}` : "", hash: "#products" });
    setMenuOpen(false);
  }
  return (
    <>
      <div className="topline"><div className="container"><span>Hàng chính hãng · Giao hàng toàn quốc</span><span>Hotline: 0969733146 · 8:00–22:00 mỗi ngày</span></div></div>
      <header className="site-header">
        <div className="container">
          <div className="header-main">
            <button className="mobile-menu" type="button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-controls="store-header-nav" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <Link className="logo" to="/"><span className="logo-mark">QN</span>QN-Mobiles</Link>
            <form className="searchbox" role="search" onSubmit={submitSearch}>
              <input type="search" placeholder="Bạn đang tìm điện thoại nào?" aria-label="Tìm kiếm điện thoại" value={search} onChange={(event) => setSearch(event.target.value)} />
              <button type="submit" aria-label="Tìm kiếm"><SearchIcon /></button>
            </form>
            <nav id="store-header-nav" className={`header-nav${menuOpen ? " is-open" : ""}`} aria-label="Điều hướng chính">
              <a href="/#products" onClick={() => setMenuOpen(false)}>Điện thoại</a>
              <Link to="/about" onClick={() => setMenuOpen(false)}>Giới thiệu</Link>
              <Link to="/order-lookup" onClick={() => setMenuOpen(false)}>Tra cứu đơn hàng</Link>
              <Link to="/about#contact" onClick={() => setMenuOpen(false)}>Liên hệ</Link>
              {user?.role === "admin" && <Link to="/admin" onClick={() => setMenuOpen(false)}>Quản lý</Link>}
              <div className="mobile-account-links">
                {loading ? <span className="account-placeholder" aria-hidden="true" /> : user ? <>
                  <span className="mobile-user-name" title={user.name}>{user.name}</span>
                  <button type="button" onClick={() => { logout(); setMenuOpen(false); }} aria-label="Đăng xuất">Đăng xuất</button>
                </> : <>
                  <Link to="/login" state={{ from: location }} onClick={() => setMenuOpen(false)}>Đăng nhập</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)}>Đăng ký</Link>
                </>}
              </div>
            </nav>
            <div className="header-utilities">
              {loading ? <span className="account-placeholder" aria-hidden="true" /> : user ? <div className="header-account">
                <span className="header-user-name" title={user.name}>{user.name}</span>
                <button className="header-logout" type="button" onClick={logout} aria-label="Đăng xuất">Đăng xuất</button>
              </div> : <div className="header-account">
                <Link className="header-link" to="/login" state={{ from: location }} aria-label="Đăng nhập"><UserIcon /><span>Đăng nhập</span></Link>
                <Link className="header-register" to="/register">Đăng ký</Link>
              </div>}
              <button className="header-link cart-trigger" type="button" onClick={onOpenCart} aria-label="Giỏ hàng">
                <CartIcon /><span>Giỏ hàng</span><b className="cart-badge">{cartCount}</b>
              </button>
            </div>
          </div>
          <nav className="brand-nav" aria-label="Chọn thương hiệu">
            <a href="/#products">Tất cả điện thoại</a>
            {BRANDS.map(([brand, label]) => <a key={brand} href={`/?brand=${brand}#products`}>{brand === "APPLE" ? "iPhone" : label.replace(" / iPhone", "")}</a>)}
          </nav>
        </div>
      </header>
    </>
  );
}
