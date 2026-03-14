import { Router } from "express";
import { optionalAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { productQuerySchema, productSlugSchema } from "@ecommerce/shared";
import {
  getAllController,
  getBySlugController,
  searchController,
} from "../controllers/product.controller";

export const productRouter = Router();

productRouter.get("/",       optionalAuth, validate(productQuerySchema, "query"),  getAllController);
productRouter.get("/search", optionalAuth, validate(productQuerySchema, "query"),  searchController);
productRouter.get("/:slug",  optionalAuth, validate(productSlugSchema,  "params"), getBySlugController);