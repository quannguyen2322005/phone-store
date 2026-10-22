import { Link } from "react-router-dom";
import { money } from "../format.js";
import ProductImage from "./ProductImage.jsx";
import { HeartIcon } from "./icons.jsx";

export default function ProductCard({ product, favorite, onFavorite, onAdd }) {
  const variant = product.variants?.find((item) => item.stock > 0) || product.variants?.[0];
  const price = variant?.price ?? product.salePrice;
  const original = variant?.originalPrice ?? product.originalPrice;
  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={`/product/${product._id}`} aria-label={`Xem ${product.name}`}><ProductImage name={product.name} alt={product.name} width="900" height="900" loading="lazy" /></Link>
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
