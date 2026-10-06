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
  const statusNames = { pending: "Chờ xác nhận", shipping: "Đang giao", completed: "Đã hoàn thành", cancelled: "Đã hủy" };

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
    panel.innerHTML = `<div class="panel-toolbar"><h2>Danh sách sản phẩm (${result.pagination.total})</h2><div style="display:flex;gap:7px"><button type="button" class="button secondary small" id="seed-button">Thêm dữ liệu mẫu</button><button type="button" class="button small" id="new-product-button">+ Thêm sản phẩm</button></div></div>
      <div class="table-wrap"><table class="admin-table"><thead><tr><th>SẢN PHẨM</th><th>GIÁ BÁN</th><th>RAM / ROM</th><th>TỒN KHO</th><th>THAO TÁC</th></tr></thead>
      <tbody>${products.map((product) => {
        const variant = product.variants?.[0];
        const image = variant?.image || product.images?.[0] || "";
        const low = product.stock <= 5;
        return `<tr><td><div class="table-product"><img src="${escapeHtml(image)}" alt=""><div><strong>${escapeHtml(product.name)}</strong><div style="margin-top:4px;color:#8994a3;font-size:9px">${escapeHtml(product.brand)}</div></div></div></td>
          <td>${money(variant?.price ?? product.salePrice)}</td><td>${escapeHtml(product.specs?.ram || "—")} / ${escapeHtml(variant?.storage || "—")}</td>
          <td class="${low ? "inventory-low" : ""}">${product.stock} máy</td><td><div class="table-actions">
            <button class="icon-action" type="button" data-edit-product="${escapeHtml(product._id)}" aria-label="Sửa sản phẩm"><svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"></path></svg></button>
            <button class="icon-action" type="button" data-delete-product="${escapeHtml(product._id)}" aria-label="Xóa sản phẩm"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"></path></svg></button>
          </div></td></tr>`;
      }).join("") || '<tr><td colspan="5" style="text-align:center;padding:28px">Chưa có sản phẩm nào. Thêm sản phẩm hoặc tạo dữ liệu mẫu.</td></tr>'}</tbody></table></div>`;
  }
  async function loadOrders() {
    const result = await PhoneAPI.getOrders({ limit: 100 });
    orders = result.orders;
    panel.innerHTML = `<div class="panel-toolbar"><h2>Đơn hàng (${result.pagination.total})</h2><button type="button" class="button secondary small" id="refresh-orders">Làm mới</button></div>
      <div class="table-wrap"><table class="admin-table"><thead><tr><th>MÃ ĐƠN</th><th>KHÁCH HÀNG</th><th>SẢN PHẨM</th><th>TỔNG TIỀN</th><th>THANH TOÁN</th><th>TRẠNG THÁI</th></tr></thead>
      <tbody>${orders.map((order) => `<tr><td><strong>#${escapeHtml(order._id.slice(-8).toUpperCase())}</strong><div style="margin-top:4px;color:#8994a3;font-size:9px">${new Date(order.createdAt).toLocaleString("vi-VN")}</div></td>
        <td><strong>${escapeHtml(order.customer.name)}</strong><div style="margin-top:4px;color:#8994a3;font-size:9px">${escapeHtml(order.customer.phone)}</div><div style="margin-top:3px;color:#8994a3;font-size:9px">${escapeHtml(order.deliveryMethod === "pickup" ? "Nhận tại cửa hàng" : order.customer.address)}</div></td>
        <td>${order.items.map((item) => `${escapeHtml(item.productName)} × ${item.quantity}<div style="color:#8994a3;font-size:9px">${escapeHtml(item.storage)} · ${escapeHtml(item.color)}</div>`).join("<br>")}</td>
        <td><strong>${money(order.total)}</strong></td><td>${escapeHtml(order.paymentMethod)}<div style="margin-top:4px;color:#8994a3;font-size:9px">${escapeHtml(order.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán")}</div></td>
        <td><select class="sort-select" data-order-status="${escapeHtml(order._id)}" ${order.status === "cancelled" ? "disabled" : ""} aria-label="Trạng thái đơn hàng"><option value="pending" ${order.status === "pending" ? "selected" : ""}>Chờ xác nhận</option><option value="shipping" ${order.status === "shipping" ? "selected" : ""}>Đang giao</option><option value="completed" ${order.status === "completed" ? "selected" : ""}>Đã hoàn thành</option><option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>Đã hủy</option></select><span class="status-pill ${escapeHtml(order.status)}" style="margin-top:5px">${statusNames[order.status] || escapeHtml(order.status)}</span></td>
      </tr>`).join("") || '<tr><td colspan="6" style="text-align:center;padding:28px">Chưa có đơn hàng.</td></tr>'}</tbody></table></div>`;
  }
  async function loadTab() {
    panel.innerHTML = '<div class="empty-state">Đang tải dữ liệu...</div>';
    try {
      if (activeTab === "products") await loadProducts();
      else await loadOrders();
    } catch (error) { showToast(error.message, true); panel.innerHTML = `<div class="empty-state"><strong>Không tải được dữ liệu</strong>${escapeHtml(error.message)}</div>`; }
  }
  function openProductModal(product) {
    const form = $("#product-form");
    form.reset();
    form.elements.namedItem("id").value = product?._id || "";
    $("#modal-title").textContent = product ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới";
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
    catch (error) { throw new Error(`${label} phải là JSON hợp lệ.`); }
  }
  function productPayload(form) {
    const data = new FormData(form);
    const images = String(data.get("images") || "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    const specs = parseJsonField(data.get("specs"), "Thông số");
    const variants = parseJsonField(data.get("variants"), "Phiên bản");
    if (!Array.isArray(variants) || variants.length === 0) throw new Error("Phiên bản phải là một danh sách không rỗng.");
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
      if (result.user.role !== "admin") throw new Error("Tài khoản này không có quyền quản trị.");
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
      if (!product || !confirm(`Xóa sản phẩm "${product.name}"?`)) return;
      try {
        await PhoneAPI.deleteProduct(product._id);
        showToast("Đã xóa sản phẩm.");
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
      showToast("Đã cập nhật trạng thái đơn hàng.");
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
      showToast(id ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm.");
      await Promise.all([loadProducts(), refreshOverview()]);
    } catch (error) { showToast(error.message, true); }
    finally { submit.disabled = false; }
  });
  $$("[data-close-modal]").forEach((button) => button.addEventListener("click", closeProductModal));
  modal.addEventListener("click", (event) => { if (event.target === modal) closeProductModal(); });
  initializeDashboard();
})();

