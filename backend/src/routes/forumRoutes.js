import express from "express";
import {
    getEventMessages,
    postMessage,
    deleteMessage,
    togglePin,
    toggleReaction,
    getNotifications,
    markNotificationAsRead
} from "../controllers/forumController.js";
import { protect } from "../middleware/authMiddleware.js";

const forumRoutes = express.Router();

// Notifications (must be before /:eventId to avoid path conflict)
forumRoutes.get("/notifications", protect, getNotifications);
forumRoutes.patch("/notifications/:id/read", protect, markNotificationAsRead);

// Forum Messages
forumRoutes.get("/:eventId", protect, getEventMessages);
forumRoutes.post("/:eventId", protect, postMessage);
forumRoutes.delete("/:messageId", protect, deleteMessage);
forumRoutes.patch("/:messageId/pin", protect, togglePin);
forumRoutes.patch("/:messageId/react", protect, toggleReaction);

export default forumRoutes;
