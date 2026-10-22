import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { money } from "../format.js";
import ProductImage from "./ProductImage.jsx";
import { CloseIcon } from "./icons.jsx";

export default function CartDrawer({ cart, cartSync, open, onClose, adjustCart, setCart, setToast, onRefreshCart, onRemoveUnavailable, onClearCartSync }) {
  const [deliveryMethod, setDeliveryMethod] = useState("delivery");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const fieldRefs = useRef({});
  const navigate = useNavigate();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function checkout(event) {
    event.preventDefault();
    if (cartSync.syncing || !cartSync.checked) {
      setToast({ message: "Vui lòng kiểm tra lại giá và tồn kho trước khi đặt hàng.", error: true });
      return;
    }
    if (cartSync.unavailableItems.length) {
      setToast({ message: "Vui lòng xóa phiên bản đã hết hàng khỏi giỏ trước khi đặt hàng.", error: true });
      return;
    }
    if (!cart.length) {
      setToast({ message: "Giỏ hàng của bạn đang trống.", error: true });
      return;
    }
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const email = String(data.get("email") || "").trim();
    const address = String(data.get("address") || "").trim();
    const phoneDigits = phone.replace(/\D/g, "");
    const errors = {};
    if (!name || name.length > 100) errors.name = "Vui lòng nhập họ tên hợp lệ.";
    if (!/^[+()\d\s.-]{8,20}$/.test(phone) || !/^(?:0|\+84)/.test(phone) || phoneDigits.length < 9 || phoneDigits.length > 11) {
      errors.phone = "Số điện thoại cần bắt đầu bằng 0 hoặc +84 và có từ 9 đến 11 chữ số.";
    }
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.email = "Vui lòng nhập email hợp lệ.";
    if (deliveryMethod === "delivery" && !address) errors.address = "Vui lòng nhập địa chỉ giao hàng.";
    setFieldErrors(errors);
    const firstError = ["name", "phone", "email", "address"].find((field) => errors[field]);
    if (firstError) {
      window.requestAnimationFrame(() => fieldRefs.current[firstError]?.focus());
      return;
    }
    const order = {
      customer: { name, phone, email, address },
      items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
      deliveryMethod: data.get("deliveryMethod"),
      paymentMethod: data.get("paymentMethod"),
      note: data.get("note")
    };
    setSubmitting(true);
    try {
      const result = await api.createOrder(order);
      const orderCode = result.order.code || result.order._id.slice(-8).toUpperCase();
      const completedOrder = { ...result.order, code: orderCode };
      try {
        localStorage.setItem("quannguyenmobile-last-order", JSON.stringify({ code: orderCode, phone }));
      } catch (error) {
        console.warn("Không thể lưu thông tin tra cứu đơn hàng trên thiết bị:", error);
      }
      setCart([]);
      onClearCartSync();
      setFormKey((current) => current + 1);
      setDeliveryMethod("delivery");
      setPaymentMethod("COD");
      setFieldErrors({});
      navigate(`/order-success/${orderCode}`, { state: { order: completedOrder } });
    } catch (error) {
      if (error.status === 409) {
        await onRefreshCart();
        setToast({ message: "Sản phẩm vừa thay đổi tồn kho. Giỏ hàng đã được cập nhật, vui lòng kiểm tra lại.", error: true });
      } else setToast({ message: error.message, error: true });
    } finally {
      setSubmitting(false);
    }
  }
  return <div className={`cart-overlay${open ? " is-open" : ""}`} aria-hidden={!open} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <div className="drawer-head"><h2 id="cart-title">Giỏ hàng &amp; đặt hàng</h2><button className="close-button" type="button" onClick={onClose} aria-label="Đóng giỏ hàng"><CloseIcon /></button></div>
      <div className="drawer-body">
        {cartSync.message && <p className="cart-sync-message" role="status">{cartSync.message}</p>}
        {cartSync.syncing && <p className="cart-sync-progress" role="status">Đang kiểm tra giá và tồn kho…</p>}
        {!cartSync.checked && !cartSync.syncing && <button className="button small secondary cart-retry" type="button" onClick={onRefreshCart}>Kiểm tra lại giỏ hàng</button>}
        {cart.length ? cart.map((item) => {
          const changes = cartSync.changes[item.key];
          return <div className="cart-row" key={item.key}>
            <ProductImage name={item.name} source={item.image} alt={item.name} width="900" height="900" loading="lazy" />
            <div><h3>{item.name}</h3><p>{item.storage} · {item.color}</p><strong>{money(item.price)}</strong>
              {changes && <div className="cart-row-changes"><small className="stock-label">{changes.priceChanged && "Giá mới"}{changes.priceChanged && (changes.quantityReduced || changes.stockChanged) ? " · " : ""}{changes.quantityReduced && `Chỉ còn ${item.stock} máy`}{!changes.quantityReduced && changes.stockChanged && `Tồn kho: ${item.stock} máy`}</small></div>}
              <div className="qty-control"><button type="button" disabled={cartSync.syncing} onClick={() => adjustCart(item.key, -1)} aria-label="Giảm số lượng">−</button><span>{item.quantity}</span><button type="button" onClick={() => adjustCart(item.key, 1)} disabled={cartSync.syncing || item.quantity >= item.stock} aria-label="Tăng số lượng">+</button></div>
            </div>
            <button className="remove-cart" type="button" onClick={() => setCart((current) => current.filter((entry) => entry.key !== item.key))} aria-label={`Xóa ${item.name}`}>×</button>
          </div>;
        }) : !cartSync.unavailableItems.length && <div className="empty-state"><strong>Giỏ hàng đang trống</strong>Chọn chiếc điện thoại phù hợp với bạn nhé.</div>}
        {cartSync.unavailableItems.map((item) => <div className="cart-row cart-row-unavailable" key={item.key}>
          <ProductImage name={item.name} source={item.image} alt={item.name} width="900" height="900" loading="lazy" />
          <div><h3>{item.name}</h3><p>{item.storage} · {item.color}</p><strong className="saving-label">Hết hàng</strong></div>
          <button className="remove-cart" type="button" onClick={() => onRemoveUnavailable(item.key)} aria-label={`Xóa ${item.name} đã hết hàng`}>×</button>
        </div>)}
      </div>
      <form className={`checkout-form${cart.length || cartSync.unavailableItems.length ? "" : " hidden"}`} key={formKey} noValidate onSubmit={checkout}>
        <h3>Thông tin nhận hàng</h3><div className="form-grid">
          <div className="form-field"><label htmlFor="customer-name">Họ và tên *</label><input id="customer-name" name="name" required maxLength="100" autoComplete="name" ref={(element) => { fieldRefs.current.name = element; }} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "customer-name-error" : undefined} onChange={() => setFieldErrors((current) => ({ ...current, name: "" }))} />{fieldErrors.name && <small className="field-error" id="customer-name-error">{fieldErrors.name}</small>}</div>
          <div className="form-field"><label htmlFor="customer-phone">Số điện thoại *</label><input id="customer-phone" name="phone" required maxLength="20" inputMode="tel" autoComplete="tel" ref={(element) => { fieldRefs.current.phone = element; }} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "customer-phone-error" : undefined} onChange={() => setFieldErrors((current) => ({ ...current, phone: "" }))} />{fieldErrors.phone && <small className="field-error" id="customer-phone-error">{fieldErrors.phone}</small>}</div>
          <div className="form-field full"><label htmlFor="customer-email">Email</label><input id="customer-email" name="email" type="email" maxLength="254" autoComplete="email" ref={(element) => { fieldRefs.current.email = element; }} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "customer-email-error" : undefined} onChange={() => setFieldErrors((current) => ({ ...current, email: "" }))} />{fieldErrors.email && <small className="field-error" id="customer-email-error">{fieldErrors.email}</small>}</div>
        </div>
        <div className="checkout-options"><label><input type="radio" name="deliveryMethod" value="delivery" checked={deliveryMethod === "delivery"} onChange={() => setDeliveryMethod("delivery")} /> Giao tận nơi</label><label><input type="radio" name="deliveryMethod" value="pickup" checked={deliveryMethod === "pickup"} onChange={() => setDeliveryMethod("pickup")} /> Nhận tại cửa hàng</label></div>
        {deliveryMethod === "delivery" && <div className="form-field"><label htmlFor="customer-address">Địa chỉ giao hàng *</label><input id="customer-address" name="address" required maxLength="300" autoComplete="street-address" ref={(element) => { fieldRefs.current.address = element; }} aria-invalid={Boolean(fieldErrors.address)} aria-describedby={fieldErrors.address ? "customer-address-error" : undefined} onChange={() => setFieldErrors((current) => ({ ...current, address: "" }))} />{fieldErrors.address && <small className="field-error" id="customer-address-error">{fieldErrors.address}</small>}</div>}
        <div className="checkout-options"><label><input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} /> Thanh toán COD</label><label><input type="radio" name="paymentMethod" value="QR" checked={paymentMethod === "QR"} onChange={() => setPaymentMethod("QR")} /> Chuyển khoản QR</label></div>
        <div className="form-field"><label htmlFor="customer-note">Ghi chú (tối đa 500 ký tự)</label><textarea id="customer-note" name="note" maxLength="500" /></div>
        <div className="cart-total"><span>Tạm tính</span><span>{money(total)}</span></div>
        {cartSync.unavailableItems.length > 0 && <p className="field-error" role="alert">Xóa phiên bản hết hàng để tiếp tục đặt hàng.</p>}
        {!cartSync.checked && !cartSync.syncing && <p className="field-error" role="alert">Cần kiểm tra giá và tồn kho trước khi đặt hàng.</p>}
        <button className="button" type="submit" disabled={submitting || cartSync.syncing || !cartSync.checked || cartSync.unavailableItems.length > 0 || !cart.length}>{submitting ? "Đang tạo đơn hàng..." : "Đặt hàng ngay"}</button>
      </form>
    </section>
  </div>;
}
