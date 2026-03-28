// AUTO-SELECTOR: REST by default.
// next.config.ts aliases @/hooks/useProducts → hooks/rest/useProducts or hooks/trpc/useProducts
// based on NEXT_PUBLIC_API_MODE build env. See next.config.ts for alias config.
export * from "./rest/useProducts";
