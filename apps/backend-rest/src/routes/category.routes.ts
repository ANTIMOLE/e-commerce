import { Router } from "express";
import { getAllController, getBySlugController } from "../controllers/category.controller";

export const categoryRoutes = Router();

categoryRoutes.get("/",       getAllController);
categoryRoutes.get("/:slug",  getBySlugController);