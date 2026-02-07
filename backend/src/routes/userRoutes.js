import express from "express";
import { getMe, updateProfile } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const userRoutes = express.Router();

userRoutes.use(protect);

userRoutes.get("/me", getMe);
userRoutes.put("/profile", updateProfile);

export default userRoutes;