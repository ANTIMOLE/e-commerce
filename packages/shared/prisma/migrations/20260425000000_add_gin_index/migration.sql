-- Migration: add_gin_index
-- Jalankan via: npx prisma migrate deploy
-- ATAU manual: psql -d yourdb -f migration.sql

-- Enable trigram extension (untuk ILIKE search yang fast)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index pada name (dipakai di product search: contains + mode: insensitive)
CREATE INDEX IF NOT EXISTS products_name_gin_idx
  ON products USING gin(name gin_trgm_ops);

-- GIN index pada description (opsional, untuk future search)
CREATE INDEX IF NOT EXISTS products_description_gin_idx
  ON products USING gin(description gin_trgm_ops);
