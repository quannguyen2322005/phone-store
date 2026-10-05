(() => {
  const baseUrl = (window.PHONE_STORE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const token = localStorage.getItem("quannguyenmobile-admin-token");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    let result;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error(`API trả về dữ liệu không hợp lệ (HTTP ${response.status}).`);
    }
    if (!response.ok) throw new Error(result.message || `Yêu cầu thất bại (HTTP ${response.status}).`);
    return result;
  }

  const queryString = (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.set(key, value);
    });
    const serialized = query.toString();
    return serialized ? `?${serialized}` : "";
  };

  window.PhoneAPI = {
    baseUrl,
    getProducts(params = {}) { return request(`/products${queryString(params)}`); },
    getProduct(id) { return request(`/products/${encodeURIComponent(id)}`); },
    createOrder(order) { return request("/orders", { method: "POST", body: JSON.stringify(order) }); },
    login(credentials) { return request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }); },
    getOverview() { return request("/admin/overview"); },
    getOrders(params = {}) { return request(`/orders${queryString(params)}`); },
    updateOrderStatus(id, status) { return request(`/orders/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); },
    createProduct(product) { return request("/products", { method: "POST", body: JSON.stringify(product) }); },
    updateProduct(id, product) { return request(`/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(product) }); },
    deleteProduct(id) { return request(`/products/${encodeURIComponent(id)}`, { method: "DELETE" }); },
    seedProducts() { return request("/products/seed", { method: "POST", body: "{}" }); }
  };
})();
