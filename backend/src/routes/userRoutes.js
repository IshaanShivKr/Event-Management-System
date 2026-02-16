import express from "express";
import {
    getMe,
    updateProfile,
    updatePassword,
    deleteMyAccount,
    requestPasswordReset,
    getAllOrganizers,
    getOrganizerById,
    followOrganizer,
    unfollowOrganizer
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const userRoutes = express.Router();

userRoutes.use(protect);

userRoutes.get("/me", getMe);
userRoutes.get("/organizer", getAllOrganizers);
userRoutes.get("/organizer/:id", getOrganizerById);

userRoutes.put("/profile", updateProfile);

userRoutes.patch("/update-password", updatePassword);

userRoutes.delete("/delete-me", deleteMyAccount);

userRoutes.post("/request-reset", requestPasswordReset);

userRoutes.post("/follow/:id", authorize("Participant"), followOrganizer);
userRoutes.post("/unfollow/:id", authorize("Participant"), unfollowOrganizer);

export default userRoutes;