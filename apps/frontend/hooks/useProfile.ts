// AUTO-SELECTOR: REST by default.
// next.config.ts aliases @/hooks/useProfile → hooks/rest/useProfile or hooks/trpc/useProfile
// based on NEXT_PUBLIC_API_MODE build env. See next.config.ts for alias config.
export * from "./rest/useProfile";
