// ============================================================
// tRPC CLIENT SETUP
//
// PENTING untuk penelitian:
// Menggunakan httpLink (BUKAN httpBatchLink) supaya
// setiap procedure = 1 HTTP request.
// Ini memastikan perbandingan REST vs tRPC apple-to-apple.
// ============================================================

import { createTRPCReact }  from "@trpc/react-query";
import { httpLink }         from "@trpc/client";
import type { AppRouter }   from "../../backend-trpc/src/routers";
import { TRPC_BASE_URL }    from "./constants";

// ── tRPC React Hook Factory ───────────────────────────────────
export const trpc = createTRPCReact<AppRouter>();

// ── tRPC Client ───────────────────────────────────────────────
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpLink({
        url: TRPC_BASE_URL,

        // Send cookies with every request (same as axios withCredentials: true)
        // This is how accessToken cookie gets sent to tRPC server automatically
        fetch(url, options) {
          return fetch(url, { ...options, credentials: "include" });
        },

        // NOTE: httpLink — NO batching
        // Each procedure call = 1 HTTP request
        // Ensures apple-to-apple comparison with REST
      }),
    ],
  });
}
