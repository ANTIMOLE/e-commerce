-- DropIndex
DROP INDEX "products_description_gin_idx";

-- DropIndex
DROP INDEX "products_name_gin_idx";

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");
