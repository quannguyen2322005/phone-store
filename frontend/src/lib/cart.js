export const CART_KEY = "quannguyenmobile-cart";
export const CART_VERSION = 2;

export function readSavedCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    const items = Array.isArray(saved) ? saved
      : saved?.version === CART_VERSION && Array.isArray(saved.items) ? saved.items : [];
    return items.filter((item) => item && typeof item === "object" && !Array.isArray(item)
      && typeof item.key === "string" && item.key.length > 0
      && typeof item.productId === "string" && item.productId.length > 0
      && typeof item.variantId === "string" && item.variantId.length > 0
      && item.key === `${item.productId}:${item.variantId}`
      && Number.isFinite(item.price) && item.price >= 0
      && Number.isInteger(item.quantity) && item.quantity > 0);
  } catch (error) {
    console.error("Không thể đọc giỏ hàng đã lưu:", error);
    return [];
  }
}
