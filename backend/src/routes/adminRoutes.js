import express from "express";
import { createOrganizer } from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const adminRoutes = express.Router();

adminRoutes.post("/create-organizer", protect, authorize("Admin"), createOrganizer);

export default adminRoutes;