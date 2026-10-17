import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "./api.js";
import { money } from "./format.js";
import { ProtectedRoute } from "./auth.jsx";
import LoginPage from "./pages/LoginPage.jsx";

// Trang quản trị dùng Mantine nên tải riêng, khách mua hàng không phải tải phần này.
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));

const CART_KEY = "quannguyenmobile-cart";
const BRANDS = [
  ["APPLE", "Apple / iPhone"], ["SAMSUNG", "Samsung"], ["XIAOMI", "Xiaomi"],
  ["OPPO", "OPPO"], ["ONEPLUS", "OnePlus"], ["VIVO", "vivo"], ["GOOGLE", "Google Pixel"]
];
const LEGACY_SAMPLE_IMAGES = new Set([
  "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85"
]);
const BRAND_IMAGE_FALLBACKS = {
  APPLE: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=85",
  SAMSUNG: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=900&q=85",
  XIAOMI: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85",
  OPPO: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85",
  ONEPLUS: "https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=85",
  VIVO: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85",
  GOOGLE: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=85"
};
const slugify = (value) => value.toLowerCase().replace(/\+/g, " plus ").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const productImagePath = (name) => `/images/products/${slugify(name)}`;
function productImageSource(name, source) {
  if (source && !LEGACY_SAMPLE_IMAGES.has(source) && !source.startsWith("/images/products/")) return source;
  return `${productImagePath(name)}.webp`;
}

function readSavedCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error("Không thể đọc giỏ hàng đã lưu:", error);
    return [];
  }
}

function App() {
  const [cart, setCart] = useState(readSavedCart);
  const [cartOpen, setCartOpen] = useState(window.location.hash === "#cart");
  const [toast, setToast] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("phone-store-cart-update"));
  }, [cart]);

  useEffect(() => {
    if (location.hash === "#cart") setCartOpen(true);
    else if (cartOpen) setCartOpen(false);
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

  function addToCart(product, variant) {
    if (!variant || variant.stock < 1) {
      setToast({ message: "Phiên bản này hiện đã hết hàng.", error: true });
      return;
    }
    const key = `${product._id}:${variant._id}`;
    const existing = cart.find((item) => item.key === key);
    if (existing && existing.quantity >= variant.stock) {
      setToast({ message: "Số lượng trong giỏ đã đạt tồn kho hiện tại.", error: true });
      return;
    }
    setCart((current) => {
      if (current.some((item) => item.key === key)) return current.map((item) => item.key === key ? { ...item, quantity: item.quantity + 1 } : item);
      const item = {
        key, productId: product._id, variantId: variant._id, name: product.name, brand: product.brand,
        image: productImageSource(product.name, variant.image || product.images?.[0]), storage: variant.storage, color: variant.color,
        price: variant.price, stock: variant.stock, quantity: 1
      };
      return [...current, item];
    });
    setToast({ message: `Đã thêm ${product.name} vào giỏ hàng.` });
  }

  function adjustCart(key, difference) {
    const item = cart.find((entry) => entry.key === key);
    if (!item) return;
    if (item.quantity + difference > item.stock) {
      setToast({ message: "Số lượng trong giỏ đã đạt tồn kho hiện tại.", error: true });
      return;
    }
    setCart((current) => current.flatMap((item) => {
      if (item.key !== key) return [item];
      const quantity = item.quantity + difference;
      if (quantity <= 0) return [];
      return [{ ...item, quantity }];
    }));
  }

  async function addProductById(id) {
    try {
      const { product } = await api.getProduct(id);
      const variant = product.variants?.find((item) => item.stock > 0) || product.variants?.[0];
      addToCart(product, variant);
    } catch (error) {
      setToast({ message: error.message, error: true });
    }
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<StorePage addProductById={addProductById} setToast={setToast} onOpenCart={() => setCartOpen(true)} />} />
        <Route path="/about" element={<AboutPage onOpenCart={() => setCartOpen(true)} />} />
        <Route path="/about.html" element={<AboutPage onOpenCart={() => setCartOpen(true)} />} />
        <Route path="/admin" element={<ProtectedRoute admin><Suspense fallback={<main className="container page-shell"><div className="empty-state">Đang tải trang quản trị...</div></main>}><AdminPage /></Suspense></ProtectedRoute>} />
        <Route path="/admin.html" element={<ProtectedRoute admin><Suspense fallback={<main className="container page-shell"><div className="empty-state">Đang tải trang quản trị...</div></main>}><AdminPage /></Suspense></ProtectedRoute>} />
        <Route path="/product/:id" element={<ProductPage addToCart={addToCart} onOpenCart={() => setCartOpen(true)} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!location.pathname.startsWith("/admin") && (
        <CartDrawer
          cart={cart}
          open={cartOpen}
          onClose={() => { setCartOpen(false); if (location.hash === "#cart") navigate(location.pathname); }}
          adjustCart={adjustCart}
          setCart={setCart}
          setToast={setToast}
        />
      )}
      {toast && <div className={`toast is-visible${toast.error ? " error" : ""}`} role="status" aria-live="polite">{toast.message}</div>}
    </>
  );
}

function SiteHeader({ cartCount, onOpenCart, searchValue = "" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [search, setSearch] = useState(searchValue);
  useEffect(() => setSearch(searchValue), [searchValue]);
  function submitSearch(event) {
    event.preventDefault();
    navigate(`/?search=${encodeURIComponent(search.trim())}#products`);
    setMenuOpen(false);
  }
  return (
    <>
      <div className="topline"><div className="container"><span>Hàng chính hãng · Giao hàng toàn quốc</span><span>Hotline: 0969733146 · 8:00–22:00 mỗi ngày</span></div></div>
      <header className="site-header">
        <div className="container">
          <div className="header-main">
            <button className="mobile-menu" type="button" aria-label="Mở menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <Link className="logo" to="/"><span className="logo-mark">QN</span>QN-Mobiles</Link>
            <form className="searchbox" role="search" onSubmit={submitSearch}>
              <input type="search" placeholder="Bạn đang tìm điện thoại nào?" aria-label="Tìm kiếm điện thoại" value={search} onChange={(event) => setSearch(event.target.value)} />
              <button type="submit" aria-label="Tìm kiếm"><SearchIcon /></button>
            </form>
            <nav className={`header-nav${menuOpen ? " is-open" : ""}`} aria-label="Điều hướng chính">
              <a href="/#products" onClick={() => setMenuOpen(false)}>Điện thoại</a>
              <Link to="/about" onClick={() => setMenuOpen(false)}>Giới thiệu</Link>
              <Link to="/about#contact" onClick={() => setMenuOpen(false)}>Liên hệ</Link>
              <Link to="/admin" onClick={() => setMenuOpen(false)}>Quản lý</Link>
            </nav>
            <div className="header-utilities">
              <Link className="header-link" to="/admin" aria-label="Tài khoản"><UserIcon /><span>Tài khoản</span></Link>
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

function Footer() {
  return <footer className="footer"><div className="container"><Link className="logo" to="/"><span className="logo-mark">QN</span>QN-Mobiles</Link><p>Smartphone chính hãng · Hỗ trợ mỗi ngày 8:00–22:00</p><p>© 2026 QN-Mobiles</p></div></footer>;
}

function StorePage({ addProductById, setToast, onOpenCart }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(() => ({
    page: 1, limit: 9, brand: searchParams.get("brand") || "", ram: "", storage: "",
    minPrice: "", maxPrice: "", search: searchParams.get("search") || "", sort: ""
  }));
  const [priceDraft, setPriceDraft] = useState({ minPrice: filters.minPrice, maxPrice: filters.maxPrice });
  const [searchInput, setSearchInput] = useState(filters.search);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("quannguyenmobile-favorites") || "[]"); }
    catch (error) {
      console.error("Không thể đọc danh sách yêu thích đã lưu:", error);
      return [];
    }
  });
  const [slide, setSlide] = useState(0);
  const cartCount = useCartCount();

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % 3), 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getProducts(filters)
      .then((result) => {
        if (!active) return;
        setProducts(result.products || []);
        setPagination(result.pagination || { total: 0, pages: 1 });
        setLoadError("");
      })
      .catch((error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => current.search === searchInput.trim() ? current : { ...current, search: searchInput.trim(), page: 1 });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const brandFromUrl = searchParams.get("brand") || "";
    const searchFromUrl = searchParams.get("search") || "";
    setSearchInput(searchFromUrl);
    setFilters((current) => current.brand === brandFromUrl && current.search === searchFromUrl
      ? current : { ...current, brand: brandFromUrl, search: searchFromUrl, page: 1 });
  }, [searchParams]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  }
  function toggleFilter(key, value, checked) {
    const selected = filters[key] ? filters[key].split(",").filter(Boolean) : [];
    const updated = checked ? [...new Set([...selected, value])] : selected.filter((item) => item !== value);
    updateFilter(key, updated.join(","));
  }
  function clearFilters() {
    setSearchInput("");
    setPriceDraft({ minPrice: "", maxPrice: "" });
    setFilters({ page: 1, limit: 9, brand: "", ram: "", storage: "", minPrice: "", maxPrice: "", search: "", sort: "" });
    navigate("/", { replace: true });
  }
  function toggleFavorite(id) {
    const updated = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("quannguyenmobile-favorites", JSON.stringify(updated));
    setToast({ message: updated.includes(id) ? "Đã thêm vào danh sách yêu thích." : "Đã bỏ khỏi danh sách yêu thích." });
  }
  const pages = Array.from({ length: Math.min(pagination.pages || 1, 12) }, (_, index) => index + 1);

  return (
    <div className="store-page">
      <SiteHeader cartCount={cartCount} onOpenCart={onOpenCart} searchValue={searchInput} />
      <main className="container">
        <Hero slide={slide} setSlide={setSlide} onBrand={(brand) => updateFilter("brand", brand)} />
        <ServiceRow />
        <section className="intro-band">
          <div className="intro-copy"><span className="hero-label">Về cửa hàng</span><h2>Điện thoại chính hãng, thông tin rõ ràng.</h2><p>Xem giá, phiên bản và tình trạng hàng trước khi chọn mua. Cần hỗ trợ, cửa hàng luôn sẵn sàng tư vấn.</p><Link className="button secondary" to="/about">Thông tin cửa hàng</Link></div>
          <div className="intro-stats"><div><strong>7</strong><span>Thương hiệu điện thoại</span></div><div><strong>100%</strong><span>Hàng chính hãng</span></div><div><strong>8–22h</strong><span>Hỗ trợ mỗi ngày</span></div></div>
        </section>
        <section id="products">
          <div className="catalog-layout">
            <aside className="filter-panel" aria-label="Bộ lọc sản phẩm">
              <div className="filter-title">Bộ lọc <button className="clear-filter" type="button" onClick={clearFilters}>Xóa tất cả</button></div>
              <FilterGroup title="Thương hiệu" options={BRANDS} selected={filters.brand} onChange={(value, checked) => toggleFilter("brand", value, checked)} />
              <div className="filter-group"><h3>Mức giá (₫)</h3><div className="price-range">
                <input type="number" min="0" step="1000000" placeholder="Từ" value={priceDraft.minPrice} onChange={(event) => setPriceDraft((draft) => ({ ...draft, minPrice: event.target.value }))} />
                <input type="number" min="0" step="1000000" placeholder="Đến" value={priceDraft.maxPrice} onChange={(event) => setPriceDraft((draft) => ({ ...draft, maxPrice: event.target.value }))} />
              </div><button className="button small secondary" type="button" style={{ marginTop: 8 }} onClick={() => setFilters((current) => ({ ...current, ...priceDraft, page: 1 }))}>Áp dụng giá</button></div>
              <FilterGroup title="RAM" options={[["8", "8GB"], ["12", "12GB"], ["16", "16GB"]]} selected={filters.ram} onChange={(value, checked) => toggleFilter("ram", value, checked)} />
              <FilterGroup title="Bộ nhớ trong" options={[["128GB", "128GB"], ["256GB", "256GB"], ["512GB", "512GB"], ["1TB", "1TB"]]} selected={filters.storage} onChange={(value, checked) => toggleFilter("storage", value, checked)} />
            </aside>
            <div>
              <div className="catalog-toolbar"><div className="catalog-heading"><h2>Điện thoại nổi bật</h2><p>{loading ? "Đang tải sản phẩm..." : loadError ? "Không thể kết nối" : `${pagination.total || 0} sản phẩm`}</p></div>
                <select className="sort-select" aria-label="Sắp xếp sản phẩm" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
                  <option value="">Sắp xếp: Nổi bật</option><option value="price_asc">Giá: Thấp đến cao</option><option value="price_desc">Giá: Cao đến thấp</option><option value="newest">Mới nhất</option>
                </select>
              </div>
              <div className="product-grid" aria-live="polite">
                {loading ? <div className="empty-state">Đang tải danh sách điện thoại...</div>
                  : loadError ? <div className="empty-state"><strong>Không tải được sản phẩm</strong>{loadError}<br /><br />Hãy kiểm tra kết nối API tại {api.baseUrl}.</div>
                    : products.length ? products.map((product) => <ProductCard key={product._id} product={product} favorite={favorites.includes(product._id)} onFavorite={() => toggleFavorite(product._id)} onAdd={() => addProductById(product._id)} />)
                      : <div className="empty-state"><strong>Chưa tìm thấy điện thoại phù hợp</strong>Thử xóa bớt bộ lọc hoặc tìm kiếm với từ khóa khác.</div>}
              </div>
              {!loadError && pagination.pages > 1 && <div className="pagination" aria-label="Phân trang">{pages.map((page) => <button type="button" key={page} className={filters.page === page ? "active" : ""} aria-label={`Trang ${page}`} onClick={() => updateFilter("page", page)}>{page}</button>)}{pagination.pages > pages.length && <button type="button" aria-label="Trang cuối" onClick={() => updateFilter("page", pagination.pages)}>…</button>}</div>}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function useCartCount() {
  const [count, setCount] = useState(() => readSavedCart().reduce((total, item) => total + item.quantity, 0));
  useEffect(() => {
    const update = () => setCount(readSavedCart().reduce((total, item) => total + item.quantity, 0));
    window.addEventListener("storage", update);
    window.addEventListener("phone-store-cart-update", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("phone-store-cart-update", update);
    };
  }, []);
  return count;
}

function FilterGroup({ title, options, selected, onChange }) {
  const values = selected ? selected.split(",") : [];
  return <div className="filter-group"><h3>{title}</h3>{options.map(([value, label]) => (
    <label className="check-row" key={value}><input type="checkbox" checked={values.includes(value)} onChange={(event) => onChange(value, event.target.checked)} />{label}</label>
  ))}</div>;
}

function ProductCard({ product, favorite, onFavorite, onAdd }) {
  const variant = product.variants?.find((item) => item.stock > 0) || product.variants?.[0];
  const image = productImageSource(product.name, variant?.image || product.images?.[0]);
  const price = variant?.price ?? product.salePrice;
  const original = variant?.originalPrice ?? product.originalPrice;
  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={`/product/${product._id}`} aria-label={`Xem ${product.name}`}><ProductImage name={product.name} brand={product.brand} source={image} alt={product.name} loading="lazy" /></Link>
        {product.featured && <span className="product-badge">Nổi bật</span>}
        <button className={`product-favorite${favorite ? " is-selected" : ""}`} type="button" aria-label={favorite ? "Bỏ yêu thích" : "Thêm yêu thích"} onClick={onFavorite}><HeartIcon /></button>
      </div>
      <div className="product-content">
        <div className="product-brand">{product.brand}</div><h3 title={product.name}><Link to={`/product/${product._id}`}>{product.name}</Link></h3>
        <div className="product-spec-line"><span>{product.specs?.ram || "—"} RAM</span><span>{variant?.storage || "Nhiều phiên bản"}</span></div>
        <div className="product-price-line"><span className="product-price">{money(price)}</span>{original > price && <del className="product-old-price">{money(original)}</del>}</div>
        <div className="product-card-footer"><span className="stock-label">{product.stock > 0 ? `Còn ${product.stock} máy` : "Tạm hết hàng"}</span><button className="button small" type="button" disabled={product.stock < 1} onClick={onAdd}>Thêm giỏ</button></div>
      </div>
    </article>
  );
}

function Hero({ slide, setSlide, onBrand }) {
  const data = [
    ["iPhone", "iPhone 17 Pro", "Xem phiên bản, giá bán và tình trạng hàng tại cửa hàng.", "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=850&q=85", ""],
    ["Samsung", "Điện thoại Samsung", "Tìm mẫu phù hợp và xem các phiên bản đang bán.", "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=850&q=85", "SAMSUNG"],
    ["Xiaomi", "Điện thoại Xiaomi", "Xem giá và lựa chọn bộ nhớ theo nhu cầu.", "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=850&q=85", "XIAOMI"]
  ];
  return <section className="hero" aria-label="Sản phẩm nổi bật"><div className="hero-slides">{data.map((item, index) => (
    <article className={`hero-slide${slide === index ? " is-active" : ""}`} key={item[0]}>
      <div className="hero-copy"><span className="hero-label">{item[0]}</span><h1>{item[1]}</h1><p>{item[2]}</p>
        <a className="button" href="#products" onClick={() => item[4] && onBrand(item[4])}>{item[4] ? `Xem ${item[4] === "SAMSUNG" ? "Samsung" : "Xiaomi"}` : "Xem sản phẩm"} <ArrowIcon /></a>
      </div>
      <div className="hero-visual"><img src={item[3]} alt={item[1]} /></div>
    </article>
  ))}<div className="hero-dots" aria-label="Chọn banner">{data.map((item, index) => <button key={item[0]} type="button" className={slide === index ? "is-active" : ""} aria-label={`Banner ${index + 1}`} onClick={() => setSlide(index)} />)}</div></div></section>;
}

function ServiceRow() {
  const services = [
    ["Giao hàng siêu tốc", "Nhận máy trong ngày"], ["Chính hãng 100%", "Bảo hành chính thức"],
    ["Thanh toán linh hoạt", "COD và chuyển khoản QR"], ["Đổi trả dễ dàng", "An tâm trong 30 ngày"]
  ];
  return <section className="service-row" aria-label="Dịch vụ QN-Mobiles">{services.map(([title, description], index) => <div className="service-item" key={title}><ServiceIcon index={index} /><div><strong>{title}</strong><small>{description}</small></div></div>)}</section>;
}

function AboutPage({ onOpenCart }) {
  return <div className="about-page">
    <SiteHeader cartCount={useCartCount()} onOpenCart={onOpenCart} />
    <main className="container page-shell">
      <section className="about-hero"><div><span className="hero-label">Về cửa hàng</span><h1>Điện thoại chính hãng, tư vấn rõ ràng.</h1><p>QN-Mobiles cung cấp điện thoại chính hãng với giá và thông tin phiên bản minh bạch. Liên hệ cửa hàng để được hỗ trợ chọn máy, đặt hàng và bảo hành.</p></div><div className="about-visual"><img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=80" alt="Điện thoại trưng bày tại cửa hàng" /></div></section>
      <section className="story-grid"><article className="story-card"><h2>Sản phẩm</h2><p>Thông tin model, dung lượng, màu sắc và giá bán được hiển thị theo từng phiên bản.</p></article><article className="story-card"><h2>Bảo hành</h2><p>Sản phẩm chính hãng, áp dụng chính sách bảo hành của nhà sản xuất.</p></article><article className="story-card"><h2>Hỗ trợ</h2><p>Liên hệ cửa hàng để được tư vấn trước khi mua và hỗ trợ sau khi nhận máy.</p></article></section>
      <section className="contact-card" id="contact"><div><span className="hero-label">Liên hệ</span><h2>Cần tư vấn hoặc đặt hàng?</h2></div><div className="contact-info"><div><strong>Hotline/Zalo</strong><p>Quân Nguyễn: 0969733146</p></div><div><strong>Giờ làm việc</strong><p>08:00 – 22:00 hàng ngày</p></div><div><strong>Địa chỉ</strong><p>Liên hệ cửa hàng để được hướng dẫn địa điểm.</p></div></div><a className="button" href="https://zalo.me/0969733146" target="_blank" rel="noreferrer">Nhắn Zalo</a></section>
    </main><Footer />
  </div>;
}

function ProductPage({ addToCart, onOpenCart }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const cartCount = useCartCount();

  useEffect(() => {
    let active = true;
    setProduct(null);
    setError("");
    api.getProduct(id).then(({ product: result }) => {
      if (!active) return;
      setProduct(result);
      setSelected(result.variants?.find((variant) => variant.stock > 0) || result.variants?.[0] || null);
      document.title = `${result.name} — QN-Mobiles`;
    }).catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [id]);

  const variants = product?.variants || [];
  const storages = [...new Set(variants.map((variant) => variant.storage))];
  const colors = [...new Map(variants.map((variant) => [variant.color, variant])).values()];
  const selectVariant = (key, value) => {
    const matching = variants.filter((variant) => variant[key] === value);
    setSelected(matching.find((variant) => (key === "storage" ? variant.color : variant.storage) === (key === "storage" ? selected?.color : selected?.storage))
      || matching.find((variant) => variant.stock > 0) || matching[0]);
  };
  return <div className="product-page">
    <SiteHeader cartCount={cartCount} onOpenCart={onOpenCart} />
    <main className="container">
      <div className="page-title"><Link to="/">Trang chủ</Link>　/　<a href="/#products">Điện thoại</a>　/　<span>{product?.name || "Chi tiết sản phẩm"}</span></div>
      {error ? <div className="empty-state"><strong>Không tải được sản phẩm</strong>{error}</div> : !product ? <div className="empty-state">Đang tải sản phẩm...</div> : <>
        <section className="detail-layout">
          <div className="detail-image"><ProductImage name={product.name} brand={product.brand} source={productImageSource(product.name, selected?.image || product.images?.[0])} alt={product.name} /></div>
          <div className="detail-info"><div className="product-brand">{product.brand} · {product.category}</div><h1>{product.name}</h1><div className="rating-line"><span>Hàng chính hãng · Bảo hành chính thức</span></div>
            <div className="detail-price"><span>{money(selected?.price)}</span>{selected?.originalPrice > selected?.price && <del>{money(selected.originalPrice)}</del>}</div>
            <div className="saving-label">{selected?.stock > 0 ? `Còn ${selected.stock} sản phẩm trong kho` : "Phiên bản đã hết hàng"}</div>
            <p className="detail-description">{product.description || "Điện thoại chính hãng, giao hàng toàn quốc."}</p>
            <div className="option-block"><div className="option-title">Dung lượng</div><div className="option-list">{storages.map((storage) => <button className={`option-chip${selected?.storage === storage ? " is-selected" : ""}`} key={storage} type="button" onClick={() => selectVariant("storage", storage)}>{storage}</button>)}</div></div>
            <div className="option-block"><div className="option-title">Màu sắc</div><div className="option-list">{colors.map((variant) => <button className={`option-chip color-chip${selected?.color === variant.color ? " is-selected" : ""}`} key={variant.color} type="button" onClick={() => selectVariant("color", variant.color)}><span className="color-dot" style={{ background: variant.colorHex || "#ddd" }} />{variant.color}</button>)}</div></div>
            <div className="detail-actions"><button className="button" type="button" disabled={!selected || selected.stock < 1} onClick={() => addToCart(product, selected)}>Thêm vào giỏ hàng</button><a className="button secondary" href="/#products">Tiếp tục mua</a></div>
            <div className="detail-perks"><span>Hàng chính hãng 100%</span><span>Giao hàng toàn quốc</span><span>Đổi trả theo chính sách</span><span>Hỗ trợ trả góp linh hoạt</span></div>
          </div>
        </section>
        <section className="specs-section"><h2>Thông số kỹ thuật</h2><table className="spec-table"><tbody>{[["Màn hình", "screen"], ["Vi xử lý", "chip"], ["RAM", "ram"], ["Pin", "battery"], ["Camera", "camera"]].map(([label, key]) => <tr key={key}><th>{label}</th><td>{product.specs?.[key] || "Đang cập nhật"}</td></tr>)}<tr><th>Bộ nhớ</th><td>{storages.join(" / ")}</td></tr></tbody></table></section>
      </>}
    </main><Footer />
  </div>;
}

function CartDrawer({ cart, open, onClose, adjustCart, setCart, setToast }) {
  const [deliveryMethod, setDeliveryMethod] = useState("delivery");
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function checkout(event) {
    event.preventDefault();
    if (!cart.length) {
      setToast({ message: "Giỏ hàng của bạn đang trống.", error: true });
      return;
    }
    const data = new FormData(event.currentTarget);
    const order = {
      customer: { name: data.get("name"), phone: data.get("phone"), email: data.get("email"), address: data.get("address") },
      items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
      deliveryMethod: data.get("deliveryMethod"),
      paymentMethod: data.get("paymentMethod")
    };
    setSubmitting(true);
    try {
      const result = await api.createOrder(order);
      setCart([]);
      setFormKey((current) => current + 1);
      setDeliveryMethod("delivery");
      onClose();
      setToast({ message: `Đặt hàng thành công · Mã đơn ${result.order._id.slice(-8).toUpperCase()}.` });
    } catch (error) {
      setToast({ message: error.message, error: true });
    } finally {
      setSubmitting(false);
    }
  }
  return <div className={`cart-overlay${open ? " is-open" : ""}`} aria-hidden={!open} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <div className="drawer-head"><h2 id="cart-title">Giỏ hàng &amp; đặt hàng</h2><button className="close-button" type="button" onClick={onClose} aria-label="Đóng giỏ hàng"><CloseIcon /></button></div>
      <div className="drawer-body">{cart.length ? cart.map((item) => <div className="cart-row" key={item.key}>
        <ProductImage name={item.name} brand={item.brand} source={item.image} alt={item.name} /><div><h3>{item.name}</h3><p>{item.storage} · {item.color}</p><strong>{money(item.price)}</strong><div className="qty-control"><button type="button" onClick={() => adjustCart(item.key, -1)} aria-label="Giảm số lượng">−</button><span>{item.quantity}</span><button type="button" onClick={() => adjustCart(item.key, 1)} disabled={item.quantity >= item.stock} aria-label="Tăng số lượng">+</button></div></div>
        <button className="remove-cart" type="button" onClick={() => setCart((current) => current.filter((entry) => entry.key !== item.key))} aria-label={`Xóa ${item.name}`}>×</button>
      </div>) : <div className="empty-state"><strong>Giỏ hàng đang trống</strong>Chọn chiếc điện thoại phù hợp với bạn nhé.</div>}</div>
      <form className={`checkout-form${cart.length ? "" : " hidden"}`} key={formKey} onSubmit={checkout}>
        <h3>Thông tin nhận hàng</h3><div className="form-grid">
          <div className="form-field"><label htmlFor="customer-name">Họ và tên *</label><input id="customer-name" name="name" required autoComplete="name" /></div>
          <div className="form-field"><label htmlFor="customer-phone">Số điện thoại *</label><input id="customer-phone" name="phone" required inputMode="tel" autoComplete="tel" /></div>
          <div className="form-field full"><label htmlFor="customer-email">Email</label><input id="customer-email" name="email" type="email" autoComplete="email" /></div>
        </div>
        <div className="checkout-options"><label><input type="radio" name="deliveryMethod" value="delivery" checked={deliveryMethod === "delivery"} onChange={() => setDeliveryMethod("delivery")} /> Giao tận nơi</label><label><input type="radio" name="deliveryMethod" value="pickup" checked={deliveryMethod === "pickup"} onChange={() => setDeliveryMethod("pickup")} /> Nhận tại cửa hàng</label></div>
        {deliveryMethod === "delivery" && <div className="form-field"><label htmlFor="customer-address">Địa chỉ giao hàng *</label><input id="customer-address" name="address" required autoComplete="street-address" /></div>}
        <div className="checkout-options"><label><input type="radio" name="paymentMethod" value="COD" defaultChecked /> Thanh toán COD</label><label><input type="radio" name="paymentMethod" value="QR" /> Chuyển khoản QR</label></div>
        <div className="cart-total"><span>Tạm tính</span><span>{money(total)}</span></div><button className="button" type="submit" disabled={submitting}>{submitting ? "Đang tạo đơn hàng..." : "Đặt hàng ngay"}</button>
      </form>
    </section>
  </div>;
}

function NotFound() {
  return <main className="container page-shell"><div className="empty-state"><strong>Không tìm thấy trang này</strong><Link className="button" to="/">Quay lại cửa hàng</Link></div></main>;
}

function ProductImage({ name, brand, source, alt, ...props }) {
  const primary = productImageSource(name, source);
  const candidates = primary.startsWith("/images/products/")
    ? [".webp", ".jpg", ".jpeg", ".png"].map((extension) => `${productImagePath(name)}${extension}`)
      .concat(BRAND_IMAGE_FALLBACKS[brand] || [])
    : [primary];
  const [candidateIndex, setCandidateIndex] = useState(0);
  useEffect(() => setCandidateIndex(0), [primary]);
  if (candidateIndex >= candidates.length || !candidates[candidateIndex]) return null;
  return <img {...props} src={candidates[candidateIndex]} alt={alt} onError={() => setCandidateIndex((index) => index + 1)} />;
}

function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>; }
function CartIcon() { return <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" /><circle cx="10" cy="21" r="1" /><circle cx="18" cy="21" r="1" /></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>; }
function CloseIcon() { return <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>; }
function HeartIcon() { return <svg viewBox="0 0 24 24"><path d="M20.8 8.6c0 5.2-8.8 10.4-8.8 10.4S3.2 13.8 3.2 8.6A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.2Z" /></svg>; }
function ArrowIcon() { return <svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>; }
function ServiceIcon({ index }) {
  const paths = [
    <><path d="M3 7h11v11H3zM14 11h4l3 3v4h-7" /><circle cx="7.5" cy="19" r="2" /><circle cx="17.5" cy="19" r="2" /></>,
    <><path d="M12 3 4 6v5c0 5.2 3.4 8.5 8 10 4.6-1.5 8-4.8 8-10V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
    <><path d="M20 11a8 8 0 1 1-2.3-5.7L20 8" /><path d="M20 3v5h-5M12 8v4l3 2" /></>
  ];
  return <svg viewBox="0 0 24 24">{paths[index]}</svg>;
}

export default App;
