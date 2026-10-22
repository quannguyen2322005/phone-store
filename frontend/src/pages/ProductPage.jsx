import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { money } from "../format.js";
import SiteHeader from "../components/SiteHeader.jsx";
import Footer from "../components/Footer.jsx";
import ProductCard from "../components/ProductCard.jsx";
import ProductImage from "../components/ProductImage.jsx";
import { useCartCount } from "../hooks/useCartCount.js";

export default function ProductPage({ addToCart, onOpenCart }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState("");
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("quannguyenmobile-favorites") || "[]"); }
    catch { return []; }
  });
  const metaDescriptionRef = useRef(null);
  const cartCount = useCartCount();

  useEffect(() => {
    let active = true;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.content || "";
    setProduct(null);
    setSelected(null);
    setQuantity(1);
    setSelectedImage("");
    setError("");
    api.getProduct(id).then(({ product: result }) => {
      if (!active) return;
      setProduct(result);
      const initialVariant = result.variants?.find((variant) => variant.stock > 0) || result.variants?.[0] || null;
      setSelected(initialVariant);
      setSelectedImage(initialVariant?.image || result.images?.[0] || "");
      document.title = `${result.name} — QN-Mobiles`;
      if (metaDescription) {
        metaDescriptionRef.current = previousDescription;
        metaDescription.content = (result.description || `${result.name} chính hãng tại QN-Mobiles.`).slice(0, 160);
      }
    }).catch((requestError) => {
      if (!active) return;
      setNotFound([400, 404].includes(requestError.status));
      setError(requestError.message);
      if ([400, 404].includes(requestError.status)) document.title = "Không tìm thấy sản phẩm — QN-Mobiles";
    });
    return () => {
      active = false;
      if (metaDescription && metaDescriptionRef.current !== null) {
        metaDescription.content = metaDescriptionRef.current;
        metaDescriptionRef.current = null;
      }
    };
  }, [id]);

  useEffect(() => {
    if (!product?.brand) return undefined;
    let active = true;
    setLoadingRelated(true);
    api.getProducts({ brand: product.brand, limit: 5 })
      .then((result) => {
        if (active) setRelatedProducts((result.products || []).filter((item) => item._id !== product._id).slice(0, 4));
      })
      .catch(() => { if (active) setRelatedProducts([]); })
      .finally(() => { if (active) setLoadingRelated(false); });
    return () => { active = false; };
  }, [product?._id, product?.brand]);

  const variants = product?.variants || [];
  const storages = [...new Set(variants.map((variant) => variant.storage).filter(Boolean))];
  const colors = [...new Set(variants.map((variant) => variant.color).filter(Boolean))];
  const productImages = [...new Set([
    selected?.image,
    ...(product?.images || []),
    ...variants.map((variant) => variant.image)
  ].filter((image) => typeof image === "string" && image.trim()))];
  const activeImage = productImages.includes(selectedImage) ? selectedImage : productImages[0] || "";
  const selectVariant = (key, value) => {
    const matching = variants.filter((variant) => variant[key] === value);
    const otherKey = key === "storage" ? "color" : "storage";
    const preferred = matching.find((variant) => variant[otherKey] === selected?.[otherKey]);
    const next = (preferred?.stock > 0 ? preferred : null) || matching.find((variant) => variant.stock > 0) || preferred || matching[0] || null;
    setSelected(next);
    setQuantity(1);
    setSelectedImage(next?.image || product.images?.[0] || "");
  };
  const discount = selected?.originalPrice > selected?.price
    ? Math.round((selected.originalPrice - selected.price) / selected.originalPrice * 100) : 0;
  function toggleRelatedFavorite(productId) {
    const updated = favorites.includes(productId) ? favorites.filter((item) => item !== productId) : [...favorites, productId];
    setFavorites(updated);
    localStorage.setItem("quannguyenmobile-favorites", JSON.stringify(updated));
  }
  function optionIsOutOfStock(key, value) {
    const otherKey = key === "storage" ? "color" : "storage";
    const currentCombination = variants.find((variant) => variant[key] === value && variant[otherKey] === selected?.[otherKey]);
    return !currentCombination || currentCombination.stock < 1;
  }
  function changeGalleryImage(index, event) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const buttons = [...event.currentTarget.parentElement.querySelectorAll("button[data-gallery-index]")];
    if (!buttons.length) return;
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
      : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    setSelectedImage(productImages[nextIndex]);
    buttons[nextIndex].focus();
  }
  return <div className="product-page">
    <SiteHeader cartCount={cartCount} onOpenCart={onOpenCart} />
    <main className="container">
      <nav className="page-title" aria-label="Breadcrumb"><ol>
        <li><Link to="/">Trang chủ</Link></li>
        <li><a href="/#products">Điện thoại</a></li>
        <li aria-current="page">{product?.name || "Chi tiết sản phẩm"}</li>
      </ol></nav>
      {error ? <div className="empty-state product-error"><strong>{notFound ? "Không tìm thấy sản phẩm" : "Không tải được sản phẩm"}</strong><p>{notFound ? "Sản phẩm có thể đã bị xóa hoặc đường dẫn không chính xác." : error}</p><Link className="button" to="/">Về trang chủ</Link></div> : !product ? <div className="product-detail-skeleton" aria-label="Đang tải sản phẩm"><div /><div><i /><i /><i /><i /></div></div> : <>
        <section className="detail-layout">
          <div className="product-gallery"><div className="detail-image"><ProductImage name={product.name} source={activeImage} alt={`${product.name}${selected?.color ? ` màu ${selected.color}` : ""}`} width="900" height="900" /></div>
            {productImages.length > 1 && <div className="product-thumbnails" role="group" aria-label="Ảnh sản phẩm">
              {productImages.map((image, index) => <button data-gallery-index={index} type="button" key={`${image}-${index}`} className={`product-thumbnail${activeImage === image ? " is-selected" : ""}`} aria-label={`Xem ảnh ${index + 1}`} aria-current={activeImage === image ? "true" : undefined} onClick={() => setSelectedImage(image)} onKeyDown={(event) => changeGalleryImage(index, event)}><ProductImage name={product.name} source={image} alt="" width="90" height="90" /></button>)}
            </div>}
          </div>
          <div className="detail-info"><div className="product-brand">{product.brand} · {product.category}</div><h1>{product.name}</h1><div className="rating-line"><span>Hàng chính hãng · Bảo hành chính thức</span></div>
            <div className="detail-price"><span>{money(selected?.price)}</span>{selected?.originalPrice > selected?.price && <><del>{money(selected.originalPrice)}</del><span className="discount-badge">Giảm {discount}%</span></>}</div>
            <div className="saving-label">{selected?.stock > 0 ? `Còn ${selected.stock} sản phẩm trong kho` : "Phiên bản đã hết hàng"}</div>
            <div className="option-block"><div className="option-title">Dung lượng</div><div className="option-list">{storages.map((storage) => {
              const outOfStock = optionIsOutOfStock("storage", storage);
              return <button className={`option-chip${selected?.storage === storage ? " is-selected" : ""}${outOfStock ? " is-out-of-stock" : ""}`} key={storage} type="button" aria-pressed={selected?.storage === storage} onClick={() => selectVariant("storage", storage)}>{storage}{outOfStock && <span className="option-stock">Hết hàng</span>}</button>;
            })}</div></div>
            <div className="option-block"><div className="option-title">Màu sắc</div><div className="option-list">{colors.map((color) => {
              const colorVariant = variants.find((variant) => variant.color === color);
              const outOfStock = optionIsOutOfStock("color", color);
              return <button className={`option-chip color-chip${selected?.color === color ? " is-selected" : ""}${outOfStock ? " is-out-of-stock" : ""}`} key={color} type="button" aria-pressed={selected?.color === color} onClick={() => selectVariant("color", color)}><span className="color-dot" style={{ background: colorVariant?.colorHex || "#ddd" }} />{color}{outOfStock && <span className="option-stock">Hết hàng</span>}</button>;
            })}</div></div>
            <div className="detail-actions"><label className="detail-quantity">Số lượng<select aria-label="Số lượng sản phẩm" value={quantity} disabled={!selected || selected.stock < 1} onChange={(event) => setQuantity(Number(event.target.value))}>{Array.from({ length: Math.min(selected?.stock || 0, 10) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><button className="button" type="button" disabled={!selected || selected.stock < 1} onClick={() => addToCart(product, selected, quantity)}>Thêm vào giỏ hàng</button><button className="button buy-now-button" type="button" disabled={!selected || selected.stock < 1} onClick={() => { if (addToCart(product, selected, quantity)) onOpenCart(); }}>Mua ngay</button></div>
            <div className="detail-perks"><span>Hàng chính hãng 100%</span><span>Giao hàng toàn quốc</span><span>Đổi trả theo chính sách</span><span>Hỗ trợ trả góp linh hoạt</span></div>
          </div>
        </section>
        <section className="specs-section"><h2>Thông số kỹ thuật</h2><table className="spec-table"><tbody>{[["Màn hình", "screen"], ["Vi xử lý", "chip"], ["RAM", "ram"], ["Pin", "battery"], ["Camera", "camera"]].map(([label, key]) => <tr key={key}><th>{label}</th><td>{product.specs?.[key] || "Đang cập nhật"}</td></tr>)}<tr><th>Bộ nhớ</th><td>{storages.join(" / ") || "Đang cập nhật"}</td></tr></tbody></table></section>
        {product.description && <section className="product-description-section"><h2>Mô tả sản phẩm</h2><p>{product.description}</p></section>}
        {(loadingRelated || relatedProducts.length > 0) && <section className="related-products"><h2>Sản phẩm cùng thương hiệu</h2>{loadingRelated ? <div className="related-loading" aria-label="Đang tải sản phẩm liên quan"><span /><span /><span /><span /></div> : <div className="product-grid">{relatedProducts.map((item) => <ProductCard key={item._id} product={item} favorite={favorites.includes(item._id)} onFavorite={() => toggleRelatedFavorite(item._id)} onAdd={() => addToCart(item, item.variants?.find((variant) => variant.stock > 0) || item.variants?.[0])} />)}</div>}</section>}
      </>}
    </main><Footer />
  </div>;
}
