// =============================================================
// s02_shopping.js — S-02: Shopping Flow
// Scenario: Authenticated user browses and manages cart
// Operations: login, browse products, add/update/remove cart items
//
// FIX:
//  - Pisah functionalErrorRate dari slaBreachRate (tidak boleh dicampur)
//  - Fail-fast jika PRODUCT_IDS_FOR_CART < 3 (bukan silent skip)
//  - Unique user per VU: __VU % TEST_USERS.length, tapi minimal 1 user per 2 VU
//    supaya tidak ada cart contention antar VU
//
// Run:
//   k6 run --env API=rest --env TEST_TYPE=load   s02_shopping.js
//   k6 run --env API=trpc --env TEST_TYPE=load   s02_shopping.js
//   k6 run --env API=rest --env TEST_TYPE=stress s02_shopping.js
//   k6 run --env API=rest --env TEST_TYPE=spike  s02_shopping.js
//   k6 run --env API=rest --env TEST_TYPE=soak   s02_shopping.js
// =============================================================

import http from "k6/http";
import { check, sleep, group, fail } from "k6";
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
  restPatch,
  restDelete,
  parseResponse,
  checkAndRecord,
} from "./http.js";
import {
  randomItem,
  randomInt,
  PRODUCT_SLUGS,
  PRODUCT_IDS_FOR_CART,
} from "./seed.js";

// Custom metrics — FIX: pisah functional error dari SLA breach
const functionalErrorRate = new Rate("functional_error_rate"); // 4xx/5xx
const slaBreachRate = new Rate("sla_breach_rate"); // 2xx tapi lambat
const errorCounter = new Counter("request_errors");
const latencyBrowse = new Trend("latency_browse", true);
const latencyCartGet = new Trend("latency_cart_get", true);
const latencyCartAdd = new Trend("latency_cart_add", true);
const latencyCartUpdate = new Trend("latency_cart_update", true);
const latencyCartRemove = new Trend("latency_cart_remove", true);
const payloadBytes = new Trend("payload_size_bytes", true);

export const options = {
  stages: STAGES[TEST_TYPE] || STAGES.load,
  thresholds: {
    ...THRESHOLDS_WRITE,
    // FIX: threshold terpisah untuk functional error dan SLA breach
    functional_error_rate: ["rate<0.01"], // maksimal 1% request gagal (4xx/5xx)
    sla_breach_rate: ["rate<0.05"], // maksimal 5% request melebihi SLA duration
    latency_browse: ["p(95)<600"],
    latency_cart_get: ["p(95)<500"],
    latency_cart_add: ["p(95)<800"],
    latency_cart_update: ["p(95)<800"],
    latency_cart_remove: ["p(95)<600"],
  },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

// =============================================================
// REQUEST HELPERS — semua pakai checkAndRecord baru (5 arg)
// =============================================================

function getCart() {
  const tag = { endpoint: "cart_get", api: API_TYPE, scenario: "s02" };
  let res;
  if (API_TYPE === "rest") {
    res = http.get(`${BASE}/cart`, { headers: JSON_HEADERS, tags: tag });
  } else {
    res = trpcQuery(BASE, "cart.get", null, tag);
  }
  latencyCartGet.add(res.timings.duration);
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
  const tag = { endpoint: "cart_add", api: API_TYPE, scenario: "s02" };
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
    800,
  );
  return parseResponse(API_TYPE, res);
}

function updateCartItem(itemId, quantity) {
  const tag = { endpoint: "cart_update", api: API_TYPE, scenario: "s02" };
  let res;
  if (API_TYPE === "rest") {
    res = restPatch(`${BASE}/cart/${itemId}`, { quantity }, tag);
  } else {
    res = trpcMutation(BASE, "cart.updateItem", { itemId, quantity }, tag);
  }
  latencyCartUpdate.add(res.timings.duration);
  checkAndRecord(
    res,
    "cart_update",
    null,
    functionalErrorRate,
    slaBreachRate,
    errorCounter,
    800,
  );
  return res;
}

function removeCartItem(itemId) {
  const tag = { endpoint: "cart_remove", api: API_TYPE, scenario: "s02" };
  let res;
  if (API_TYPE === "rest") {
    res = restDelete(`${BASE}/cart/${itemId}`, tag);
  } else {
    res = trpcMutation(BASE, "cart.removeItem", { itemId }, tag);
  }
  latencyCartRemove.add(res.timings.duration);
  checkAndRecord(
    res,
    "cart_remove",
    null,
    functionalErrorRate,
    slaBreachRate,
    errorCounter,
    600,
  );
  return res;
}

function clearCart() {
  const tag = { endpoint: "cart_clear", api: API_TYPE, scenario: "s02" };
  let res;
  if (API_TYPE === "rest") {
    res = restDelete(`${BASE}/cart`, tag);
  } else {
    res = trpcMutation(BASE, "cart.clear", {}, tag);
  }
  checkAndRecord(
    res,
    "cart_clear",
    null,
    functionalErrorRate,
    slaBreachRate,
    errorCounter,
    600,
  );
  return res;
}

function browseProducts() {
  const tag = { endpoint: "browse", api: API_TYPE, scenario: "s02" };
  let res;
  if (API_TYPE === "rest") {
    res = restGet(
      `${BASE}/products`,
      { page: randomInt(1, 5), limit: 12 },
      tag,
    );
  } else {
    res = trpcQuery(
      BASE,
      "product.getAll",
      { page: randomInt(1, 5), limit: 12 },
      tag,
    );
  }
  latencyBrowse.add(res.timings.duration);
  payloadBytes.add(res.body ? res.body.length : 0);
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
  const tag = { endpoint: "product_detail", api: API_TYPE, scenario: "s02" };
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
  sleep(thinkTime(1, 0.3));

  // Step 2: Browse products
  group("browse", () => {
    browseProducts();
    sleep(thinkTime(1.5, 0.3));

    if (PRODUCT_SLUGS.length > 0) {
      getProductDetail(randomItem(PRODUCT_SLUGS));
      sleep(thinkTime(1.5, 0.3));
      getProductDetail(randomItem(PRODUCT_SLUGS));
      sleep(thinkTime(1.5, 0.3));
    }
  });

  // Step 3: Clear previous cart
  clearCart();
  sleep(thinkTime(0.5, 0.1));

  // Step 4: Cart operations
  const addedItemIds = [];
  group("cart_operations", () => {
    // FIX: productIds diambil berdasarkan VU index agar distribusi lebih merata
    // dan tidak ada VU yang selalu ambil produk yang sama (mengurangi stock contention)
    const base = __VU % Math.max(PRODUCT_IDS_FOR_CART.length, 1);
    const productsToAdd =
      PRODUCT_IDS_FOR_CART.length >= 3
        ? [
            PRODUCT_IDS_FOR_CART[base % PRODUCT_IDS_FOR_CART.length],
            PRODUCT_IDS_FOR_CART[(base + 1) % PRODUCT_IDS_FOR_CART.length],
            PRODUCT_IDS_FOR_CART[(base + 2) % PRODUCT_IDS_FOR_CART.length],
          ]
        : [];

    for (const productId of productsToAdd) {
      const cartData = addToCart(productId, randomInt(1, 3));
      sleep(thinkTime(1, 0.2));

      if (cartData?.items) {
        cartData.items.forEach((item) => {
          if (item.productId === productId) addedItemIds.push(item.id);
        });
      }
    }

    // Get cart summary
    getCart();
    sleep(thinkTime(1.5, 0.3));

    // Update quantity on one item
    if (addedItemIds.length > 0) {
      updateCartItem(addedItemIds[0], randomInt(1, 5));
      sleep(thinkTime(1, 0.2));
    }

    // Remove one item
    if (addedItemIds.length > 1) {
      removeCartItem(addedItemIds[addedItemIds.length - 1]);
      sleep(thinkTime(1, 0.2));
    }

    // Final cart summary
    getCart();
    sleep(thinkTime(1, 0.2));
  });
}

// =============================================================
// SETUP — FIX: fail-fast jika prerequisites tidak terpenuhi
// =============================================================

export function setup() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(
    `S-02 Shopping Flow | API: ${API_TYPE.toUpperCase()} | Test: ${TEST_TYPE.toUpperCase()}`,
  );
  console.log(`${"=".repeat(60)}\n`);

  const res = http.get(HEALTH_URL);
  if (res.status !== 200) throw new Error(`Health check failed: ${res.status}`);

  // FIX: fail-fast — bukan console.warn
  if (PRODUCT_SLUGS.length === 0) {
    throw new Error(
      "[SETUP FAIL] PRODUCT_SLUGS kosong. Isi seed.js dulu sebelum run.\n" +
        "Query: SELECT slug FROM products WHERE is_active=true AND stock>100 ORDER BY random() LIMIT 100;",
    );
  }

  if (PRODUCT_IDS_FOR_CART.length < 3) {
    throw new Error(
      `[SETUP FAIL] PRODUCT_IDS_FOR_CART hanya ${PRODUCT_IDS_FOR_CART.length} item, minimal 3 dibutuhkan.\n` +
        "Query: SELECT id FROM products WHERE is_active=true AND stock>500 ORDER BY random() LIMIT 30;",
    );
  }

  // FIX: minimal user pool = max VU untuk test type ini
  // agar tidak ada cart contention antar VU (1 VU per user)
  const requiredUsers = MAX_VU[TEST_TYPE] || MAX_VU.load; // default ke load (200)
  if (TEST_USERS.length < requiredUsers) {
    throw new Error(
      `[SETUP FAIL] TEST_USERS hanya ${TEST_USERS.length} user, butuh minimal ${requiredUsers} ` +
        `(= max VU untuk TEST_TYPE=${TEST_TYPE}).\n` +
        "Untuk shopping flow, tiap VU WAJIB punya user unik supaya tidak ada cart contention.\n" +
        "Query: SELECT email FROM users WHERE role='USER' ORDER BY created_at LIMIT 500;\n" +
        "Paste hasilnya ke TEST_USERS di auth.js",
    );
  }

  console.log(`✓ PRODUCT_SLUGS: ${PRODUCT_SLUGS.length} slugs`);
  console.log(
    `✓ PRODUCT_IDS_FOR_CART: ${PRODUCT_IDS_FOR_CART.length} products`,
  );
  console.log(`✓ TEST_USERS: ${TEST_USERS.length} users`);

  return {
    apiType: API_TYPE,
    testType: TEST_TYPE,
    startTime: new Date().toISOString(),
  };
}

export function handleSummary(data) {
  const filename = `results/s02_shopping_${API_TYPE}_${TEST_TYPE}_${Date.now()}.json`;
  const m = data.metrics;
  const fmt = (v) => (v != null ? v.toFixed(1) : "N/A");
  const pct = (v) => (v != null ? (v * 100).toFixed(2) : "N/A");

  const summary = `
${"=".repeat(62)}
  S-02 SHOPPING FLOW | ${API_TYPE.toUpperCase()} | ${TEST_TYPE.toUpperCase()}
${"=".repeat(62)}
  Response Time (ms)
    Avg:    ${fmt(m.http_req_duration?.values?.avg)}    P95: ${fmt(m.http_req_duration?.values?.["p(95)"])}
    Median: ${fmt(m.http_req_duration?.values?.med)}    P99: ${fmt(m.http_req_duration?.values?.["p(99)"])}
  Throughput:  ${fmt(m.http_reqs?.values?.rate)} req/s
  Total Reqs:  ${m.http_reqs?.values?.count || 0}

  Error Rates (PISAH — jangan campur saat analisis)
    Functional Error (4xx/5xx): ${pct(m.functional_error_rate?.values?.rate)}%
    SLA Breach (2xx tapi lambat): ${pct(m.sla_breach_rate?.values?.rate)}%

  Per-Endpoint P95 (ms)
    Browse:       ${fmt(m.latency_browse?.values?.["p(95)"])}
    Cart Get:     ${fmt(m.latency_cart_get?.values?.["p(95)"])}
    Cart Add:     ${fmt(m.latency_cart_add?.values?.["p(95)"])}
    Cart Update:  ${fmt(m.latency_cart_update?.values?.["p(95)"])}
    Cart Remove:  ${fmt(m.latency_cart_remove?.values?.["p(95)"])}
${"=".repeat(62)}\n`;

  return { [filename]: JSON.stringify(data, null, 2), stdout: summary };
}
