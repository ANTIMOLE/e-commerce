// AUTO-SELECTOR: REST by default.
// next.config.ts aliases @/hooks/useCheckout → hooks/rest/useCheckout or hooks/trpc/useCheckout
// based on NEXT_PUBLIC_API_MODE build env. See next.config.ts for alias config.
export * from "./rest/useCheckout";
