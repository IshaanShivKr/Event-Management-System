import Event from "../models/Event.js";
import NormalEvent from "../models/NormalEvent.js";
import MerchandiseEvent from "../models/MerchandiseEvent.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

export async function createEvent(req, res) {
    try {
        const { eventType, ...eventData } = req.body;
        const organizerId = req.user.id;

        let newEvent;

        if (eventType === "Normal") {
            newEvent = new NormalEvent({ ...eventData, organizerId, });
        } else if (eventType === "Merchandise") {
            newEvent = new MerchandiseEvent({ ...eventData, organizerId, });
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
        const events = await Event.find().populate("organizerId", "organizerName category contactEmail");
        return sendSuccess(res, "Events fetched successfully", events, 200);

    } catch (error) {
        return sendError(res, "Failed to fetch events", error.message, 500);
    }
}

export async function getEventById(req, res) {
    try {
        const event = await Event.findById(req.params.id).populate("organizerId", "organizerName category description contactEmail phone");
        if (!event) {
            return sendError(res, "Event not found", "EVENT_NOT_FOUND", 404);
        }

        return sendSuccess(res, "Event details fetched successfully", event);

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