(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const grid = $("#product-grid");
  if (!grid) return;

  const state = { page: 1, limit: 9, totalPages: 1, search: "", timer: null };
  const formatPrice = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const readCart = () => {
    try {
      const value = JSON.parse(localStorage.getItem("quannguyenmobile-cart") || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error("Không thể đọc giỏ hàng đã lưu:", error);
      return [];
    }
  };
  const saveCart = (cart) => {
    localStorage.setItem("quannguyenmobile-cart", JSON.stringify(cart));
    renderCart();
  };

  function showToast(message, isError = false) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("is-visible");
    clearTimeout(state.timer);
    state.timer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }
  function getFilters() {
    const values = (name) => $$(`input[name="${name}"]:checked`).map((input) => input.value).join(",");
    return {
      page: state.page,
      limit: state.limit,
      brand: values("brand"),
      ram: values("ram"),
      storage: values("storage"),
      minPrice: $("#min-price").value,
      maxPrice: $("#max-price").value,
      search: state.search,
      sort: $("#sort-select").value
    };
  }
  function productCard(product) {
    const firstVariant = product.variants?.find((variant) => variant.stock > 0) || product.variants?.[0];
    const image = firstVariant?.image || product.images?.[0] || "";
    const salePrice = firstVariant?.price ?? product.salePrice;
    const oldPrice = firstVariant?.originalPrice ?? product.originalPrice;
    const available = product.stock > 0;
    return `<article class="product-card">
      <a class="product-image" href="product-detail.html?id=${encodeURIComponent(product._id)}" aria-label="Xem ${escapeHtml(product.name)}">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy">
        ${product.featured ? '<span class="product-badge">Nổi bật</span>' : ""}
        <button class="product-favorite" type="button" aria-label="Sản phẩm yêu thích"><svg viewBox="0 0 24 24"><path d="M20.8 8.6c0 5.2-8.8 10.4-8.8 10.4S3.2 13.8 3.2 8.6A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.2Z"></path></svg></button>
      </a>
      <div class="product-content">
        <div class="product-brand">${escapeHtml(product.brand)}</div>
        <h3 title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</h3>
        <div class="product-spec-line"><span>${escapeHtml(product.specs?.ram || "—")} RAM</span><span>${escapeHtml(firstVariant?.storage || "Nhiều phiên bản")}</span></div>
        <div class="product-price-line"><span class="product-price">${formatPrice(salePrice)}</span>${oldPrice > salePrice ? `<del class="product-old-price">${formatPrice(oldPrice)}</del>` : ""}</div>
        <div class="product-card-footer"><span class="stock-label">${available ? `Còn ${product.stock} máy` : "Tạm hết hàng"}</span><button class="button small" type="button" data-add-product="${escapeHtml(product._id)}" ${available ? "" : "disabled"}>Thêm giỏ</button></div>
      </div>
    </article>`;
  }
  async function loadProducts() {
    grid.innerHTML = '<div class="empty-state">Đang tải danh sách điện thoại...</div>';
    try {
      const result = await PhoneAPI.getProducts(getFilters());
      state.totalPages = Math.max(1, result.pagination.pages);
      $("#result-count").textContent = `${result.pagination.total} sản phẩm`;
      grid.innerHTML = result.products.length ? result.products.map(productCard).join("") :
        '<div class="empty-state"><strong>Chưa tìm thấy điện thoại phù hợp</strong>Thử xóa bớt bộ lọc hoặc tìm kiếm với từ khóa khác.</div>';
      renderPagination();
    } catch (error) {
      grid.innerHTML = `<div class="empty-state"><strong>Không tải được sản phẩm</strong>${escapeHtml(error.message)}<br><br>Hãy kiểm tra Backend tại ${escapeHtml(PhoneAPI.baseUrl)}.</div>`;
      $("#result-count").textContent = "Không thể kết nối";
      $("#pagination").innerHTML = "";
    }
  }
  function renderPagination() {
    const pagination = $("#pagination");
    if (state.totalPages <= 1) { pagination.innerHTML = ""; return; }
    pagination.innerHTML = Array.from({ length: state.totalPages }, (_, index) =>
      `<button type="button" data-page="${index + 1}" class="${state.page === index + 1 ? "active" : ""}" aria-label="Trang ${index + 1}">${index + 1}</button>`
    ).join("");
  }
  function addToCart(product, variant) {
    const cart = readCart();
    const key = `${product._id}:${variant._id}`;
    const existing = cart.find((item) => item.key === key);
    if (existing && existing.quantity >= variant.stock) return showToast("Số lượng trong giỏ đã đạt tồn kho hiện tại.", true);
    if (existing) existing.quantity += 1;
    else cart.push({
      key, productId: product._id, variantId: variant._id, name: product.name, brand: product.brand,
      image: variant.image || product.images?.[0] || "", storage: variant.storage, color: variant.color,
      price: variant.price, stock: variant.stock, quantity: 1
    });
    saveCart(cart);
    showToast(`Đã thêm ${product.name} vào giỏ hàng.`);
  }
  async function addById(id) {
    try {
      const { product } = await PhoneAPI.getProduct(id);
      const variant = product.variants.find((item) => item.stock > 0);
      if (!variant) return showToast("Sản phẩm hiện đã hết hàng.", true);
      addToCart(product, variant);
    } catch (error) { showToast(error.message, true); }
  }
  function renderCart() {
    const cart = readCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    $$("[data-cart-count]").forEach((badge) => { badge.textContent = count; });
    const target = $("#cart-items");
    if (!target) return;
    target.innerHTML = cart.length ? cart.map((item) => `
      <div class="cart-row">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
        <div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.storage)} · ${escapeHtml(item.color)}</p><strong>${formatPrice(item.price)}</strong>
          <div class="qty-control"><button type="button" data-qty="-1" data-key="${escapeHtml(item.key)}" aria-label="Giảm số lượng">−</button><span>${item.quantity}</span><button type="button" data-qty="1" data-key="${escapeHtml(item.key)}" aria-label="Tăng số lượng" ${item.quantity >= item.stock ? "disabled" : ""}>+</button></div>
        </div>
        <button class="remove-cart" type="button" data-remove="${escapeHtml(item.key)}" aria-label="Xóa ${escapeHtml(item.name)}">×</button>
      </div>`).join("") : '<div class="empty-state"><strong>Giỏ hàng đang trống</strong>Chọn chiếc điện thoại phù hợp với bạn nhé.</div>';
    $("#cart-total").textContent = formatPrice(cart.reduce((total, item) => total + item.price * item.quantity, 0));
    $("#checkout-form").classList.toggle("hidden", cart.length === 0);
  }
  function setDeliveryFields() {
    const pickup = $('input[name="deliveryMethod"]:checked').value === "pickup";
    $("#address-field").classList.toggle("hidden", pickup);
    $("#customer-address").required = !pickup;
  }

  $("#product-grid").addEventListener("click", (event) => {
    const favorite = event.target.closest(".product-favorite");
    if (favorite) {
      event.preventDefault();
      favorite.classList.toggle("is-selected");
      return;
    }
    const addButton = event.target.closest("[data-add-product]");
    if (addButton) { event.preventDefault(); addById(addButton.dataset.addProduct); }
  });
  $("#pagination").addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (button) { state.page = Number(button.dataset.page); loadProducts(); }
  });
  $("#search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    state.search = $("#search-input").value.trim();
    state.page = 1;
    loadProducts();
  });
  $("#search-input").addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => {
      state.search = $("#search-input").value.trim();
      state.page = 1;
      loadProducts();
    }, 350);
  });
  $$('.filter-panel input[type="checkbox"]').forEach((input) => input.addEventListener("change", () => { state.page = 1; loadProducts(); }));
  $("#apply-price").addEventListener("click", () => { state.page = 1; loadProducts(); });
  $("#sort-select").addEventListener("change", () => { state.page = 1; loadProducts(); });
  $("#clear-filters").addEventListener("click", () => {
    $$('.filter-panel input[type="checkbox"]').forEach((input) => { input.checked = false; });
    $("#min-price").value = "";
    $("#max-price").value = "";
    $("#sort-select").value = "";
    state.search = "";
    $("#search-input").value = "";
    state.page = 1;
    loadProducts();
  });
  $$("[data-brand-filter]").forEach((link) => link.addEventListener("click", () => {
    const brand = link.dataset.brandFilter;
    $$('.filter-panel input[name="brand"]').forEach((input) => { input.checked = input.value === brand; });
    state.page = 1;
    loadProducts();
  }));
  $$("[data-brand-jump]").forEach((link) => link.addEventListener("click", () => {
    const brand = link.dataset.brandJump;
    $$('.filter-panel input[name="brand"]').forEach((input) => { input.checked = input.value === brand; });
    loadProducts();
  }));
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-open-cart]")) { event.preventDefault(); $("#cart-overlay").classList.add("is-open"); $("#cart-overlay").setAttribute("aria-hidden", "false"); }
    if (event.target.closest("[data-close-cart]") || event.target === $("#cart-overlay")) { $("#cart-overlay").classList.remove("is-open"); $("#cart-overlay").setAttribute("aria-hidden", "true"); }
    const quantity = event.target.closest("[data-qty]");
    if (quantity) {
      const cart = readCart();
      const item = cart.find((entry) => entry.key === quantity.dataset.key);
      if (item) {
        item.quantity += Number(quantity.dataset.qty);
        if (item.quantity <= 0) saveCart(cart.filter((entry) => entry.key !== item.key));
        else if (item.quantity <= item.stock) saveCart(cart);
      }
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) saveCart(readCart().filter((item) => item.key !== remove.dataset.remove));
  });
  $$('input[name="deliveryMethod"]').forEach((input) => input.addEventListener("change", setDeliveryFields));
  $("#checkout-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const cart = readCart();
    if (!cart.length) return showToast("Giỏ hàng của bạn đang trống.", true);
    const form = new FormData(event.currentTarget);
    const order = {
      customer: { name: form.get("name"), phone: form.get("phone"), email: form.get("email"), address: form.get("address") },
      items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
      deliveryMethod: form.get("deliveryMethod"),
      paymentMethod: form.get("paymentMethod")
    };
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Đang tạo đơn hàng...";
    try {
      const result = await PhoneAPI.createOrder(order);
      saveCart([]);
      event.currentTarget.reset();
      setDeliveryFields();
      $("#cart-overlay").classList.remove("is-open");
      showToast(`Đặt hàng thành công · Mã đơn ${result.order._id.slice(-8).toUpperCase()}.`);
      loadProducts();
    } catch (error) { showToast(error.message, true); }
    finally { submit.disabled = false; submit.textContent = "Đặt hàng ngay"; }
  });
  $(".mobile-menu").addEventListener("click", (event) => {
    const nav = $(".header-nav");
    const open = nav.classList.toggle("is-open");
    event.currentTarget.setAttribute("aria-expanded", String(open));
  });
  const slides = $$(".hero-slide");
  const dots = $$(".hero-dots button");
  let activeSlide = 0;
  const setSlide = (index) => {
    activeSlide = index;
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === index));
  };
  dots.forEach((dot, index) => dot.addEventListener("click", () => setSlide(index)));
  setInterval(() => setSlide((activeSlide + 1) % slides.length), 6000);
  const initialSearch = new URLSearchParams(location.search).get("search");
  if (initialSearch) {
    state.search = initialSearch;
    $("#search-input").value = initialSearch;
  }
  if (location.hash === "#cart") {
    $("#cart-overlay").classList.add("is-open");
    $("#cart-overlay").setAttribute("aria-hidden", "false");
  }
  renderCart();
  setDeliveryFields();
  loadProducts();
})();

