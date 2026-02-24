import express from "express";
import { submitFeedback, getEventFeedbackStats } from "../controllers/feedbackController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const feedbackRoutes = express.Router();

// Participant submits feedback
feedbackRoutes.post("/:eventId", protect, authorize("Participant"), submitFeedback);

// Organizer views feedback (or anyone with Organizer access to that event)
feedbackRoutes.get("/event/:eventId", protect, authorize("Organizer"), getEventFeedbackStats);

export default feedbackRoutes;
