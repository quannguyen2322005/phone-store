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
    if (!selectedVariant) throw new Error("Sáº£n pháº©m hiá»‡n chÆ°a cÃ³ phiÃªn báº£n nÃ o.");
    const storageOptions = [...new Set(variants.map((variant) => variant.storage))];
    const colorOptions = [...new Map(variants.map((variant) => [variant.color, variant])).values()];
    const image = selectedVariant.image || product.images?.[0] || "";
    const sale = selectedVariant.price;
    const old = selectedVariant.originalPrice;
    $("#breadcrumb-name").textContent = product.name;
    document.title = `${product.name} â€” QuÃ¢n Nguyá»…n mobile store`;
    detail.innerHTML = `
      <div class="detail-image"><img id="detail-image" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}"></div>
      <div class="detail-info">
        <div class="product-brand">${escapeHtml(product.brand)} Â· ${escapeHtml(product.category)}</div>
        <h1>${escapeHtml(product.name)}</h1>
        <div class="rating-line"><span class="rating-stars">â˜…â˜…â˜…â˜…â˜…</span><span>HÃ ng chÃ­nh hÃ£ng Â· Báº£o hÃ nh chÃ­nh thá»©c</span></div>
        <div class="detail-price"><span id="variant-price">${formatPrice(sale)}</span><del id="variant-old-price">${old > sale ? formatPrice(old) : ""}</del></div>
        <div class="saving-label" id="variant-stock">${selectedVariant.stock > 0 ? `CÃ²n ${selectedVariant.stock} sáº£n pháº©m trong kho` : "PhiÃªn báº£n Ä‘Ã£ háº¿t hÃ ng"}</div>
        <p style="margin:17px 0 0;color:#718095;font-size:11px;line-height:1.8">${escapeHtml(product.description || "Äiá»‡n thoáº¡i chÃ­nh hÃ£ng, giao hÃ ng toÃ n quá»‘c.")}</p>
        <div class="option-block"><div class="option-title">Dung lÆ°á»£ng</div><div class="option-list" id="storage-options">${storageOptions.map((storage) => `<button type="button" class="option-chip ${storage === selectedVariant.storage ? "is-selected" : ""}" data-storage="${escapeHtml(storage)}">${escapeHtml(storage)}</button>`).join("")}</div></div>
        <div class="option-block"><div class="option-title">MÃ u sáº¯c</div><div class="option-list" id="color-options">${colorOptions.map((variant) => `<button type="button" class="option-chip color-chip ${variant.color === selectedVariant.color ? "is-selected" : ""}" data-color="${escapeHtml(variant.color)}"><span class="color-dot" style="background:${escapeHtml(variant.colorHex || "#ddd")}"></span>${escapeHtml(variant.color)}</button>`).join("")}</div></div>
        <div class="detail-actions"><button class="button" id="add-to-cart" type="button">ThÃªm vÃ o giá» hÃ ng</button><a class="button secondary" href="index.html#products">Tiáº¿p tá»¥c mua</a></div>
        <div class="detail-perks"><span>HÃ ng chÃ­nh hÃ£ng 100%</span><span>Giao hÃ ng toÃ n quá»‘c</span><span>Äá»•i tráº£ theo chÃ­nh sÃ¡ch</span><span>Há»— trá»£ tráº£ gÃ³p linh hoáº¡t</span></div>
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
    $("#variant-stock").textContent = variant.stock > 0 ? `CÃ²n ${variant.stock} sáº£n pháº©m trong kho` : "PhiÃªn báº£n Ä‘Ã£ háº¿t hÃ ng";
    $("#detail-image").src = variant.image || product.images?.[0] || "";
    $("#storage-options").querySelectorAll("[data-storage]").forEach((button) => button.classList.toggle("is-selected", button.dataset.storage === variant.storage));
    $("#color-options").querySelectorAll("[data-color]").forEach((button) => button.classList.toggle("is-selected", button.dataset.color === variant.color));
    $("#add-to-cart").disabled = variant.stock < 1;
  }
  function renderSpecs() {
    const labels = { screen: "MÃ n hÃ¬nh", chip: "Vi xá»­ lÃ½", ram: "RAM", battery: "Pin", camera: "Camera" };
    const rows = Object.entries(labels).map(([key, label]) =>
      `<tr><th>${label}</th><td>${escapeHtml(product.specs?.[key] || "Äang cáº­p nháº­t")}</td></tr>`
    );
    rows.push(`<tr><th>Bá»™ nhá»›</th><td>${[...new Set(product.variants.map((variant) => variant.storage))].map(escapeHtml).join(" / ")}</td></tr>`);
    $("#spec-table-wrap").innerHTML = `<table class="spec-table"><tbody>${rows.join("")}</tbody></table>`;
  }
  function addSelectedToCart() {
    if (selectedVariant.stock < 1) return toast("PhiÃªn báº£n nÃ y hiá»‡n Ä‘Ã£ háº¿t hÃ ng.", true);
    let cart = [];
    try {
      const parsed = JSON.parse(localStorage.getItem("quannguyenmobile-cart") || "[]");
      cart = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("KhÃ´ng thá»ƒ Ä‘á»c giá» hÃ ng Ä‘Ã£ lÆ°u:", error);
      return toast("KhÃ´ng Ä‘á»c Ä‘Æ°á»£c giá» hÃ ng Ä‘Ã£ lÆ°u. HÃ£y thá»­ xÃ³a dá»¯ liá»‡u trang vÃ  táº£i láº¡i.", true);
    }
    const key = `${product._id}:${selectedVariant._id}`;
    const existing = cart.find((item) => item.key === key);
    if (existing && existing.quantity >= selectedVariant.stock) return toast("Sá»‘ lÆ°á»£ng trong giá» Ä‘Ã£ Ä‘áº¡t tá»“n kho hiá»‡n táº¡i.", true);
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
    toast(`ÄÃ£ thÃªm ${product.name} vÃ o giá» hÃ ng.`);
  }

  try {
    const savedCart = JSON.parse(localStorage.getItem("quannguyenmobile-cart") || "[]");
    const badge = document.querySelector("[data-cart-count]");
    if (badge) badge.textContent = Array.isArray(savedCart) ? savedCart.reduce((total, item) => total + (Number(item.quantity) || 0), 0) : 0;
  } catch (error) {
    console.error("KhÃ´ng thá»ƒ Ä‘á»c giá» hÃ ng Ä‘Ã£ lÆ°u:", error);
  }
  $("#detail-search").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = $("#search-input").value.trim();
    location.href = `index.html${query ? `?search=${encodeURIComponent(query)}` : "#products"}`;
  });
  const initialSearch = new URLSearchParams(location.search).get("search");
  if (initialSearch) $("#search-input").value = initialSearch;
  if (!productId) {
    detail.innerHTML = '<div class="empty-state"><strong>ChÆ°a chá»n sáº£n pháº©m</strong><a href="index.html#products">Quay láº¡i danh sÃ¡ch Ä‘iá»‡n thoáº¡i</a></div>';
    $("#spec-table-wrap").textContent = "KhÃ´ng cÃ³ thÃ´ng sá»‘ Ä‘á»ƒ hiá»ƒn thá»‹.";
  } else {
    PhoneAPI.getProduct(productId)
      .then((result) => { product = result.product; renderProduct(); })
      .catch((error) => {
        detail.innerHTML = `<div class="empty-state"><strong>KhÃ´ng táº£i Ä‘Æ°á»£c sáº£n pháº©m</strong>${escapeHtml(error.message)}<br><br><a href="index.html#products">Quay láº¡i cá»­a hÃ ng</a></div>`;
        $("#spec-table-wrap").textContent = "KhÃ´ng thá»ƒ táº£i thÃ´ng sá»‘ ká»¹ thuáº­t.";
      });
  }
})();

