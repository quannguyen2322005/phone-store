import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { money } from "../format.js";
import { BRANDS } from "../lib/store.js";
import SiteHeader from "../components/SiteHeader.jsx";
import Footer from "../components/Footer.jsx";
import ProductCard from "../components/ProductCard.jsx";
import Hero from "../components/Hero.jsx";
import ServiceRow from "../components/ServiceRow.jsx";
import { useCartCount } from "../hooks/useCartCount.js";

export default function StorePage({ addProductById, setToast, onOpenCart }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const querySignature = searchParams.toString();
  const filters = useMemo(() => {
    const params = new URLSearchParams(querySignature);
    return {
      page: Math.max(1, Number.parseInt(params.get("page"), 10) || 1),
      limit: 9,
      brand: params.get("brand") || "",
      ram: params.get("ram") || "",
      storage: params.get("storage") || "",
      minPrice: params.get("minPrice") || "",
      maxPrice: params.get("maxPrice") || "",
      search: params.get("search") || "",
      sort: params.get("sort") || ""
    };
  }, [querySignature]);
  const [priceDraft, setPriceDraft] = useState({ minPrice: filters.minPrice, maxPrice: filters.maxPrice });
  const [searchInput, setSearchInput] = useState(filters.search);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const filterDrawerRef = useRef(null);
  const productsRef = useRef(null);
  const previousPage = useRef(filters.page);
  const previousUrlSearch = useRef(filters.search);
  const previousUrlPrice = useRef({ minPrice: filters.minPrice, maxPrice: filters.maxPrice });
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("quannguyenmobile-favorites") || "[]"); }
    catch (error) {
      console.error("Không thể đọc danh sách yêu thích đã lưu:", error);
      return [];
    }
  });
  const cartCount = useCartCount();

  const updateQuery = useCallback((updates, { replace = false, resetPage = true } = {}) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) next.delete(key);
        else next.set(key, String(value));
      });
      if (resetPage && !Object.hasOwn(updates, "page")) next.delete("page");
      return next;
    }, { replace, preventScrollReset: true });
  }, [setSearchParams]);

  const updateFilter = useCallback((key, value) => {
    updateQuery({ [key]: value });
  }, [updateQuery]);

  const toggleFilter = useCallback((key, value, checked) => {
    const selected = filters[key] ? filters[key].split(",").filter(Boolean) : [];
    const updated = checked ? [...new Set([...selected, value])] : selected.filter((item) => item !== value);
    updateFilter(key, updated.join(","));
  }, [filters, updateFilter]);

  const applyPriceRange = useCallback((draft, options = {}) => {
    const min = draft.minPrice.trim();
    const max = draft.maxPrice.trim();
    if (min && max && Number(min) > Number(max)) return;
    if (min === filters.minPrice && max === filters.maxPrice) return;
    updateQuery({ minPrice: min, maxPrice: max }, options);
  }, [filters.maxPrice, filters.minPrice, updateQuery]);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setPriceDraft({ minPrice: "", maxPrice: "" });
    setSearchParams({}, { preventScrollReset: true });
  }, [setSearchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
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
    if (searchInput.trim() === filters.search) return undefined;
    const timer = window.setTimeout(() => {
      updateQuery({ search: searchInput.trim() }, { replace: true });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [filters.search, searchInput, updateQuery]);

  useEffect(() => {
    if (previousUrlSearch.current !== filters.search) {
      previousUrlSearch.current = filters.search;
      setSearchInput(filters.search);
    }
    if (previousUrlPrice.current.minPrice !== filters.minPrice || previousUrlPrice.current.maxPrice !== filters.maxPrice) {
      previousUrlPrice.current = { minPrice: filters.minPrice, maxPrice: filters.maxPrice };
      setPriceDraft({ minPrice: filters.minPrice, maxPrice: filters.maxPrice });
    }
  }, [filters.maxPrice, filters.minPrice, filters.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => applyPriceRange(priceDraft, { replace: true }), 600);
    return () => window.clearTimeout(timer);
  }, [applyPriceRange, priceDraft]);

  useEffect(() => {
    if (previousPage.current !== filters.page) {
      previousPage.current = filters.page;
      productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [filters.page]);

  useEffect(() => {
    const dialog = filterDrawerRef.current;
    if (!dialog) return;
    if (filterDrawerOpen && !dialog.open) dialog.showModal();
    if (!filterDrawerOpen && dialog.open) dialog.close();
  }, [filterDrawerOpen]);

  function toggleFavorite(id) {
    const updated = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("quannguyenmobile-favorites", JSON.stringify(updated));
    setToast({ message: updated.includes(id) ? "Đã thêm vào danh sách yêu thích." : "Đã bỏ khỏi danh sách yêu thích." });
  }
  const totalPages = Math.max(1, pagination.pages || 1);
  const pages = getPaginationPages(filters.page, totalPages);
  const activeChips = [
    ...filters.brand.split(",").filter(Boolean).map((value) => ({ key: "brand", value, label: BRANDS.find(([brand]) => brand === value)?.[1] || value })),
    ...filters.ram.split(",").filter(Boolean).map((value) => ({ key: "ram", value, label: `RAM ${value}GB` })),
    ...filters.storage.split(",").filter(Boolean).map((value) => ({ key: "storage", value, label: value })),
    ...((filters.minPrice || filters.maxPrice) ? [{ key: "price", label: `${filters.minPrice ? money(Number(filters.minPrice)) : "0₫"} – ${filters.maxPrice ? money(Number(filters.maxPrice)) : "Không giới hạn"}` }] : []),
    ...(filters.search ? [{ key: "search", label: `Tìm: ${filters.search}` }] : [])
  ];
  const activeFilterCount = activeChips.length;
  const priceError = priceDraft.minPrice && priceDraft.maxPrice && Number(priceDraft.minPrice) > Number(priceDraft.maxPrice)
    ? "Giá tối thiểu không thể lớn hơn giá tối đa." : "";
  const filterProps = { filters, priceDraft, priceError, onToggle: toggleFilter, onPriceDraft: setPriceDraft, onPriceEnter: () => applyPriceRange(priceDraft), onPriceQuick: (minPrice, maxPrice) => {
    const next = { minPrice, maxPrice };
    setPriceDraft(next);
    applyPriceRange(next);
  }, onClear: clearFilters };

  return (
    <div className="store-page">
      <SiteHeader cartCount={cartCount} onOpenCart={onOpenCart} searchValue={searchInput} />
      <main className="container">
        <Hero />
        <ServiceRow />
        <section className="intro-band">
          <div className="intro-copy"><span className="hero-label">Về cửa hàng</span><h2>Điện thoại chính hãng, thông tin rõ ràng.</h2><p>Xem giá, phiên bản và tình trạng hàng trước khi chọn mua. Cần hỗ trợ, cửa hàng luôn sẵn sàng tư vấn.</p><Link className="button secondary" to="/about">Thông tin cửa hàng</Link></div>
          <div className="intro-stats"><div><strong>7</strong><span>Thương hiệu điện thoại</span></div><div><strong>100%</strong><span>Hàng chính hãng</span></div><div><strong>8–22h</strong><span>Hỗ trợ mỗi ngày</span></div></div>
        </section>
        <section id="products">
          <div className="catalog-layout">
            <aside className="filter-panel desktop-filter-panel" aria-label="Bộ lọc sản phẩm"><FilterControls {...filterProps} /></aside>
            <div>
              <div className="catalog-mobile-filter"><button type="button" className="button secondary" onClick={() => setFilterDrawerOpen(true)}>Bộ lọc ({activeFilterCount})</button></div>
              <div className="catalog-toolbar"><div className="catalog-heading"><h2>Điện thoại nổi bật</h2><p>{loading ? "Đang tải sản phẩm..." : loadError ? "Không thể kết nối" : `${pagination.total || 0} sản phẩm`}</p></div>
                <select className="sort-select" aria-label="Sắp xếp sản phẩm" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
                  <option value="">Sắp xếp: Nổi bật</option><option value="price_asc">Giá: Thấp đến cao</option><option value="price_desc">Giá: Cao đến thấp</option><option value="newest">Mới nhất</option>
                </select>
              </div>
              {activeChips.length > 0 && <div className="active-filter-chips" aria-label="Bộ lọc đang áp dụng">
                {activeChips.map((chip, index) => <button type="button" key={`${chip.key}-${chip.value || index}`} className="filter-chip" onClick={() => {
                  if (chip.key === "price") { updateQuery({ minPrice: "", maxPrice: "" }); setPriceDraft({ minPrice: "", maxPrice: "" }); }
                  else if (chip.key === "search") { setSearchInput(""); updateFilter("search", ""); }
                  else toggleFilter(chip.key, chip.value, false);
                }}>{chip.label}<span aria-hidden="true">×</span></button>)}
                <button className="clear-filter" type="button" onClick={clearFilters}>Xóa tất cả</button>
              </div>}
              {loadError && products.length > 0 && <p className="catalog-error" role="status">Không thể tải bộ lọc mới. Đang giữ danh sách trước đó.</p>}
              <div ref={productsRef} className={`product-grid${loading && products.length ? " is-loading" : ""}`} aria-live="polite" aria-busy={loading}>
                {loading && products.length === 0 ? Array.from({ length: 6 }, (_, index) => <div className="product-skeleton" key={index} aria-hidden="true"><span /><div><i /><i /><i /></div></div>)
                  : loadError && products.length === 0 ? <div className="empty-state"><strong>Không tải được sản phẩm</strong>{loadError}<br /><br />Hãy kiểm tra kết nối API tại {api.baseUrl}.</div>
                    : products.length ? products.map((product) => <ProductCard key={product._id} product={product} favorite={favorites.includes(product._id)} onFavorite={() => toggleFavorite(product._id)} onAdd={() => addProductById(product._id)} />)
                      : <div className="empty-state"><strong>Chưa tìm thấy điện thoại phù hợp</strong>Thử đổi từ khóa hoặc xóa bộ lọc để xem thêm sản phẩm.<br /><button className="button secondary" type="button" onClick={clearFilters}>Xóa bộ lọc</button></div>}
              </div>
              {!loadError && totalPages > 1 && <nav className="pagination" aria-label="Phân trang">
                <button type="button" className="pagination-step" disabled={filters.page <= 1} onClick={() => updateQuery({ page: filters.page - 1 }, { resetPage: false })}>Trước</button>
                {pages.map((item, index) => item === "ellipsis" ? <span className="pagination-gap" key={`gap-${index}`} aria-hidden="true">…</span> : <button type="button" key={item} className={filters.page === item ? "active" : ""} aria-label={`Trang ${item}`} aria-current={filters.page === item ? "page" : undefined} onClick={() => updateQuery({ page: item }, { resetPage: false })}>{item}</button>)}
                <button type="button" className="pagination-step" disabled={filters.page >= totalPages} onClick={() => updateQuery({ page: filters.page + 1 }, { resetPage: false })}>Sau</button>
              </nav>}
            </div>
          </div>
          <dialog ref={filterDrawerRef} className="filter-drawer" onClose={() => setFilterDrawerOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setFilterDrawerOpen(false); }} aria-label="Bộ lọc sản phẩm" aria-modal="true">
            <div className="filter-drawer-inner"><button type="button" className="filter-drawer-close" aria-label="Đóng bộ lọc" onClick={() => setFilterDrawerOpen(false)}>×</button><FilterControls {...filterProps} /><button className="button filter-results-button" type="button" onClick={() => setFilterDrawerOpen(false)}>Xem {pagination.total || 0} sản phẩm</button></div>
          </dialog>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function FilterControls({ filters, priceDraft, priceError, onToggle, onPriceDraft, onPriceEnter, onPriceQuick, onClear }) {
  return <>
    <div className="filter-title">Bộ lọc <button className="clear-filter" type="button" onClick={onClear}>Xóa tất cả</button></div>
    <FilterGroup title="Thương hiệu" options={BRANDS} selected={filters.brand} onChange={(value, checked) => onToggle("brand", value, checked)} />
    <div className="filter-group"><h3>Mức giá (₫)</h3><div className="price-range">
      <input type="number" min="0" step="1000000" placeholder="Từ" aria-label="Giá tối thiểu" value={priceDraft.minPrice} onKeyDown={(event) => { if (event.key === "Enter") onPriceEnter(); }} onChange={(event) => onPriceDraft((draft) => ({ ...draft, minPrice: event.target.value }))} />
      <input type="number" min="0" step="1000000" placeholder="Đến" aria-label="Giá tối đa" value={priceDraft.maxPrice} onKeyDown={(event) => { if (event.key === "Enter") onPriceEnter(); }} onChange={(event) => onPriceDraft((draft) => ({ ...draft, maxPrice: event.target.value }))} />
    </div>{priceError && <small className="price-error" role="alert">{priceError}</small>}<div className="price-quick-filters">
      <button type="button" onClick={() => onPriceQuick("", "5000000")}>Dưới 5 triệu</button><button type="button" onClick={() => onPriceQuick("5000000", "10000000")}>5–10 triệu</button>
      <button type="button" onClick={() => onPriceQuick("10000000", "20000000")}>10–20 triệu</button><button type="button" onClick={() => onPriceQuick("20000000", "")}>Trên 20 triệu</button>
    </div></div>
    <FilterGroup title="RAM" options={[["8", "8GB"], ["12", "12GB"], ["16", "16GB"]]} selected={filters.ram} onChange={(value, checked) => onToggle("ram", value, checked)} />
    <FilterGroup title="Bộ nhớ trong" options={[["128GB", "128GB"], ["256GB", "256GB"], ["512GB", "512GB"], ["1TB", "1TB"]]} selected={filters.storage} onChange={(value, checked) => onToggle("storage", value, checked)} />
  </>;
}

function getPaginationPages(current, total) {
  const visible = new Set([1, total]);
  for (let page = Math.max(2, current - 2); page <= Math.min(total - 1, current + 2); page += 1) visible.add(page);
  const sorted = [...visible].sort((a, b) => a - b);
  return sorted.reduce((result, page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push("ellipsis");
    result.push(page);
    return result;
  }, []);
}


function FilterGroup({ title, options, selected, onChange }) {
  const values = selected ? selected.split(",") : [];
  return <div className="filter-group"><h3>{title}</h3>{options.map(([value, label]) => (
    <label className="check-row" key={value}><input type="checkbox" checked={values.includes(value)} onChange={(event) => onChange(value, event.target.checked)} />{label}</label>
  ))}</div>;
}
