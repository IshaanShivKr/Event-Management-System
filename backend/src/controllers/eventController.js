import Event from "../models/Event.js";
import NormalEvent from "../models/NormalEvent.js";
import MerchandiseEvent from "../models/MerchandiseEvent.js";

export async function createEvent(req, res) {
    try {
        const {
            eventType,
            ...eventData
        } = req.body;
        const organizerId = req.user.id;

        let newEvent;

        if (eventType === "Normal") {
            newEvent = new NormalEvent({
                ...eventData,
                organizerId,
            });
        } else if (eventType === "Merchandise") {
            newEvent = new MerchandiseEvent({
                ...eventData,
                organizerId,
            });
        } else {
            return res.status(400).json({
                message: "Invalid event type",
            })
        }

        await newEvent.save();
        res.status(201).json({
            message: `${eventType} event created successfully`,
            event: newEvent,
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create event",
            error: error.message,
        });
    }
}

export async function getAllEvents(req, res) {
    try {
        const events = await Event.find().populate("organizerId", "organizerName category contactEmail");
        res.status(200).json(events);

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch events",
            error: error.message,
        });
    }
}

export async function getEventById(req, res) {
    try {
        const event = await Event.findById(req.params.id).populate("organizerId", "organizerName category description contactEmail phone");
        res.status(200).json(event);

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch event",
            error: error.message,
        });
    }
}

export async function getMyEvents(req, res) {
    try {
        const events = await Event.find({ organizerId: req.user.id });
        res.status(200).json(events);

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch events",
            error: error.message,
        });
    }
}