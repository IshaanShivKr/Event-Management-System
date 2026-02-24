import mongoose from "mongoose";
import Registration from "../models/Registration.js";
import Event from "../models/Event.js";
import NormalEvent from "../models/NormalEvent.js";
import MerchandiseEvent from "../models/MerchandiseEvent.js";
import Participant from "../models/Participant.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { generateTicketBundle } from "../utils/ticketUtils.js";
import { sendTicketConfirmationEmail } from "../utils/emailService.js";

const ACTIVE_REGISTRATION_STATUSES = ["Registered", "Waitlisted", "Attended"];

export async function finalizeRegistrationTicket({ registration, participant, event, session }) {
    const ticketBundle = await generateTicketBundle({
        event,
        participant,
        registrationId: registration._id,
        organizerName: event.organizerId?.organizerName,
    });

    registration.ticketId = ticketBundle.ticketId;
    registration.qrCodeDataUrl = ticketBundle.qrCodeDataUrl;
    registration.ticketSnapshot = ticketBundle.ticketSnapshot;
    registration.confirmationEmailSent = false;

    await registration.save({ session });

    // Assuming session commits later or we don't have one if called post-transaction
    // The email sending happens after the save.
}

export async function sendConfirmationEmail(registrationId, participant, event) {
    try {
        const registration = await Registration.findById(registrationId);
        const emailResult = await sendTicketConfirmationEmail({
            participant,
            event,
            registration,
        });

        if (emailResult.sent) {
            await Registration.findByIdAndUpdate(registration._id, { confirmationEmailSent: true });
        }
    } catch (emailError) {
        console.error("Ticket email failed:", emailError.message);
    }
}

function formatRegistrationRecord(registration) {
    return {
        id: registration._id,
        ticketId: registration.ticketId || registration._id,
        ticketRef: registration.ticketId ? `/api/registrations/ticket/${registration.ticketId}` : `/api/registrations/${registration._id}`,
        eventName: registration.eventId?.name,
        eventType: registration.eventId?.eventType,
        organizer: registration.eventId?.organizerId?.organizerName || registration.ticketSnapshot?.organizerName,
        participationStatus: registration.status,
        schedule: {
            start: registration.eventId?.eventStartDate,
            end: registration.eventId?.eventEndDate,
        },
        teamName: registration.responses?.find((field) => (field.label || "").toLowerCase().includes("team"))?.value || "Individual",
        quantity: registration.quantity,
        paymentStatus: registration.paymentStatus,
        qrCodeDataUrl: registration.qrCodeDataUrl,
        details: registration,
    };
}

export async function registerForEvent(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    let registration;
    let participant;
    let event;

    try {
        const { eventId, responses, selections, quantity = 1, transactionId, paymentProof } = req.body;
        const participantId = req.user.id;
        const parsedQuantity = Math.max(1, Number(quantity) || 1);

        participant = await Participant.findById(participantId).session(session).lean();
        if (!participant) {
            await session.abortTransaction();
            return sendError(res, "Participant account not found", "NOT_FOUND", 404);
        }

        event = await Event.findById(eventId)
            .populate("organizerId", "organizerName")
            .session(session)
            .lean();

        if (!event) {
            await session.abortTransaction();
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        if (event.status !== "Published") {
            await session.abortTransaction();
            return sendError(res, `Registrations are currently ${event.status.toLowerCase()}`, "REGISTRATION_UNAVAILABLE", 400);
        }

        if (event.eligibility !== "ALL" && event.eligibility !== participant.participantType) {
            await session.abortTransaction();
            return sendError(res, "You are not eligible for this event", "INELIGIBLE_PARTICIPANT", 403);
        }

        if (new Date() > new Date(event.registrationDeadline)) {
            await session.abortTransaction();
            return sendError(res, "Registration deadline passed", "DEADLINE_PASSED", 400);
        }

        const existing = await Registration.findOne({ eventId, participantId }).session(session);
        if (existing && !["Cancelled", "Rejected"].includes(existing.status)) {
            await session.abortTransaction();
            return sendError(res, "You are already registered for this event.", "DUPLICATE_REGISTRATION", 400);
        }

        if (event.eventType === "Normal") {
            const currentRegs = await Registration.countDocuments({
                eventId,
                status: { $in: ACTIVE_REGISTRATION_STATUSES },
            }).session(session);

            if (currentRegs >= event.registrationLimit) {
                await session.abortTransaction();
                return sendError(res, "Event registration limit reached.", "CAPACITY_REACHED", 400);
            }

            const normalEvent = await NormalEvent.findById(eventId).session(session);
            if (normalEvent && !normalEvent.formLocked) {
                normalEvent.formLocked = true;
                await normalEvent.save({ session });
            }
        } else if (event.eventType === "Merchandise") {
            if (event.purchaseLimit && parsedQuantity > event.purchaseLimit) {
                await session.abortTransaction();
                return sendError(
                    res,
                    `You can purchase up to ${event.purchaseLimit} unit(s) for this item.`,
                    "PURCHASE_LIMIT_EXCEEDED",
                    400,
                );
            }

            // We do NOT decrement stock here anymore. It's decremented upon organizer approval.
            const merchEvent = await MerchandiseEvent.findById(eventId).session(session);
            if (!merchEvent || merchEvent.stockQuantity < parsedQuantity) {
                await session.abortTransaction();
                return sendError(res, "Not enough stock available to fulfill this request.", "STOCK_EXHAUSTED", 400);
            }
            price = merchEvent.price || 0;
            totalCalculatedPrice = price * parsedQuantity;
        }

        registration = existing || new Registration({ eventId, participantId });

        let processedResponses = [];
        if (event.eventType === "Normal") {
            const normalEvent = await NormalEvent.findById(eventId).session(session);
            if (Array.isArray(responses)) {
                processedResponses = responses.map(response => {
                    const fieldDef = normalEvent.customFormFields.find(f => f._id.toString() === response.fieldId);
                    return {
                        fieldId: response.fieldId,
                        label: fieldDef ? fieldDef.label : "Unknown Field",
                        value: response.value
                    };
                });
            }
        }

        registration.responses = processedResponses;
        registration.selections = event.eventType === "Merchandise" ? (selections || {}) : undefined;
        registration.quantity = event.eventType === "Merchandise" ? parsedQuantity : 1;
        registration.transactionId = transactionId || registration.transactionId;

        if (event.eventType === "Merchandise") {
            registration.status = "Pending";
            registration.paymentStatus = "Pending";
            registration.paymentProof = paymentProof; // Save base64 image 
            await registration.save({ session });
            await session.commitTransaction();

            const savedRegistration = await Registration.findById(registration._id)
                .populate({
                    path: "eventId",
                    populate: { path: "organizerId", select: "organizerName category description contactEmail" },
                });
            return sendSuccess(res, "Merchandise order placed. Pending organizer approval.", formatRegistrationRecord(savedRegistration), 201);
        }

        registration.status = "Registered";
        registration.paymentStatus = (event.price ?? event.registrationFee ?? 0) > 0 ? "Completed" : "N/A";

        await finalizeRegistrationTicket({ registration, participant, event, session });
        await session.commitTransaction();

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        if (error.code === 11000) {
            return sendError(res, "You are already registered for this event.", "DUPLICATE_REGISTRATION", 400);
        }
        return sendError(res, "Registration failed", error.message, 500);
    } finally {
        session.endSession();
    }

    await sendConfirmationEmail(registration._id, participant, event);

    const savedRegistration = await Registration.findById(registration._id)
        .populate({
            path: "eventId",
            populate: { path: "organizerId", select: "organizerName category description contactEmail" },
        });

    return sendSuccess(res, "Registration successful", formatRegistrationRecord(savedRegistration), 201);
}

export async function approveMerchandiseOrder(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const organizerId = req.user.id;

        const registration = await Registration.findById(id).populate("eventId").session(session);
        if (!registration || registration.eventId.eventType !== "Merchandise") {
            await session.abortTransaction();
            return sendError(res, "Invalid merchandise registration", "NOT_FOUND", 404);
        }

        if (String(registration.eventId.organizerId) !== String(organizerId)) {
            await session.abortTransaction();
            return sendError(res, "Unauthorized", "UNAUTHORIZED", 403);
        }

        if (registration.status !== "Pending") {
            await session.abortTransaction();
            return sendError(res, "Order is not pending approval", "INVALID_STATE", 400);
        }

        const merchEvent = await MerchandiseEvent.findById(registration.eventId._id).session(session);
        if (merchEvent.stockQuantity < registration.quantity) {
            await session.abortTransaction();
            return sendError(res, "Not enough stock to approve this order", "STOCK_EXHAUSTED", 400);
        }

        // Deduct stock
        merchEvent.stockQuantity -= registration.quantity;
        await merchEvent.save({ session });

        // Update registration
        registration.status = "Registered";
        registration.paymentStatus = "Completed";

        const participant = await Participant.findById(registration.participantId).session(session).lean();
        const event = await Event.findById(registration.eventId._id).populate("organizerId", "organizerName").session(session).lean();

        await finalizeRegistrationTicket({ registration, participant, event, session });
        await session.commitTransaction();

        // Send confirmation email post-transaction
        await sendConfirmationEmail(registration._id, participant, event);

        return sendSuccess(res, "Order approved and ticket generated", formatRegistrationRecord(registration), 200);

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        return sendError(res, "Failed to approve order", error.message, 500);
    } finally {
        session.endSession();
    }
}

export async function rejectMerchandiseOrder(req, res) {
    try {
        const { id } = req.params;
        const organizerId = req.user.id;

        const registration = await Registration.findById(id).populate("eventId");
        if (!registration || registration.eventId.eventType !== "Merchandise") {
            return sendError(res, "Invalid merchandise registration", "NOT_FOUND", 404);
        }

        if (String(registration.eventId.organizerId) !== String(organizerId)) {
            return sendError(res, "Unauthorized", "UNAUTHORIZED", 403);
        }

        if (registration.status !== "Pending") {
            return sendError(res, "Order is not pending approval", "INVALID_STATE", 400);
        }

        registration.status = "Rejected";
        // Do not touch stock, as it was never decremented
        await registration.save();

        return sendSuccess(res, "Order rejected", formatRegistrationRecord(registration), 200);
    } catch (error) {
        return sendError(res, "Failed to reject order", error.message, 500);
    }
}

export async function getMyRegistrations(req, res) {
    try {
        const participantId = req.user.id;
        const { tab } = req.query;

        const now = new Date();
        let registrations = await Registration.find({ participantId })
            .populate({
                path: "eventId",
                populate: {
                    path: "organizerId",
                    select: "organizerName category",
                },
            })
            .sort({ createdAt: -1 });

        if (tab === "upcoming") {
            registrations = registrations.filter((reg) =>
                reg.eventId
                && new Date(reg.eventId.eventStartDate) > now
                && ACTIVE_REGISTRATION_STATUSES.includes(reg.status)
            );
        } else if (tab === "normal") {
            registrations = registrations.filter((reg) => reg.eventId && reg.eventId.eventType === "Normal");
        } else if (tab === "merchandise") {
            registrations = registrations.filter((reg) => reg.eventId && reg.eventId.eventType === "Merchandise");
        } else if (tab === "completed") {
            registrations = registrations.filter((reg) =>
                reg.status === "Attended"
                || (reg.eventId && new Date(reg.eventId.eventEndDate) < now && reg.status === "Registered")
            );
        } else if (tab === "cancelled" || tab === "cancelled-rejected" || tab === "rejected") {
            registrations = registrations.filter((reg) => ["Cancelled", "Rejected"].includes(reg.status));
        }

        const formattedRegistrations = registrations.map(formatRegistrationRecord);
        return sendSuccess(res, `Fetched ${tab || "all"} registrations`, formattedRegistrations, 200);

    } catch (error) {
        return sendError(res, "Failed to fetch registrations", error.message, 500);
    }
}

export async function getRegistrationById(req, res) {
    try {
        const registration = await Registration.findOne({ _id: req.params.id, participantId: req.user.id })
            .populate({
                path: "eventId",
                populate: { path: "organizerId", select: "organizerName category description contactEmail" },
            });

        if (!registration) {
            return sendError(res, "Registration record not found", "NOT_FOUND", 404);
        }

        return sendSuccess(res, "Registration details fetched", formatRegistrationRecord(registration), 200);

    } catch (error) {
        return sendError(res, "Error fetching record", error.message, 500);
    }
}

export async function getRegistrationByTicketId(req, res) {
    try {
        const registration = await Registration.findOne({
            ticketId: req.params.ticketId,
            participantId: req.user.id,
        }).populate({
            path: "eventId",
            populate: { path: "organizerId", select: "organizerName category description contactEmail" },
        });

        if (!registration) {
            return sendError(res, "Ticket not found", "NOT_FOUND", 404);
        }

        return sendSuccess(res, "Ticket details fetched", formatRegistrationRecord(registration), 200);

    } catch (error) {
        return sendError(res, "Error fetching ticket", error.message, 500);
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

        const attendees = await Registration.find({
            eventId,
            status: { $in: ACTIVE_REGISTRATION_STATUSES },
        })
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

        const registration = await Registration.findOne({ _id: registrationId, participantId })
            .populate("eventId")
            .session(session);
        if (!registration) {
            await session.abortTransaction();
            return sendError(res, "Registration not found", "NOT_FOUND", 404);
        }

        if (registration.status === "Cancelled") {
            await session.abortTransaction();
            return sendError(res, "Registration is already cancelled", "ALREADY_CANCELLED", 400);
        }

        const event = registration.eventId;
        if (!event) {
            await session.abortTransaction();
            return sendError(res, "Associated event not found", "NOT_FOUND", 404);
        }

        if (new Date() > new Date(event.eventStartDate)) {
            await session.abortTransaction();
            return sendError(res, "Cannot cancel registration after the event has started", "EVENT_STARTED", 400);
        }

        if (event.eventType === "Merchandise" && ACTIVE_REGISTRATION_STATUSES.includes(registration.status)) {
            await MerchandiseEvent.findByIdAndUpdate(
                event._id,
                { $inc: { stockQuantity: registration.quantity } },
                { session },
            );
        }

        registration.status = "Cancelled";
        await registration.save({ session });

        await session.commitTransaction();
        return sendSuccess(res, "Registration cancelled successfully", formatRegistrationRecord(registration), 200);

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        return sendError(res, "Cancellation failed", error.message, 500);

    } finally {
        session.endSession();
    }
}
