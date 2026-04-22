import http from "k6/http";
import { check } from "k6";

const BASE = "http://localhost:4001/trpc";
const H = { "Content-Type": "application/json" };

// FIX #1 & #2: Hapus wrapper {json:} di query dan mutation
function q(proc, input, jar) {
  const inputStr = input
    ? `?input=${encodeURIComponent(JSON.stringify(input))}` // ← FIX: no {json:} wrapper
    : "";
  const opts = jar ? { headers: H, jar } : { headers: H };
  return http.get(`${BASE}/${proc}${inputStr}`, opts);
}

function m(proc, input, jar) {
  const opts = jar ? { headers: H, jar } : { headers: H };
  return http.post(
    `${BASE}/${proc}`,
    JSON.stringify(input ?? {}), // ← FIX: no {json:} wrapper
    opts,
  );
}

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  // 1. Public products
  const products = q("product.getAll", { page: 1, limit: 3 });
  check(products, { "tRPC product.getAll 200": (r) => r.status === 200 });

  const body = JSON.parse(products.body);
  // FIX #3: Akses body.result.data bukan body.result.data.json
  const productData = body?.result?.data;
  console.log(
    "tRPC products response structure:",
    JSON.stringify(Object.keys(body)),
  );
  console.log("tRPC products data:", JSON.stringify(productData?.data?.[0]));

  const productId = productData?.data?.[0]?.id;
  const slug = productData?.data?.[0]?.slug;

  // 2. Categories
  const cats = q("category.getAll");
  check(cats, { "tRPC category.getAll 200": (r) => r.status === 200 });

  // 3. Product detail
  if (slug) {
    const detail = q("product.getBySlug", { slug });
    check(detail, { "tRPC product.getBySlug 200": (r) => r.status === 200 });
  }

  // 4. Search — FIX: input dikirim tanpa {json:} wrapper
  const search = q("product.search", { q: "samsung" });
  check(search, { "tRPC product.search 200": (r) => r.status === 200 });

  // 5. Register
  const email = `trpc_smoke_${Date.now()}@test.com`;
  const reg = m("auth.register", {
    name: "tRPC Smoke",
    email,
    password: "TestPass123!",
  });
  check(reg, { "tRPC auth.register 200": (r) => r.status === 200 });

  // 6. Login with cookie jar — FIX: body langsung tanpa {json:} wrapper
  const jar = http.cookieJar();
  const login = http.post(
    `${BASE}/auth.login`,
    JSON.stringify({ email: "admin1@zenit.dev", password: "Password123!" }), // ← FIX
    { headers: H, jar },
  );
  check(login, { "tRPC auth.login 200": (r) => r.status === 200 });

  const cookies = jar.cookiesForURL("http://localhost:4001");
  console.log("tRPC cookies after login:", JSON.stringify(cookies));
  check(cookies, {
    "tRPC accessToken cookie set": (c) => c.accessToken !== undefined,
    "tRPC refreshToken cookie set": (c) => c.refreshToken !== undefined,
  });

  // 7. Protected queries
  const me = q("auth.me", null, jar);
  check(me, { "tRPC auth.me 200": (r) => r.status === 200 });

  const profile = q("profile.get", null, jar);
  check(profile, { "tRPC profile.get 200": (r) => r.status === 200 });

  const cart = q("cart.get", null, jar);
  check(cart, { "tRPC cart.get 200": (r) => r.status === 200 });

  const cartBody = JSON.parse(cart.body);
  // FIX #3: Akses cartBody.result.data bukan cartBody.result.data.json
  const cartId = cartBody?.result?.data?.id;
  console.log("tRPC cart:", JSON.stringify(cartBody?.result?.data));

  const orders = q("order.getAll", { page: 1 }, jar);
  check(orders, { "tRPC order.getAll 200": (r) => r.status === 200 });

  // 8. Add to cart
  if (productId) {
    const addCart = m("cart.addItem", { productId, quantity: 1 }, jar);
    check(addCart, { "tRPC cart.addItem 200": (r) => r.status === 200 });
    console.log(
      "tRPC addItem:",
      addCart.status,
      addCart.body?.substring(0, 200),
    );
  }

  // 9. Profile addresses
  const addresses = q("profile.getAddresses", null, jar);
  check(addresses, {
    "tRPC profile.getAddresses 200": (r) => r.status === 200,
  });

  // 10. Auth refresh — FIX: kirim {} bukan {json:{}}
  const refresh = m("auth.refresh", {}, jar);
  check(refresh, { "tRPC auth.refresh 200": (r) => r.status === 200 });

  // 11. Admin routes
  const dashboard = q("admin.getDashboard", null, jar);
  check(dashboard, { "tRPC admin.getDashboard 200": (r) => r.status === 200 });

  const adminProducts = q("admin.getProducts", { page: 1 }, jar);
  check(adminProducts, {
    "tRPC admin.getProducts 200": (r) => r.status === 200,
  });

  const adminOrders = q("admin.getOrders", { page: 1 }, jar);
  check(adminOrders, { "tRPC admin.getOrders 200": (r) => r.status === 200 });

  const adminUsers = q("admin.getUsers", { page: 1 }, jar);
  check(adminUsers, { "tRPC admin.getUsers 200": (r) => r.status === 200 });

  // 12. Logout
  const logout = m("auth.logout", {}, jar);
  check(logout, { "tRPC auth.logout 200": (r) => r.status === 200 });

  console.log("\n✅ tRPC smoke test done");
}
