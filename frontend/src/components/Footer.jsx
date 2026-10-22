import { Link } from "react-router-dom";

export default function Footer() {
  return <footer className="footer"><div className="container"><Link className="logo" to="/"><span className="logo-mark">QN</span>QN-Mobiles</Link><p>Smartphone chính hãng · Hỗ trợ mỗi ngày 8:00–22:00</p><Link to="/order-lookup">Tra cứu đơn hàng</Link><p>© 2026 QN-Mobiles</p></div></footer>;
}
