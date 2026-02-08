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
        const participantType = req.user.participantType;

        const event = await Event.findById(eventId).lean();
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
            const currentRegs = await Registration.countDocuments({ eventId }).session(session);

            if (currentRegs >= event.registrationLimit) {
                return sendError(res, "Event registration limit reached.", "CAPACITY_REACHED", 400);
            }
            if (currentRegs === 0) {
                await NormalEvent.findByIdAndUpdate(eventId, { formLocked: true });
            }
        } else {
            if (event.stockQuantity < quantity) {
                return sendError(res, "Out of stock", "STOCK_EXHAUSTED", 400);
            }

            const updatedMerch = await MerchandiseEvent.findOneAndUpdate(
                { _id: eventId, stockQuantity: { $gte: quantity } },
                { $inc: { stockQuantity: -quantity } },
                { new: true, session }
            );

            if (!updatedMerch) {
                return sendError(res, "Stock depleted", "STOCK_EXHAUSTED", 400);
            }
        }

        const registration = new Registration({ 
            ...req.body, 
            participantId: req.user.id,
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