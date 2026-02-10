import express from "express";
import {
    createEvent,
    getAllEvents,
    getEventById,
    getMyEvents,
    updateEventStatus,
    updateEvent,
    deleteEvent
} from "../controllers/eventController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const eventRoutes = express.Router();

eventRoutes.get("/", getAllEvents);
eventRoutes.get("/my-events", protect, authorize("Organizer"), getMyEvents);
eventRoutes.get("/:id", getEventById);

eventRoutes.post("/create", protect, authorize("Organizer"), createEvent);

eventRoutes.patch("/:id/status", protect, authorize("Organize"), updateEventStatus);

eventRoutes.put("/:id", protect, authorize("Organizer"), updateEvent);

eventRoutes.delete("/:id", protect, authorize("Organizer"), deleteEvent);

export default eventRoutes;