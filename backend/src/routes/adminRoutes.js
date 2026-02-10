import express from "express";
import { createOrganizer } from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const adminRoutes = express.Router();

adminRoutes.use(protect, authorize("Admin"));

adminRoutes.post("/create-organizer", createOrganizer);
adminRoutes.get("/organizers", getAllOrganizers);
adminRoutes.get("/organizers/:id", getOrganizerById);

adminRoutes.get("/participants", getAllParticipants);
adminRoutes.get("/participants/:id", getParticipantById);

adminRoutes.get("/events", getAllSystemEvents);

adminRoutes.delete("/users/:id", deleteUser);

export default adminRoutes;