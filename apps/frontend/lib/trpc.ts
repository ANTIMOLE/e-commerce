// ============================================================
// tRPC CLIENT SETUP
//
// PENTING untuk penelitian:
// Menggunakan httpLink (BUKAN httpBatchLink) supaya
// setiap procedure = 1 HTTP request.
// Ini memastikan perbandingan REST vs tRPC apple-to-apple.
// ============================================================

import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "../../backend-trpc/src/routers";
import { TRPC_BASE_URL, ACCESS_TOKEN_KEY } from "./constants";

// ── tRPC React Hook Factory ───────────────────────────────────
// Dari ini semua hooks: trpc.product.list.useQuery(), dll
export const trpc = createTRPCReact<AppRouter>();

// ── tRPC Client ───────────────────────────────────────────────
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpLink({
        url: TRPC_BASE_URL,

        // Attach JWT ke setiap request
        headers() {
          const token =
            typeof window !== "undefined"
              ? localStorage.getItem(ACCESS_TOKEN_KEY)
              : null;

          return token
            ? { Authorization: `Bearer ${token}` }
            : {};
        },

        // NOTE: httpLink — NO batching
        // Setiap procedure call = 1 HTTP request terpisah
        // Lihat: trpc.io/docs/client/links/httpLink
      }),
    ],
  });
}
