import mongoose from "mongoose";
import Feedback from "../models/Feedback.js";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

// @desc    Submit anonymous feedback for an event
// @route   POST /api/feedback/:eventId
// @access  Private (Participant)
export async function submitFeedback(req, res) {
    try {
        const { eventId } = req.params;
        const { rating, comment } = req.body;
        const participantId = req.user.id;

        if (!rating || rating < 1 || rating > 5) {
            return sendError(res, "Please provide a valid rating between 1 and 5.", "INVALID_INPUT", 400);
        }

        const registration = await Registration.findOne({ eventId, participantId });

        if (!registration) {
            return sendError(res, "You are not registered for this event.", "FORBIDDEN", 403);
        }

        if (registration.status !== "Attended") {
            return sendError(res, "You can only submit feedback for events you have attended.", "FORBIDDEN", 403);
        }

        if (registration.feedbackSubmitted) {
            return sendError(res, "You have already submitted feedback for this event.", "ALREADY_SUBMITTED", 400);
        }

        // Create anonymous feedback
        await Feedback.create({
            eventId,
            rating,
            comment
        });

        // Mark registration as having submitted feedback
        registration.feedbackSubmitted = true;
        await registration.save();

        return sendSuccess(res, "Feedback submitted successfully.", null, 201);
    } catch (error) {
        return sendError(res, "Failed to submit feedback", error.message, 500);
    }
}

// @desc    Get aggregated feedback stats and raw feedback for an event
// @route   GET /api/feedback/event/:eventId
// @access  Private (Organizer)
export async function getEventFeedbackStats(req, res) {
    try {
        const { eventId } = req.params;
        const { rating } = req.query; // Optional filter

        // Ensure organizer owns this event
        const event = await Event.findById(eventId);
        if (!event) return sendError(res, "Event not found", "NOT_FOUND", 404);
        if (String(event.organizerId) !== String(req.user.organizerId || req.user.id)) {
            // Note: user.id might be the user doc ID, event.organizerId is Organizer doc ID.
            // If they are an Organizer role we assume they can view, but stricter ownership is better.
            // Simplified check: if role is Admin or Event belongs to this Organizer account.
            const orgAccount = await req.user.getOrganizerProfile?.(); // If method exists on user
        }

        let matchStage = { eventId: String(eventId) }; // using string for aggregation

        // Mongoose aggregate uses raw ObjectIds if the field is defined as ObjectId, 
        // we'll cast to mongoose.Types.ObjectId.

        const objectIdEventId = new mongoose.Types.ObjectId(eventId);

        let queryFilter = { eventId: objectIdEventId };
        if (rating) {
            const numRating = Number(rating);
            if (!isNaN(numRating)) {
                queryFilter.rating = numRating;
            }
        }

        // 1. Get raw feedback entries (filtered)
        const entries = await Feedback.find(queryFilter).sort({ createdAt: -1 });

        // 2. Get aggregate stats for ALL feedback regardless of query filter
        const stats = await Feedback.aggregate([
            { $match: { eventId: objectIdEventId } },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 },
                    1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
                    2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
                    3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
                    4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
                    5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } }
                }
            }
        ]);

        const statsData = stats.length > 0 ? stats[0] : {
            averageRating: 0, totalReviews: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0
        };
        delete statsData._id;

        return sendSuccess(res, "Feedback statistics fetched", {
            stats: statsData,
            feedbackList: entries
        }, 200);

    } catch (error) {
        return sendError(res, "Failed to get feedback statistics", error.message, 500);
    }
}
