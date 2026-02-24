import express from "express";
import {
    registerForEvent,
    getMyRegistrations,
    getRegistrationById,
    getRegistrationByTicketId,
    getEventAttendees,
    cancelRegistration,
    approveMerchandiseOrder,
    rejectMerchandiseOrder,
    updateAttendanceStatus
} from "../controllers/registrationController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const registrationRoutes = express.Router();

registrationRoutes.post("/register", protect, authorize("Participant"), registerForEvent);

registrationRoutes.get("/my-registrations", protect, authorize("Participant"), getMyRegistrations);
registrationRoutes.get("/event/:id", protect, authorize("Organizer"), getEventAttendees);
registrationRoutes.get("/ticket/:ticketId", protect, authorize("Participant"), getRegistrationByTicketId);
registrationRoutes.get("/:id", protect, authorize("Participant"), getRegistrationById);

registrationRoutes.delete("/cancel/:id", protect, authorize("Participant"), cancelRegistration);

registrationRoutes.patch("/:id/attendance", protect, authorize("Organizer"), updateAttendanceStatus);

registrationRoutes.post("/approve-merch/:id", protect, authorize("Organizer"), approveMerchandiseOrder);
registrationRoutes.post("/reject-merch/:id", protect, authorize("Organizer"), rejectMerchandiseOrder);

export default registrationRoutes;
