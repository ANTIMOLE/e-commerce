# Manual API Test Guide for Bruno

Panduan ini dibuat untuk pengujian manual API setelah proses fix bug selesai. Fokusnya adalah:

- mencakup seluruh endpoint REST dan seluruh procedure tRPC yang aktif
- memberi daftar request yang perlu dipanggil
- menjelaskan hasil minimum yang diharapkan
- memudahkan pencatatan hasil ke skripsi sebagai bukti pengujian manual yang komprehensif

Dokumen ini mengasumsikan perilaku final yang diinginkan setelah fix, terutama:

- `ship` dan `deliver` adalah aksi admin
- request invalid harus gagal dengan kode error yang sesuai
- REST dan tRPC harus menunjukkan perilaku bisnis yang ekuivalen

## 1. Base URL dan Cara Pakai Bruno

### REST

- Base URL: `http://localhost:4000/api/v1`
- Health check: `GET /health`

### tRPC

- Base URL: `http://localhost:4001/trpc`
- Health check: `GET /health`

### Apakah tRPC bisa dites di Bruno?

Bisa.

Pola request tRPC di project ini:

- Query: `GET /trpc/<procedure>?input=<urlencoded-json>`
- Mutation: `POST /trpc/<procedure>` dengan body JSON mentah

Contoh:

```http
GET http://localhost:4001/trpc/product.getAll?input=%7B%22page%22%3A1%2C%22limit%22%3A12%7D
```

```http
POST http://localhost:4001/trpc/auth.login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "TestPass123!"
}
```

### Catatan penting Bruno

- Aktifkan cookie persistence.
- Buat sesi terpisah:
  - `anonymous`
  - `user`
  - `admin`
- Simpan dynamic values hasil request:
  - `USER_ID`
  - `ADMIN_ID`
  - `CATEGORY_SLUG`
  - `CATEGORY_ID`
  - `PRODUCT_ID`
  - `PRODUCT_SLUG`
  - `CART_ID`
  - `CART_ITEM_ID`
  - `ADDRESS_ID`
  - `ORDER_ID`
  - `ORDER_NUMBER`
  - `ADMIN_PRODUCT_ID`

## 2. Data Uji yang Disarankan

### Akun user baru

```json
{
  "name": "Bruno User",
  "email": "bruno.user@example.com",
  "password": "TestPass123!"
}
```

### Login user

```json
{
  "email": "bruno.user@example.com",
  "password": "TestPass123!"
}
```

### Login admin

Gunakan akun admin seed yang memang ada di database lokal.

### Payload alamat

```json
{
  "label": "Rumah",
  "recipientName": "Bruno User",
  "phone": "081234567890",
  "address": "Jl. Testing No. 123",
  "city": "Surabaya",
  "province": "Jawa Timur",
  "zipCode": "60231",
  "isDefault": true
}
```

### Payload update alamat parsial

```json
{
  "city": "Malang"
}
```

### Payload update profile

```json
{
  "name": "Bruno User Updated",
  "phone": "081298765432"
}
```

## 3. Cara Mencatat Hasil

Untuk setiap request, minimal catat:

- nama request
- protokol: REST atau tRPC
- input yang dikirim
- status code
- ringkasan response
- hasil: `Lulus` atau `Gagal`

Simpan screenshot Bruno untuk request-request kunci:

- register
- login
- get products
- add cart
- create address
- calculate summary
- confirm checkout
- get orders
- admin dashboard
- admin ship
- admin deliver

## 4. Urutan Eksekusi yang Disarankan

Urutan aman:

1. health
2. auth
3. category + product browse
4. profile
5. address
6. cart
7. checkout
8. orders
9. admin
10. negative cases utama

## 5. REST Manual Test Checklist

Base prefix REST: `/api/v1`

### 5.1 Health

#### R-01 `GET /health`

- Auth: tidak perlu
- Expected:
  - status `200`
  - body memuat `status: "ok"`
  - body memuat `api: "REST"`

### 5.2 Auth

#### R-02 `POST /auth/register`

- Auth: tidak perlu
- Body:

```json
{
  "name": "Bruno User",
  "email": "bruno.user@example.com",
  "password": "TestPass123!"
}
```

- Expected:
  - status `201`
  - body success
  - data user ada
  - `passwordHash` tidak muncul
  - cookie `accessToken` dan `refreshToken` terset

#### R-03 `POST /auth/register` duplicate email

- Expected:
  - status `409`
  - message menjelaskan email sudah terdaftar

#### R-04 `POST /auth/login`

- Body:

```json
{
  "email": "bruno.user@example.com",
  "password": "TestPass123!"
}
```

- Expected:
  - status `200`
  - data user ada
  - cookie auth terset

#### R-05 `POST /auth/login` wrong password

- Expected:
  - status `401`
  - message generic, bukan bocor detail

#### R-06 `GET /auth/me`

- Auth: user login
- Expected:
  - status `200`
  - data user sesuai akun login
  - ada `id`, `name`, `email`, `role`

#### R-07 `GET /auth/profile`

- Auth: user login
- Expected:
  - status `200`
  - data profile sesuai user login

#### R-08 `PATCH /auth/change-password`

- Auth: user login
- Body:

```json
{
  "oldPassword": "TestPass123!",
  "newPassword": "NewPass123!"
}
```

- Expected:
  - status `200`
  - message sukses
  - login dengan password lama gagal
  - login dengan password baru berhasil

#### R-09 `POST /auth/refresh`

- Auth: refresh cookie tersedia
- Expected:
  - status `200`
  - access token baru terset sebagai cookie

#### R-10 `POST /auth/logout`

- Auth: user login
- Expected:
  - status `200`
  - logout sukses
  - request protected berikutnya gagal `401`

### 5.3 Categories

#### R-11 `GET /categories`

- Expected:
  - status `200`
  - array kategori tidak kosong
  - simpan satu `CATEGORY_ID` dan `CATEGORY_SLUG`

#### R-12 `GET /categories/:slug`

- Gunakan `CATEGORY_SLUG`
- Expected:
  - status `200`
  - kategori sesuai slug

### 5.4 Products

#### R-13 `GET /products`

- Query contoh: `?page=1&limit=12`
- Expected:
  - status `200`
  - ada metadata pagination
  - list produk tidak kosong
  - simpan satu `PRODUCT_ID` dan `PRODUCT_SLUG`

#### R-14 `GET /products` dengan filter kategori

- Query contoh: `?categoryId={{CATEGORY_ID}}`
- Expected:
  - status `200`
  - semua data relevan terhadap kategori

#### R-15 `GET /products` dengan filter harga

- Query contoh: `?minPrice=10000&maxPrice=100000`
- Expected:
  - status `200`
  - data terfilter

#### R-16 `GET /products` dengan filter rating

- Query contoh: `?minRating=4`
- Expected:
  - status `200`

#### R-17 `GET /products` dengan sort

- Query contoh: `?sortBy=sold_count&sortOrder=desc`
- Expected:
  - status `200`
  - response sukses tanpa error validasi atau server error

#### R-18 `GET /products/search`

- Query contoh: `?q=sepatu&page=1&limit=12`
- Expected:
  - status `200`
  - hasil pencarian relevan
  - pagination tetap jalan

#### R-19 `GET /products/:slug`

- Gunakan `PRODUCT_SLUG`
- Expected:
  - status `200`
  - detail produk lengkap

#### R-20 `GET /products/:slug` invalid slug

- Expected:
  - status `404`

### 5.5 Profile

#### R-21 `GET /profile`

- Auth: user login
- Expected:
  - status `200`
  - profile user tampil

#### R-22 `PATCH /profile`

- Auth: user login
- Body:

```json
{
  "name": "Bruno User Updated",
  "phone": "081298765432"
}
```

- Expected:
  - status `200`
  - field berubah

### 5.6 Addresses

#### R-23 `GET /profile/addresses`

- Auth: user login
- Expected:
  - status `200`
  - array alamat, boleh kosong di awal

#### R-24 `POST /profile/addresses`

- Auth: user login
- Body: payload alamat
- Expected:
  - status `201` atau `200`
  - alamat baru terbentuk
  - simpan `ADDRESS_ID`

#### R-25 `PATCH /profile/addresses/:addressId`

- Auth: user login
- Body:

```json
{
  "city": "Malang"
}
```

- Expected:
  - status `200`
  - update parsial berhasil

#### R-26 `PATCH /profile/addresses/:addressId/default`

- Auth: user login
- Expected:
  - status `200`
  - alamat target jadi default

#### R-27 `DELETE /profile/addresses/:addressId`

- Auth: user login
- Gunakan alamat dummy lain jika tidak ingin menghapus alamat checkout utama
- Expected:
  - status `200`

### 5.7 Cart

#### R-28 `GET /cart`

- Auth: user login
- Expected:
  - status `200`
  - cart aktif tersedia
  - simpan `CART_ID`

#### R-29 `POST /cart`

- Auth: user login
- Body:

```json
{
  "productId": "{{PRODUCT_ID}}",
  "quantity": 1
}
```

- Expected:
  - status `200`
  - item masuk cart
  - ambil `CART_ITEM_ID` dari response cart atau dari request `GET /cart`

#### R-30 `PATCH /cart/:itemId`

- Auth: user login
- Body:

```json
{
  "quantity": 2
}
```

- Expected:
  - status `200`
  - quantity berubah

#### R-31 `DELETE /cart/:itemId`

- Auth: user login
- Expected:
  - status `200`
  - item hilang dari cart

#### R-32 `DELETE /cart`

- Auth: user login
- Expected:
  - status `200`
  - semua item cart terhapus

#### R-33 `POST /cart` stok tidak cukup

- Body quantity sangat besar
- Expected:
  - status `400`

### 5.8 Checkout

Sebelum checkout, pastikan:

- cart berisi item
- user punya alamat valid

#### R-34 `POST /checkout/calculate-summary`

- Auth: user login
- Body:

```json
{
  "cartId": "{{CART_ID}}",
  "shippingMethod": "regular"
}
```

- Expected:
  - status `200`
  - ada `subtotal`, `tax`, `shippingCost`, `total`
  - nilai numerik konsisten

#### R-35 `POST /checkout/confirm`

- Body:

```json
{
  "cartId": "{{CART_ID}}",
  "addressId": "{{ADDRESS_ID}}",
  "shippingMethod": "regular",
  "paymentMethod": "bank_transfer"
}
```

- Expected:
  - status `201` atau `200`
  - order berhasil dibuat
  - simpan `ORDER_ID` dan `ORDER_NUMBER`
  - cart lama kosong atau berubah `checked_out`

#### R-36 `GET /checkout/summary/:orderNumber`

- Gunakan `ORDER_NUMBER`
- Expected:
  - status `200`
  - detail checkout tampil
  - total, subtotal, tax, shippingCost bertipe numerik

### 5.9 Orders

#### R-37 `GET /orders`

- Auth: user login
- Expected:
  - status `200`
  - order list muncul

#### R-38 `GET /orders?status=pending_payment`

- Expected:
  - status `200`
  - filter status bekerja

#### R-39 `GET /orders/:orderId`

- Gunakan `ORDER_ID`
- Expected:
  - status `200`
  - detail order tampil

#### R-40 `POST /orders/:orderId/confirm`

- Auth: user login
- Expected:
  - status `200`
  - status order berpindah dari `pending_payment` ke `confirmed`

#### R-41 `POST /orders/:orderId/cancel`

- Gunakan order lain yang masih `pending_payment`
- Expected:
  - status `200`
  - status jadi `cancelled`

#### R-42 `POST /orders/:orderId/ship` oleh user biasa

- Auth: user login biasa
- Expected:
  - status `403`

#### R-43 `POST /orders/:orderId/deliver` oleh user biasa

- Auth: user login biasa
- Expected:
  - status `403`

### 5.10 Admin

Gunakan sesi admin terpisah.

#### R-44 `GET /admin/dashboard`

- Auth: admin
- Expected:
  - status `200`
  - ada `summary`, `topProducts`, `recentOrders`, `salesChart`

#### R-45 `GET /admin/products`

- Auth: admin
- Expected:
  - status `200`
  - pagination admin muncul

#### R-46 `POST /admin/products`

- Auth: admin
- Body contoh:

```json
{
  "categoryId": "{{CATEGORY_ID}}",
  "name": "Produk Admin Bruno",
  "description": "Produk untuk test admin",
  "price": 99999,
  "stock": 10,
  "images": [],
  "discount": 0
}
```

- Expected:
  - status `201` atau `200`
  - produk baru terbentuk
  - simpan `ADMIN_PRODUCT_ID`

#### R-47 `PATCH /admin/products/:id`

- Body:

```json
{
  "price": 88888,
  "stock": 15
}
```

- Expected:
  - status `200`
  - field update berhasil

#### R-48 `DELETE /admin/products/:id`

- Expected:
  - status `200`
  - soft delete sukses

#### R-49 `GET /admin/orders`

- Expected:
  - status `200`
  - list order admin tampil

#### R-50 `PATCH /admin/orders/:id/status`

- Gunakan order yang sesuai transisi valid
- Body contoh:

```json
{
  "status": "processing"
}
```

- Expected:
  - status `200` jika transisi valid
  - status `400` jika transisi tidak valid

#### R-51 `GET /admin/users`

- Expected:
  - status `200`
  - list user tampil

#### R-52 `POST /orders/:orderId/ship` oleh admin

- Auth: admin
- Order harus sudah `confirmed`
- Expected:
  - status `200`
  - status jadi `shipped`

#### R-53 `POST /orders/:orderId/deliver` oleh admin

- Auth: admin
- Order harus sudah `shipped`
- Expected:
  - status `200`
  - status jadi `delivered`

## 6. tRPC Manual Test Checklist

Semua request tRPC dipanggil ke `/trpc/<procedure>`.

Catatan format:

- Query: `GET`
- Mutation: `POST`
- Success response tRPC normalnya berbentuk `result.data`
- Error tRPC normalnya punya `error.data.httpStatus`

### 6.1 Health

#### T-01 `GET /health`

- Expected:
  - status `200`
  - `api: "tRPC"`

### 6.2 Auth

#### T-02 `auth.register`

- Method: `POST /trpc/auth.register`
- Body: sama seperti REST register
- Expected:
  - status `200`
  - `result.data.user` ada
  - cookie auth terset

#### T-03 `auth.register` duplicate email

- Expected:
  - status HTTP sesuai error
  - `error.data.httpStatus = 409`

#### T-04 `auth.login`

- Method: `POST /trpc/auth.login`
- Body login user
- Expected:
  - status `200`
  - `result.data.user` ada

#### T-05 `auth.login` wrong password

- Expected:
  - status error
  - `httpStatus = 401`

#### T-06 `auth.me`

- Method:

```http
GET /trpc/auth.me
```

- Expected:
  - status `200`
  - `result.data` berisi user aktif

#### T-07 `auth.changePassword`

- Method: `POST /trpc/auth.changePassword`
- Expected:
  - status `200`
  - perubahan password sukses

#### T-08 `auth.refresh`

- Method: `POST /trpc/auth.refresh`
- Body: kosong
- Expected:
  - status `200`
  - access token cookie diperbarui

#### T-09 `auth.logout`

- Method: `POST /trpc/auth.logout`
- Expected:
  - status `200`
  - sesi logout

### 6.3 Categories

#### T-10 `category.getAll`

- Method:

```http
GET /trpc/category.getAll
```

- Expected:
  - status `200`
  - `result.data` array kategori

#### T-11 `category.getBySlug`

- Method:

```http
GET /trpc/category.getBySlug?input={"slug":"{{CATEGORY_SLUG}}"}
```

- Gunakan URL-encoded JSON di Bruno
- Expected:
  - status `200`

### 6.4 Products

#### T-12 `product.getAll`

- Query input:

```json
{
  "page": 1,
  "limit": 12
}
```

- Expected:
  - status `200`
  - paginated result tampil
  - simpan `PRODUCT_ID`, `PRODUCT_SLUG`

#### T-13 `product.getAll` filter kategori

- Input:

```json
{
  "page": 1,
  "limit": 12,
  "categoryId": "{{CATEGORY_ID}}"
}
```

- Expected:
  - status `200`

#### T-14 `product.getAll` filter harga dan rating

- Input:

```json
{
  "page": 1,
  "limit": 12,
  "minPrice": 10000,
  "maxPrice": 100000,
  "minRating": 4
}
```

- Expected:
  - status `200`

#### T-15 `product.getAll` sort

- Input:

```json
{
  "page": 1,
  "limit": 12,
  "sortBy": "sold_count",
  "sortOrder": "desc"
}
```

- Expected:
  - status `200`
  - tidak error karena snake_case alias harus didukung

#### T-16 `product.search`

- Input:

```json
{
  "q": "sepatu",
  "page": 1,
  "limit": 12
}
```

- Expected:
  - status `200`

#### T-17 `product.getBySlug`

- Input:

```json
{
  "slug": "{{PRODUCT_SLUG}}"
}
```

- Expected:
  - status `200`

#### T-18 `product.getById`

- Input:

```json
{
  "id": "{{PRODUCT_ID}}"
}
```

- Expected:
  - status `200`

### 6.5 Profile

#### T-19 `profile.get`

- Expected:
  - status `200`

#### T-20 `profile.update`

- Body: update profile
- Expected:
  - status `200`

### 6.6 Addresses

#### T-21 `profile.getAddresses`

- Expected:
  - status `200`

#### T-22 `profile.addAddress`

- Body: payload alamat
- Expected:
  - status `200`
  - simpan `ADDRESS_ID`

#### T-23 `profile.updateAddress`

- Body:

```json
{
  "addressId": "{{ADDRESS_ID}}",
  "data": {
    "city": "Malang"
  }
}
```

- Expected:
  - status `200`

#### T-24 `profile.setDefaultAddress`

- Body:

```json
{
  "addressId": "{{ADDRESS_ID}}"
}
```

- Expected:
  - status `200`

#### T-25 `profile.deleteAddress`

- Body:

```json
{
  "addressId": "{{ADDRESS_ID}}"
}
```

- Expected:
  - status `200`

### 6.7 Cart

#### T-26 `cart.get`

- Expected:
  - status `200`
  - simpan `CART_ID`

#### T-27 `cart.addItem`

- Body:

```json
{
  "productId": "{{PRODUCT_ID}}",
  "quantity": 1
}
```

- Expected:
  - status `200`
  - cart terbaru dikembalikan
  - simpan `CART_ITEM_ID`

#### T-28 `cart.updateItem`

- Body:

```json
{
  "itemId": "{{CART_ITEM_ID}}",
  "quantity": 2
}
```

- Expected:
  - status `200`

#### T-29 `cart.removeItem`

- Body:

```json
{
  "itemId": "{{CART_ITEM_ID}}"
}
```

- Expected:
  - status `200`

#### T-30 `cart.clear`

- Body: kosong
- Expected:
  - status `200`
  - `success: true`

### 6.8 Checkout

#### T-31 `checkout.calculateSummary`

- Body:

```json
{
  "cartId": "{{CART_ID}}",
  "shippingMethod": "regular"
}
```

- Expected:
  - status `200`
  - subtotal, tax, shippingCost, total ada

#### T-32 `checkout.confirm`

- Body:

```json
{
  "cartId": "{{CART_ID}}",
  "addressId": "{{ADDRESS_ID}}",
  "shippingMethod": "regular",
  "paymentMethod": "bank_transfer"
}
```

- Expected:
  - status `200`
  - order terbentuk
  - simpan `ORDER_ID` dan `ORDER_NUMBER`

#### T-33 `checkout.getSummary`

- Input:

```json
{
  "orderNumber": "{{ORDER_NUMBER}}"
}
```

- Expected:
  - status `200`
  - summary checkout tampil

### 6.9 Orders

#### T-34 `order.getAll`

- Input:

```json
{
  "page": 1,
  "limit": 20
}
```

- Expected:
  - status `200`

#### T-35 `order.getById`

- Input:

```json
{
  "orderId": "{{ORDER_ID}}"
}
```

- Expected:
  - status `200`

#### T-36 `order.confirm`

- Input:

```json
{
  "orderId": "{{ORDER_ID}}"
}
```

- Expected:
  - status `200`
  - status menjadi `confirmed`

#### T-37 `order.cancel`

- Gunakan order lain yang masih `pending_payment`
- Expected:
  - status `200`
  - status jadi `cancelled`

#### T-38 `order.ship` oleh user biasa

- Input:

```json
{
  "orderId": "{{ORDER_ID}}"
}
```

- Expected:
  - status error
  - `httpStatus = 403`

#### T-39 `order.deliver` oleh user biasa

- Expected:
  - status error
  - `httpStatus = 403`

### 6.10 Admin

#### T-40 `admin.getDashboard`

- Expected:
  - status `200`

#### T-41 `admin.getProducts`

- Input:

```json
{
  "page": 1,
  "limit": 20
}
```

- Expected:
  - status `200`

#### T-42 `admin.createProduct`

- Body: sama seperti REST create product
- Expected:
  - status `200`
  - simpan `ADMIN_PRODUCT_ID`

#### T-43 `admin.updateProduct`

- Body:

```json
{
  "id": "{{ADMIN_PRODUCT_ID}}",
  "price": 88888,
  "stock": 15
}
```

- Expected:
  - status `200`

#### T-44 `admin.deleteProduct`

- Body:

```json
{
  "id": "{{ADMIN_PRODUCT_ID}}"
}
```

- Expected:
  - status `200`

#### T-45 `admin.getOrders`

- Expected:
  - status `200`

#### T-46 `admin.updateOrderStatus`

- Body:

```json
{
  "orderId": "{{ORDER_ID}}",
  "status": "processing"
}
```

- Expected:
  - status `200` untuk transisi valid
  - status error untuk transisi tidak valid

#### T-47 `admin.getUsers`

- Expected:
  - status `200`

#### T-48 `order.ship` oleh admin

- Input:

```json
{
  "orderId": "{{ORDER_ID}}"
}
```

- Expected:
  - status `200`
  - status jadi `shipped`

#### T-49 `order.deliver` oleh admin

- Input:

```json
{
  "orderId": "{{ORDER_ID}}"
}
```

- Expected:
  - status `200`
  - status jadi `delivered`

## 7. Negative Cases Wajib untuk Skripsi

Supaya pengujian manual terlihat kuat, minimal jalankan negative cases ini pada REST dan tRPC:

1. Login dengan password salah -> `401`
2. Register email duplikat -> `409`
3. Protected route tanpa login -> `401`
4. User biasa akses route admin -> `403`
5. User biasa `ship` order -> `403`
6. User biasa `deliver` order -> `403`
7. UUID/orderId invalid format -> `400`
8. Resource valid format tapi tidak ditemukan -> `404`
9. Quantity melebihi stok -> `400`
10. Checkout cart kosong -> `400`
11. Transisi status order tidak valid -> `400`

## 8. Bukti Minimum yang Sebaiknya Dilampirkan

Untuk lampiran skripsi, minimal ambil screenshot:

1. REST register success
2. REST login success
3. REST get products success
4. REST add cart success
5. REST checkout confirm success
6. REST user ship forbidden
7. REST admin ship success
8. tRPC login success
9. tRPC get products success
10. tRPC cart add success
11. tRPC checkout confirm success
12. tRPC user ship forbidden
13. tRPC admin ship success
14. admin dashboard success pada kedua protokol

## 9. Kesimpulan Pemakaian

Jika semua request inti di dokumen ini berjalan sesuai hasil yang diharapkan:

- modul fungsional utama sudah diuji manual secara menyeluruh
- REST dan tRPC sama-sama memiliki bukti eksekusi nyata
- hasil pengujian manual sudah cukup kuat untuk diringkas ke bab hasil skripsi

Dokumen ini sengaja dibuat sebagai checklist operasional. Setelah bug fix selesai, kamu bisa menjalankan semua request di sini satu per satu, lalu memindahkan hasil akhirnya ke tabel pengujian manual di skripsi.
