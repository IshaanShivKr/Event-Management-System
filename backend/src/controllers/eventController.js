import mongoose from "mongoose";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import NormalEvent from "../models/NormalEvent.js";
import MerchandiseEvent from "../models/MerchandiseEvent.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

export async function createEvent(req, res) {
    try {
        const { eventType, ...eventData } = req.body;
        const organizerId = req.user.id;

        let newEvent;

        if (eventType === "Normal") {
            const { name, description, eligibility, registrationDeadline, eventStartDate, eventEndDate, registrationLimit, eventTags, registrationFee, customFormFields } = eventData;
            newEvent = new NormalEvent({ name, description, eligibility, registrationDeadline, eventStartDate, eventEndDate, registrationLimit, eventTags, registrationFee, customFormFields, organizerId });
        } else if (eventType === "Merchandise") {
            const { name, description, eligibility, registrationDeadline, eventStartDate, eventEndDate, registrationLimit, eventTags, itemDetails, price, stockQuantity, purchaseLimit } = eventData;
            newEvent = new MerchandiseEvent({ name, description, eligibility, registrationDeadline, eventStartDate, eventEndDate, registrationLimit, eventTags, itemDetails, price, stockQuantity, purchaseLimit, organizerId });
        } else {
            return sendError(res, "Invalid event type", "INVALID_EVENT_TYPE", 400);
        }

        await newEvent.save();
        return sendSuccess(res, `${eventType} event created successfully`, newEvent, 201);

    } catch (error) {
        return sendError(res, "Failed to create event", error.message, 500);
    }
}

export async function getAllEvents(req, res) {
    try {
        const events = await Event.find({ status: { $in: ["Published", "Ongoing"] } }).populate("organizerId", "organizerName category contactEmail");
        return sendSuccess(res, "Events fetched successfully", events, 200);

    } catch (error) {
        return sendError(res, "Failed to fetch events", error.message, 500);
    }
}

export async function getEventById(req, res) {
    try {
        const event = await Event.findById(req.params.id).populate("organizerId", "organizerName category description contactEmail phone");
        if (!event) {
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        return sendSuccess(res, "Event details fetched successfully", event, 200);

    } catch (error) {
        return sendError(res, "Failed to fetch event", error.message, 500);
    }
}

export async function getMyEvents(req, res) {
    try {
        const events = await Event.find({ organizerId: req.user.id });
        return sendSuccess(res, "Your events fetched successfully", events);

    } catch (error) {
        return sendError(res, "Failed to fetch your events", error.message, 500);
    }
}

export async function updateEventStatus(req, res) {
    try {
        const { status } = req.body;
        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        if (event.organizerId.toString() !== req.user.id) {
            return sendError(res, "Unauthorized: You do not own this event", "UNAUTHORIZED", 403);
        }

        if (event.status !== "Draft" && status === "Draft") {
            return sendError(res, "Cannot revert a published event to draft", "INVALID_TRANSITION", 400);
        }

        event.status = status;
        await event.save();

        return sendSuccess(res, `Event status updated to ${status}`, event, 200);

    } catch (error) {
        return sendError(res, "Update status failed", error.message, 500);
    }
}

export async function updateEvent(req, res) {
    try {
        const { updates } = req.body;
        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        if (event.organizerId.toString() !== req.user.id) {
            return sendError(res, "Unauthorized", "UNAUTHORIZED", 403);
        }

        if (event.formLocked && updates.customFormFields) {
            return sendError(res, "Cannot edit form fields after registrations have started", "FORM_LOCKED", 400);
        }

        // Whitelist allowed update fields to prevent changing protected properties
        const allowedFields = new Set([
            "name",
            "description",
            "eligibility",
            "registrationDeadline",
            "eventStartDate",
            "eventEndDate",
            "registrationLimit",
            "eventTags",
            "registrationFee",
            "customFormFields",
            // merchandise fields
            "itemDetails",
            "price",
            "stockQuantity",
            "purchaseLimit",
        ]);

        const sanitized = {};
        Object.keys(updates || {}).forEach((k) => {
            if (allowedFields.has(k)) sanitized[k] = updates[k];
        });

        const updatedEvent = await Event.findByIdAndUpdate(eventId, sanitized, { new: true, runValidators: true });
        return sendSuccess(res, "Event updated successfully", updatedEvent);

    } catch (error) {
        return sendError(res, "Update failed", error.message, 500);
    }
}

export async function deleteEvent(req, res) {
    try {
        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        if (event.organizerId.toString() !== req.user.id) {
            return sendError(res, "Unauthorized", "UNAUTHORIZED", 403);
        }

        const registrationCount = await mongoose.model("Registration").countDocuments({ eventId });
        if (registrationCount > 0) {
            return sendError(res, "Cannot delete event with active registrations. Cancel them first.", "HAS_REGISTRATIONS", 400);
        }

        await Event.findByIdAndDelete(eventId);
        return sendSuccess(res, "Event deleted successfully", null);

    } catch (error) {
        return sendError(res, "Deletion failed", error.message, 500);
    }
}