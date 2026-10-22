import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { money } from "../format.js";

const BANK_INFO = import.meta.env.VITE_BANK_INFO?.trim();

export default function OrderSuccessPage() {
  const { code: routeCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    if (location.state?.order) {
      setOrder(location.state.order);
      setLoading(false);
      return;
    }

    let savedOrder;
    try {
      savedOrder = JSON.parse(localStorage.getItem("quannguyenmobile-last-order") || "null");
    } catch {
      savedOrder = null;
    }
    if (!savedOrder?.phone || savedOrder.code?.toUpperCase() !== routeCode?.toUpperCase()) {
      setError("Không có thông tin tra cứu đơn hàng trên thiết bị này.");
      setLoading(false);
      return;
    }

    let active = true;
    api.lookupOrder({ code: routeCode, phone: savedOrder.phone })
      .then((result) => { if (active) setOrder(result.order); })
      .catch((lookupError) => { if (active) setError(lookupError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [location.state, routeCode]);

  async function copyCode() {
    const code = order?.code || routeCode;
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(code);
          setCopyMessage("Đã sao chép mã đơn.");
          return;
        } catch {
          // Thử cách sao chép dự phòng khi quyền clipboard bị trình duyệt từ chối.
        }
      }
      const input = document.createElement("textarea");
      input.value = code;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      if (!copied) throw new Error("copy-failed");
      setCopyMessage("Đã sao chép mã đơn.");
    } catch {
      setCopyMessage("Không sao chép được. Bạn có thể chọn và sao chép mã đơn.");
    }
  }

  if (loading) return <main className="container page-shell"><div className="empty-state">Đang tải thông tin đơn hàng...</div></main>;
  if (!order) return <main className="container page-shell"><div className="order-panel"><h1>Chưa tải được đơn hàng</h1><p role="alert">{error}</p><Link className="button" to="/order-lookup">Tra cứu đơn hàng</Link></div></main>;

  const orderCode = order.code || routeCode;
  const items = order.items || [];

  return <div className="order-page-wrap">
    <header className="order-page-header"><Link className="logo" to="/"><span className="logo-mark">QN</span>QN-Mobiles</Link></header>
    <main className="order-page container">
      <section className="order-panel order-confirmation">
        <div className="success-mark" aria-hidden="true">✓</div>
        <span className="order-eyebrow">Đặt hàng thành công</span>
        <h1>Cảm ơn bạn đã đặt hàng</h1>
        <p>Cửa hàng đã nhận được thông tin và sẽ sớm liên hệ xác nhận đơn.</p>
        <div className="order-code-box"><span>Mã đơn hàng</span><strong>{orderCode}</strong><button className="button secondary" type="button" onClick={copyCode}>Sao chép mã</button></div>
        {copyMessage && <p className="copy-message" role="status">{copyMessage}</p>}

        <section className="order-summary-section" aria-labelledby="order-items-title">
          <h2 id="order-items-title">Sản phẩm đã đặt</h2>
          <div className="order-item-list">{items.map((item, index) => <div className="order-item" key={`${item.variantId || item.name || item.productName}-${index}`}>
            <div><strong>{item.productName || item.name}</strong><span>{item.storage} · {item.color} · SL: {item.quantity}</span></div>
            <b>{money(item.price * item.quantity)}</b>
          </div>)}</div>
          <div className="order-total"><span>Tổng tiền</span><strong>{money(order.total)}</strong></div>
        </section>

        <section className="order-summary-section order-methods" aria-label="Thông tin thanh toán và nhận hàng">
          <div><span>Nhận hàng</span><strong>{order.deliveryMethod === "pickup" ? "Nhận tại cửa hàng" : "Giao tận nơi"}</strong></div>
          <div><span>Thanh toán</span><strong>{order.paymentMethod === "QR" ? "Chuyển khoản QR" : "Thanh toán COD"}</strong></div>
        </section>
        {order.paymentMethod === "QR" ? <aside className="payment-instructions">
          <h2>Hướng dẫn chuyển khoản</h2>
          <p>Số tiền: <strong>{money(order.total)}</strong></p>
          <p>Nội dung chuyển khoản: <strong>{orderCode}</strong></p>
          <p>{BANK_INFO || "Cửa hàng sẽ liên hệ gửi thông tin chuyển khoản."}</p>
        </aside> : <p className="order-note">Bạn thanh toán khi nhận hàng.</p>}
        {order.deliveryMethod === "pickup" && <p className="order-note">Vui lòng liên hệ hotline 0969733146 để hẹn thời gian nhận hàng.</p>}
        <div className="order-actions"><Link className="button" to="/">Tiếp tục mua sắm</Link><button className="button secondary" type="button" onClick={() => navigate("/order-lookup", { state: { code: orderCode } })}>Tra cứu đơn khác</button></div>
      </section>
    </main>
  </div>;
}
