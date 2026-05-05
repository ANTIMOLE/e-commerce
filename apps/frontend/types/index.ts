// ============================================================
// FRONTEND TYPES / MODELS
// ============================================================

export interface PaginatedResponse<T> {
  data:        T[];
  totalCount:  number;
  page:        number;
  totalPages:  number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?:   T;
  message?: string;
  error?:  string;
}

export type UserRole = "USER" | "ADMIN";

export interface User {
  id:        string;
  name:      string;
  email:     string;
  phone?:    string;
  role:      UserRole;   // [FIX] tambah role — dibutuhkan admin layout guard
  createdAt: string;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
}

export interface LoginInput {
  email:        string;
  password:     string;
  captchaToken?: string;
}


export interface RegisterInput {
  name:     string;
  email:    string;
  password: string;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface Category {
  id:           string;
  name:         string;
  slug:         string;
  description?: string;
  productCount?: number;
}

export interface Product {
  id:          string;
  categoryId:  string;
  category?:   Category;
  name:        string;
  slug:        string;
  description?: string;
  price:       number;
  stock:       number;
  images:      string[];
  rating?:     number;
  soldCount:   number;
  location?:   string;
  discount?:   number;
  isActive:    boolean;
  createdAt:   string;
}

export interface ProductListParams {
  page?:        number;
  limit?:       number;
  categoryId?:  string;
  minPrice?:    number;
  maxPrice?:    number;
  minRating?:   number;
  q?:           string;
  sortBy?:      string;
  sortOrder?:   "asc" | "desc";
}

export interface CartItem {
  id:          string;
  cartId:      string;
  productId:   string;
  product:     Product;
  quantity:    number;
  priceAtTime: number;
  subtotal:    number;
  isAvailable: boolean;
}

export interface Cart {
  id:         string;
  userId:     string;
  items:      CartItem[];
  itemCount:  number;
  subtotal:   number;
  tax:        number;
  total:      number;
}

export interface AddToCartInput {
  productId: string;
  quantity:  number;
}

export interface UpdateCartItemInput {
  cartItemId: string;
  quantity:   number;
}

export interface Address {
  id:            string;
  userId:        string;
  label?:        string;
  recipientName: string;
  phone:         string;
  address:       string;
  city:          string;
  province:      string;
  zipCode:       string;
  isDefault:     boolean;
}

export interface AddressInput {
  label?:        string;
  recipientName: string;
  phone:         string;
  address:       string;
  city:          string;
  province:      string;
  zipCode:       string;
  isDefault?:    boolean;
}

export type ShippingMethodCode = "regular" | "express";
export type PaymentMethodCode  = "bank_transfer" | "qris" | "cod";

export interface ShippingOption {
  code:          ShippingMethodCode;
  name:          string;
  description:   string;
  estimatedDays: string;
  price:         number;
}

export interface PaymentOption {
  code:        PaymentMethodCode;
  name:        string;
  description: string;
}

export interface CheckoutSummary {
  items:        CartItem[];
  subtotal:     number;
  tax:          number;
  shippingCost: number;
  total:        number;
}

export interface CheckoutConfirmInput {
  cartId:          string;
  addressId:       string;
  shippingMethod:  ShippingMethodCode;
  paymentMethod:   PaymentMethodCode;
}

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  id:           string;
  orderId:      string;
  productId?:   string;
  productName:  string;
  productImage?: string;
  quantity:     number;
  unitPrice:    number;
  subtotal:     number;
}

// [FIX] shippingAddress bukan Address entity — ini JSON snapshot yang disimpan
// saat order dibuat. Tidak punya id/userId/isDefault karena bukan row tabel Address.
export interface OrderShippingAddressSnapshot {
  recipientName: string;
  phone:         string;
  address:       string;
  city:          string;
  province:      string;
  zipCode:       string;
}

export interface Order {
  id:              string;
  userId:          string;
  orderNumber:     string;
  status:          OrderStatus;
  subtotal:        number;
  tax:             number;
  shippingCost:    number;
  total:           number;
  shippingAddress: OrderShippingAddressSnapshot;
  paymentMethod:   PaymentMethodCode;
  shippingMethod:  ShippingMethodCode;
  items:           OrderItem[];
  itemCount:       number;
  createdAt:       string;
  updatedAt:       string;
}

export interface OrderListParams {
  page?:   number;
  limit?:  number;
  status?: OrderStatus;
}

export interface UpdateProfileInput {
  name?:  string;
  phone?: string;
}

export interface CheckoutState {
  cartId?:         string;
  addressId?:      string;
  address?:        Address;
  shippingMethod?: ShippingOption;
  paymentMethod?:  PaymentOption;
  summary?:        CheckoutSummary;
}
