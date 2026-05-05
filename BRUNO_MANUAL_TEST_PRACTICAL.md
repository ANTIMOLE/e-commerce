# Bruno Manual Test Practical Sheet

File ini dibuat untuk eksekusi cepat di Bruno.

Tujuannya bukan menjelaskan teori, tapi supaya kamu bisa langsung:

- copy URL
- copy body
- kirim request
- simpan variable
- cek hasil minimum

Gunakan file ini setelah bug fix selesai.

## 1. Setup Cepat Bruno

Buat environment variable berikut:

```text
base_rest=http://localhost:4000/api/v1
base_trpc=http://localhost:4001/trpc
```

Buat 3 session/cookie jar terpisah:

- `ANON`
- `USER`
- `ADMIN`

Buat variable yang akan diisi selama test:

```text
CATEGORY_ID=
CATEGORY_SLUG=
PRODUCT_ID=
PRODUCT_SLUG=
CART_ID=
CART_ITEM_ID=
ADDRESS_ID=
ORDER_ID=
ORDER_NUMBER=
ADMIN_PRODUCT_ID=
```

## 2. Rule Praktis tRPC di Bruno

### Query tRPC

Format:

```text
GET {{base_trpc}}/<procedure>?input=<urlencoded-json>
```

Contoh:

```text
GET {{base_trpc}}/product.getBySlug?input=%7B%22slug%22%3A%22sepatu-nike%22%7D
```

### Mutation tRPC

Format:

```text
POST {{base_trpc}}/<procedure>
Content-Type: application/json
```

Body = JSON mentah.

Contoh:

```json
{
  "email": "bruno.user@example.com",
  "password": "TestPass123!"
}
```

## 3. Payload Siap Pakai

### User register

```json
{
  "name": "Bruno User",
  "email": "bruno.user@example.com",
  "password": "TestPass123!"
}
```

### User login

```json
{
  "email": "bruno.user@example.com",
  "password": "TestPass123!"
}
```

### User login password baru

```json
{
  "email": "bruno.user@example.com",
  "password": "NewPass123!"
}
```

### Change password

```json
{
  "oldPassword": "TestPass123!",
  "newPassword": "NewPass123!"
}
```

### Update profile

```json
{
  "name": "Bruno User Updated",
  "phone": "081298765432"
}
```

### Create address

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

### Update address partial

```json
{
  "city": "Malang"
}
```

### Add cart item

```json
{
  "productId": "{{PRODUCT_ID}}",
  "quantity": 1
}
```

### Update cart item

```json
{
  "quantity": 2
}
```

### REST calculate summary

```json
{
  "cartId": "{{CART_ID}}",
  "shippingMethod": "regular"
}
```

### REST confirm checkout

```json
{
  "cartId": "{{CART_ID}}",
  "addressId": "{{ADDRESS_ID}}",
  "shippingMethod": "regular",
  "paymentMethod": "bank_transfer"
}
```

### Admin create product

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

### Admin update product

```json
{
  "price": 88888,
  "stock": 15
}
```

### Admin update order status

```json
{
  "status": "processing"
}
```

## 4. REST Practical Run Sheet

Gunakan base URL: `{{base_rest}}`

---

## A. REST HEALTH

### REST-01 Health

- Session: `ANON`
- Method: `GET`
- URL:

```text
{{base_rest}}/health
```

- Expected:
  - `200`
  - ada `status = ok`
  - ada `api = REST`

---

## B. REST AUTH

### REST-02 Register

- Session: `ANON`
- Method: `POST`
- URL:

```text
{{base_rest}}/auth/register
```

- Body: pakai payload `User register`
- Expected:
  - `201`
  - user berhasil dibuat
  - cookie auth terset

### REST-03 Register duplicate

- Session: `ANON`
- Kirim ulang request register yang sama
- Expected:
  - `409`

### REST-04 Login

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/auth/login
```

- Body: payload `User login`
- Expected:
  - `200`
  - cookie auth terset

### REST-05 Login wrong password

- Session: `ANON`
- URL:

```text
{{base_rest}}/auth/login
```

- Body:

```json
{
  "email": "bruno.user@example.com",
  "password": "Salah123!"
}
```

- Expected:
  - `401`

### REST-06 Get me

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_rest}}/auth/me
```

- Expected:
  - `200`
  - ada `id`, `email`, `role`

### REST-07 Get auth profile

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_rest}}/auth/profile
```

- Expected:
  - `200`

### REST-08 Change password

- Session: `USER`
- Method: `PATCH`
- URL:

```text
{{base_rest}}/auth/change-password
```

- Body: payload `Change password`
- Expected:
  - `200`

### REST-09 Login with new password

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/auth/login
```

- Body: payload `User login password baru`
- Expected:
  - `200`

### REST-10 Refresh

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/auth/refresh
```

- Expected:
  - `200`

### REST-11 Logout

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/auth/logout
```

- Expected:
  - `200`

### REST-12 Protected route after logout

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_rest}}/auth/me
```

- Expected:
  - `401`

### REST-13 Login again for next tests

- Session: `USER`
- URL:

```text
{{base_rest}}/auth/login
```

- Body: payload `User login password baru`
- Expected:
  - `200`

---

## C. REST CATEGORY + PRODUCT

### REST-14 Get categories

- Session: `ANON`
- Method: `GET`
- URL:

```text
{{base_rest}}/categories
```

- Expected:
  - `200`
  - array tidak kosong

- Simpan:
  - `CATEGORY_ID`
  - `CATEGORY_SLUG`

### REST-15 Get category by slug

- Session: `ANON`
- Method: `GET`
- URL:

```text
{{base_rest}}/categories/{{CATEGORY_SLUG}}
```

- Expected:
  - `200`

### REST-16 Get products

- Session: `ANON`
- Method: `GET`
- URL:

```text
{{base_rest}}/products?page=1&limit=12
```

- Expected:
  - `200`
  - list produk ada

- Simpan:
  - `PRODUCT_ID`
  - `PRODUCT_SLUG`

### REST-17 Products by category

- URL:

```text
{{base_rest}}/products?page=1&limit=12&categoryId={{CATEGORY_ID}}
```

- Expected:
  - `200`

### REST-18 Products by price

- URL:

```text
{{base_rest}}/products?page=1&limit=12&minPrice=10000&maxPrice=100000
```

- Expected:
  - `200`

### REST-19 Products by rating

- URL:

```text
{{base_rest}}/products?page=1&limit=12&minRating=4
```

- Expected:
  - `200`

### REST-20 Products sort sold_count

- URL:

```text
{{base_rest}}/products?page=1&limit=12&sortBy=sold_count&sortOrder=desc
```

- Expected:
  - `200`

### REST-21 Product search

- URL:

```text
{{base_rest}}/products/search?q=sepatu&page=1&limit=12
```

- Expected:
  - `200`

### REST-22 Product detail

- URL:

```text
{{base_rest}}/products/{{PRODUCT_SLUG}}
```

- Expected:
  - `200`

### REST-23 Product detail invalid slug

- URL:

```text
{{base_rest}}/products/slug-tidak-ada
```

- Expected:
  - `404`

---

## D. REST PROFILE + ADDRESS

### REST-24 Get profile

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_rest}}/profile
```

- Expected:
  - `200`

### REST-25 Update profile

- Session: `USER`
- Method: `PATCH`
- URL:

```text
{{base_rest}}/profile
```

- Body: payload `Update profile`
- Expected:
  - `200`

### REST-26 Get addresses

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_rest}}/profile/addresses
```

- Expected:
  - `200`

### REST-27 Create address

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/profile/addresses
```

- Body: payload `Create address`
- Expected:
  - `200` atau `201`

- Simpan:
  - `ADDRESS_ID`

### REST-28 Update address

- Session: `USER`
- Method: `PATCH`
- URL:

```text
{{base_rest}}/profile/addresses/{{ADDRESS_ID}}
```

- Body: payload `Update address partial`
- Expected:
  - `200`

### REST-29 Set default address

- Session: `USER`
- Method: `PATCH`
- URL:

```text
{{base_rest}}/profile/addresses/{{ADDRESS_ID}}/default
```

- Expected:
  - `200`

---

## E. REST CART

### REST-30 Get cart

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_rest}}/cart
```

- Expected:
  - `200`

- Simpan:
  - `CART_ID`

### REST-31 Add cart item

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/cart
```

- Body: payload `Add cart item`
- Expected:
  - `200`

### REST-32 Get cart again

- Session: `USER`
- URL:

```text
{{base_rest}}/cart
```

- Expected:
  - `200`

- Simpan:
  - `CART_ITEM_ID`
  - `CART_ID`

### REST-33 Update cart item

- Session: `USER`
- Method: `PATCH`
- URL:

```text
{{base_rest}}/cart/{{CART_ITEM_ID}}
```

- Body: payload `Update cart item`
- Expected:
  - `200`

### REST-34 Add cart item stok berlebih

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/cart
```

- Body:

```json
{
  "productId": "{{PRODUCT_ID}}",
  "quantity": 99999
}
```

- Expected:
  - `400`

### REST-35 Delete cart item

- Session: `USER`
- Method: `DELETE`
- URL:

```text
{{base_rest}}/cart/{{CART_ITEM_ID}}
```

- Expected:
  - `200`

### REST-36 Add cart item again for checkout

- Session: `USER`
- Ulangi `REST-31`
- Expected:
  - `200`

### REST-37 Get cart again for checkout

- Session: `USER`
- URL:

```text
{{base_rest}}/cart
```

- Expected:
  - `200`

- Simpan lagi:
  - `CART_ID`
  - `CART_ITEM_ID`

---

## F. REST CHECKOUT

### REST-38 Calculate summary

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/checkout/calculate-summary
```

- Body: payload `REST calculate summary`
- Expected:
  - `200`
  - ada `subtotal`, `tax`, `shippingCost`, `total`

### REST-39 Confirm checkout

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/checkout/confirm
```

- Body: payload `REST confirm checkout`
- Expected:
  - `200` atau `201`

- Simpan:
  - `ORDER_ID`
  - `ORDER_NUMBER`

### REST-40 Checkout summary

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_rest}}/checkout/summary/{{ORDER_NUMBER}}
```

- Expected:
  - `200`

---

## G. REST ORDERS

### REST-41 Get orders

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_rest}}/orders
```

- Expected:
  - `200`

### REST-42 Get order by id

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_rest}}/orders/{{ORDER_ID}}
```

- Expected:
  - `200`

### REST-43 Confirm order

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/orders/{{ORDER_ID}}/confirm
```

- Expected:
  - `200`

### REST-44 User tries ship

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/orders/{{ORDER_ID}}/ship
```

- Expected:
  - `403`

### REST-45 User tries deliver

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_rest}}/orders/{{ORDER_ID}}/deliver
```

- Expected:
  - `403`

---

## H. REST ADMIN

### REST-46 Admin login

- Session: `ADMIN`
- Method: `POST`
- URL:

```text
{{base_rest}}/auth/login
```

- Body: akun admin lokal
- Expected:
  - `200`

### REST-47 Admin dashboard

- Session: `ADMIN`
- Method: `GET`
- URL:

```text
{{base_rest}}/admin/dashboard
```

- Expected:
  - `200`

### REST-48 Admin products

- Session: `ADMIN`
- Method: `GET`
- URL:

```text
{{base_rest}}/admin/products?page=1&limit=20
```

- Expected:
  - `200`

### REST-49 Admin create product

- Session: `ADMIN`
- Method: `POST`
- URL:

```text
{{base_rest}}/admin/products
```

- Body: payload `Admin create product`
- Expected:
  - `200` atau `201`

- Simpan:
  - `ADMIN_PRODUCT_ID`

### REST-50 Admin update product

- Session: `ADMIN`
- Method: `PATCH`
- URL:

```text
{{base_rest}}/admin/products/{{ADMIN_PRODUCT_ID}}
```

- Body: payload `Admin update product`
- Expected:
  - `200`

### REST-51 Admin delete product

- Session: `ADMIN`
- Method: `DELETE`
- URL:

```text
{{base_rest}}/admin/products/{{ADMIN_PRODUCT_ID}}
```

- Expected:
  - `200`

### REST-52 Admin get orders

- Session: `ADMIN`
- Method: `GET`
- URL:

```text
{{base_rest}}/admin/orders?page=1&limit=20
```

- Expected:
  - `200`

### REST-53 Admin get users

- Session: `ADMIN`
- Method: `GET`
- URL:

```text
{{base_rest}}/admin/users?page=1&limit=20
```

- Expected:
  - `200`

### REST-54 Admin ship order

- Session: `ADMIN`
- Method: `POST`
- URL:

```text
{{base_rest}}/orders/{{ORDER_ID}}/ship
```

- Expected:
  - `200`

### REST-55 Admin deliver order

- Session: `ADMIN`
- Method: `POST`
- URL:

```text
{{base_rest}}/orders/{{ORDER_ID}}/deliver
```

- Expected:
  - `200`

---

## 5. tRPC Practical Run Sheet

Gunakan base URL: `{{base_trpc}}`

---

## A. tRPC HEALTH

### TRPC-01 Health

- Session: `ANON`
- Method: `GET`
- URL:

```text
http://localhost:4001/health
```

- Expected:
  - `200`
  - `api = tRPC`

---

## B. tRPC AUTH

### TRPC-02 Register

- Session: `ANON`
- Method: `POST`
- URL:

```text
{{base_trpc}}/auth.register
```

- Body: payload `User register`
- Expected:
  - `200`
  - `result.data.user` ada

### TRPC-03 Register duplicate

- Session: `ANON`
- Ulangi register
- Expected:
  - error
  - `httpStatus = 409`

### TRPC-04 Login

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_trpc}}/auth.login
```

- Body: payload `User login password baru`
- Expected:
  - `200`

### TRPC-05 Me

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_trpc}}/auth.me
```

- Expected:
  - `200`

### TRPC-06 Change password optional

- Kalau mau tes terpisah di tRPC, gunakan:
- URL:

```text
{{base_trpc}}/auth.changePassword
```

- Body: `oldPassword/newPassword`
- Expected:
  - `200`

### TRPC-07 Refresh

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_trpc}}/auth.refresh
```

- Body:

```json
{}
```

- Expected:
  - `200`

### TRPC-08 Logout

- Session: `USER`
- Method: `POST`
- URL:

```text
{{base_trpc}}/auth.logout
```

- Body:

```json
{}
```

- Expected:
  - `200`

### TRPC-09 Login again for next tests

- Session: `USER`
- URL:

```text
{{base_trpc}}/auth.login
```

- Body: payload `User login password baru`

---

## C. tRPC CATEGORY + PRODUCT

### TRPC-10 category.getAll

- Session: `ANON`
- Method: `GET`
- URL:

```text
{{base_trpc}}/category.getAll
```

- Expected:
  - `200`

- Simpan:
  - `CATEGORY_ID`
  - `CATEGORY_SLUG`

### TRPC-11 category.getBySlug

- URL:

```text
{{base_trpc}}/category.getBySlug?input=%7B%22slug%22%3A%22{{CATEGORY_SLUG}}%22%7D
```

- Expected:
  - `200`

### TRPC-12 product.getAll

- URL:

```text
{{base_trpc}}/product.getAll?input=%7B%22page%22%3A1%2C%22limit%22%3A12%7D
```

- Expected:
  - `200`

- Simpan:
  - `PRODUCT_ID`
  - `PRODUCT_SLUG`

### TRPC-13 product.getAll by category

- URL:

```text
{{base_trpc}}/product.getAll?input=%7B%22page%22%3A1%2C%22limit%22%3A12%2C%22categoryId%22%3A%22{{CATEGORY_ID}}%22%7D
```

- Expected:
  - `200`

### TRPC-14 product.getAll by price/rating

- URL:

```text
{{base_trpc}}/product.getAll?input=%7B%22page%22%3A1%2C%22limit%22%3A12%2C%22minPrice%22%3A10000%2C%22maxPrice%22%3A100000%2C%22minRating%22%3A4%7D
```

- Expected:
  - `200`

### TRPC-15 product.getAll sort sold_count

- URL:

```text
{{base_trpc}}/product.getAll?input=%7B%22page%22%3A1%2C%22limit%22%3A12%2C%22sortBy%22%3A%22sold_count%22%2C%22sortOrder%22%3A%22desc%22%7D
```

- Expected:
  - `200`

### TRPC-16 product.search

- URL:

```text
{{base_trpc}}/product.search?input=%7B%22q%22%3A%22sepatu%22%2C%22page%22%3A1%2C%22limit%22%3A12%7D
```

- Expected:
  - `200`

### TRPC-17 product.getBySlug

- URL:

```text
{{base_trpc}}/product.getBySlug?input=%7B%22slug%22%3A%22{{PRODUCT_SLUG}}%22%7D
```

- Expected:
  - `200`

### TRPC-18 product.getById

- URL:

```text
{{base_trpc}}/product.getById?input=%7B%22id%22%3A%22{{PRODUCT_ID}}%22%7D
```

- Expected:
  - `200`

---

## D. tRPC PROFILE + ADDRESS

### TRPC-19 profile.get

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_trpc}}/profile.get
```

- Expected:
  - `200`

### TRPC-20 profile.update

- Method: `POST`
- URL:

```text
{{base_trpc}}/profile.update
```

- Body: payload `Update profile`
- Expected:
  - `200`

### TRPC-21 profile.getAddresses

- Method: `GET`
- URL:

```text
{{base_trpc}}/profile.getAddresses
```

- Expected:
  - `200`

### TRPC-22 profile.addAddress

- Method: `POST`
- URL:

```text
{{base_trpc}}/profile.addAddress
```

- Body: payload `Create address`
- Expected:
  - `200`

- Simpan:
  - `ADDRESS_ID`

### TRPC-23 profile.updateAddress

- URL:

```text
{{base_trpc}}/profile.updateAddress
```

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
  - `200`

### TRPC-24 profile.setDefaultAddress

- URL:

```text
{{base_trpc}}/profile.setDefaultAddress
```

- Body:

```json
{
  "addressId": "{{ADDRESS_ID}}"
}
```

- Expected:
  - `200`

---

## E. tRPC CART

### TRPC-25 cart.get

- Session: `USER`
- Method: `GET`
- URL:

```text
{{base_trpc}}/cart.get
```

- Expected:
  - `200`

- Simpan:
  - `CART_ID`

### TRPC-26 cart.addItem

- Method: `POST`
- URL:

```text
{{base_trpc}}/cart.addItem
```

- Body:

```json
{
  "productId": "{{PRODUCT_ID}}",
  "quantity": 1
}
```

- Expected:
  - `200`

### TRPC-27 cart.get again

- URL:

```text
{{base_trpc}}/cart.get
```

- Expected:
  - `200`

- Simpan:
  - `CART_ITEM_ID`
  - `CART_ID`

### TRPC-28 cart.updateItem

- URL:

```text
{{base_trpc}}/cart.updateItem
```

- Body:

```json
{
  "itemId": "{{CART_ITEM_ID}}",
  "quantity": 2
}
```

- Expected:
  - `200`

### TRPC-29 cart.removeItem

- URL:

```text
{{base_trpc}}/cart.removeItem
```

- Body:

```json
{
  "itemId": "{{CART_ITEM_ID}}"
}
```

- Expected:
  - `200`

### TRPC-30 cart.addItem again for checkout

- Ulangi `TRPC-26`

### TRPC-31 cart.get again for checkout

- URL:

```text
{{base_trpc}}/cart.get
```

- Simpan:
  - `CART_ITEM_ID`
  - `CART_ID`

### TRPC-32 cart.clear optional

- URL:

```text
{{base_trpc}}/cart.clear
```

- Body:

```json
{}
```

- Expected:
  - `200`

---

## F. tRPC CHECKOUT

### TRPC-33 checkout.calculateSummary

- Method: `POST`
- URL:

```text
{{base_trpc}}/checkout.calculateSummary
```

- Body:

```json
{
  "cartId": "{{CART_ID}}",
  "shippingMethod": "regular"
}
```

- Expected:
  - `200`

### TRPC-34 checkout.confirm

- Method: `POST`
- URL:

```text
{{base_trpc}}/checkout.confirm
```

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
  - `200`

- Simpan:
  - `ORDER_ID`
  - `ORDER_NUMBER`

### TRPC-35 checkout.getSummary

- Method: `GET`
- URL:

```text
{{base_trpc}}/checkout.getSummary?input=%7B%22orderNumber%22%3A%22{{ORDER_NUMBER}}%22%7D
```

- Expected:
  - `200`

---

## G. tRPC ORDERS

### TRPC-36 order.getAll

- Method: `GET`
- URL:

```text
{{base_trpc}}/order.getAll?input=%7B%22page%22%3A1%2C%22limit%22%3A20%7D
```

- Expected:
  - `200`

### TRPC-37 order.getById

- URL:

```text
{{base_trpc}}/order.getById?input=%7B%22orderId%22%3A%22{{ORDER_ID}}%22%7D
```

- Expected:
  - `200`

### TRPC-38 order.confirm

- Method: `POST`
- URL:

```text
{{base_trpc}}/order.confirm
```

- Body:

```json
{
  "orderId": "{{ORDER_ID}}"
}
```

- Expected:
  - `200`

### TRPC-39 User tries ship

- Method: `POST`
- URL:

```text
{{base_trpc}}/order.ship
```

- Body:

```json
{
  "orderId": "{{ORDER_ID}}"
}
```

- Expected:
  - error
  - `httpStatus = 403`

### TRPC-40 User tries deliver

- Method: `POST`
- URL:

```text
{{base_trpc}}/order.deliver
```

- Body:

```json
{
  "orderId": "{{ORDER_ID}}"
}
```

- Expected:
  - error
  - `httpStatus = 403`

---

## H. tRPC ADMIN

### TRPC-41 Admin login

- Session: `ADMIN`
- Method: `POST`
- URL:

```text
{{base_trpc}}/auth.login
```

- Body: akun admin lokal
- Expected:
  - `200`

### TRPC-42 admin.getDashboard

- Session: `ADMIN`
- Method: `GET`
- URL:

```text
{{base_trpc}}/admin.getDashboard
```

- Expected:
  - `200`

### TRPC-43 admin.getProducts

- URL:

```text
{{base_trpc}}/admin.getProducts?input=%7B%22page%22%3A1%2C%22limit%22%3A20%7D
```

- Expected:
  - `200`

### TRPC-44 admin.createProduct

- Method: `POST`
- URL:

```text
{{base_trpc}}/admin.createProduct
```

- Body: payload `Admin create product`
- Expected:
  - `200`

- Simpan:
  - `ADMIN_PRODUCT_ID`

### TRPC-45 admin.updateProduct

- URL:

```text
{{base_trpc}}/admin.updateProduct
```

- Body:

```json
{
  "id": "{{ADMIN_PRODUCT_ID}}",
  "price": 88888,
  "stock": 15
}
```

- Expected:
  - `200`

### TRPC-46 admin.deleteProduct

- URL:

```text
{{base_trpc}}/admin.deleteProduct
```

- Body:

```json
{
  "id": "{{ADMIN_PRODUCT_ID}}"
}
```

- Expected:
  - `200`

### TRPC-47 admin.getOrders

- URL:

```text
{{base_trpc}}/admin.getOrders?input=%7B%22page%22%3A1%2C%22limit%22%3A20%7D
```

- Expected:
  - `200`

### TRPC-48 admin.getUsers

- URL:

```text
{{base_trpc}}/admin.getUsers?input=%7B%22page%22%3A1%2C%22limit%22%3A20%7D
```

- Expected:
  - `200`

### TRPC-49 Admin ship order

- Method: `POST`
- URL:

```text
{{base_trpc}}/order.ship
```

- Body:

```json
{
  "orderId": "{{ORDER_ID}}"
}
```

- Expected:
  - `200`

### TRPC-50 Admin deliver order

- Method: `POST`
- URL:

```text
{{base_trpc}}/order.deliver
```

- Body:

```json
{
  "orderId": "{{ORDER_ID}}"
}
```

- Expected:
  - `200`

### TRPC-51 admin.updateOrderStatus

- Method: `POST`
- URL:

```text
{{base_trpc}}/admin.updateOrderStatus
```

- Body:

```json
{
  "orderId": "{{ORDER_ID}}",
  "status": "processing"
}
```

- Expected:
  - `200` jika transisi valid
  - `400` jika transisi tidak valid

---

## 6. Negative Set Minimum

Kalau mau cepat tapi tetap kuat, minimal jalankan ini juga di REST dan tRPC:

1. login salah password -> `401`
2. register duplicate -> `409`
3. protected route tanpa login -> `401`
4. admin route pakai user biasa -> `403`
5. ship pakai user biasa -> `403`
6. deliver pakai user biasa -> `403`
7. quantity terlalu besar -> `400`
8. resource tidak ditemukan -> `404`

## 7. Bukti Screenshot Minimum

Ambil screenshot untuk:

1. REST register sukses
2. REST login sukses
3. REST get products sukses
4. REST add cart sukses
5. REST checkout confirm sukses
6. REST user ship `403`
7. REST admin ship `200`
8. tRPC login sukses
9. tRPC get products sukses
10. tRPC add cart sukses
11. tRPC checkout confirm sukses
12. tRPC user ship `403`
13. tRPC admin ship `200`
14. REST admin dashboard sukses
15. tRPC admin dashboard sukses

## 8. Pakai File Ini Gimana

Paling praktis:

1. isi `base_rest` dan `base_trpc`
2. login admin lokal
3. jalanin urutan REST dari atas ke bawah
4. jalanin urutan tRPC dari atas ke bawah
5. setiap ketemu ID/slug/order number, simpan ke variable Bruno
6. tandai status request: `PASS` atau `FAIL`

File ini sengaja dibuat supaya kamu tinggal copy blok URL dan body ke Bruno, bukan baca penjelasan panjang dulu.
