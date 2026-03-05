import type { Product } from "@/types";

const img = (text: string, bg = "e2e8f0", fg = "64748b") =>
  `https://placehold.co/400x400/${bg}/${fg}?text=${encodeURIComponent(text)}`;

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1", categoryId: "1",
    name: "Xiaomi Redmi 15 (8/128GB) Baterai 7000mAh",
    slug: "xiaomi-redmi-15-8-128gb",
    price: 1829000, stock: 45, soldCount: 1240,
    rating: 4.9, discount: 15, location: "Jakarta Timur",
    images: [img("Xiaomi Redmi 15", "1e293b", "94a3b8")],
    isActive: true, createdAt: "2025-01-10",
  },
  {
    id: "2", categoryId: "4",
    name: "Minyak Goreng Sunco 2 Liter - Si Paling Bening",
    slug: "minyak-goreng-sunco-2l",
    price: 27899, stock: 200, soldCount: 25000,
    rating: 4.5, discount: 7, location: "Kab. Banyuwangi",
    images: [img("Sunco 2L", "fef3c7", "92400e")],
    isActive: true, createdAt: "2025-01-05",
  },
  {
    id: "3", categoryId: "4",
    name: "Rinso Cair 500ml (52 pcs / 1 Dus) Deterjen Cair",
    slug: "rinso-cair-500ml-52pcs",
    price: 17900, stock: 150, soldCount: 8500,
    rating: 4.8, discount: 0, location: "Kab. Kediri",
    images: [img("Rinso Cair", "dbeafe", "1e40af")],
    isActive: true, createdAt: "2025-01-08",
  },
  {
    id: "4", categoryId: "9",
    name: "Sweety Silver Pants Popok Bayi S40/M32/L28/XL24",
    slug: "sweety-silver-pants-bayi",
    price: 44944, stock: 80, soldCount: 9200,
    rating: 4.9, discount: 55, location: "Jakarta Timur",
    images: [img("Sweety Pants", "fce7f3", "9d174d")],
    isActive: true, createdAt: "2025-01-12",
  },
  {
    id: "5", categoryId: "6",
    name: "Bantal Kesehatan Contour Pillow Ergonomis Head Neck",
    slug: "bantal-kesehatan-contour-pillow",
    price: 499000, stock: 30, soldCount: 750,
    rating: 4.8, discount: 0, location: "Jakarta Selatan",
    images: [img("Bantal Contour", "f0fdf4", "166534")],
    isActive: true, createdAt: "2025-01-15",
  },
  {
    id: "6", categoryId: "4",
    name: "Taiko Krezz Camilan Ikan Cumi Rasa Baru 500g",
    slug: "taiko-krezz-camilan-500g",
    price: 26558, stock: 300, soldCount: 100000,
    rating: 4.9, discount: 52, location: "Dunia-Shop",
    images: [img("Taiko Krezz", "fef9c3", "713f12")],
    isActive: true, createdAt: "2025-01-03",
  },
  {
    id: "7", categoryId: "7",
    name: "Serum Vitamin C 20% Brightening Wajah 30ml",
    slug: "serum-vitamin-c-20-30ml",
    price: 89000, stock: 120, soldCount: 3400,
    rating: 4.7, discount: 20, location: "Tangerang",
    images: [img("Serum Vit C", "fdf4ff", "7e22ce")],
    isActive: true, createdAt: "2025-01-20",
  },
  {
    id: "8", categoryId: "5",
    name: "Masker KF94 Korea 4-Layer Protection isi 50 pcs",
    slug: "masker-kf94-korea-50pcs",
    price: 65000, stock: 500, soldCount: 12000,
    rating: 4.8, discount: 10, location: "Surabaya",
    images: [img("Masker KF94", "f0f9ff", "0c4a6e")],
    isActive: true, createdAt: "2025-01-18",
  },
  {
    id: "9", categoryId: "1",
    name: "Earphone TWS Bluetooth 5.3 Bass Booster ANC",
    slug: "earphone-tws-bluetooth-5-3",
    price: 159000, stock: 75, soldCount: 4200,
    rating: 4.6, discount: 30, location: "Bandung",
    images: [img("TWS Earphone", "0f172a", "94a3b8")],
    isActive: true, createdAt: "2025-01-22",
  },
  {
    id: "10", categoryId: "3",
    name: "Kemeja Pria Slimfit Polos Premium Bahan Katun",
    slug: "kemeja-pria-slimfit-premium",
    price: 119000, stock: 60, soldCount: 890,
    rating: 4.5, discount: 25, location: "Bandung",
    images: [img("Kemeja Pria", "f8fafc", "334155")],
    isActive: true, createdAt: "2025-01-25",
  },
  {
    id: "11", categoryId: "2",
    name: "Dress Wanita Korean Style Flowy Midi Dress Casual",
    slug: "dress-wanita-korean-style",
    price: 145000, stock: 40, soldCount: 1560,
    rating: 4.7, discount: 35, location: "Jakarta Pusat",
    images: [img("Korean Dress", "fdf2f8", "9d174d")],
    isActive: true, createdAt: "2025-01-28",
  },
  {
    id: "12", categoryId: "8",
    name: "Sepatu Running Pria Ringan Anti Slip Size 39-44",
    slug: "sepatu-running-pria-ringan",
    price: 275000, stock: 55, soldCount: 2300,
    rating: 4.6, discount: 40, location: "Surabaya",
    images: [img("Sepatu Running", "f0fdf4", "14532d")],
    isActive: true, createdAt: "2025-01-30",
  },
];

export const MOCK_BESTSELLERS = MOCK_PRODUCTS
  .sort((a, b) => b.soldCount - a.soldCount)
  .slice(0, 6);

export const MOCK_NEW_ARRIVALS = MOCK_PRODUCTS
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 6);
