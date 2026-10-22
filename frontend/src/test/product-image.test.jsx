import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ProductImage from "../components/ProductImage.jsx";

afterEach(() => cleanup());

describe("ProductImage", () => {
  it("dùng ảnh nội bộ theo tên sản phẩm thay cho ảnh Unsplash mẫu cũ", () => {
    render(
      <ProductImage
        name="Google Pixel 9 Pro XL"
        alt="Google Pixel 9 Pro XL"
        source="https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=900&q=85"
      />,
    );

    expect(screen.getByRole("img").getAttribute("src")).toBe("/images/products-optimized/google-pixel-9-pro-xl.webp");
  });
});
