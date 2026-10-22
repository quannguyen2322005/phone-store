import { ServiceIcon } from "./icons.jsx";

export default function ServiceRow() {
  const services = [
    ["Giao hàng siêu tốc", "Nhận máy trong ngày"], ["Chính hãng 100%", "Bảo hành chính thức"],
    ["Thanh toán linh hoạt", "COD và chuyển khoản QR"], ["Đổi trả dễ dàng", "An tâm trong 30 ngày"]
  ];
  return <section className="service-row" aria-label="Dịch vụ QN-Mobiles">{services.map(([title, description], index) => <div className="service-item" key={title}><ServiceIcon index={index} /><div><strong>{title}</strong><small>{description}</small></div></div>)}</section>;
}
