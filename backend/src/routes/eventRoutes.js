import express from "express";
import { createEvent, getAllEvents, getEventById, getMyEvents } from "../controllers/eventController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const eventRoutes = express.Router();

eventRoutes.get("/", getAllEvents);
eventRoutes.get("/my-events", protect, authorize("Organizer"), getMyEvents);
eventRoutes.get("/:id", getEventById);

eventRoutes.post("/create", protect, authorize("Organizer"), createEvent);

export default eventRoutes;