import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { money } from "../format.js";
import { readSavedCart, CART_KEY } from "../lib/cart.js";
import { productImageSource, slugify } from "../lib/images.js";
import CartDrawer from "../components/CartDrawer.jsx";
import { useCart } from "../hooks/useCart.js";

vi.mock("../components/ProductImage.jsx", () => ({
  default: ({ alt, ...props }) => <img alt={alt} {...props} />,
}));

const product = { _id: "product-1", name: "iPhone 17 Pro", brand: "APPLE" };
const variant = { _id: "variant-1", storage: "128GB", color: "Đen", price: 5000000, stock: 2 };

function CartHarness() {
  const [toast, setToast] = useState(null);
  const { cart, setCart, cartSync, adjustCart, addToCart, clearCartSync } = useCart(setToast, false);
  return (
    <MemoryRouter>
      <button type="button" onClick={() => addToCart(product, variant)}>
        Thêm iPhone
      </button>
      <CartDrawer
        cart={cart}
        cartSync={cartSync}
        open
        onClose={() => {}}
        adjustCart={adjustCart}
        setCart={setCart}
        setToast={setToast}
        onRefreshCart={async () => true}
        onRemoveUnavailable={() => {}}
        onClearCartSync={clearCartSync}
      />
      {toast?.message && <p>{toast.message}</p>}
    </MemoryRouter>
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe("các tiện ích dùng chung", () => {
  it("chuẩn hóa slug và tạo đúng đường dẫn ảnh WebP", () => {
    expect(slugify("Dien thoai + 5")).toBe("dien-thoai-plus-5");
    expect(productImageSource("iPhone 17 Pro")).toBe("/images/products-optimized/iphone-17-pro.webp");
  });

  it("định dạng giá bằng tiền Việt Nam", () => {
    expect(money(5000000)).toContain("5.000.000");
    expect(money(5000000)).toContain("₫");
  });

  it("lọc dòng giỏ hàng sai cấu trúc và trả mảng rỗng khi JSON lỗi", () => {
    const validItem = {
      key: "product-1:variant-1",
      productId: "product-1",
      variantId: "variant-1",
      price: 5000000,
      quantity: 1,
    };
    localStorage.setItem(
      CART_KEY,
      JSON.stringify({
        version: 2,
        items: [validItem, { ...validItem, quantity: 0 }, { ...validItem, key: "wrong-key" }, null],
      }),
    );
    expect(readSavedCart()).toEqual([validItem]);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(CART_KEY, "{");
    expect(readSavedCart()).toEqual([]);
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});

describe("CartDrawer", () => {
  it("thêm sản phẩm, tăng giảm trong giới hạn tồn kho và xóa dòng", () => {
    render(<CartHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Thêm iPhone" }));
    expect(screen.getByText("iPhone 17 Pro")).toBeTruthy();
    expect(screen.getByText("1", { selector: ".qty-control span" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Tăng số lượng" }));
    expect(screen.getByText("2", { selector: ".qty-control span" })).toBeTruthy();
    const increaseButton = screen.getByRole("button", { name: "Tăng số lượng" });
    expect(increaseButton.disabled).toBe(true);
    fireEvent.click(increaseButton);
    expect(screen.getByText("2", { selector: ".qty-control span" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Giảm số lượng" }));
    expect(screen.getByText("1", { selector: ".qty-control span" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Giảm số lượng" }));
    expect(screen.queryByText("iPhone 17 Pro")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Thêm iPhone" }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa iPhone 17 Pro" }));
    expect(screen.queryByText("iPhone 17 Pro")).toBeNull();
  });
});
