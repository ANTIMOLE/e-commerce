// AUTO-SELECTOR: REST by default.
// next.config.ts aliases @/hooks/useCart → hooks/rest/useCart or hooks/trpc/useCart
// based on NEXT_PUBLIC_API_MODE build env. See next.config.ts for alias config.
export * from "./rest/useCart";
