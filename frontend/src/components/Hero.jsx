import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { money } from "../format.js";
import ProductImage from "./ProductImage.jsx";
import { ArrowIcon, ArrowPreviousIcon } from "./icons.jsx";

export default function Hero() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    let active = true;
    api.getProducts({ limit: 3, sort: "" })
      .then((result) => { if (active) setProducts((result.products || []).slice(0, 3)); })
      .catch(() => { if (active) setProducts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || products.length < 2) return undefined;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % products.length), 6000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, products.length]);

  useEffect(() => setSlide((current) => Math.min(current, Math.max(products.length - 1, 0))), [products.length]);

  const visibleProducts = products.length ? products : [null];
  const activeSlide = visibleProducts.length ? Math.min(slide, visibleProducts.length - 1) : 0;
  const changeSlide = (step) => setSlide((current) => (current + step + visibleProducts.length) % visibleProducts.length);

  return <section className="hero" aria-label="Sản phẩm nổi bật" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
    <div className="hero-slides">
      {visibleProducts.map((product, index) => <article className={`hero-slide${activeSlide === index ? " is-active" : ""}`} key={product?._id || "loading"} aria-hidden={activeSlide !== index} inert={activeSlide !== index}>
        <div className="hero-copy">
          <span className="hero-label">{product?.brand || (loading ? "Đang tải sản phẩm" : "Sản phẩm nổi bật")}</span>
          <h1>{product?.name || (loading ? "Đang tìm sản phẩm phù hợp" : "Sản phẩm đang được cập nhật")}</h1>
          <p>{product ? `Giá từ ${money(product.salePrice)}.` : "Thông tin và hình ảnh sản phẩm sẽ sớm được cập nhật."}</p>
          {product && <Link className="button" to={`/product/${product._id}`}>Xem chi tiết <ArrowIcon /></Link>}
        </div>
        <div className="hero-visual">{product ? <ProductImage name={product.name} alt={product.name} width="900" height="900" loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} /> : <span className="hero-placeholder" aria-hidden="true">QN-Mobiles</span>}</div>
      </article>)}
      {visibleProducts.length > 1 && <>
        <button className="hero-arrow hero-arrow-previous" type="button" aria-label="Sản phẩm trước" onClick={() => changeSlide(-1)}><ArrowPreviousIcon /></button>
        <button className="hero-arrow hero-arrow-next" type="button" aria-label="Sản phẩm tiếp theo" onClick={() => changeSlide(1)}><ArrowIcon /></button>
        <div className="hero-dots" aria-label="Chọn sản phẩm nổi bật">{visibleProducts.map((product, index) => <button key={product?._id || index} type="button" className={activeSlide === index ? "is-active" : ""} aria-label={`Sản phẩm ${index + 1}`} aria-current={activeSlide === index ? "true" : undefined} onClick={() => setSlide(index)} />)}</div>
      </>}
    </div>
  </section>;
}
