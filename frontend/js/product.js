(() => {
  const $ = (selector) => document.querySelector(selector);
  const detail = $("#detail-content");
  const productId = new URLSearchParams(location.search).get("id");
  const formatPrice = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  let product;
  let selectedVariant;

  function toast(message, isError = false) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.classList.add("is-visible");
    setTimeout(() => element.classList.remove("is-visible"), 3000);
  }
  function renderProduct() {
    const variants = product.variants || [];
    selectedVariant = variants.find((variant) => variant.stock > 0) || variants[0];
    if (!selectedVariant) throw new Error("Sản phẩm hiện chưa có phiên bản nào.");
    const storageOptions = [...new Set(variants.map((variant) => variant.storage))];
    const colorOptions = [...new Map(variants.map((variant) => [variant.color, variant])).values()];
    const image = selectedVariant.image || product.images?.[0] || "";
    const sale = selectedVariant.price;
    const old = selectedVariant.originalPrice;
    $("#breadcrumb-name").textContent = product.name;
    document.title = `${product.name} — Quân Nguyễn mobile store`;
    detail.innerHTML = `
      <div class="detail-image"><img id="detail-image" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}"></div>
      <div class="detail-info">
        <div class="product-brand">${escapeHtml(product.brand)} · ${escapeHtml(product.category)}</div>
        <h1>${escapeHtml(product.name)}</h1>
        <div class="rating-line"><span class="rating-stars">★★★★★</span><span>Hàng chính hãng · Bảo hành chính thức</span></div>
        <div class="detail-price"><span id="variant-price">${formatPrice(sale)}</span><del id="variant-old-price">${old > sale ? formatPrice(old) : ""}</del></div>
        <div class="saving-label" id="variant-stock">${selectedVariant.stock > 0 ? `Còn ${selectedVariant.stock} sản phẩm trong kho` : "Phiên bản đã hết hàng"}</div>
        <p style="margin:17px 0 0;color:#718095;font-size:11px;line-height:1.8">${escapeHtml(product.description || "Điện thoại chính hãng, giao hàng toàn quốc.")}</p>
        <div class="option-block"><div class="option-title">Dung lượng</div><div class="option-list" id="storage-options">${storageOptions.map((storage) => `<button type="button" class="option-chip ${storage === selectedVariant.storage ? "is-selected" : ""}" data-storage="${escapeHtml(storage)}">${escapeHtml(storage)}</button>`).join("")}</div></div>
        <div class="option-block"><div class="option-title">Màu sắc</div><div class="option-list" id="color-options">${colorOptions.map((variant) => `<button type="button" class="option-chip color-chip ${variant.color === selectedVariant.color ? "is-selected" : ""}" data-color="${escapeHtml(variant.color)}"><span class="color-dot" style="background:${escapeHtml(variant.colorHex || "#ddd")}"></span>${escapeHtml(variant.color)}</button>`).join("")}</div></div>
        <div class="detail-actions"><button class="button" id="add-to-cart" type="button">Thêm vào giỏ hàng</button><a class="button secondary" href="index.html#products">Tiếp tục mua</a></div>
        <div class="detail-perks"><span>Hàng chính hãng 100%</span><span>Giao hàng toàn quốc</span><span>Đổi trả theo chính sách</span><span>Hỗ trợ trả góp linh hoạt</span></div>
      </div>`;
    renderSpecs();
    $("#storage-options").addEventListener("click", (event) => {
      const option = event.target.closest("[data-storage]");
      if (!option) return;
      const matches = variants.filter((variant) => variant.storage === option.dataset.storage);
      const sameColor = matches.find((variant) => variant.color === selectedVariant.color);
      selectVariant(sameColor || matches.find((variant) => variant.stock > 0) || matches[0]);
    });
    $("#color-options").addEventListener("click", (event) => {
      const option = event.target.closest("[data-color]");
      if (!option) return;
      const matches = variants.filter((variant) => variant.color === option.dataset.color);
      const sameStorage = matches.find((variant) => variant.storage === selectedVariant.storage);
      selectVariant(sameStorage || matches.find((variant) => variant.stock > 0) || matches[0]);
    });
    $("#add-to-cart").addEventListener("click", addSelectedToCart);
    selectVariant(selectedVariant);
  }
  function selectVariant(variant) {
    selectedVariant = variant;
    $("#variant-price").textContent = formatPrice(variant.price);
    $("#variant-old-price").textContent = variant.originalPrice > variant.price ? formatPrice(variant.originalPrice) : "";
    $("#variant-stock").textContent = variant.stock > 0 ? `Còn ${variant.stock} sản phẩm trong kho` : "Phiên bản đã hết hàng";
    $("#detail-image").src = variant.image || product.images?.[0] || "";
    $("#storage-options").querySelectorAll("[data-storage]").forEach((button) => button.classList.toggle("is-selected", button.dataset.storage === variant.storage));
    $("#color-options").querySelectorAll("[data-color]").forEach((button) => button.classList.toggle("is-selected", button.dataset.color === variant.color));
    $("#add-to-cart").disabled = variant.stock < 1;
  }
  function renderSpecs() {
    const labels = { screen: "Màn hình", chip: "Vi xử lý", ram: "RAM", battery: "Pin", camera: "Camera" };
    const rows = Object.entries(labels).map(([key, label]) =>
      `<tr><th>${label}</th><td>${escapeHtml(product.specs?.[key] || "Đang cập nhật")}</td></tr>`
    );
    rows.push(`<tr><th>Bộ nhớ</th><td>${[...new Set(product.variants.map((variant) => variant.storage))].map(escapeHtml).join(" / ")}</td></tr>`);
    $("#spec-table-wrap").innerHTML = `<table class="spec-table"><tbody>${rows.join("")}</tbody></table>`;
  }
  function addSelectedToCart() {
    if (selectedVariant.stock < 1) return toast("Phiên bản này hiện đã hết hàng.", true);
    let cart = [];
    try {
      const parsed = JSON.parse(localStorage.getItem("quannguyenmobile-cart") || "[]");
      cart = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Không thể đọc giỏ hàng đã lưu:", error);
      return toast("Không đọc được giỏ hàng đã lưu. Hãy thử xóa dữ liệu trang và tải lại.", true);
    }
    const key = `${product._id}:${selectedVariant._id}`;
    const existing = cart.find((item) => item.key === key);
    if (existing && existing.quantity >= selectedVariant.stock) return toast("Số lượng trong giỏ đã đạt tồn kho hiện tại.", true);
    if (existing) existing.quantity += 1;
    else cart.push({
      key, productId: product._id, variantId: selectedVariant._id, name: product.name, brand: product.brand,
      image: selectedVariant.image || product.images?.[0] || "", storage: selectedVariant.storage,
      color: selectedVariant.color, price: selectedVariant.price, stock: selectedVariant.stock, quantity: 1
    });
    localStorage.setItem("quannguyenmobile-cart", JSON.stringify(cart));
    document.querySelectorAll("[data-cart-count]").forEach((badge) => {
      badge.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    });
    toast(`Đã thêm ${product.name} vào giỏ hàng.`);
  }

  try {
    const savedCart = JSON.parse(localStorage.getItem("quannguyenmobile-cart") || "[]");
    const badge = document.querySelector("[data-cart-count]");
    if (badge) badge.textContent = Array.isArray(savedCart) ? savedCart.reduce((total, item) => total + (Number(item.quantity) || 0), 0) : 0;
  } catch (error) {
    console.error("Không thể đọc giỏ hàng đã lưu:", error);
  }
  $("#detail-search").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = $("#search-input").value.trim();
    location.href = `index.html${query ? `?search=${encodeURIComponent(query)}` : "#products"}`;
  });
  const initialSearch = new URLSearchParams(location.search).get("search");
  if (initialSearch) $("#search-input").value = initialSearch;
  if (!productId) {
    detail.innerHTML = '<div class="empty-state"><strong>Chưa chọn sản phẩm</strong><a href="index.html#products">Quay lại danh sách điện thoại</a></div>';
    $("#spec-table-wrap").textContent = "Không có thông số để hiển thị.";
  } else {
    PhoneAPI.getProduct(productId)
      .then((result) => { product = result.product; renderProduct(); })
      .catch((error) => {
        detail.innerHTML = `<div class="empty-state"><strong>Không tải được sản phẩm</strong>${escapeHtml(error.message)}<br><br><a href="index.html#products">Quay lại cửa hàng</a></div>`;
        $("#spec-table-wrap").textContent = "Không thể tải thông số kỹ thuật.";
      });
  }
})();

