"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { trpc, createTRPCClient } from "../lib/trpc";
import { queryClient } from "../lib/queryClient";

// ── Providers ─────────────────────────────────────────────────
// Wrap seluruh app dengan:
// 1. trpc.Provider    → untuk tRPC hooks
// 2. QueryClientProvider → untuk TanStack Query (dipakai REST juga)

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // useState supaya client tidak di-recreate saat re-render
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
