import { hashPassword } from "../utils/authUtils.js";
import User from "../models/User.js";
import Participant from "../models/Participant.js";
import Organizer from "../models/Organizer.js";
import Event from "../models/Event.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

export async function createOrganizer(req, res) {
    try {
        const { email, password, organizerName, category, description, contactEmail, phone } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return sendError(res, "Email already registered", "EMAIL_EXISTS", 400);
        }

        const hashedPassword = await hashPassword(password);

        const newOrganizer = new Organizer({ email, password: hashedPassword, organizerName, category, description, contactEmail, phone });

        await newOrganizer.save();

        const organizerResponse = newOrganizer.toObject();
        delete organizerResponse.password;

        return sendSuccess(res, "Organizer created successfully", organizerResponse, 201);

    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, "Email already registered", "EMAIL_EXISTS", 400);
        }
        return sendError(res, "Failed to create organizer", error.message, 500);
    }
}

export async function getAllOrganizers(req, res) {
    try {
        const organizers = await Organizer.find().select("-password");
        return sendSuccess(res, "All organizers fetched", organizers, 200);

    } catch (error) {
        return sendError(res, "Failed to fetch organizers", error.message, 500);
    }
}

export async function getOrganizerById(req, res) {
    try {
        const organizer = await Organizer.findById(req.params.id).select("-password");
        if (!organizer) {
            return sendError(res, "Organizer not found", "NOT_FOUND", 404);
        }
        return sendSuccess(res, "Organizer details fetched", organizer, 200);

    } catch (error) {
        return sendError(res, "Error fetching organizer", error.message, 500);
    }
}

export async function getAllParticipants(req, res) {
    try {
        const participants = await Participant.find().select("-password");
        return sendSuccess(res, "All users fetched", participants, 200);

    } catch (error) {
        return sendError(res, "Failed to fetch users", error.message, 500);
    }
}

export async function getParticipantById(req, res) {
    try {
        const participant = await Participant.findById(req.params.id).select("-password");
        if (!participant) {
            return sendError(res, "User not found", "NOT_FOUND", 404);
        }
        return sendSuccess(res, "User details fetched", participant, 200);

    } catch (error) {
        return sendError(res, "Error fetching user", error.message, 500);
    }
}

export async function getAllSystemEvents(req, res) {
    try {
        const events = await Event.find().populate("organizerId", "organizerName category").sort({ createdAt: -1 });
        return sendSuccess(res, "All system events fetched", events, 200);

    } catch (error) {
        return sendError(res, "Failed to fetch system events", error.message, 500);
    }
}

export async function deleteUser(req, res) {
    try {
        const userId = req.params.id;
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            return sendError(res, "User not found", "NOT_FOUND", 404);
        }
        return sendSuccess(res, "User removed successfully", null, 200);

    } catch (error) {
        return sendError(res, "Deletion failed", error.message, 500);
    }
}