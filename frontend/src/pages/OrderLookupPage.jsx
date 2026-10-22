import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api.js";
import { money } from "../format.js";

const STATUS_LABELS = {
  pending: "Chờ xác nhận",
  shipping: "Đang giao",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy"
};
const STATUS_STEPS = ["pending", "shipping", "completed"];

export default function OrderLookupPage() {
  const location = useLocation();
  const [code, setCode] = useState(location.state?.code || "");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function lookup(event) {
    event.preventDefault();
    setError("");
    setOrder(null);
    const normalizedCode = code.trim().toUpperCase();
    const digits = phone.replace(/\D/g, "");
    if (!/^[A-Z0-9]{8}$/.test(normalizedCode) || digits.length < 8 || digits.length > 15) {
      setError("Vui lòng nhập mã đơn 8 ký tự và số điện thoại hợp lệ.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.lookupOrder({ code: normalizedCode, phone: phone.trim() });
      setOrder(result.order);
    } catch (lookupError) {
      setError(lookupError.message);
    } finally {
      setLoading(false);
    }
  }

  const currentStep = STATUS_STEPS.indexOf(order?.status);

  return <div className="order-page-wrap">
    <header className="order-page-header"><Link className="logo" to="/"><span className="logo-mark">QN</span>QN-Mobiles</Link><Link to="/">Tiếp tục mua sắm</Link></header>
    <main className="order-page container">
      <section className="order-panel">
        <span className="order-eyebrow">Hỗ trợ đơn hàng</span>
        <h1>Tra cứu đơn hàng</h1>
        <p>Nhập mã đơn và số điện thoại đã dùng khi đặt hàng.</p>
        <form className="order-lookup-form" onSubmit={lookup} noValidate>
          <label htmlFor="lookup-code">Mã đơn hàng</label>
          <input id="lookup-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" maxLength="8" placeholder="Ví dụ: AB12CDEF" />
          <label htmlFor="lookup-phone">Số điện thoại</label>
          <input id="lookup-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="Số điện thoại khi đặt hàng" />
          {error && <p className="lookup-error" role="alert">{error}</p>}
          <button className="button" type="submit" disabled={loading}>{loading ? "Đang tra cứu..." : "Tra cứu đơn hàng"}</button>
        </form>

        {order && <section className="lookup-result" aria-live="polite">
          <div className="lookup-result-heading"><div><span>Mã đơn</span><strong>{order.code}</strong></div><span className={`order-status-badge is-${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span></div>
          {order.status === "cancelled" ? <p className="cancelled-message">Đơn hàng đã được hủy.</p> : <ol className="order-timeline" aria-label="Tiến trình đơn hàng">{STATUS_STEPS.map((status, index) => <li className={index <= currentStep ? "is-complete" : ""} key={status}><span>{index + 1}</span>{STATUS_LABELS[status]}</li>)}</ol>}
          <div className="lookup-items">{order.items.map((item, index) => <div className="order-item" key={`${item.name}-${index}`}><div><strong>{item.name}</strong><span>{item.storage} · {item.color} · SL: {item.quantity}</span></div><b>{money(item.price * item.quantity)}</b></div>)}</div>
          <div className="order-total"><span>Tổng tiền</span><strong>{money(order.total)}</strong></div>
          <div className="order-methods"><div><span>Người nhận</span><strong>{order.customer.name}</strong></div><div><span>Số điện thoại</span><strong>{order.customer.phone}</strong></div><div><span>Địa chỉ</span><strong>{order.customer.address || "Nhận tại cửa hàng"}</strong></div></div>
          <Link className="lookup-new-link" to="/order-lookup" onClick={() => { setOrder(null); setCode(""); setPhone(""); }}>Tra cứu đơn khác</Link>
        </section>}
      </section>
    </main>
  </div>;
}
