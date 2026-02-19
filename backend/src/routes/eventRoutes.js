import express from "express";
import {
    createEvent,
    getAllEvents,
    browseEvents,
    getTrendingEvents,
    getEventById,
    getMyEvents,
    updateEventStatus,
    updateEvent,
    deleteEvent
} from "../controllers/eventController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const eventRoutes = express.Router();

eventRoutes.get("/", getAllEvents);
eventRoutes.get("/browse", protect, authorize("Participant"), browseEvents);
eventRoutes.get("/trending", protect, authorize("Participant"), getTrendingEvents);

eventRoutes.get("/my-events", protect, authorize("Organizer"), getMyEvents);
eventRoutes.get("/:id", getEventById);

eventRoutes.post("/create", protect, authorize("Organizer"), createEvent);

eventRoutes.patch("/:id/status", protect, authorize("Organizer"), updateEventStatus);

eventRoutes.put("/:id", protect, authorize("Organizer"), updateEvent);

eventRoutes.delete("/:id", protect, authorize("Organizer"), deleteEvent);

export default eventRoutes;
