import mongoose from "mongoose";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import NormalEvent from "../models/NormalEvent.js";
import MerchandiseEvent from "../models/MerchandiseEvent.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

export async function registerForEvent(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { eventId, responses, selections, quantity = 1 } = req.body;
        const participantId = req.user.id;

        const event = await Event.findById(eventId).session(session).lean();
        if (!event) {
            await session.abortTransaction();
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        if (event.status !== "Published") {
            await session.abortTransaction();
            return sendError(res, `Registrations are currently ${event.status.toLowerCase()}`, "REGISTRATION_UNAVAILABLE", 400);
        }

        if (event.eligibility !== "ALL" && event.eligibility !== req.user.participantType) {
            await session.abortTransaction();
            return sendError(res, "You are not eligible for this event", "INELIGIBLE_PARTICIPANT", 403);
        }

        if (new Date() > new Date(event.registrationDeadline)) {
            await session.abortTransaction();
            return sendError(res, "Registration deadline passed", "DEADLINE_PASSED", 400);
        }

        if (event.eventType === "Normal") {
            const currentRegs = await Registration.countDocuments({ eventId }).session(session);

            if (currentRegs >= event.registrationLimit) {
                await session.abortTransaction();
                return sendError(res, "Event registration limit reached.", "CAPACITY_REACHED", 400);
            }
            
            if (currentRegs === 0) {
                await NormalEvent.findByIdAndUpdate(eventId, { formLocked: true }).session(session);
            }
        } else {
            const updatedMerch = await MerchandiseEvent.findOneAndUpdate(
                { _id: eventId, stockQuantity: { $gte: quantity } },
                { $inc: { stockQuantity: -quantity } },
                { new: true, session }
            );

            if (!updatedMerch) {
                await session.abortTransaction();
                return sendError(res, "Stock depleted or insufficient quantity.", "STOCK_EXHAUSTED", 400);
            }
        }

        const registration = new Registration({ 
            eventId,
            participantId,
            responses: event.eventType === "Normal" ? responses : undefined,
            selections: event.eventType === "Merchandise" ? selections : undefined,
            quantity: event.eventType === "Merchandise" ? quantity : 1,
            paymentStatus: (event.price && event.price > 0) ? "Pending" : "N/A"
        });

        await registration.save({ session });
        await session.commitTransaction();
        return sendSuccess(res, "Registration successful", registration, 201);

    } catch (error) {
        await session.abortTransaction();
        if (error.code === 11000) {
            return sendError(res, "You are already registered for this event.", "DUPLICATE_REGISTRATION", 400);
        }
        return sendError(res, "Registration failed", error.message, 500);
    } finally {
        session.endSession();
    }
}

export async function getMyRegistraions(req, res) {
    try {
        const registrations = await Registration.find({ participantId: req.user.id })
                                        .populate("eventId", "name eventStartDate eventEndDate status eventType")
                                        .sort({ createdAt: -1 });

        return sendSuccess(res, "Registration history fetched", registrations, 200);

    } catch (error) {
        return sendError(res, "Failed to fetch history", error.message, 500);
    }
}

export async function getRegistrationById(req, res) {
    try {
        const registration = await Registration.findOne({_id: req.params.id, participantId: req.user.id }).
                                        populate("eventId");

        if (!registration) {
            return sendError(res, "Registration record not found", "NOT_FOUND", 404);
        }

        return sendSuccess(res, "Registration details fetched", registration, 200);

    } catch (error) {
        return sendError(res, "Error fetching record", error.message, 500);
    }
}

export async function getEventAttendees(req, res) {
    try {
        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        if (event.organizerId.toString() !== req.user.id) {
            return sendError(res, "Access denied: You do not own this event", "UNAUTHORIZED", 403);
        }

        const attendees = await Registration.find({ eventId })
                            .populate("participantId", "firstName lastName email phone participantType")
                            .sort({ createdAt: 1 });

        return sendSuccess(res, "Attendees list fetched", attendees, 200);

    } catch (error) {
        return sendError(res, "Failed to fetch attendees", error.message, 500);
    }
}

export async function cancelRegistration(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const registrationId = req.params.id;
        const participantId = req.user.id;

        const registration = await Registration.findOne({ _id: registrationId, participantId });
        if (!registration) {
            await session.abortTransaction();
            return sendError(res, "Registration not found", "NOT_FOUND", 404);
        }

        const event = registration.eventId;

        if (new Date() > new Date(event.eventStartDate)) {
            await session.abortTransaction();
            return sendError(res, "Cannot cancel registration after the event has started", "EVENT_STARTED", 400);
        }

        if (event.eventType === "Merchandise") {
            await MerchandiseEvent.findByIdAndUpdate(
                event._id,
                { $inc: { stockQuantity: registration.quantity } },
                { session }
            );
        }

        await Registration.findByIdAndDelete(registrationId).session(session);

        await session.commitTransaction();
        return sendSuccess(res, "Registration cancelled successfully. Any stock/spots have been restored.", null, 200);

    } catch (error) {
        await session.abortTransaction();
        return sendError(res, "Cancellation failed", error.message, 500);

    } finally {
        session.endSession();
    }
}