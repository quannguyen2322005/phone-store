(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const panel = $("#admin-panel");
  const modal = $("#product-modal");
  let activeTab = "products";
  let products = [];
  let orders = [];

  const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const statusNames = { pending: "Chá» xÃ¡c nháº­n", shipping: "Äang giao", completed: "ÄÃ£ hoÃ n thÃ nh", cancelled: "ÄÃ£ há»§y" };

  function showToast(message, isError = false) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("is-visible");
    setTimeout(() => toast.classList.remove("is-visible"), 3300);
  }
  function showDashboard() {
    $("#login-card").classList.add("hidden");
    $("#dashboard").classList.remove("hidden");
  }
  function showLogin() {
    $("#dashboard").classList.add("hidden");
    $("#login-card").classList.remove("hidden");
  }
  function applyOverview(data) {
    $("#stat-revenue").textContent = money(data.revenue);
    $("#stat-orders").textContent = data.newOrders;
    $("#stat-stock").textContent = data.lowStock;
    $("#stat-products").textContent = data.productCount;
  }
  async function refreshOverview() {
    applyOverview(await PhoneAPI.getOverview());
  }
  async function loadProducts() {
    const result = await PhoneAPI.getProducts({ limit: 48, sort: "newest" });
    products = result.products;
    panel.innerHTML = `<div class="panel-toolbar"><h2>Danh sÃ¡ch sáº£n pháº©m (${result.pagination.total})</h2><div style="display:flex;gap:7px"><button type="button" class="button secondary small" id="seed-button">ThÃªm dá»¯ liá»‡u máº«u</button><button type="button" class="button small" id="new-product-button">+ ThÃªm sáº£n pháº©m</button></div></div>
      <div class="table-wrap"><table class="admin-table"><thead><tr><th>Sáº¢N PHáº¨M</th><th>GIÃ BÃN</th><th>RAM / ROM</th><th>Tá»’N KHO</th><th>THAO TÃC</th></tr></thead>
      <tbody>${products.map((product) => {
        const variant = product.variants?.[0];
        const image = variant?.image || product.images?.[0] || "";
        const low = product.stock <= 5;
        return `<tr><td><div class="table-product"><img src="${escapeHtml(image)}" alt=""><div><strong>${escapeHtml(product.name)}</strong><div style="margin-top:4px;color:#8994a3;font-size:9px">${escapeHtml(product.brand)}</div></div></div></td>
          <td>${money(variant?.price ?? product.salePrice)}</td><td>${escapeHtml(product.specs?.ram || "â€”")} / ${escapeHtml(variant?.storage || "â€”")}</td>
          <td class="${low ? "inventory-low" : ""}">${product.stock} mÃ¡y</td><td><div class="table-actions">
            <button class="icon-action" type="button" data-edit-product="${escapeHtml(product._id)}" aria-label="Sá»­a sáº£n pháº©m"><svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"></path></svg></button>
            <button class="icon-action" type="button" data-delete-product="${escapeHtml(product._id)}" aria-label="XÃ³a sáº£n pháº©m"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"></path></svg></button>
          </div></td></tr>`;
      }).join("") || '<tr><td colspan="5" style="text-align:center;padding:28px">ChÆ°a cÃ³ sáº£n pháº©m nÃ o. ThÃªm sáº£n pháº©m hoáº·c táº¡o dá»¯ liá»‡u máº«u.</td></tr>'}</tbody></table></div>`;
  }
  async function loadOrders() {
    const result = await PhoneAPI.getOrders({ limit: 100 });
    orders = result.orders;
    panel.innerHTML = `<div class="panel-toolbar"><h2>ÄÆ¡n hÃ ng (${result.pagination.total})</h2><button type="button" class="button secondary small" id="refresh-orders">LÃ m má»›i</button></div>
      <div class="table-wrap"><table class="admin-table"><thead><tr><th>MÃƒ ÄÆ N</th><th>KHÃCH HÃ€NG</th><th>Sáº¢N PHáº¨M</th><th>Tá»”NG TIá»€N</th><th>THANH TOÃN</th><th>TRáº NG THÃI</th></tr></thead>
      <tbody>${orders.map((order) => `<tr><td><strong>#${escapeHtml(order._id.slice(-8).toUpperCase())}</strong><div style="margin-top:4px;color:#8994a3;font-size:9px">${new Date(order.createdAt).toLocaleString("vi-VN")}</div></td>
        <td><strong>${escapeHtml(order.customer.name)}</strong><div style="margin-top:4px;color:#8994a3;font-size:9px">${escapeHtml(order.customer.phone)}</div><div style="margin-top:3px;color:#8994a3;font-size:9px">${escapeHtml(order.deliveryMethod === "pickup" ? "Nháº­n táº¡i cá»­a hÃ ng" : order.customer.address)}</div></td>
        <td>${order.items.map((item) => `${escapeHtml(item.productName)} Ã— ${item.quantity}<div style="color:#8994a3;font-size:9px">${escapeHtml(item.storage)} Â· ${escapeHtml(item.color)}</div>`).join("<br>")}</td>
        <td><strong>${money(order.total)}</strong></td><td>${escapeHtml(order.paymentMethod)}<div style="margin-top:4px;color:#8994a3;font-size:9px">${escapeHtml(order.paymentStatus === "paid" ? "ÄÃ£ thanh toÃ¡n" : "ChÆ°a thanh toÃ¡n")}</div></td>
        <td><select class="sort-select" data-order-status="${escapeHtml(order._id)}" ${order.status === "cancelled" ? "disabled" : ""} aria-label="Tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng"><option value="pending" ${order.status === "pending" ? "selected" : ""}>Chá» xÃ¡c nháº­n</option><option value="shipping" ${order.status === "shipping" ? "selected" : ""}>Äang giao</option><option value="completed" ${order.status === "completed" ? "selected" : ""}>ÄÃ£ hoÃ n thÃ nh</option><option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>ÄÃ£ há»§y</option></select><span class="status-pill ${escapeHtml(order.status)}" style="margin-top:5px">${statusNames[order.status] || escapeHtml(order.status)}</span></td>
      </tr>`).join("") || '<tr><td colspan="6" style="text-align:center;padding:28px">ChÆ°a cÃ³ Ä‘Æ¡n hÃ ng.</td></tr>'}</tbody></table></div>`;
  }
  async function loadTab() {
    panel.innerHTML = '<div class="empty-state">Äang táº£i dá»¯ liá»‡u...</div>';
    try {
      if (activeTab === "products") await loadProducts();
      else await loadOrders();
    } catch (error) { showToast(error.message, true); panel.innerHTML = `<div class="empty-state"><strong>KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u</strong>${escapeHtml(error.message)}</div>`; }
  }
  function openProductModal(product) {
    const form = $("#product-form");
    form.reset();
    form.elements.namedItem("id").value = product?._id || "";
    $("#modal-title").textContent = product ? "Cáº­p nháº­t sáº£n pháº©m" : "ThÃªm sáº£n pháº©m má»›i";
    if (product) {
      form.elements.namedItem("name").value = product.name;
      form.elements.namedItem("brand").value = product.brand;
      form.elements.namedItem("originalPrice").value = product.originalPrice;
      form.elements.namedItem("salePrice").value = product.salePrice;
      form.elements.namedItem("images").value = (product.images || []).join("\n");
      form.elements.namedItem("specs").value = JSON.stringify(product.specs || {}, null, 2);
      form.elements.namedItem("variants").value = JSON.stringify(product.variants || [], null, 2);
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }
  function closeProductModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }
  function parseJsonField(raw, label) {
    try { return JSON.parse(raw); }
    catch (error) { throw new Error(`${label} pháº£i lÃ  JSON há»£p lá»‡.`); }
  }
  function productPayload(form) {
    const data = new FormData(form);
    const images = String(data.get("images") || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    const specs = parseJsonField(data.get("specs"), "ThÃ´ng sá»‘");
    const variants = parseJsonField(data.get("variants"), "PhiÃªn báº£n");
    if (!Array.isArray(variants) || variants.length === 0) throw new Error("PhiÃªn báº£n pháº£i lÃ  má»™t danh sÃ¡ch khÃ´ng rá»—ng.");
    return {
      name: data.get("name").trim(),
      brand: data.get("brand"),
      category: "Smartphone",
      originalPrice: Number(data.get("originalPrice")),
      salePrice: Number(data.get("salePrice")),
      images,
      specs,
      variants
    };
  }
  async function initializeDashboard() {
    try {
      const overview = await PhoneAPI.getOverview();
      showDashboard();
      applyOverview(overview);
      await loadTab();
    } catch (error) {
      if (localStorage.getItem("quannguyenmobile-admin-token")) localStorage.removeItem("quannguyenmobile-admin-token");
      showLogin();
    }
  }

  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const result = await PhoneAPI.login({ email: form.get("email"), password: form.get("password") });
      if (result.user.role !== "admin") throw new Error("TÃ i khoáº£n nÃ y khÃ´ng cÃ³ quyá»n quáº£n trá»‹.");
      localStorage.setItem("quannguyenmobile-admin-token", result.token);
      showDashboard();
      await refreshOverview();
      await loadTab();
    } catch (error) { localStorage.removeItem("quannguyenmobile-admin-token"); showToast(error.message, true); }
    finally { submit.disabled = false; }
  });
  $("#logout-button").addEventListener("click", () => {
    localStorage.removeItem("quannguyenmobile-admin-token");
    showLogin();
  });
  $$(".admin-tabs button").forEach((button) => button.addEventListener("click", () => {
    activeTab = button.dataset.tab;
    $$(".admin-tabs button").forEach((tab) => tab.classList.toggle("active", tab === button));
    loadTab();
  }));
  panel.addEventListener("click", async (event) => {
    if (event.target.closest("#new-product-button")) openProductModal();
    if (event.target.closest("#refresh-orders")) {
      await Promise.all([loadOrders(), refreshOverview()]);
    }
    const editButton = event.target.closest("[data-edit-product]");
    if (editButton) openProductModal(products.find((product) => product._id === editButton.dataset.editProduct));
    const deleteButton = event.target.closest("[data-delete-product]");
    if (deleteButton) {
      const product = products.find((item) => item._id === deleteButton.dataset.deleteProduct);
      if (!product || !confirm(`XÃ³a sáº£n pháº©m "${product.name}"?`)) return;
      try {
        await PhoneAPI.deleteProduct(product._id);
        showToast("ÄÃ£ xÃ³a sáº£n pháº©m.");
        await Promise.all([loadProducts(), refreshOverview()]);
      } catch (error) { showToast(error.message, true); }
    }
    if (event.target.closest("#seed-button")) {
      try {
        const result = await PhoneAPI.seedProducts();
        showToast(result.message);
        await Promise.all([loadProducts(), refreshOverview()]);
      } catch (error) { showToast(error.message, true); }
    }
  });
  panel.addEventListener("change", async (event) => {
    const select = event.target.closest("[data-order-status]");
    if (!select) return;
    select.disabled = true;
    try {
      await PhoneAPI.updateOrderStatus(select.dataset.orderStatus, select.value);
      showToast("ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng.");
      await Promise.all([loadOrders(), refreshOverview()]);
    } catch (error) {
      showToast(error.message, true);
      await loadOrders();
    }
  });
  $("#product-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const payload = productPayload(form);
      const id = form.elements.namedItem("id").value;
      if (id) await PhoneAPI.updateProduct(id, payload);
      else await PhoneAPI.createProduct(payload);
      closeProductModal();
      showToast(id ? "ÄÃ£ cáº­p nháº­t sáº£n pháº©m." : "ÄÃ£ thÃªm sáº£n pháº©m.");
      await Promise.all([loadProducts(), refreshOverview()]);
    } catch (error) { showToast(error.message, true); }
    finally { submit.disabled = false; }
  });
  $$("[data-close-modal]").forEach((button) => button.addEventListener("click", closeProductModal));
  modal.addEventListener("click", (event) => { if (event.target === modal) closeProductModal(); });
  initializeDashboard();
})();

