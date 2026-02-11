import express from "express";
import {
    registerForEvent,
    getMyRegistrations,
    getRegistrationById,
    getEventAttendees,
    cancelRegistration
} from "../controllers/registrationController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const registrationRoutes = express.Router();

registrationRoutes.post("/register", protect, authorize("Participant"), registerForEvent);

registrationRoutes.get("/my-history", protect, authorize("Participant"), getMyRegistrations);
registrationRoutes.get("/event/:id", protect, authorize("Organizer"), getEventAttendees);
registrationRoutes.get("/:id", protect, authorize("Participant"), getRegistrationById);

registrationRoutes.delete("/cancel/:id", protect, authorize("Participant"), cancelRegistration);

export default registrationRoutes;