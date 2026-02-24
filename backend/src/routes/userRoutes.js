import express from "express";
import {
    getMe,
    updateProfile,
    updatePassword,
    deleteMyAccount,
    getAllOrganizers,
    getOrganizerById,
    followOrganizer,
    unfollowOrganizer,
    requestPasswordReset
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const userRoutes = express.Router();

userRoutes.use(protect);

userRoutes.get("/me", getMe);
userRoutes.get("/organizer", authorize("Participant"), getAllOrganizers);
userRoutes.get("/organizer/:id", authorize("Participant"), getOrganizerById);

userRoutes.put("/profile", updateProfile);

userRoutes.patch("/update-password", updatePassword);

userRoutes.delete("/delete-me", deleteMyAccount);

userRoutes.post("/follow/:id", authorize("Participant"), followOrganizer);
userRoutes.post("/unfollow/:id", authorize("Participant"), unfollowOrganizer);

userRoutes.post("/request-reset", requestPasswordReset);

export default userRoutes;
