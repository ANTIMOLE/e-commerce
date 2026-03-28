// AUTO-SELECTOR: REST by default.
// next.config.ts aliases @/hooks/useAuth → hooks/rest/useAuth or hooks/trpc/useAuth
// based on NEXT_PUBLIC_API_MODE build env. See next.config.ts for alias config.
export * from "./rest/useAuth";
