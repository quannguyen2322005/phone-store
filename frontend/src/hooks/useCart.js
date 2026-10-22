import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { CART_KEY, CART_VERSION, readSavedCart } from "../lib/cart.js";
import { productImageSource } from "../lib/images.js";

export function useCart(setToast, cartOpen) {
  const [cart, setCart] = useState(readSavedCart);
  const [cartSync, setCartSync] = useState(() => ({
    message: "",
    changes: {},
    unavailableItems: [],
    checked: cart.length === 0,
    syncing: cart.length > 0
  }));
  const cartRef = useRef(cart);
  const initialCartCheck = useRef(false);

  useEffect(() => {
    cartRef.current = cart;
    localStorage.setItem(CART_KEY, JSON.stringify({ version: CART_VERSION, items: cart }));
    window.dispatchEvent(new Event("phone-store-cart-update"));
  }, [cart]);

  async function refreshCart() {
    const snapshot = cartRef.current;
    if (!snapshot.length) {
      setCartSync({ message: "", changes: {}, unavailableItems: [], checked: true, syncing: false });
      return true;
    }
    setCartSync((current) => ({ ...current, syncing: true, checked: false }));
    try {
      const result = await api.checkCart(snapshot.map(({ productId, variantId }) => ({ productId, variantId })));
      const checkedItems = new Map((result.items || []).map((item) => [`${item.productId}:${item.variantId}`, item]));
      const snapshotKeys = new Set(snapshot.map((item) => item.key));
      const changes = {};
      const unavailableItems = [];
      let changed = false;
      const reconciled = new Map();

      snapshot.forEach((item) => {
        const current = checkedItems.get(item.key);
        if (!current?.exists) {
          changed = true;
          return;
        }
        const priceChanged = current.price !== item.price;
        const stockChanged = current.stock !== item.stock;
        if (priceChanged || stockChanged) changed = true;
        const updated = { ...item, name: current.name || item.name, image: current.image || item.image, price: current.price, stock: current.stock };
        if (current.stock < 1) {
          unavailableItems.push({ ...updated, quantity: 0 });
          changed = true;
          return;
        }
        const quantityReduced = item.quantity > current.stock;
        if (quantityReduced) changed = true;
        reconciled.set(item.key, { ...updated, quantity: quantityReduced ? current.stock : item.quantity });
        if (priceChanged || stockChanged || quantityReduced) changes[item.key] = { priceChanged, stockChanged, quantityReduced };
      });

      setCart((current) => current.flatMap((item) => {
        if (!snapshotKeys.has(item.key)) return [item];
        const updated = reconciled.get(item.key);
        return updated ? [updated] : [];
      }));
      setCartSync({
        message: changed ? "Giá hoặc tồn kho một số sản phẩm đã thay đổi, giỏ hàng đã được cập nhật." : "",
        changes,
        unavailableItems,
        checked: true,
        syncing: false
      });
      return true;
    } catch {
      setCartSync((current) => ({ ...current, message: "Chưa thể kiểm tra giá và tồn kho. Vui lòng thử lại.", checked: false, syncing: false }));
      return false;
    }
  }

  useEffect(() => {
    function syncCartFromAnotherTab(event) {
      if (event.key !== CART_KEY) return;
      const nextCart = readSavedCart();
      cartRef.current = nextCart;
      setCart(nextCart);
      setCartSync({ message: "", changes: {}, unavailableItems: [], checked: nextCart.length === 0, syncing: false });
      if (nextCart.length) refreshCart();
    }
    window.addEventListener("storage", syncCartFromAnotherTab);
    return () => window.removeEventListener("storage", syncCartFromAnotherTab);
  }, []);

  useEffect(() => {
    if (!initialCartCheck.current) {
      initialCartCheck.current = true;
      if (cartRef.current.length) refreshCart();
      return;
    }
    if (cartOpen && cartRef.current.length) refreshCart();
  }, [cartOpen]);

  function addToCart(product, variant, quantity = 1) {
    if (!variant || variant.stock < 1) {
      setToast({ message: "Phiên bản này hiện đã hết hàng.", error: true });
      return false;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > variant.stock) {
      setToast({ message: "Số lượng vượt quá tồn kho hiện tại.", error: true });
      return false;
    }
    const key = `${product._id}:${variant._id}`;
    const existing = cart.find((item) => item.key === key);
    if ((existing?.quantity || 0) + quantity > variant.stock) {
      setToast({ message: "Số lượng trong giỏ đã đạt tồn kho hiện tại.", error: true });
      return false;
    }
    setCart((current) => {
      if (current.some((item) => item.key === key)) return current.map((item) => item.key === key ? { ...item, quantity: item.quantity + quantity } : item);
      const item = {
        key, productId: product._id, variantId: variant._id, name: product.name, brand: product.brand,
        image: productImageSource(product.name), storage: variant.storage, color: variant.color,
        price: variant.price, stock: variant.stock, quantity
      };
      return [...current, item];
    });
    setCartSync((current) => ({ ...current, checked: false }));
    setToast({ message: quantity === 1 ? `Đã thêm ${product.name} vào giỏ hàng.` : `Đã thêm ${quantity} ${product.name} vào giỏ hàng.` });
    return true;
  }

  function adjustCart(key, difference) {
    const item = cart.find((entry) => entry.key === key);
    if (!item) return;
    if (item.quantity + difference > item.stock) {
      setToast({ message: "Số lượng trong giỏ đã đạt tồn kho hiện tại.", error: true });
      return;
    }
    setCart((current) => current.flatMap((item) => {
      if (item.key !== key) return [item];
      const quantity = item.quantity + difference;
      if (quantity <= 0) return [];
      return [{ ...item, quantity }];
    }));
  }

  function removeUnavailable(key) {
    setCartSync((current) => ({ ...current, unavailableItems: current.unavailableItems.filter((item) => item.key !== key) }));
  }

  function clearCartSync() {
    setCartSync({ message: "", changes: {}, unavailableItems: [], checked: true, syncing: false });
  }

  return { cart, setCart, cartSync, setCartSync, refreshCart, addToCart, adjustCart, removeUnavailable, clearCartSync };
}
