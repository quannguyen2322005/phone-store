// Định dạng tiền VNĐ dùng chung cho trang khách và trang quản trị.
export const money = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0
}).format(value || 0);
