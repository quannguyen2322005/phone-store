import { useEffect, useState } from "react";
import { readSavedCart } from "../lib/cart.js";

export function useCartCount() {
  const [count, setCount] = useState(() => readSavedCart().reduce((total, item) => total + item.quantity, 0));
  useEffect(() => {
    const update = () => setCount(readSavedCart().reduce((total, item) => total + item.quantity, 0));
    window.addEventListener("storage", update);
    window.addEventListener("phone-store-cart-update", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("phone-store-cart-update", update);
    };
  }, []);
  return count;
}
