import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#6C63FF",
};

export const metadata: Metadata = {
  title:       "Zenit — Marketplace",
  description: "Belanja produk terbaik di Zenit Marketplace",
  keywords:    ["e-commerce", "marketplace", "belanja online", "produk terbaik"],
  authors:     { name: "Zenit Team" },
  icons:       {
    icon:[
      { url : "/favicon/favicon.ico" },
      { url : "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url : "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url : "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other:[
      { rel: "manifest", url: "/favicon/site.webmanifest" },
      { rel: "android-chrome", url: "/favicon/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { rel: "android-chrome", url: "/favicon/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ]
  },

  manifest: "/favicon/site.webmanifest",

  // https://zenit.com
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),

  appleWebApp:{
    capable: true,
    title: "Zenit Marketplace",
    statusBarStyle: "default",
  },


  openGraph: {
    type : "website",
    url  : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    locale: "id_ID",
    siteName: "Zenit Marketplace",
    title: "Zenit Marketplace",
    description: "Belanja produk terbaik di Zenit Marketplace",
    images: [
      {
        url: "/zenit-logo.svg",
        width: 1200,
        height: 630,
        alt: "Zenit Marketplace Logo",
      },
      {
        url: "/zenit-icon.svg",
        width: 512,
        height: 512,
        alt: "Zenit Marketplace Icon",
      },
    ]
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${jakarta.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
