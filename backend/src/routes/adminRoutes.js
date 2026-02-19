import express from "express";
import {
    getAdminDashboard,
    createOrganizer,
    getAllOrganizersForAdmin,
    getOrganizerByIdForAdmin,
    updateOrganizerAccountState,
    deleteOrganizerPermanently,
    getOrganizerPasswordResetRequests,
    resolveOrganizerPasswordResetRequest,
    getAllParticipants,
    getParticipantById,
    getAllSystemEvents,
    deleteUser
} from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const adminRoutes = express.Router();

adminRoutes.use(protect, authorize("Admin"));

adminRoutes.get("/dashboard", getAdminDashboard);

adminRoutes.post("/create-organizer", createOrganizer); // backward-compatible path
adminRoutes.post("/organizers", createOrganizer);
adminRoutes.get("/organizers", getAllOrganizersForAdmin);
adminRoutes.get("/organizers/:id", getOrganizerByIdForAdmin);
adminRoutes.patch("/organizers/:id/account-state", updateOrganizerAccountState);
adminRoutes.delete("/organizers/:id/permanent", deleteOrganizerPermanently);

adminRoutes.get("/password-reset-requests", getOrganizerPasswordResetRequests);
adminRoutes.patch("/password-reset-requests/:id", resolveOrganizerPasswordResetRequest);

adminRoutes.get("/participants", getAllParticipants);
adminRoutes.get("/participants/:id", getParticipantById);

adminRoutes.get("/events", getAllSystemEvents);

adminRoutes.delete("/users/:id", deleteUser);

export default adminRoutes;
