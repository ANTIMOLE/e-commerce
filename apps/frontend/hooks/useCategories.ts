// AUTO-SELECTOR: REST by default.
// next.config.ts aliases @/hooks/useCategories → hooks/rest/useCategories or hooks/trpc/useCategories
// based on NEXT_PUBLIC_API_MODE build env. See next.config.ts for alias config.
export * from "./rest/useCategories";
