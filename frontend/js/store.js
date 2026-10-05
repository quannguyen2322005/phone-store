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
      console.error("KhÃ´ng thá»ƒ Ä‘á»c giá» hÃ ng Ä‘Ã£ lÆ°u:", error);
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
        ${product.featured ? '<span class="product-badge">Ná»•i báº­t</span>' : ""}
        <button class="product-favorite" type="button" aria-label="Sáº£n pháº©m yÃªu thÃ­ch"><svg viewBox="0 0 24 24"><path d="M20.8 8.6c0 5.2-8.8 10.4-8.8 10.4S3.2 13.8 3.2 8.6A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.2Z"></path></svg></button>
      </a>
      <div class="product-content">
        <div class="product-brand">${escapeHtml(product.brand)}</div>
        <h3 title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</h3>
        <div class="product-spec-line"><span>${escapeHtml(product.specs?.ram || "â€”")} RAM</span><span>${escapeHtml(firstVariant?.storage || "Nhiá»u phiÃªn báº£n")}</span></div>
        <div class="product-price-line"><span class="product-price">${formatPrice(salePrice)}</span>${oldPrice > salePrice ? `<del class="product-old-price">${formatPrice(oldPrice)}</del>` : ""}</div>
        <div class="product-card-footer"><span class="stock-label">${available ? `CÃ²n ${product.stock} mÃ¡y` : "Táº¡m háº¿t hÃ ng"}</span><button class="button small" type="button" data-add-product="${escapeHtml(product._id)}" ${available ? "" : "disabled"}>ThÃªm giá»</button></div>
      </div>
    </article>`;
  }
  async function loadProducts() {
    grid.innerHTML = '<div class="empty-state">Äang táº£i danh sÃ¡ch Ä‘iá»‡n thoáº¡i...</div>';
    try {
      const result = await PhoneAPI.getProducts(getFilters());
      state.totalPages = Math.max(1, result.pagination.pages);
      $("#result-count").textContent = `${result.pagination.total} sáº£n pháº©m`;
      grid.innerHTML = result.products.length ? result.products.map(productCard).join("") :
        '<div class="empty-state"><strong>ChÆ°a tÃ¬m tháº¥y Ä‘iá»‡n thoáº¡i phÃ¹ há»£p</strong>Thá»­ xÃ³a bá»›t bá»™ lá»c hoáº·c tÃ¬m kiáº¿m vá»›i tá»« khÃ³a khÃ¡c.</div>';
      renderPagination();
    } catch (error) {
      grid.innerHTML = `<div class="empty-state"><strong>KhÃ´ng táº£i Ä‘Æ°á»£c sáº£n pháº©m</strong>${escapeHtml(error.message)}<br><br>HÃ£y kiá»ƒm tra Backend táº¡i ${escapeHtml(PhoneAPI.baseUrl)}.</div>`;
      $("#result-count").textContent = "KhÃ´ng thá»ƒ káº¿t ná»‘i";
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
    if (existing && existing.quantity >= variant.stock) return showToast("Sá»‘ lÆ°á»£ng trong giá» Ä‘Ã£ Ä‘áº¡t tá»“n kho hiá»‡n táº¡i.", true);
    if (existing) existing.quantity += 1;
    else cart.push({
      key, productId: product._id, variantId: variant._id, name: product.name, brand: product.brand,
      image: variant.image || product.images?.[0] || "", storage: variant.storage, color: variant.color,
      price: variant.price, stock: variant.stock, quantity: 1
    });
    saveCart(cart);
    showToast(`ÄÃ£ thÃªm ${product.name} vÃ o giá» hÃ ng.`);
  }
  async function addById(id) {
    try {
      const { product } = await PhoneAPI.getProduct(id);
      const variant = product.variants.find((item) => item.stock > 0);
      if (!variant) return showToast("Sáº£n pháº©m hiá»‡n Ä‘Ã£ háº¿t hÃ ng.", true);
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
        <div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.storage)} Â· ${escapeHtml(item.color)}</p><strong>${formatPrice(item.price)}</strong>
          <div class="qty-control"><button type="button" data-qty="-1" data-key="${escapeHtml(item.key)}" aria-label="Giáº£m sá»‘ lÆ°á»£ng">âˆ’</button><span>${item.quantity}</span><button type="button" data-qty="1" data-key="${escapeHtml(item.key)}" aria-label="TÄƒng sá»‘ lÆ°á»£ng" ${item.quantity >= item.stock ? "disabled" : ""}>+</button></div>
        </div>
        <button class="remove-cart" type="button" data-remove="${escapeHtml(item.key)}" aria-label="XÃ³a ${escapeHtml(item.name)}">Ã—</button>
      </div>`).join("") : '<div class="empty-state"><strong>Giá» hÃ ng Ä‘ang trá»‘ng</strong>Chá»n chiáº¿c Ä‘iá»‡n thoáº¡i phÃ¹ há»£p vá»›i báº¡n nhÃ©.</div>';
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
    if (!cart.length) return showToast("Giá» hÃ ng cá»§a báº¡n Ä‘ang trá»‘ng.", true);
    const form = new FormData(event.currentTarget);
    const order = {
      customer: { name: form.get("name"), phone: form.get("phone"), email: form.get("email"), address: form.get("address") },
      items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
      deliveryMethod: form.get("deliveryMethod"),
      paymentMethod: form.get("paymentMethod")
    };
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Äang táº¡o Ä‘Æ¡n hÃ ng...";
    try {
      const result = await PhoneAPI.createOrder(order);
      saveCart([]);
      event.currentTarget.reset();
      setDeliveryFields();
      $("#cart-overlay").classList.remove("is-open");
      showToast(`Äáº·t hÃ ng thÃ nh cÃ´ng Â· MÃ£ Ä‘Æ¡n ${result.order._id.slice(-8).toUpperCase()}.`);
      loadProducts();
    } catch (error) { showToast(error.message, true); }
    finally { submit.disabled = false; submit.textContent = "Äáº·t hÃ ng ngay"; }
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

