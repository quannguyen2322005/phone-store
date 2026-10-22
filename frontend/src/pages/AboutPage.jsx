import SiteHeader from "../components/SiteHeader.jsx";
import Footer from "../components/Footer.jsx";
import { useCartCount } from "../hooks/useCartCount.js";

export default function AboutPage({ onOpenCart }) {
  return <div className="about-page">
    <SiteHeader cartCount={useCartCount()} onOpenCart={onOpenCart} />
    <main className="container page-shell">
      <section className="about-hero"><div><span className="hero-label">Về cửa hàng</span><h1>Điện thoại chính hãng, tư vấn rõ ràng.</h1><p>QN-Mobiles cung cấp điện thoại chính hãng với giá và thông tin phiên bản minh bạch. Liên hệ cửa hàng để được hỗ trợ chọn máy, đặt hàng và bảo hành.</p></div><div className="about-visual"><img src="/images/placeholder.svg" alt="Điện thoại" width="900" height="900" loading="lazy" decoding="async" /></div></section>
      <section className="story-grid"><article className="story-card"><h2>Sản phẩm</h2><p>Thông tin model, dung lượng, màu sắc và giá bán được hiển thị theo từng phiên bản.</p></article><article className="story-card"><h2>Bảo hành</h2><p>Sản phẩm chính hãng, áp dụng chính sách bảo hành của nhà sản xuất.</p></article><article className="story-card"><h2>Hỗ trợ</h2><p>Liên hệ cửa hàng để được tư vấn trước khi mua và hỗ trợ sau khi nhận máy.</p></article></section>
      <section className="contact-card" id="contact"><div><span className="hero-label">Liên hệ</span><h2>Cần tư vấn hoặc đặt hàng?</h2></div><div className="contact-info"><div><strong>Hotline/Zalo</strong><p>Quân Nguyễn: 0969733146</p></div><div><strong>Giờ làm việc</strong><p>08:00 – 22:00 hàng ngày</p></div><div><strong>Địa chỉ</strong><p>Liên hệ cửa hàng để được hướng dẫn địa điểm.</p></div></div><a className="button" href="https://zalo.me/0969733146" target="_blank" rel="noreferrer">Nhắn Zalo</a></section>
    </main><Footer />
  </div>;
}
