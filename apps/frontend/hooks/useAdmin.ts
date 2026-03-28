// AUTO-SELECTOR: REST by default.
// next.config.ts aliases @/hooks/useAdmin → hooks/rest/useAdmin or hooks/trpc/useAdmin
// based on NEXT_PUBLIC_API_MODE build env. See next.config.ts for alias config.
export * from "./rest/useAdmin";
