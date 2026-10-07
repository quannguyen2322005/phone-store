import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "./api.js";

const CART_KEY = "quannguyenmobile-cart";
const BRANDS = [
  ["APPLE", "Apple / iPhone"], ["SAMSUNG", "Samsung"], ["XIAOMI", "Xiaomi"],
  ["OPPO", "OPPO"], ["ONEPLUS", "OnePlus"], ["VIVO", "vivo"], ["GOOGLE", "Google Pixel"]
];
const STATUS_NAMES = {
  pending: "Chờ xác nhận", shipping: "Đang giao", completed: "Đã hoàn thành", cancelled: "Đã hủy"
};
const money = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0
}).format(value || 0);

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
    if (location.pathname.startsWith("/admin")) document.title = "Quản lý cửa hàng — Quân Nguyễn mobile store";
    else if (location.pathname.startsWith("/about")) document.title = "Giới thiệu — Quân Nguyễn mobile store";
    else document.title = "Quân Nguyễn mobile store — Smartphone chính hãng";
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
        image: variant.image || product.images?.[0] || "", storage: variant.storage, color: variant.color,
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
        <Route path="/" element={<StorePage addProductById={addProductById} setToast={setToast} onOpenCart={() => setCartOpen(true)} />} />
        <Route path="/about" element={<AboutPage onOpenCart={() => setCartOpen(true)} />} />
        <Route path="/about.html" element={<AboutPage onOpenCart={() => setCartOpen(true)} />} />
        <Route path="/admin" element={<AdminPage setToast={setToast} />} />
        <Route path="/admin.html" element={<AdminPage setToast={setToast} />} />
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
      <div className="topline"><div className="container"><span>Miễn phí giao hàng đơn từ 5 triệu · Hỗ trợ trả góp 0%</span><span>Hotline: 0969733146 · 8:00–22:00 mỗi ngày</span></div></div>
      <header className="site-header">
        <div className="container">
          <div className="header-main">
            <button className="mobile-menu" type="button" aria-label="Mở menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <Link className="logo" to="/"><span className="logo-mark">Q</span>Quân Nguyễn mobile store</Link>
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
  return <footer className="footer"><div className="container"><Link className="logo" to="/"><span className="logo-mark">Q</span>Quân Nguyễn mobile store</Link><p>Smartphone chính hãng · Hỗ trợ mỗi ngày 8:00–22:00</p><p>© 2026 Quân Nguyễn mobile store</p></div></footer>;
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
    <>
      <SiteHeader cartCount={cartCount} onOpenCart={onOpenCart} searchValue={searchInput} />
      <main className="container">
        <Hero slide={slide} setSlide={setSlide} onBrand={(brand) => updateFilter("brand", brand)} />
        <ServiceRow />
        <section className="intro-band">
          <div className="intro-copy"><span className="hero-label">Về cửa hàng</span><h2>Quân Nguyễn mobile store — nơi bạn tìm đúng chiếc điện thoại phù hợp với cuộc sống.</h2><p>Chúng tôi mang đến những sản phẩm smartphone chính hãng, thiết kế tối ưu cho công việc, học tập, giải trí và sáng tạo. Với đội ngũ tư vấn tận tâm, giá rõ ràng, bảo hành đáng tin cậy và giao hàng nhanh, cửa hàng luôn sẵn sàng hỗ trợ bạn chọn lựa chiếc điện thoại tốt nhất.</p><Link className="button" to="/about">Tìm hiểu thêm</Link></div>
          <div className="intro-stats"><div><strong>10k+</strong><span>Khách hàng tin tưởng</span></div><div><strong>1.000+</strong><span>Sản phẩm có sẵn</span></div><div><strong>24/7</strong><span>Hỗ trợ tư vấn</span></div></div>
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
    </>
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
  const image = variant?.image || product.images?.[0] || "";
  const price = variant?.price ?? product.salePrice;
  const original = variant?.originalPrice ?? product.originalPrice;
  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={`/product/${product._id}`} aria-label={`Xem ${product.name}`}><img src={image} alt={product.name} loading="lazy" /></Link>
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
    ["Thế hệ mới · Trải nghiệm đỉnh cao", "Chạm đến tương lai cùng iPhone 17 Pro", "Hiệu năng mạnh mẽ, camera chuyên nghiệp. Đặt trước ngay để nhận ưu đãi độc quyền.", "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=850&q=85", "ƯU ĐÃI|ĐẾN 3 TRIỆU", ""],
    ["Galaxy AI · Mở lối sáng tạo", "Mọi khoảnh khắc đều thật khác biệt", "Galaxy flagship với camera xuất sắc, Galaxy AI và nhiều đặc quyền dành riêng cho bạn.", "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=850&q=85", "TRẢ GÓP|0%", "SAMSUNG"],
    ["Nhiếp ảnh Leica · Bứt phá hiệu năng", "Đam mê công nghệ, chọn Xiaomi", "Thiết kế thời thượng, hiệu năng flagship và camera tạo nên những khung hình ấn tượng.", "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=850&q=85", "QUÀ TẶNG|ĐẾN 2 TRIỆU", "XIAOMI"]
  ];
  return <section className="hero" aria-label="Sản phẩm nổi bật"><div className="hero-slides">{data.map((item, index) => (
    <article className={`hero-slide${slide === index ? " is-active" : ""}`} key={item[0]}>
      <div className="hero-copy"><span className="hero-label">{item[0]}</span><h1>{item[1]}</h1><p>{item[2]}</p>
        <a className="button" href="#products" onClick={() => item[5] && onBrand(item[5])}>{item[5] ? `Xem ${item[5] === "SAMSUNG" ? "Samsung" : "Xiaomi"}` : "Khám phá ngay"} <ArrowIcon /></a>
      </div>
      <div className="hero-visual"><img src={item[3]} alt={item[1]} /><span className="hero-discount">{item[4].split("|").map((line) => <span key={line}>{line}</span>)}</span></div>
    </article>
  ))}<div className="hero-dots" aria-label="Chọn banner">{data.map((item, index) => <button key={item[0]} type="button" className={slide === index ? "is-active" : ""} aria-label={`Banner ${index + 1}`} onClick={() => setSlide(index)} />)}</div></div></section>;
}

function ServiceRow() {
  const services = [
    ["Giao hàng siêu tốc", "Nhận máy trong ngày"], ["Chính hãng 100%", "Bảo hành chính thức"],
    ["Thanh toán linh hoạt", "COD và chuyển khoản QR"], ["Đổi trả dễ dàng", "An tâm trong 30 ngày"]
  ];
  return <section className="service-row" aria-label="Dịch vụ Quân Nguyễn mobile store">{services.map(([title, description], index) => <div className="service-item" key={title}><ServiceIcon index={index} /><div><strong>{title}</strong><small>{description}</small></div></div>)}</section>;
}

function AboutPage({ onOpenCart }) {
  return <>
    <SiteHeader cartCount={useCartCount()} onOpenCart={onOpenCart} />
    <main className="container page-shell">
      <section className="about-hero"><div><span className="hero-label">Về chúng tôi</span><h1>Quân Nguyễn mobile store – giải pháp công nghệ cho mọi nhu cầu.</h1><p>Được thành lập với mục tiêu giúp khách hàng tiếp cận những chiếc điện thoại chất lượng, giá tốt và dịch vụ hỗ trợ chu đáo, Quân Nguyễn mobile store cam kết mang tới trải nghiệm mua sắm dễ dàng và tin cậy. Từ điện thoại cao cấp đến mẫu phổ thông, chúng tôi luôn lựa chọn sản phẩm chính hãng, bảo hành rõ ràng và tư vấn đúng nhu cầu của từng khách hàng.</p></div><div className="about-visual"><img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=80" alt="Cửa hàng điện thoại" /></div></section>
      <section className="story-grid"><article className="story-card"><h2>Sứ mệnh</h2><p>Đem đến những thiết bị công nghệ đáng tin cậy, giúp khách hàng kết nối, làm việc và tận hưởng cuộc sống tốt hơn mỗi ngày.</p></article><article className="story-card"><h2>Giá trị cốt lõi</h2><p>Chính hãng, minh bạch, thân thiện và nhanh chóng. Mỗi khách hàng đều được tư vấn đúng nhu cầu và hỗ trợ sau bán hàng tận tâm.</p></article><article className="story-card"><h2>Cam kết</h2><p>Hỗ trợ khách hàng từ lựa chọn sản phẩm, thanh toán, giao hàng đến bảo hành, đổi trả với quy trình rõ ràng, tiện lợi.</p></article></section>
      <section className="contact-card" id="contact"><div><span className="hero-label">Liên hệ</span><h2>Đặt hàng hoặc tư vấn nhanh chóng</h2></div><div className="contact-info"><div><strong>Hotline/Zalo</strong><p>Quân Nguyễn: 0969733146</p></div><div><strong>Giờ làm việc</strong><p>08:00 – 22:00 hàng ngày</p></div><div><strong>Địa chỉ</strong><p>Địa điểm cửa hàng theo khu vực bạn yêu cầu, vui lòng liên hệ để được tư vấn cụ thể.</p></div></div><a className="button" href="https://zalo.me/0969733146" target="_blank" rel="noreferrer">Chat Zalo ngay</a></section>
    </main><Footer />
  </>;
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
      document.title = `${result.name} — Quân Nguyễn mobile store`;
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
  return <>
    <SiteHeader cartCount={cartCount} onOpenCart={onOpenCart} />
    <main className="container">
      <div className="page-title"><Link to="/">Trang chủ</Link>　/　<a href="/#products">Điện thoại</a>　/　<span>{product?.name || "Chi tiết sản phẩm"}</span></div>
      {error ? <div className="empty-state"><strong>Không tải được sản phẩm</strong>{error}</div> : !product ? <div className="empty-state">Đang tải sản phẩm...</div> : <>
        <section className="detail-layout">
          <div className="detail-image"><img src={selected?.image || product.images?.[0] || ""} alt={product.name} /></div>
          <div className="detail-info"><div className="product-brand">{product.brand} · {product.category}</div><h1>{product.name}</h1><div className="rating-line"><span className="rating-stars">★★★★★</span><span>Hàng chính hãng · Bảo hành chính thức</span></div>
            <div className="detail-price"><span>{money(selected?.price)}</span>{selected?.originalPrice > selected?.price && <del>{money(selected.originalPrice)}</del>}</div>
            <div className="saving-label">{selected?.stock > 0 ? `Còn ${selected.stock} sản phẩm trong kho` : "Phiên bản đã hết hàng"}</div>
            <p style={{ margin: "17px 0 0", color: "#718095", fontSize: 11, lineHeight: 1.8 }}>{product.description || "Điện thoại chính hãng, giao hàng toàn quốc."}</p>
            <div className="option-block"><div className="option-title">Dung lượng</div><div className="option-list">{storages.map((storage) => <button className={`option-chip${selected?.storage === storage ? " is-selected" : ""}`} key={storage} type="button" onClick={() => selectVariant("storage", storage)}>{storage}</button>)}</div></div>
            <div className="option-block"><div className="option-title">Màu sắc</div><div className="option-list">{colors.map((variant) => <button className={`option-chip color-chip${selected?.color === variant.color ? " is-selected" : ""}`} key={variant.color} type="button" onClick={() => selectVariant("color", variant.color)}><span className="color-dot" style={{ background: variant.colorHex || "#ddd" }} />{variant.color}</button>)}</div></div>
            <div className="detail-actions"><button className="button" type="button" disabled={!selected || selected.stock < 1} onClick={() => addToCart(product, selected)}>Thêm vào giỏ hàng</button><a className="button secondary" href="/#products">Tiếp tục mua</a></div>
            <div className="detail-perks"><span>Hàng chính hãng 100%</span><span>Giao hàng toàn quốc</span><span>Đổi trả theo chính sách</span><span>Hỗ trợ trả góp linh hoạt</span></div>
          </div>
        </section>
        <section className="specs-section"><h2>Thông số kỹ thuật</h2><table className="spec-table"><tbody>{[["Màn hình", "screen"], ["Vi xử lý", "chip"], ["RAM", "ram"], ["Pin", "battery"], ["Camera", "camera"]].map(([label, key]) => <tr key={key}><th>{label}</th><td>{product.specs?.[key] || "Đang cập nhật"}</td></tr>)}<tr><th>Bộ nhớ</th><td>{storages.join(" / ")}</td></tr></tbody></table></section>
      </>}
    </main><Footer />
  </>;
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
        <img src={item.image} alt={item.name} /><div><h3>{item.name}</h3><p>{item.storage} · {item.color}</p><strong>{money(item.price)}</strong><div className="qty-control"><button type="button" onClick={() => adjustCart(item.key, -1)} aria-label="Giảm số lượng">−</button><span>{item.quantity}</span><button type="button" onClick={() => adjustCart(item.key, 1)} disabled={item.quantity >= item.stock} aria-label="Tăng số lượng">+</button></div></div>
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

function AdminPage({ setToast }) {
  const [token, setToken] = useState(() => localStorage.getItem("quannguyenmobile-admin-token"));
  const [overview, setOverview] = useState(null);
  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [productTotal, setProductTotal] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [modalProduct, setModalProduct] = useState(undefined);
  const [saving, setSaving] = useState(false);

  async function refreshOverview() { setOverview(await api.getOverview()); }
  async function loadTab() {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "products") {
        const result = await api.getProducts({ limit: 48, sort: "newest" });
        setProducts(result.products || []);
        setProductTotal(result.pagination?.total || 0);
      } else {
        const result = await api.getOrders({ limit: 100 });
        setOrders(result.orders || []);
      }
    } catch (requestError) {
      setError(requestError.message);
      setToast({ message: requestError.message, error: true });
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token) return;
    Promise.all([refreshOverview(), loadTab()]).catch((requestError) => {
      localStorage.removeItem("quannguyenmobile-admin-token");
      setToken(null);
      setToast({ message: requestError.message, error: true });
    });
  }, [token]);
  useEffect(() => { if (token) loadTab(); }, [activeTab]);

  async function login(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoginBusy(true);
    try {
      const result = await api.login({ email: data.get("email"), password: data.get("password") });
      if (result.user.role !== "admin") throw new Error("Tài khoản này không có quyền quản trị.");
      localStorage.setItem("quannguyenmobile-admin-token", result.token);
      setToken(result.token);
      setToast({ message: "Đăng nhập quản trị thành công." });
    } catch (requestError) {
      localStorage.removeItem("quannguyenmobile-admin-token");
      setToast({ message: requestError.message, error: true });
    } finally { setLoginBusy(false); }
  }
  function logout() {
    localStorage.removeItem("quannguyenmobile-admin-token");
    setToken(null);
    setOverview(null);
  }
  async function saveProduct(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const specs = JSON.parse(data.get("specs"));
      const variants = JSON.parse(data.get("variants"));
      if (!Array.isArray(variants) || !variants.length) throw new Error("Phiên bản phải là một danh sách không rỗng.");
      const product = {
        name: String(data.get("name")).trim(), brand: data.get("brand"), category: "Smartphone",
        originalPrice: Number(data.get("originalPrice")), salePrice: Number(data.get("salePrice")),
        images: String(data.get("images") || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean), specs, variants
      };
      const id = data.get("id");
      if (id) await api.updateProduct(id, product);
      else await api.createProduct(product);
      setModalProduct(undefined);
      setToast({ message: id ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm." });
      await Promise.all([loadTab(), refreshOverview()]);
    } catch (requestError) {
      setToast({ message: requestError instanceof SyntaxError ? "Thông số và phiên bản phải là JSON hợp lệ." : requestError.message, error: true });
    } finally { setSaving(false); }
  }
  async function removeProduct(product) {
    if (!window.confirm(`Xóa sản phẩm "${product.name}"?`)) return;
    try {
      await api.deleteProduct(product._id);
      setToast({ message: "Đã xóa sản phẩm." });
      await Promise.all([loadTab(), refreshOverview()]);
    } catch (requestError) { setToast({ message: requestError.message, error: true }); }
  }
  async function seedProducts() {
    try {
      const result = await api.seedProducts();
      setToast({ message: result.message });
      await Promise.all([loadTab(), refreshOverview()]);
    } catch (requestError) { setToast({ message: requestError.message, error: true }); }
  }
  async function changeOrderStatus(id, status) {
    try {
      await api.updateOrderStatus(id, status);
      setToast({ message: "Đã cập nhật trạng thái đơn hàng." });
      await Promise.all([loadTab(), refreshOverview()]);
    } catch (requestError) {
      setToast({ message: requestError.message, error: true });
      await loadTab();
    }
  }

  return <div className="admin-page">
    <header className="admin-header"><div className="container"><Link className="logo" to="/"><span className="logo-mark">Q</span>Quân Nguyễn mobile store <small>QUẢN TRỊ</small></Link><Link to="/" style={{ color: "#cad6e5", fontSize: 11 }}>← Quay lại cửa hàng</Link></div></header>
    <main className="container admin-main">
      {!token ? <section className="login-card"><Link className="logo" to="/"><span className="logo-mark">Q</span>Quân Nguyễn mobile store</Link><h1>Đăng nhập quản trị</h1><p>Sử dụng tài khoản Admin đã cấu hình cho cửa hàng.</p>
        <form onSubmit={login}><div className="form-field"><label htmlFor="login-email">Email</label><input id="login-email" name="email" type="email" required autoComplete="username" /></div><div className="form-field"><label htmlFor="login-password">Mật khẩu</label><input id="login-password" name="password" type="password" required autoComplete="current-password" /></div><button className="button" type="submit" disabled={loginBusy}>{loginBusy ? "Đang đăng nhập..." : "Đăng nhập"}</button></form>
      </section> : <>
        <div className="admin-heading"><div><h1>Tổng quan cửa hàng</h1><p>Quản lý tồn kho và theo dõi đơn hàng Quân Nguyễn mobile store.</p></div><button className="button secondary small" type="button" onClick={logout}>Đăng xuất</button></div>
        <div className="stats-grid">{[["Tổng doanh thu hoàn tất", overview ? money(overview.revenue) : "—", "Tính trên đơn đã hoàn thành"], ["Đơn hàng chờ xác nhận", overview?.newOrders ?? "—", "Đang chờ xử lý"], ["Sắp hết hàng (≤ 5 máy)", overview?.lowStock ?? "—", "Sản phẩm cần nhập thêm"], ["Tổng sản phẩm", overview?.productCount ?? "—", "Danh mục điện thoại"]].map(([label, value, foot]) => <article className="stat-card" key={label}><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></article>)}</div>
        <nav className="admin-tabs" aria-label="Khu vực quản lý"><button className={activeTab === "products" ? "active" : ""} type="button" onClick={() => setActiveTab("products")}>Sản phẩm</button><button className={activeTab === "orders" ? "active" : ""} type="button" onClick={() => setActiveTab("orders")}>Đơn hàng</button></nav>
        <section className="admin-panel">
          {activeTab === "products" ? <><div className="panel-toolbar"><h2>Danh sách sản phẩm ({productTotal})</h2><div className="admin-toolbar-actions"><button className="button secondary small" type="button" onClick={seedProducts}>Thêm dữ liệu mẫu</button><button className="button small" type="button" onClick={() => setModalProduct(null)}>+ Thêm sản phẩm</button></div></div>
            {loading ? <div className="empty-state">Đang tải dữ liệu...</div> : error ? <div className="empty-state"><strong>Không tải được dữ liệu</strong>{error}</div> : <div className="table-wrap"><table className="admin-table"><thead><tr><th>SẢN PHẨM</th><th>GIÁ BÁN</th><th>RAM / ROM</th><th>TỒN KHO</th><th>THAO TÁC</th></tr></thead><tbody>{products.length ? products.map((product) => {
              const variant = product.variants?.[0];
              return <tr key={product._id}><td><div className="table-product"><img src={variant?.image || product.images?.[0] || ""} alt="" /><div><strong>{product.name}</strong><div className="admin-subtext">{product.brand}</div></div></div></td><td>{money(variant?.price ?? product.salePrice)}</td><td>{product.specs?.ram || "—"} / {variant?.storage || "—"}</td><td className={product.stock <= 5 ? "inventory-low" : ""}>{product.stock} máy</td><td><div className="table-actions"><button className="icon-action" type="button" aria-label="Sửa sản phẩm" onClick={() => setModalProduct(product)}><EditIcon /></button><button className="icon-action" type="button" aria-label="Xóa sản phẩm" onClick={() => removeProduct(product)}><DeleteIcon /></button></div></td></tr>;
            }) : <tr><td colSpan="5" className="admin-empty">Chưa có sản phẩm nào. Thêm sản phẩm hoặc tạo dữ liệu mẫu.</td></tr>}</tbody></table></div>}</>
            : <><div className="panel-toolbar"><h2>Đơn hàng ({orders.length})</h2><button className="button secondary small" type="button" onClick={() => { loadTab(); refreshOverview(); }}>Làm mới</button></div>
              {loading ? <div className="empty-state">Đang tải dữ liệu...</div> : error ? <div className="empty-state"><strong>Không tải được dữ liệu</strong>{error}</div> : <div className="table-wrap"><table className="admin-table"><thead><tr><th>MÃ ĐƠN</th><th>KHÁCH HÀNG</th><th>SẢN PHẨM</th><th>TỔNG TIỀN</th><th>THANH TOÁN</th><th>TRẠNG THÁI</th></tr></thead><tbody>{orders.length ? orders.map((order) => <tr key={order._id}><td><strong>#{order._id.slice(-8).toUpperCase()}</strong><div className="admin-subtext">{new Date(order.createdAt).toLocaleString("vi-VN")}</div></td><td><strong>{order.customer.name}</strong><div className="admin-subtext">{order.customer.phone}</div><div className="admin-subtext">{order.deliveryMethod === "pickup" ? "Nhận tại cửa hàng" : order.customer.address}</div></td><td>{order.items.map((item, index) => <span key={`${item.productName}-${index}`}>{item.productName} × {item.quantity}<div className="admin-subtext">{item.storage} · {item.color}</div>{index < order.items.length - 1 && <br />}</span>)}</td><td><strong>{money(order.total)}</strong></td><td>{order.paymentMethod}<div className="admin-subtext">{order.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}</div></td><td><select className="sort-select" value={order.status} disabled={order.status === "cancelled"} aria-label="Trạng thái đơn hàng" onChange={(event) => changeOrderStatus(order._id, event.target.value)}>{Object.entries(STATUS_NAMES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><br /><span className={`status-pill ${order.status}`}>{STATUS_NAMES[order.status] || order.status}</span></td></tr>) : <tr><td colSpan="6" className="admin-empty">Chưa có đơn hàng.</td></tr>}</tbody></table></div>}</>}
        </section>
      </>}
    </main>
    {modalProduct !== undefined && <ProductModal product={modalProduct} saving={saving} onClose={() => setModalProduct(undefined)} onSubmit={saveProduct} />}
    <Footer />
  </div>;
}

function ProductModal({ product, saving, onClose, onSubmit }) {
  const initial = product || {
    name: "", brand: "APPLE", originalPrice: "", salePrice: "", images: [],
    specs: { screen: "", chip: "", ram: "", battery: "", camera: "" },
    variants: [{ storage: "256GB", color: "Đen", colorHex: "#333333", price: 0, originalPrice: 0, stock: 1 }]
  };
  return <div className="modal-backdrop is-open" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-header"><h2 id="modal-title">{product ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}</h2><button className="close-button" type="button" onClick={onClose} aria-label="Đóng"><CloseIcon /></button></div>
      <form className="modal-form" onSubmit={onSubmit}><input type="hidden" name="id" value={product?._id || ""} readOnly />
        <div className="form-grid"><div className="form-field"><label htmlFor="product-name">Tên điện thoại *</label><input id="product-name" name="name" required maxLength="140" defaultValue={initial.name} /></div>
          <div className="form-field"><label htmlFor="product-brand">Thương hiệu *</label><select id="product-brand" name="brand" required defaultValue={initial.brand}>{BRANDS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
          <div className="form-field"><label htmlFor="original-price">Giá gốc (₫) *</label><input id="original-price" name="originalPrice" type="number" min="0" required defaultValue={initial.originalPrice} /></div>
          <div className="form-field"><label htmlFor="sale-price">Giá khuyến mãi (₫) *</label><input id="sale-price" name="salePrice" type="number" min="0" required defaultValue={initial.salePrice} /></div>
          <div className="form-field full"><label htmlFor="product-images">Ảnh sản phẩm (mỗi URL một dòng)</label><textarea id="product-images" name="images" defaultValue={(initial.images || []).join("\n")} /></div>
          <div className="form-field full"><label htmlFor="product-specs">Thông số JSON: screen, chip, ram, battery, camera</label><textarea id="product-specs" name="specs" required defaultValue={JSON.stringify(initial.specs || {}, null, 2)} /></div>
          <div className="form-field full"><label htmlFor="product-variants">Phiên bản JSON (storage, color, colorHex, price, originalPrice, stock)</label><textarea id="product-variants" name="variants" required defaultValue={JSON.stringify(initial.variants || [], null, 2)} /></div>
        </div>
        <div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Hủy</button><button className="button" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu sản phẩm"}</button></div>
      </form>
    </section>
  </div>;
}

function NotFound() {
  return <main className="container page-shell"><div className="empty-state"><strong>Không tìm thấy trang này</strong><Link className="button" to="/">Quay lại cửa hàng</Link></div></main>;
}

function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>; }
function CartIcon() { return <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" /><circle cx="10" cy="21" r="1" /><circle cx="18" cy="21" r="1" /></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>; }
function CloseIcon() { return <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>; }
function HeartIcon() { return <svg viewBox="0 0 24 24"><path d="M20.8 8.6c0 5.2-8.8 10.4-8.8 10.4S3.2 13.8 3.2 8.6A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.2Z" /></svg>; }
function ArrowIcon() { return <svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>; }
function EditIcon() { return <svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z" /></svg>; }
function DeleteIcon() { return <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></svg>; }
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
