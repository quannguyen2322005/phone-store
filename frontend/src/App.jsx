import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api.js";
import { ProtectedRoute } from "./auth.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import OrderSuccessPage from "./pages/OrderSuccessPage.jsx";
import OrderLookupPage from "./pages/OrderLookupPage.jsx";
import StorePage from "./pages/StorePage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import { useCart } from "./hooks/useCart.js";

// Trang quản trị dùng Mantine nên tải riêng, khách mua hàng không phải tải phần này.
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));

function App() {
  const [cartOpen, setCartOpen] = useState(window.location.hash === "#cart");
  const [toast, setToast] = useState(null);
  const {
    cart,
    setCart,
    cartSync,
    refreshCart,
    addToCart,
    adjustCart,
    removeUnavailable,
    clearCartSync
  } = useCart(setToast, cartOpen);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash === "#cart") setCartOpen(true);
    else setCartOpen(false);
    window.requestAnimationFrame(() => {
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
      else window.scrollTo(0, 0);
    });
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (location.pathname.startsWith("/product/")) return;
    if (location.pathname.startsWith("/admin")) document.title = "Quản lý cửa hàng — QN-Mobiles";
    else if (location.pathname.startsWith("/about")) document.title = "Giới thiệu — QN-Mobiles";
    else document.title = "QN-Mobiles — Smartphone chính hãng";
  }, [location.pathname]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function addProductById(id) {
    try {
      const { product } = await api.getProduct(id);
      const variant = product.variants?.find((item) => item.stock > 0) || product.variants?.[0];
      addToCart(product, variant);
    } catch (error) {
      setToast({ message: error.message, error: true });
    }
  }

  const openCart = () => setCartOpen(true);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/order-success/:code" element={<OrderSuccessPage />} />
        <Route path="/order-lookup" element={<OrderLookupPage />} />
        <Route path="/" element={<StorePage addProductById={addProductById} setToast={setToast} onOpenCart={openCart} />} />
        <Route path="/about" element={<AboutPage onOpenCart={openCart} />} />
        <Route path="/about.html" element={<AboutPage onOpenCart={openCart} />} />
        <Route path="/admin" element={<ProtectedRoute admin><Suspense fallback={<main className="container page-shell"><div className="empty-state">Đang tải trang quản trị...</div></main>}><AdminPage /></Suspense></ProtectedRoute>} />
        <Route path="/admin.html" element={<ProtectedRoute admin><Suspense fallback={<main className="container page-shell"><div className="empty-state">Đang tải trang quản trị...</div></main>}><AdminPage /></Suspense></ProtectedRoute>} />
        <Route path="/product/:id" element={<ProductPage addToCart={addToCart} onOpenCart={openCart} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!location.pathname.startsWith("/admin") && (
        <CartDrawer
          cart={cart}
          cartSync={cartSync}
          open={cartOpen}
          onClose={() => { setCartOpen(false); if (location.hash === "#cart") navigate(location.pathname); }}
          onRefreshCart={refreshCart}
          onRemoveUnavailable={removeUnavailable}
          onClearCartSync={clearCartSync}
          adjustCart={adjustCart}
          setCart={setCart}
          setToast={setToast}
        />
      )}
      {toast && <div className={`toast is-visible${toast.error ? " error" : ""}`} role="status" aria-live="polite">{toast.message}</div>}
    </>
  );
}

export default App;
