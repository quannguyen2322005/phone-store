// Trang quản trị dùng Mantine. File này được tải riêng (React.lazy) nên khách mua hàng không phải tải Mantine.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert, Badge, Box, Button, ColorInput, Container, Divider, Drawer, Group, Image, MantineProvider, Modal, NumberInput,
  Pagination, Paper, Select, SimpleGrid, Skeleton, Stack, Switch, Table, Tabs, Text, TextInput,
  Textarea, Title, createTheme
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { Notifications, notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { api } from "../api.js";
import { money } from "../format.js";
import { useAuth } from "../auth.jsx";

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
const ORDER_FILTERS = [{ value: "", label: "Tất cả" }, ...STATUS_OPTIONS];
const SPEC_FIELDS = [
  ["screen", "Màn hình"], ["chip", "Vi xử lý"], ["ram", "RAM"], ["battery", "Pin"], ["camera", "Camera"]
];
const theme = createTheme({ fontFamily: "\"DM Sans\", sans-serif", primaryColor: "blue", defaultRadius: "md" });
const dateTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23"
});
const formatDateTime = (value) => {
  const parts = Object.fromEntries(dateTime.formatToParts(new Date(value)).map(({ type, value: part }) => [type, part]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
};

const notify = (message, error = false) => notifications.show({ message, color: error ? "red" : "teal", autoClose: 3500 });

let variantKeyCounter = 0;
const newVariant = () => ({
  key: ++variantKeyCounter, storage: "256GB", color: "Đen", colorHex: "#333333", price: 0, originalPrice: "", stock: 1
});

function toForm(product) {
  if (!product) {
    return {
      name: "", brand: "APPLE", description: "", featured: false, images: [],
      specs: { screen: "", chip: "", ram: "", battery: "", camera: "" }, variants: [newVariant()]
    };
  }
  return {
    name: product.name, brand: product.brand, description: product.description || "", featured: Boolean(product.featured),
    images: product.images || [],
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
  const { token, logout } = useAuth();
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productBrand, setProductBrand] = useState(null);
  const [debouncedProductSearch] = useDebouncedValue(productSearch, 400);
  const [productTotal, setProductTotal] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const [productPages, setProductPages] = useState(1);
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [debouncedOrderSearch] = useDebouncedValue(orderSearch, 400);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPages, setOrderPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalProduct, setModalProduct] = useState(undefined); // undefined: đóng, null: thêm mới, object: sửa
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // { title, message, label, onConfirm }

  const handleLogout = useCallback(() => {
    logout();
    setOverview(null);
    setSelectedOrder(null);
  }, [logout]);

  const reportError = useCallback((requestError) => {
    if (requestError.status === 401) handleLogout();
    notify(requestError.message, true);
  }, [handleLogout]);

  const refreshOverview = useCallback(async () => {
    setOverviewLoading(true);
    try { setOverview(await api.getOverview()); } catch (requestError) { reportError(requestError); }
    finally { setOverviewLoading(false); }
  }, [reportError]);

  const loadProducts = useCallback(async (page) => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getProducts({ page, limit: PAGE_SIZE, sort: "newest", search: debouncedProductSearch, brand: productBrand });
      const pages = result.pagination?.pages || 1;
      setProductTotal(result.pagination?.total || 0);
      setProductPages(pages);
      if (page > pages) { setProductPage(pages); return; }
      setProducts(result.products || []);
    } catch (requestError) {
      setError(requestError.message);
      reportError(requestError);
    } finally { setLoading(false); }
  }, [debouncedProductSearch, productBrand, reportError]);

  const loadOrders = useCallback(async (page) => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getOrders({ page, limit: PAGE_SIZE, status: orderStatus, q: debouncedOrderSearch });
      const pages = result.pagination?.pages || 1;
      setOrderTotal(result.pagination?.total || 0);
      setOrderPages(pages);
      if (page > pages) { setOrderPage(pages); return; }
      setOrders(result.orders || []);
    } catch (requestError) {
      setError(requestError.message);
      reportError(requestError);
    } finally { setLoading(false); }
  }, [debouncedOrderSearch, orderStatus, reportError]);

  // Chỉ đăng xuất khi backend từ chối phiên; lỗi mạng tạm thời không làm mất phiên đang dùng.
  useEffect(() => {
    if (!token) return;
    refreshOverview();
  }, [token, refreshOverview]);
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
    } catch (requestError) { reportError(requestError); } finally { setSaving(false); }
  }
  function askRemoveProduct(product) {
    setConfirm({
      title: "Xóa sản phẩm", label: "Xóa", message: `Xóa sản phẩm "${product.name}"? Không thể hoàn tác.`,
      onConfirm: async () => {
        try {
          await api.deleteProduct(product._id);
          notify("Đã xóa sản phẩm.");
          await reload();
        } catch (requestError) { reportError(requestError); }
      }
    });
  }
  async function seedProducts() {
    try {
      const result = await api.seedProducts();
      notify(result.message);
      await reload();
    } catch (requestError) { reportError(requestError); }
  }
  async function applyOrderStatus(id, status) {
    try {
      const result = await api.updateOrderStatus(id, status);
      setSelectedOrder(result.order);
      notify("Đã cập nhật trạng thái đơn hàng.");
    } catch (requestError) { reportError(requestError); return; }
    await Promise.all([loadOrders(orderPage), refreshOverview()]);
  }
  async function applyPaymentStatus(id, paymentStatus) {
    try {
      const result = await api.updateOrderPaymentStatus(id, paymentStatus);
      setSelectedOrder(result.order);
      notify(paymentStatus === "paid" ? "Đã đánh dấu đơn thanh toán." : "Đã cập nhật đơn chưa thanh toán.");
    } catch (requestError) { reportError(requestError); return; }
    await loadOrders(orderPage);
  }
  async function openLowStockProduct(id) {
    try {
      const result = await api.getProduct(id);
      setModalProduct(result.product);
    } catch (requestError) { reportError(requestError); }
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
              <Text fw={800} size="lg">QN-Mobiles</Text>
              <Badge variant="light" color="blue">Quản trị</Badge>
            </Group>
            <Text component={Link} to="/" size="sm" c="gray.3">← Quay lại cửa hàng</Text>
          </Group>
        </Container>
      </Box>
      <Container size="xl" py="lg">
        {token && (
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={2}>Tổng quan cửa hàng</Title>
                <Text c="dimmed" size="sm">Quản lý tồn kho và theo dõi đơn hàng.</Text>
              </div>
              <Button variant="default" size="xs" onClick={handleLogout}>Đăng xuất</Button>
            </Group>
            <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
              <StatCard label="Doanh thu" description="Chỉ tính đơn đã hoàn thành" value={overview?.revenue == null ? null : money(overview.revenue)} loading={overviewLoading} />
              <StatCard label="Đơn chờ xác nhận" value={overview?.newOrders} loading={overviewLoading} />
              <StatCard label="Sắp hết hàng (≤ 5 máy)" value={overview?.lowStock} loading={overviewLoading} />
              <StatCard label="Tổng sản phẩm" value={overview?.productCount} loading={overviewLoading} />
            </SimpleGrid>
            <Paper withBorder p="md" radius="md">
              <Title order={4} mb="sm">Sản phẩm sắp hết hàng</Title>
              {overviewLoading ? <Skeleton height={72} /> : overview?.lowStockProducts?.length ? (
                <Stack gap="xs">
                  {overview.lowStockProducts.map((product) => (
                    <Button key={product.id} variant="subtle" color="dark" fullWidth onClick={() => openLowStockProduct(product.id)}>
                      <Group justify="space-between" w="100%" wrap="nowrap">
                        <Text size="sm" lineClamp={1}>{product.name}</Text>
                        <Badge color={product.stock === 0 ? "red" : "orange"}>{product.stock} máy</Badge>
                      </Group>
                    </Button>
                  ))}
                </Stack>
              ) : <Text size="sm" c="dimmed">Chưa có sản phẩm sắp hết hàng.</Text>}
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Tabs value={tab} onChange={(value) => { setError(""); setTab(value); }}>
                <Tabs.List mb="md">
                  <Tabs.Tab value="products">Sản phẩm</Tabs.Tab>
                  <Tabs.Tab value="orders">Đơn hàng</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="products">
                  <Group justify="space-between" align="flex-end" mb="sm" wrap="wrap">
                    <Stack gap={4}>
                      <Title order={4}>Danh sách sản phẩm ({productTotal})</Title>
                      <Text size="xs" c="dimmed">Tìm kiếm khớp theo từ nguyên trong tên hoặc thương hiệu.</Text>
                    </Stack>
                    <Group gap="xs" align="flex-end" wrap="wrap">
                      <TextInput label="Tìm sản phẩm" placeholder="Nhập tên sản phẩm" value={productSearch} maxLength={100} onChange={(event) => { setProductSearch(event.currentTarget.value); setProductPage(1); }} />
                      <Select label="Thương hiệu" placeholder="Tất cả thương hiệu" clearable data={BRAND_OPTIONS} value={productBrand} onChange={(value) => { setProductBrand(value); setProductPage(1); }} />
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
                  <Group justify="space-between" align="flex-end" mb="sm" wrap="wrap">
                    <Title order={4}>Đơn hàng ({orderTotal})</Title>
                    <Group gap="xs" align="flex-end" wrap="wrap">
                      <Select label="Trạng thái" data={ORDER_FILTERS} value={orderStatus} onChange={(value) => { setOrderStatus(value || ""); setOrderPage(1); }} allowDeselect={false} />
                      <TextInput label="Tìm đơn hàng" placeholder="Tên khách hoặc số điện thoại" value={orderSearch} maxLength={100} onChange={(event) => { setOrderSearch(event.currentTarget.value); setOrderPage(1); }} />
                      <Button variant="default" size="xs" onClick={reload}>Làm mới</Button>
                    </Group>
                  </Group>
                  <TabState loading={loading} error={error}>
                    <OrdersTable orders={orders} onOpen={setSelectedOrder} />
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
      <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatus={changeOrderStatus} onPaymentStatus={applyPaymentStatus} />
      <ConfirmModal confirm={confirm} onClose={() => setConfirm(null)} />
    </Box>
  );
}

function StatCard({ label, description, value, loading }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed">{label}</Text>
      {description && <Text size="xs" c="dimmed">{description}</Text>}
      {loading ? <Skeleton height={28} mt={8} /> : <Text fw={800} size="xl" mt={4}>{value ?? "—"}</Text>}
    </Paper>
  );
}

function TabState({ loading, error, children }) {
  if (loading) return <Stack py="md"><Skeleton height={38} /><Skeleton height={38} /><Skeleton height={38} /><Skeleton height={38} /></Stack>;
  if (error) return <Alert color="red" title="Không tải được dữ liệu">{error}</Alert>;
  return <>{children}</>;
}

function Pager({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return <Group justify="center" mt="md"><Pagination total={pages} value={page} onChange={onChange} /></Group>;
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
                <Table.Td><Badge color={product.stock === 0 ? "red" : product.stock <= 5 ? "orange" : "gray"} variant="light">{product.stock} máy</Badge></Table.Td>
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

function OrdersTable({ orders, onOpen }) {
  return (
    <Table.ScrollContainer minWidth={900}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr><Table.Th>Mã đơn</Table.Th><Table.Th>Khách</Table.Th><Table.Th>Tổng tiền</Table.Th><Table.Th>Thanh toán</Table.Th><Table.Th>Trạng thái</Table.Th><Table.Th>Ngày tạo</Table.Th></Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {orders.length ? orders.map((order) => (
            <Table.Tr key={order._id} tabIndex={0} role="button" aria-label={`Mở đơn hàng ${order._id.slice(-8).toUpperCase()}`} onClick={() => onOpen(order)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(order); } }}>
              <Table.Td><Text fw={700} size="sm">#{order._id.slice(-8).toUpperCase()}</Text></Table.Td>
              <Table.Td>
                <Text fw={600} size="sm">{order.customer.name}</Text>
                <Text size="xs" c="dimmed">{order.customer.phone}</Text>
              </Table.Td>
              <Table.Td><Text fw={700} size="sm">{money(order.total)}</Text></Table.Td>
              <Table.Td><PaymentBadge paymentStatus={order.paymentStatus} /></Table.Td>
              <Table.Td><Badge color={STATUS_COLORS[order.status] || "gray"}>{STATUS_OPTIONS.find((item) => item.value === order.status)?.label || order.status}</Badge></Table.Td>
              <Table.Td><Text size="sm">{formatDateTime(order.createdAt)}</Text></Table.Td>
            </Table.Tr>
          )) : <Table.Tr><Table.Td colSpan={6}><Text ta="center" c="dimmed" py="lg">Chưa có đơn hàng nào. Đơn mới sẽ hiển thị tại đây.</Text></Table.Td></Table.Tr>}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function PaymentBadge({ paymentStatus }) {
  const paid = paymentStatus === "paid";
  return <Badge color={paid ? "green" : "gray"} variant="light">{paid ? "Đã thanh toán" : "Chưa thanh toán"}</Badge>;
}

function OrderDrawer({ order, onClose, onStatus, onPaymentStatus }) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  if (!order) return <Drawer opened={false} onClose={onClose} />;
  const statusLabel = STATUS_OPTIONS.find((item) => item.value === order.status)?.label || order.status;
  return (
    <Drawer opened onClose={onClose} title={`Đơn hàng #${order._id.slice(-8).toUpperCase()}`} position="right" size={isMobile ? "100%" : "md"}>
      <Stack gap="md">
        <Text size="sm" c="dimmed">Tạo lúc {formatDateTime(order.createdAt)}</Text>
        <div>
          <Text fw={700} mb={4}>Thông tin khách hàng</Text>
          <Text size="sm">{order.customer.name}</Text>
          <Text size="sm">{order.customer.phone}</Text>
          <Text size="sm">{order.customer.email || "Chưa cung cấp email"}</Text>
          <Text size="sm">{order.deliveryMethod === "pickup" ? "Nhận tại cửa hàng" : order.customer.address}</Text>
        </div>
        <Divider />
        <div>
          <Text fw={700} mb="xs">Sản phẩm</Text>
          <Stack gap="sm">
            {order.items.map((item, index) => (
              <Group key={`${item.product}-${index}`} align="flex-start" wrap="nowrap">
                {item.image && <Image src={item.image} alt={item.productName} w={56} h={56} fit="contain" radius="sm" />}
                <Box flex={1}>
                  <Text size="sm" fw={600}>{item.productName}</Text>
                  <Text size="xs" c="dimmed">{item.storage} · {item.color} · SL {item.quantity}</Text>
                  <Text size="sm">{money(item.price)} / máy</Text>
                </Box>
              </Group>
            ))}
          </Stack>
        </div>
        <Divider />
        <Group justify="space-between"><Text size="sm">Tạm tính</Text><Text size="sm">{money(order.subtotal)}</Text></Group>
        <Group justify="space-between"><Text fw={700}>Tổng tiền</Text><Text fw={700}>{money(order.total)}</Text></Group>
        <Group justify="space-between"><Text size="sm">Phương thức nhận hàng</Text><Text size="sm">{order.deliveryMethod === "pickup" ? "Nhận tại cửa hàng" : "Giao hàng"}</Text></Group>
        <Group justify="space-between"><Text size="sm">Thanh toán</Text><Text size="sm">{order.paymentMethod === "QR" ? "Chuyển khoản QR" : "Thanh toán khi nhận hàng"}</Text></Group>
        <Group justify="space-between"><Text size="sm">Trạng thái thanh toán</Text><PaymentBadge paymentStatus={order.paymentStatus} /></Group>
        <Switch
          label={order.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
          checked={order.paymentStatus === "paid"}
          disabled={order.status === "cancelled"}
          onChange={(event) => onPaymentStatus(order._id, event.currentTarget.checked ? "paid" : "unpaid")}
        />
        <div>
          <Text fw={700} mb={4}>Trạng thái đơn hàng</Text>
          {order.status === "completed" || order.status === "cancelled"
            ? <Badge color={STATUS_COLORS[order.status]}>{statusLabel}</Badge>
            : <Select data={STATUS_OPTIONS} value={order.status} allowDeselect={false} onChange={(value) => onStatus(order, value)} aria-label="Trạng thái đơn hàng" />}
        </div>
        <div>
          <Text fw={700} mb={4}>Ghi chú</Text>
          <Text size="sm">{order.note || "Không có ghi chú."}</Text>
        </div>
      </Stack>
    </Drawer>
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
  const [errors, setErrors] = useState({});
  const isMobile = useMediaQuery("(max-width: 48em)");
  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const setSpec = (key, value) => setForm((current) => ({ ...current, specs: { ...current.specs, [key]: value } }));
  const setVariant = (key, patch) => setForm((current) => ({
    ...current, variants: current.variants.map((variant) => variant.key === key ? { ...variant, ...patch } : variant)
  }));
  function updateVariant(key, patch) {
    setVariant(key, patch);
    setErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((field) => { delete next[`variant-${key}-${field}`]; });
      return next;
    });
  }
  const removeVariant = (key) => {
    setForm((current) => ({ ...current, variants: current.variants.filter((variant) => variant.key !== key) }));
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([field]) => !field.startsWith(`variant-${key}-`))));
  };

  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên điện thoại.";
    if (!form.variants.length) nextErrors.variants = "Cần ít nhất một phiên bản (dung lượng và màu).";
    for (const variant of form.variants) {
      if (!variant.storage.trim()) nextErrors[`variant-${variant.key}-storage`] = "Vui lòng nhập dung lượng.";
      if (!variant.color.trim()) nextErrors[`variant-${variant.key}-color`] = "Vui lòng nhập tên màu.";
      const price = Number(variant.price);
      if (!Number.isFinite(price) || price <= 0) nextErrors[`variant-${variant.key}-price`] = "Giá bán phải lớn hơn 0.";
      const originalPrice = variant.originalPrice === "" ? price : Number(variant.originalPrice);
      if (!Number.isFinite(originalPrice) || originalPrice < price) {
        nextErrors[`variant-${variant.key}-originalPrice`] = "Giá gốc phải bằng hoặc cao hơn giá bán.";
      }
      if (typeof variant.stock !== "number" || !Number.isInteger(variant.stock) || variant.stock < 0) {
        nextErrors[`variant-${variant.key}-stock`] = "Tồn kho phải là số nguyên từ 0 trở lên.";
      }
      if (!/^#[0-9a-f]{6}$/i.test(variant.colorHex)) {
        nextErrors[`variant-${variant.key}-colorHex`] = "Mã màu phải có dạng #RRGGBB.";
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const payload = {
      name: form.name.trim(), brand: form.brand, category: "Smartphone", description: form.description.trim(), featured: form.featured,
      images: form.images.map((item) => item.trim()).filter(Boolean),
      specs: form.specs,
      variants: form.variants.map(({ key, ...variant }) => ({
        ...variant, storage: variant.storage.trim(), color: variant.color.trim(),
        price: Number(variant.price), originalPrice: variant.originalPrice === "" ? Number(variant.price) : Number(variant.originalPrice), stock: variant.stock
      }))
    };
    return onSave(payload, product?._id);
  }

  return (
    <Modal opened onClose={onClose} title={product ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"} size="xl" fullScreen={isMobile} closeOnClickOutside={false}>
      <form onSubmit={submit}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Tên điện thoại" required maxLength={140} value={form.name} error={errors.name} onChange={(event) => setField("name", event.currentTarget.value)} />
            <Select label="Thương hiệu" required allowDeselect={false} data={BRAND_OPTIONS} value={form.brand} onChange={(value) => setField("brand", value)} />
          </SimpleGrid>
          <Textarea label="Mô tả" autosize minRows={2} value={form.description} onChange={(event) => setField("description", event.currentTarget.value)} />
          <div>
            <Group justify="space-between" mb={6}>
              <Text fw={600} size="sm">Ảnh sản phẩm</Text>
              <Button variant="light" size="xs" onClick={() => setField("images", [...form.images, ""])}>+ Thêm URL ảnh</Button>
            </Group>
            {form.images.map((image, index) => (
              <Group key={index} align="flex-start" wrap="nowrap" mb="xs">
                <div style={{ flex: 1 }}>
                  <TextInput label={`URL ảnh ${index + 1}`} placeholder="URL hoặc đường dẫn ảnh" value={image} onChange={(event) => setField("images", form.images.map((current, imageIndex) => imageIndex === index ? event.currentTarget.value : current))} />
                  {image.trim() && <ImagePreview src={image.trim()} />}
                </div>
                <Button variant="subtle" color="red" mt={26} aria-label={`Xóa URL ảnh ${index + 1}`} onClick={() => setField("images", form.images.filter((_, imageIndex) => imageIndex !== index))}>Xóa</Button>
              </Group>
            ))}
          </div>
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
              <Button variant="light" size="xs" onClick={() => { setErrors((current) => ({ ...current, variants: undefined })); setForm((current) => ({ ...current, variants: [...current.variants, newVariant()] })); }}>+ Thêm phiên bản</Button>
            </Group>
            <Text size="xs" c="dimmed" mb="xs">Giá hiển thị ngoài trang chủ là giá của phiên bản rẻ nhất. Xóa phiên bản đã từng bán có thể làm đơn cũ không hoàn kho được khi hủy.</Text>
            {errors.variants && <Text size="xs" c="red" mb="xs">{errors.variants}</Text>}
            <Stack gap="sm">
              {form.variants.map((variant, index) => (
                <Paper key={variant.key} withBorder p="sm" radius="md">
                  <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                    <TextInput label="Dung lượng" required value={variant.storage} error={errors[`variant-${variant.key}-storage`]} onChange={(event) => updateVariant(variant.key, { storage: event.currentTarget.value })} />
                    <TextInput label="Màu" required value={variant.color} error={errors[`variant-${variant.key}-color`]} onChange={(event) => updateVariant(variant.key, { color: event.currentTarget.value })} />
                    <ColorInput label="Mã màu" format="hex" value={variant.colorHex} error={errors[`variant-${variant.key}-colorHex`]} onChange={(value) => updateVariant(variant.key, { colorHex: value })} />
                    <NumberInput label="Giá bán (₫)" required min={0} hideControls allowDecimal={false} thousandSeparator="." decimalSeparator="," value={variant.price} error={errors[`variant-${variant.key}-price`]} onChange={(value) => updateVariant(variant.key, { price: value })} />
                    <NumberInput label="Giá gốc (₫)" min={0} hideControls allowDecimal={false} thousandSeparator="." decimalSeparator="," description="Để trống = bằng giá bán" value={variant.originalPrice} error={errors[`variant-${variant.key}-originalPrice`]} onChange={(value) => updateVariant(variant.key, { originalPrice: value })} />
                    <NumberInput label="Tồn kho" required min={0} hideControls allowDecimal={false} value={variant.stock} error={errors[`variant-${variant.key}-stock`]} onChange={(value) => updateVariant(variant.key, { stock: value })} />
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

function ImagePreview({ src }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <Group gap="xs" mt="xs" align="center" wrap="nowrap">
      <Image src={src} alt="Ảnh xem trước sản phẩm" w={56} h={56} fit="contain" radius="sm" onError={() => setFailed(true)} />
      {failed && <Text size="xs" c="red">Không tải được ảnh từ URL này.</Text>}
    </Group>
  );
}
