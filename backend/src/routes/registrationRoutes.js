import express from "express";
import { registerForEvent } from "../controllers/registrationController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const registrationRoutes = express.Router();

registrationRoutes.post("/register", protect, authorize("Participant"), registerForEvent);

export default registrationRoutes;