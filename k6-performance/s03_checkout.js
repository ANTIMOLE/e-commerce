// =============================================================
// s03_checkout.js — S-03: Checkout Flow
// Scenario: Full purchase from browse → cart → checkout → order
//
// FIX:
//  - Pisah functionalErrorRate dari slaBreachRate
//  - Fail-fast di setup jika prerequisites kosong
//  - Tidak lagi diam-diam skip checkout kalau addressId null —
//    sekarang dicatat sebagai warning dan dihitung ke counter khusus
//    (bukan di error_rate, karena bisa jadi memang user belum setup address)
//
// Run:
//   k6 run --env API=rest --env TEST_TYPE=load   s03_checkout.js
//   k6 run --env API=trpc --env TEST_TYPE=load   s03_checkout.js
// =============================================================

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

import {
  API_TYPE,
  TEST_TYPE,
  BASE,
  HEALTH_URL,
  STAGES,
  THRESHOLDS_WRITE,
  JSON_HEADERS,
  thinkTime,
  MAX_VU,
} from "./config.js";
import { login, pickUser, TEST_USERS } from "./auth.js";
import {
  trpcQuery,
  trpcMutation,
  restGet,
  restPost,
  restDelete,
  parseResponse,
  checkAndRecord,
} from "./http.js";
import {
  randomItem,
  randomInt,
  PRODUCT_IDS_FOR_CART,
  PRODUCT_SLUGS,
} from "./seed.js";

// Custom metrics — FIX: pisah functional error dari SLA breach
const functionalErrorRate = new Rate("functional_error_rate");
const slaBreachRate = new Rate("sla_breach_rate");
const errorCounter = new Counter("request_errors");
// Counter khusus untuk flow yang tidak bisa selesai karena data tidak cukup
// (bukan error, tapi perlu dikurangi saat analisis throughput checkout)
const checkoutSkipCounter = new Counter("checkout_skip_no_address");
const latencyCartAdd = new Trend("latency_cart_add", true);
const latencyCheckout = new Trend("latency_checkout", true);
const latencyOrderDetail = new Trend("latency_order_detail", true);
const latencyBrowse = new Trend("latency_browse", true);
const payloadBytes = new Trend("payload_size_bytes", true);

export const options = {
  stages: STAGES[TEST_TYPE] || STAGES.load,
  thresholds: {
    ...THRESHOLDS_WRITE,
    functional_error_rate: ["rate<0.01"],
    sla_breach_rate: ["rate<0.05"],
    latency_cart_add: ["p(95)<1000"],
    latency_checkout: ["p(95)<2000"],
    latency_order_detail: ["p(95)<600"],
    latency_browse: ["p(95)<600"],
    // checkout_skip tidak boleh lebih dari 10% dari total VU iterations
    checkout_skip_no_address: ["count<100"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

// =============================================================
// REQUEST HELPERS
// =============================================================

function browseProducts() {
  const tag = { endpoint: "browse", api: API_TYPE, scenario: "s03" };
  let res;
  if (API_TYPE === "rest") {
    res = restGet(`${BASE}/products`, { page: 1, limit: 12 }, tag);
  } else {
    res = trpcQuery(BASE, "product.getAll", { page: 1, limit: 12 }, tag);
  }
  latencyBrowse.add(res.timings.duration);
  checkAndRecord(
    res,
    "browse",
    null,
    functionalErrorRate,
    slaBreachRate,
    errorCounter,
    600,
  );
  return res;
}

function getProductDetail(slug) {
  const tag = { endpoint: "product_detail", api: API_TYPE, scenario: "s03" };
  let res;
  if (API_TYPE === "rest") {
    res = http.get(`${BASE}/products/${slug}`, {
      headers: JSON_HEADERS,
      tags: tag,
    });
  } else {
    res = trpcQuery(BASE, "product.getBySlug", { slug }, tag);
  }
  checkAndRecord(
    res,
    "product_detail",
    null,
    functionalErrorRate,
    slaBreachRate,
    errorCounter,
    600,
  );
  return res;
}

function clearCart() {
  const tag = { endpoint: "cart_clear", api: API_TYPE, scenario: "s03" };
  if (API_TYPE === "rest") return restDelete(`${BASE}/cart`, tag);
  return trpcMutation(BASE, "cart.clear", {}, tag);
}

function getCart() {
  const tag = { endpoint: "cart_get", api: API_TYPE, scenario: "s03" };
  let res;
  if (API_TYPE === "rest") {
    res = http.get(`${BASE}/cart`, { headers: JSON_HEADERS, tags: tag });
  } else {
    res = trpcQuery(BASE, "cart.get", null, tag);
  }
  checkAndRecord(
    res,
    "cart_get",
    null,
    functionalErrorRate,
    slaBreachRate,
    errorCounter,
    500,
  );
  return parseResponse(API_TYPE, res);
}

function addToCart(productId, quantity) {
  const tag = { endpoint: "cart_add", api: API_TYPE, scenario: "s03" };
  let res;
  if (API_TYPE === "rest") {
    res = restPost(`${BASE}/cart`, { productId, quantity }, tag);
  } else {
    res = trpcMutation(BASE, "cart.addItem", { productId, quantity }, tag);
  }
  latencyCartAdd.add(res.timings.duration);
  checkAndRecord(
    res,
    "cart_add",
    null,
    functionalErrorRate,
    slaBreachRate,
    errorCounter,
    1000,
  );
  return parseResponse(API_TYPE, res);
}

function getAddresses() {
  const tag = { endpoint: "addresses_get", api: API_TYPE, scenario: "s03" };
  let res;
  if (API_TYPE === "rest") {
    res = http.get(`${BASE}/profile/addresses`, {
      headers: JSON_HEADERS,
      tags: tag,
    });
  } else {
    res = trpcQuery(BASE, "profile.getAddresses", null, tag);
  }
  checkAndRecord(
    res,
    "addresses_get",
    null,
    functionalErrorRate,
    slaBreachRate,
    errorCounter,
    500,
  );
  return parseResponse(API_TYPE, res);
}

function confirmCheckout(cartId, addressId) {
  const tag = { endpoint: "checkout_confirm", api: API_TYPE, scenario: "s03" };
  const body = {
    cartId,
    addressId,
    shippingMethod: "regular",
    paymentMethod: "bank_transfer",
  };
  let res;
  if (API_TYPE === "rest") {
    res = restPost(`${BASE}/checkout/confirm`, body, tag);
  } else {
    res = trpcMutation(BASE, "checkout.confirm", body, tag);
  }
  latencyCheckout.add(res.timings.duration);
  payloadBytes.add(res.body ? res.body.length : 0);
  checkAndRecord(
    res,
    "checkout_confirm",
    null,
    functionalErrorRate,
    slaBreachRate,
    errorCounter,
    2000,
  );
  return parseResponse(API_TYPE, res);
}

function getOrderDetail(orderId) {
  const tag = { endpoint: "order_detail", api: API_TYPE, scenario: "s03" };
  let res;
  if (API_TYPE === "rest") {
    res = http.get(`${BASE}/orders/${orderId}`, {
      headers: JSON_HEADERS,
      tags: tag,
    });
  } else {
    res = trpcQuery(BASE, "order.getById", { orderId }, tag);
  }
  latencyOrderDetail.add(res.timings.duration);
  checkAndRecord(
    res,
    "order_detail",
    null,
    functionalErrorRate,
    slaBreachRate,
    errorCounter,
    600,
  );
  return res;
}

// =============================================================
// VU FUNCTION
// =============================================================

export default function () {
  const { email, password } = pickUser(__VU);

  // Step 1: Login
  const loggedIn = login(API_TYPE, BASE, email, password);
  if (!loggedIn) {
    sleep(2);
    return;
  }
  sleep(thinkTime(0.75, 0.2));

  // Step 2: Browse
  group("browse", () => {
    browseProducts();
    sleep(thinkTime(0.75, 0.2));
    if (PRODUCT_SLUGS.length > 0) {
      getProductDetail(randomItem(PRODUCT_SLUGS));
      sleep(thinkTime(0.75, 0.2));
    }
  });

  // Step 3: Build cart
  let cartId = null;
  let addressId = null;

  group("cart_build", () => {
    clearCart();
    sleep(thinkTime(0.5, 0.1));

    const base = __VU % Math.max(PRODUCT_IDS_FOR_CART.length, 1);
    const products =
      PRODUCT_IDS_FOR_CART.length >= 3
        ? [
            PRODUCT_IDS_FOR_CART[base % PRODUCT_IDS_FOR_CART.length],
            PRODUCT_IDS_FOR_CART[(base + 1) % PRODUCT_IDS_FOR_CART.length],
            PRODUCT_IDS_FOR_CART[(base + 2) % PRODUCT_IDS_FOR_CART.length],
          ]
        : [];

    let lastCart = null;
    for (const productId of products) {
      lastCart = addToCart(productId, 1);
      sleep(thinkTime(0.5, 0.1));
    }

    if (lastCart?.id) cartId = lastCart.id;
    const cartData = getCart();
    if (!cartId && cartData?.id) cartId = cartData.id;
    sleep(thinkTime(0.75, 0.2));
  });

  if (!cartId) {
    sleep(2);
    return;
  }

  // Step 4: Checkout
  group("checkout", () => {
    const addrData = getAddresses();
    const addresses = Array.isArray(addrData) ? addrData : addrData?.data || [];

    if (addresses.length > 0) {
      addressId = addresses[0].id;
    }
    sleep(thinkTime(0.75, 0.2));

    if (!addressId) {
      // FIX: tidak lagi diam-diam return — catat ke counter terpisah
      // supaya bisa dideteksi saat analisis (bukan false "clean run")
      checkoutSkipCounter.add(1);
      console.warn(
        `[SKIP] VU ${__VU}: user tidak punya address, checkout tidak dieksekusi`,
      );
      return;
    }

    // Step 5: Confirm checkout (atomic DB transaction)
    const order = confirmCheckout(cartId, addressId);
    sleep(thinkTime(0.75, 0.2));

    let orderId = order?.id;
    if (!orderId && order?.data?.id) orderId = order.data.id;

    if (orderId) {
      getOrderDetail(orderId);
      sleep(thinkTime(0.75, 0.2));
    }

    // Step 6: View order list
    const tag = { endpoint: "orders_list", api: API_TYPE, scenario: "s03" };
    if (API_TYPE === "rest") {
      restGet(`${BASE}/orders`, { page: 1, limit: 5 }, tag);
    } else {
      trpcQuery(BASE, "order.getAll", { page: 1, limit: 5 }, tag);
    }
  });
}

// =============================================================
// SETUP — fail-fast jika prerequisites tidak terpenuhi
// =============================================================

export function setup() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(
    `S-03 Checkout Flow | API: ${API_TYPE.toUpperCase()} | Test: ${TEST_TYPE.toUpperCase()}`,
  );
  console.log(`${"=".repeat(60)}\n`);

  const res = http.get(HEALTH_URL);
  if (res.status !== 200) throw new Error(`Health check failed: ${res.status}`);

  // FIX: fail-fast
  if (PRODUCT_IDS_FOR_CART.length < 3) {
    throw new Error(
      `[SETUP FAIL] PRODUCT_IDS_FOR_CART hanya ${PRODUCT_IDS_FOR_CART.length} item, minimal 3.\n` +
        "Query: SELECT id FROM products WHERE is_active=true AND stock>500 ORDER BY random() LIMIT 30;",
    );
  }

  // FIX: minimal user pool = max VU untuk test type ini
  const requiredUsers = MAX_VU[TEST_TYPE] || MAX_VU.load;
  if (TEST_USERS.length < requiredUsers) {
    throw new Error(
      `[SETUP FAIL] TEST_USERS hanya ${TEST_USERS.length} user, butuh minimal ${requiredUsers} ` +
        `(= max VU untuk TEST_TYPE=${TEST_TYPE}).\n` +
        "Checkout flow adalah skenario write-heavy — tiap VU WAJIB punya user unik.\n" +
        "Query: SELECT email FROM users WHERE role='USER' ORDER BY created_at LIMIT 500;\n" +
        "Paste hasilnya ke TEST_USERS di auth.js",
    );
  }

  // Warning (bukan fail) untuk checkout_skip_counter — bisa diterima kalau seed address ada
  console.log(
    `✓ PRODUCT_IDS_FOR_CART: ${PRODUCT_IDS_FOR_CART.length} products`,
  );
  console.log(`✓ TEST_USERS: ${TEST_USERS.length} users`);
  console.log(
    "⚠️  Pastikan setiap test user sudah punya minimal 1 address di DB.",
  );
  console.log(
    "   Jika tidak, checkout_skip_counter akan naik dan skews analisis throughput.",
  );
  console.log(
    "   Setup address: seed_2.ts sudah include 1 address per user dari addresses_seed.csv",
  );

  return { apiType: API_TYPE, startTime: new Date().toISOString() };
}

export function handleSummary(data) {
  const filename = `results/s03_checkout_${API_TYPE}_${TEST_TYPE}_${Date.now()}.json`;
  const m = data.metrics;
  const fmt = (v) => (v != null ? v.toFixed(1) : "N/A");
  const pct = (v) => (v != null ? (v * 100).toFixed(2) : "N/A");

  const summary = `
${"=".repeat(62)}
  S-03 CHECKOUT FLOW | ${API_TYPE.toUpperCase()} | ${TEST_TYPE.toUpperCase()}
${"=".repeat(62)}
  Response Time (ms)
    Avg:    ${fmt(m.http_req_duration?.values?.avg)}    P95: ${fmt(m.http_req_duration?.values?.["p(95)"])}
    Median: ${fmt(m.http_req_duration?.values?.med)}    P99: ${fmt(m.http_req_duration?.values?.["p(99)"])}
  Throughput:  ${fmt(m.http_reqs?.values?.rate)} req/s

  Error Rates (PISAH saat analisis)
    Functional Error (4xx/5xx): ${pct(m.functional_error_rate?.values?.rate)}%
    SLA Breach (2xx tapi lambat): ${pct(m.sla_breach_rate?.values?.rate)}%

  Checkout Skips (no address): ${m.checkout_skip_no_address?.values?.count || 0}
  ↑ Kalau ini > 0, kurangi dari denominator saat hitung checkout throughput

  Per-Endpoint P95 (ms)
    Browse:          ${fmt(m.latency_browse?.values?.["p(95)"])}
    Cart Add:        ${fmt(m.latency_cart_add?.values?.["p(95)"])}
    Checkout Confirm:${fmt(m.latency_checkout?.values?.["p(95)"])} (atomic DB TX)
    Order Detail:    ${fmt(m.latency_order_detail?.values?.["p(95)"])}
${"=".repeat(62)}\n`;

  return { [filename]: JSON.stringify(data, null, 2), stdout: summary };
}
