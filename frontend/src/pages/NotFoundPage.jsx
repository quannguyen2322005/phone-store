import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return <main className="container page-shell"><div className="empty-state"><strong>Không tìm thấy trang này</strong><Link className="button" to="/">Quay lại cửa hàng</Link></div></main>;
}
