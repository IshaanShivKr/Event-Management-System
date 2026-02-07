import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import NormalEvent from "../models/NormalEvent.js";
import MerchandiseEvent from "../models/MerchandiseEvent.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

export async function registerForEvent(req, res) {
    try {
        const { eventId, responses, selections, quantity = 1 } = req.body;
        const participantId = req.user.id;
        const participantType = req.user.participantType;

        const event = await Event.findById(eventId);
        if (!event) {
            return sendError(res, "Event not found", "EVENT_NOT_FOUND", 404);
        }

        if (event.eligibility !== "ALL" && event.eligibility != req.user.participantType) {
            return sendError(res, "You are not eligible for this event", "INELIGIBLE_PARTICIPANT", 403);
        }

        if (new Date() > new Date(event.registrationDeadline)) {
            return sendError(res, "Registration deadline passed", "DEADLINE_PASSED", 400);
        }

        if (event.eventType === "Normal") {
            const currentRegs = await Registration.countDocuments({ eventId });
            if (currentRegs >= event.registrationLimit) {
                return sendError(res, "Event registration limit reached.", "CAPACITY_REACHED", 400);
            }
            if (currentRegs === 0) {
                await NormalEvent.findByIdAndUpdate(eventId, { formLocked: true });
            }
        } else {
            const updatedMerch = await MerchandiseEvent.findOneAndUpdate(
                { 
                    _id: eventId, 
                    stockQuantity: { $gte: quantity }
                },
                { 
                    $inc: { stockQuantity: -quantity } 
                },
                { new: true }
            );

            if (!updatedMerch) {
                return sendError(res, "Insufficient stock or item sold out.", "STOCK_EXHAUSTED", 400);
            }
        }

        const registration = new Registration({
            eventId,
            participantId,
            responses: event.eventType === "Normal" ? responses : undefined,
            selections: event.eventType === "Merchandise" ? selections : undefined,
            quantity: event.eventType === "Merchandise" ? quantity : 1,
            paymentStatus: event.eventType === "Merchandise" ? "Pending" : "N/A"
        });

        await registration.save();
        return sendSuccess(res, "Registration successful", registration, 201);

    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, "You are already registered for this event.", "DUPLICATE_REGISTRATION", 400);
        }
        return sendError(res, "Registration failed", error.message, 500);
    }
}