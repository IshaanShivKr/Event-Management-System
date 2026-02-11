import express from "express";
import {
    getMe,
    updateProfile,
    updatePassword,
    deleteMyAccount,
    requestPasswordReset
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const userRoutes = express.Router();

userRoutes.use(protect);

userRoutes.get("/me", getMe);
userRoutes.put("/profile", updateProfile);

userRoutes.patch("/update-password", updatePassword);

userRoutes.delete("/delete-me", deleteMyAccount);

userRoutes.post("/request-reset", requestPasswordReset);

export default userRoutes;