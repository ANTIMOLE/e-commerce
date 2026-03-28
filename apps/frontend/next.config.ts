// import type { NextConfig } from "next";

// const nextConfig = {
//   images: {
//     remotePatterns: [
//       {
//         protocol: "https",
//         hostname: "placehold.co",
//       },
//     ],
//   },
// };

// export default nextConfig;
//
import type { NextConfig } from "next";
import path from "path";

// ============================================================
// API_MODE switching via webpack alias
//
// Build for REST:  NEXT_PUBLIC_API_MODE=rest  pnpm build
// Build for tRPC:  NEXT_PUBLIC_API_MODE=trpc  pnpm build
//
// When API_MODE=trpc, every import like:
//   import { useCart } from "@/hooks/useCart"
// resolves to hooks/trpc/useCart.ts instead of hooks/rest/useCart.ts
//
// This ensures the EXACT same component code runs against both
// transports — fair apple-to-apple comparison for load testing.
// ============================================================

const apiMode = process.env.NEXT_PUBLIC_API_MODE ?? "rest";
const isTRPC  = apiMode === "trpc";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },

  webpack(config) {
    if (isTRPC) {
      // Override root hook selectors to point to tRPC implementations
      const hooks = [
        "useAuth", "useCart", "useCheckout", "useOrders",
        "useProducts", "useProfile", "useCategories", "useAdmin",
      ];

      hooks.forEach((hook) => {
        config.resolve.alias[`@/hooks/${hook}`] = path.resolve(
          __dirname,
          `hooks/trpc/${hook}.ts`
        );
      });
    }
    return config;
  },
};

export default nextConfig;
