// AUTO-SELECTOR: REST by default.
// next.config.ts aliases @/hooks/useOrders → hooks/rest/useOrders or hooks/trpc/useOrders
// based on NEXT_PUBLIC_API_MODE build env. See next.config.ts for alias config.
export * from "./rest/useOrders";
