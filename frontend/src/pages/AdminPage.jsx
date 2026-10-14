// Trang quản trị dùng Mantine. File này được tải riêng (React.lazy) nên khách mua hàng không phải tải Mantine.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert, Badge, Box, Button, ColorInput, Container, Group, Loader, MantineProvider, Modal, NumberInput,
  Pagination, Paper, PasswordInput, Select, SimpleGrid, Stack, Switch, Table, Tabs, Text, TextInput,
  Textarea, Title, createTheme
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Notifications, notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { api } from "../api.js";
import { money } from "../format.js";

const TOKEN_KEY = "quannguyenmobile-admin-token";
const PAGE_SIZE = 20;
const BRAND_OPTIONS = [
  { value: "APPLE", label: "Apple / iPhone" }, { value: "SAMSUNG", label: "Samsung" },
  { value: "XIAOMI", label: "Xiaomi" }, { value: "OPPO", label: "OPPO" },
  { value: "ONEPLUS", label: "OnePlus" }, { value: "VIVO", label: "vivo" },
  { value: "GOOGLE", label: "Google Pixel" }
];
const STATUS_OPTIONS = [
  { value: "pending", label: "Chờ xác nhận" }, { value: "shipping", label: "Đang giao" },
  { value: "completed", label: "Đã hoàn thành" }, { value: "cancelled", label: "Đã hủy" }
];
const STATUS_COLORS = { pending: "yellow", shipping: "blue", completed: "green", cancelled: "red" };
const SPEC_FIELDS = [
  ["screen", "Màn hình"], ["chip", "Vi xử lý"], ["ram", "RAM"], ["battery", "Pin"], ["camera", "Camera"]
];
const theme = createTheme({ fontFamily: "\"DM Sans\", sans-serif", primaryColor: "blue", defaultRadius: "md" });

const notify = (message, error = false) => notifications.show({ message, color: error ? "red" : "teal", autoClose: 3500 });

let variantKeyCounter = 0;
const newVariant = () => ({
  key: ++variantKeyCounter, storage: "256GB", color: "Đen", colorHex: "#333333", price: 0, originalPrice: 0, stock: 1
});

function toForm(product) {
  if (!product) {
    return {
      name: "", brand: "APPLE", description: "", featured: false, images: "",
      specs: { screen: "", chip: "", ram: "", battery: "", camera: "" }, variants: [newVariant()]
    };
  }
  return {
    name: product.name, brand: product.brand, description: product.description || "", featured: Boolean(product.featured),
    images: (product.images || []).join("\n"),
    specs: Object.fromEntries(SPEC_FIELDS.map(([key]) => [key, product.specs?.[key] || ""])),
    // Giữ nguyên _id và ảnh của từng phiên bản: đơn hàng cũ tham chiếu theo _id này (dùng khi hủy đơn để hoàn kho).
    variants: (product.variants || []).map((variant) => ({
      key: ++variantKeyCounter, _id: variant._id, storage: variant.storage, color: variant.color,
      colorHex: variant.colorHex || "#d9d9d9", price: variant.price, originalPrice: variant.originalPrice,
      stock: variant.stock, image: variant.image || ""
    }))
  };
}

export default function AdminPage() {
  return (
    <MantineProvider theme={theme} forceColorScheme="light">
      <Notifications position="top-right" />
      <AdminApp />
    </MantineProvider>
  );
}

function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const [productPages, setProductPages] = useState(1);
  const [orders, setOrders] = useState([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPages, setOrderPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalProduct, setModalProduct] = useState(undefined); // undefined: đóng, null: thêm mới, object: sửa
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // { title, message, label, onConfirm }

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setOverview(null);
  }, []);

  const refreshOverview = useCallback(async () => {
    try { setOverview(await api.getOverview()); } catch (requestError) { notify(requestError.message, true); }
  }, []);

  const loadProducts = useCallback(async (page) => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getProducts({ page, limit: PAGE_SIZE, sort: "newest" });
      const pages = result.pagination?.pages || 1;
      setProductTotal(result.pagination?.total || 0);
      setProductPages(pages);
      if (page > pages) { setProductPage(pages); return; }
      setProducts(result.products || []);
    } catch (requestError) {
      setError(requestError.message);
      notify(requestError.message, true);
    } finally { setLoading(false); }
  }, []);

  const loadOrders = useCallback(async (page) => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getOrders({ page, limit: PAGE_SIZE });
      const pages = result.pagination?.pages || 1;
      setOrderTotal(result.pagination?.total || 0);
      setOrderPages(pages);
      if (page > pages) { setOrderPage(pages); return; }
      setOrders(result.orders || []);
    } catch (requestError) {
      setError(requestError.message);
      notify(requestError.message, true);
    } finally { setLoading(false); }
  }, []);

  // Token hết hạn hoặc không hợp lệ: tổng quan báo lỗi ngay lần tải đầu nên đăng xuất để đăng nhập lại.
  useEffect(() => {
    if (!token) return;
    api.getOverview().then(setOverview).catch((requestError) => {
      logout();
      notify(requestError.message, true);
    });
  }, [token, logout]);
  useEffect(() => { if (token && tab === "products") loadProducts(productPage); }, [token, tab, productPage, loadProducts]);
  useEffect(() => { if (token && tab === "orders") loadOrders(orderPage); }, [token, tab, orderPage, loadOrders]);

  const reload = () => Promise.all([tab === "products" ? loadProducts(productPage) : loadOrders(orderPage), refreshOverview()]);

  async function saveProduct(payload, id) {
    setSaving(true);
    try {
      if (id) await api.updateProduct(id, payload);
      else await api.createProduct(payload);
      setModalProduct(undefined);
      notify(id ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm.");
      await reload();
    } catch (requestError) { notify(requestError.message, true); } finally { setSaving(false); }
  }
  function askRemoveProduct(product) {
    setConfirm({
      title: "Xóa sản phẩm", label: "Xóa", message: `Xóa sản phẩm "${product.name}"? Không thể hoàn tác.`,
      onConfirm: async () => {
        try {
          await api.deleteProduct(product._id);
          notify("Đã xóa sản phẩm.");
          await reload();
        } catch (requestError) { notify(requestError.message, true); }
      }
    });
  }
  async function seedProducts() {
    try {
      const result = await api.seedProducts();
      notify(result.message);
      await reload();
    } catch (requestError) { notify(requestError.message, true); }
  }
  async function applyOrderStatus(id, status) {
    try {
      await api.updateOrderStatus(id, status);
      notify("Đã cập nhật trạng thái đơn hàng.");
    } catch (requestError) { notify(requestError.message, true); }
    await reload();
  }
  function changeOrderStatus(order, status) {
    if (!status || status === order.status) return;
    if (status === "cancelled") {
      setConfirm({
        title: "Hủy đơn hàng", label: "Hủy đơn",
        message: `Hủy đơn #${order._id.slice(-8).toUpperCase()}? Số lượng trong đơn sẽ được cộng lại vào kho và không thể mở lại đơn.`,
        onConfirm: () => applyOrderStatus(order._id, status)
      });
      return;
    }
    applyOrderStatus(order._id, status);
  }

  return (
    <Box mih="100vh" bg="gray.0" className="admin-ui">
      <Box c="dark.7" py="sm" className="admin-topbar">
        <Container size="xl">
          <Group justify="space-between">
            <Group gap="xs">
              <Text fw={800} size="lg">Quân Nguyễn mobile store</Text>
              <Badge variant="light" color="blue">Quản trị</Badge>
            </Group>
            <Text component={Link} to="/" size="sm" c="gray.3">← Quay lại cửa hàng</Text>
          </Group>
        </Container>
      </Box>
      <Container size="xl" py="lg">
        {!token ? <LoginCard onLoggedIn={setToken} /> : (
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={2}>Tổng quan cửa hàng</Title>
                <Text c="dimmed" size="sm">Quản lý tồn kho và theo dõi đơn hàng.</Text>
              </div>
              <Button variant="default" size="xs" onClick={logout}>Đăng xuất</Button>
            </Group>
            <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
              <StatCard label="Doanh thu (đơn hoàn thành)" value={overview ? money(overview.revenue) : "—"} />
              <StatCard label="Đơn chờ xác nhận" value={overview?.newOrders ?? "—"} />
              <StatCard label="Sắp hết hàng (≤ 5 máy)" value={overview?.lowStock ?? "—"} />
              <StatCard label="Tổng sản phẩm" value={overview?.productCount ?? "—"} />
            </SimpleGrid>
            <Paper withBorder p="md" radius="md">
              <Tabs value={tab} onChange={(value) => { setError(""); setTab(value); }}>
                <Tabs.List mb="md">
                  <Tabs.Tab value="products">Sản phẩm</Tabs.Tab>
                  <Tabs.Tab value="orders">Đơn hàng</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="products">
                  <Group justify="space-between" mb="sm">
                    <Title order={4}>Danh sách sản phẩm ({productTotal})</Title>
                    <Group gap="xs">
                      <Button variant="default" size="xs" onClick={seedProducts}>Thêm dữ liệu mẫu</Button>
                      <Button size="xs" onClick={() => setModalProduct(null)}>+ Thêm sản phẩm</Button>
                    </Group>
                  </Group>
                  <TabState loading={loading} error={error}>
                    <ProductsTable products={products} onEdit={setModalProduct} onDelete={askRemoveProduct} />
                    <Pager page={productPage} pages={productPages} onChange={setProductPage} />
                  </TabState>
                </Tabs.Panel>
                <Tabs.Panel value="orders">
                  <Group justify="space-between" mb="sm">
                    <Title order={4}>Đơn hàng ({orderTotal})</Title>
                    <Button variant="default" size="xs" onClick={reload}>Làm mới</Button>
                  </Group>
                  <TabState loading={loading} error={error}>
                    <OrdersTable orders={orders} onStatus={changeOrderStatus} />
                    <Pager page={orderPage} pages={orderPages} onChange={setOrderPage} />
                  </TabState>
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </Stack>
        )}
      </Container>
      {modalProduct !== undefined && (
        <ProductModal product={modalProduct} saving={saving} onClose={() => setModalProduct(undefined)} onSave={saveProduct} />
      )}
      <ConfirmModal confirm={confirm} onClose={() => setConfirm(null)} />
    </Box>
  );
}

function StatCard({ label, value }) {
  return <Paper withBorder p="md" radius="md"><Text size="sm" c="dimmed">{label}</Text><Text fw={800} size="xl" mt={4}>{value}</Text></Paper>;
}

function TabState({ loading, error, children }) {
  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /><Text c="dimmed" size="sm">Đang tải dữ liệu...</Text></Group>;
  if (error) return <Alert color="red" title="Không tải được dữ liệu">{error}</Alert>;
  return <>{children}</>;
}

function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return <Group justify="center" mt="md"><Pagination total={pages} value={page} onChange={onChange} /></Group>;
}

function LoginCard({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.login({ email, password });
      if (result.user.role !== "admin") throw new Error("Tài khoản này không có quyền quản trị.");
      localStorage.setItem(TOKEN_KEY, result.token);
      onLoggedIn(result.token);
      notify("Đăng nhập quản trị thành công.");
    } catch (requestError) {
      localStorage.removeItem(TOKEN_KEY);
      notify(requestError.message, true);
    } finally { setBusy(false); }
  }
  return (
    <Paper withBorder p="xl" radius="md" maw={420} mx="auto" mt="xl">
      <form onSubmit={submit}>
        <Stack>
          <div>
            <Title order={3}>Đăng nhập quản trị</Title>
            <Text c="dimmed" size="sm">Dùng tài khoản Admin đã cấu hình cho cửa hàng.</Text>
          </div>
          <TextInput label="Email" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
          <PasswordInput label="Mật khẩu" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
          <Button type="submit" loading={busy}>Đăng nhập</Button>
        </Stack>
      </form>
    </Paper>
  );
}

function ProductsTable({ products, onEdit, onDelete }) {
  return (
    <Table.ScrollContainer minWidth={720}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr><Table.Th>Sản phẩm</Table.Th><Table.Th>Giá từ</Table.Th><Table.Th>RAM / Bộ nhớ</Table.Th><Table.Th>Tồn kho</Table.Th><Table.Th /></Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {products.length ? products.map((product) => {
            const storages = [...new Set((product.variants || []).map((variant) => variant.storage))].join(" / ");
            return (
              <Table.Tr key={product._id}>
                <Table.Td><Text fw={600} size="sm">{product.name}</Text><Text size="xs" c="dimmed">{product.brand}</Text></Table.Td>
                <Table.Td>{money(product.salePrice)}</Table.Td>
                <Table.Td>{product.specs?.ram || "—"} / {storages || "—"}</Table.Td>
                <Table.Td><Badge color={product.stock <= 5 ? "red" : "gray"} variant="light">{product.stock} máy</Badge></Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    <Button variant="default" size="compact-sm" onClick={() => onEdit(product)}>Sửa</Button>
                    <Button variant="light" color="red" size="compact-sm" onClick={() => onDelete(product)}>Xóa</Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          }) : <Table.Tr><Table.Td colSpan={5}><Text ta="center" c="dimmed" py="lg">Chưa có sản phẩm nào. Thêm sản phẩm hoặc tạo dữ liệu mẫu.</Text></Table.Td></Table.Tr>}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function OrdersTable({ orders, onStatus }) {
  return (
    <Table.ScrollContainer minWidth={900}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr><Table.Th>Mã đơn</Table.Th><Table.Th>Khách hàng</Table.Th><Table.Th>Sản phẩm</Table.Th><Table.Th>Tổng tiền</Table.Th><Table.Th>Thanh toán</Table.Th><Table.Th>Trạng thái</Table.Th></Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {orders.length ? orders.map((order) => (
            <Table.Tr key={order._id}>
              <Table.Td><Text fw={700} size="sm">#{order._id.slice(-8).toUpperCase()}</Text><Text size="xs" c="dimmed">{new Date(order.createdAt).toLocaleString("vi-VN")}</Text></Table.Td>
              <Table.Td>
                <Text fw={600} size="sm">{order.customer.name}</Text>
                <Text size="xs" c="dimmed">{order.customer.phone}</Text>
                <Text size="xs" c="dimmed">{order.deliveryMethod === "pickup" ? "Nhận tại cửa hàng" : order.customer.address}</Text>
              </Table.Td>
              <Table.Td>{order.items.map((item, index) => (
                <div key={`${item.productName}-${index}`}><Text size="sm">{item.productName} × {item.quantity}</Text><Text size="xs" c="dimmed">{item.storage} · {item.color}</Text></div>
              ))}</Table.Td>
              <Table.Td><Text fw={700} size="sm">{money(order.total)}</Text></Table.Td>
              <Table.Td><Text size="sm">{order.paymentMethod}</Text><Text size="xs" c="dimmed">{order.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}</Text></Table.Td>
              <Table.Td>
                {/* Đơn đã hoàn thành hoặc đã hủy không được đổi trạng thái nữa (quy tắc nghiệp vụ). */}
                {order.status === "completed" || order.status === "cancelled"
                  ? <Badge color={STATUS_COLORS[order.status]}>{STATUS_OPTIONS.find((item) => item.value === order.status)?.label}</Badge>
                  : <Select size="xs" w={150} allowDeselect={false} data={STATUS_OPTIONS} value={order.status} aria-label="Trạng thái đơn hàng" onChange={(value) => onStatus(order, value)} />}
              </Table.Td>
            </Table.Tr>
          )) : <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed" py="lg">Chưa có đơn hàng.</Text></Table.Td></Table.Tr>}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function ConfirmModal({ confirm, onClose }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try { await confirm.onConfirm(); } finally { setBusy(false); onClose(); }
  }
  return (
    <Modal opened={Boolean(confirm)} onClose={onClose} title={confirm?.title} centered>
      <Text size="sm">{confirm?.message}</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose} disabled={busy}>Không</Button>
        <Button color="red" onClick={run} loading={busy}>{confirm?.label}</Button>
      </Group>
    </Modal>
  );
}

function ProductModal({ product, saving, onClose, onSave }) {
  const [form, setForm] = useState(() => toForm(product));
  const isMobile = useMediaQuery("(max-width: 48em)");
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setSpec = (key, value) => setForm((current) => ({ ...current, specs: { ...current.specs, [key]: value } }));
  const setVariant = (key, patch) => setForm((current) => ({
    ...current, variants: current.variants.map((variant) => variant.key === key ? { ...variant, ...patch } : variant)
  }));
  const removeVariant = (key) => setForm((current) => ({ ...current, variants: current.variants.filter((variant) => variant.key !== key) }));

  function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) return notify("Vui lòng nhập tên điện thoại.", true);
    if (!form.variants.length) return notify("Cần ít nhất một phiên bản (dung lượng và màu).", true);
    for (const variant of form.variants) {
      if (!variant.storage.trim() || !variant.color.trim()) return notify("Mỗi phiên bản cần có dung lượng và màu.", true);
      if (!(Number(variant.price) > 0)) return notify(`Phiên bản ${variant.storage} ${variant.color} cần có giá bán lớn hơn 0.`, true);
    }
    const payload = {
      name: form.name.trim(), brand: form.brand, category: "Smartphone", description: form.description.trim(), featured: form.featured,
      images: form.images.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      specs: form.specs,
      variants: form.variants.map(({ key, ...variant }) => ({
        ...variant, storage: variant.storage.trim(), color: variant.color.trim(),
        price: Number(variant.price), originalPrice: Number(variant.originalPrice) || Number(variant.price), stock: Number(variant.stock) || 0
      }))
    };
    return onSave(payload, product?._id);
  }

  return (
    <Modal opened onClose={onClose} title={product ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"} size="xl" fullScreen={isMobile} closeOnClickOutside={false}>
      <form onSubmit={submit}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Tên điện thoại" required maxLength={140} value={form.name} onChange={(event) => setField("name", event.currentTarget.value)} />
            <Select label="Thương hiệu" required allowDeselect={false} data={BRAND_OPTIONS} value={form.brand} onChange={(value) => setField("brand", value)} />
          </SimpleGrid>
          <Textarea label="Mô tả" autosize minRows={2} value={form.description} onChange={(event) => setField("description", event.currentTarget.value)} />
          <Textarea label="Ảnh sản phẩm (mỗi đường dẫn một dòng)" autosize minRows={2} value={form.images} onChange={(event) => setField("images", event.currentTarget.value)} />
          <Switch label="Hiển thị là sản phẩm nổi bật" checked={form.featured} onChange={(event) => setField("featured", event.currentTarget.checked)} />
          <div>
            <Text fw={600} size="sm" mb={6}>Thông số kỹ thuật</Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {SPEC_FIELDS.map(([key, label]) => (
                <TextInput key={key} label={label} value={form.specs[key]} onChange={(event) => setSpec(key, event.currentTarget.value)} />
              ))}
            </SimpleGrid>
          </div>
          <div>
            <Group justify="space-between" mb={6}>
              <Text fw={600} size="sm">Phiên bản (dung lượng và màu)</Text>
              <Button variant="light" size="xs" onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, newVariant()] }))}>+ Thêm phiên bản</Button>
            </Group>
            <Text size="xs" c="dimmed" mb="xs">Giá hiển thị ngoài trang chủ là giá của phiên bản rẻ nhất. Xóa phiên bản đã từng bán có thể làm đơn cũ không hoàn kho được khi hủy.</Text>
            <Stack gap="sm">
              {form.variants.map((variant, index) => (
                <Paper key={variant.key} withBorder p="sm" radius="md">
                  <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                    <TextInput label="Dung lượng" required value={variant.storage} onChange={(event) => setVariant(variant.key, { storage: event.currentTarget.value })} />
                    <TextInput label="Màu" required value={variant.color} onChange={(event) => setVariant(variant.key, { color: event.currentTarget.value })} />
                    <ColorInput label="Mã màu" format="hex" value={variant.colorHex} onChange={(value) => setVariant(variant.key, { colorHex: value })} />
                    <NumberInput label="Giá bán (₫)" required min={0} hideControls allowDecimal={false} thousandSeparator="." decimalSeparator="," value={variant.price} onChange={(value) => setVariant(variant.key, { price: value })} />
                    <NumberInput label="Giá gốc (₫)" min={0} hideControls allowDecimal={false} thousandSeparator="." decimalSeparator="," description="Để trống = bằng giá bán" value={variant.originalPrice} onChange={(value) => setVariant(variant.key, { originalPrice: value })} />
                    <NumberInput label="Tồn kho" required min={0} hideControls allowDecimal={false} value={variant.stock} onChange={(value) => setVariant(variant.key, { stock: value })} />
                  </SimpleGrid>
                  <Group justify="flex-end" mt="xs">
                    <Button variant="subtle" color="red" size="compact-xs" disabled={form.variants.length === 1} onClick={() => removeVariant(variant.key)}>Xóa phiên bản {index + 1}</Button>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </div>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>Hủy</Button>
            <Button type="submit" loading={saving}>Lưu sản phẩm</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
