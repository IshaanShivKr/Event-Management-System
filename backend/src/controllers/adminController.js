import crypto from "crypto";
import { hashPassword } from "../utils/authUtils.js";
import User from "../models/User.js";
import Participant from "../models/Participant.js";
import Organizer from "../models/Organizer.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { ORGANIZER_LOGIN_DOMAIN } from "../config/env.js";

function slugify(value = "") {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 18) || "club";
}

function generateTemporaryPassword(length = 12) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#%";
    const bytes = crypto.randomBytes(length);
    let password = "";
    for (let i = 0; i < length; i += 1) {
        password += chars[bytes[i] % chars.length];
    }
    return password;
}

async function generateUniqueOrganizerLoginEmail(organizerName) {
    const base = slugify(organizerName);
    const domain = String(ORGANIZER_LOGIN_DOMAIN || "felicity.local").replace(/^@+/, "").toLowerCase();

    for (let attempt = 0; attempt < 25; attempt += 1) {
        const suffix = crypto.randomInt(100, 99999);
        const candidate = `${base}.${suffix}@${domain}`.toLowerCase();
        const exists = await User.exists({ email: candidate });
        if (!exists) {
            return candidate;
        }
    }

    const fallback = `${base}.${Date.now()}@${domain}`.toLowerCase();
    return fallback;
}

function sanitizeOrganizer(organizer) {
    if (!organizer) return null;
    const obj = organizer.toObject ? organizer.toObject() : organizer;
    delete obj.password;
    return obj;
}

export async function createOrganizer(req, res) {
    try {
        const { organizerName, category, description, contactEmail, phone } = req.body;

        if (!organizerName || !category || !description || !contactEmail || !phone) {
            return sendError(
                res,
                "organizerName, category, description, contactEmail and phone are required",
                "MISSING_FIELDS",
                400,
            );
        }

        const loginEmail = await generateUniqueOrganizerLoginEmail(organizerName);
        const temporaryPassword = generateTemporaryPassword(12);
        const hashedPassword = await hashPassword(temporaryPassword);

        const newOrganizer = new Organizer({
            email: loginEmail,
            password: hashedPassword,
            organizerName,
            category,
            description,
            contactEmail,
            phone,
            accountStatus: "ACTIVE",
            accountStatusUpdatedAt: new Date(),
        });

        await newOrganizer.save();

        return sendSuccess(res, "Organizer created successfully", {
            organizer: sanitizeOrganizer(newOrganizer),
            credentials: {
                loginEmail,
                temporaryPassword,
            },
        }, 201);
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, "Unable to generate unique organizer login. Please retry.", "EMAIL_EXISTS", 409);
        }
        return sendError(res, "Failed to create organizer", error.message, 500);
    }
}

export async function getAllOrganizersForAdmin(req, res) {
    try {
        const { status, category, search } = req.query;

        const query = {};
        if (status) query.accountStatus = status.toUpperCase();
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { organizerName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { contactEmail: { $regex: search, $options: "i" } },
            ];
        }

        const organizers = await Organizer.find(query)
            .select("-password")
            .sort({ createdAt: -1 });

        return sendSuccess(res, "All organizers fetched", organizers, 200);
    } catch (error) {
        return sendError(res, "Failed to fetch organizers", error.message, 500);
    }
}

export async function getOrganizerByIdForAdmin(req, res) {
    try {
        const organizer = await Organizer.findById(req.params.id).select("-password");
        if (!organizer) {
            return sendError(res, "Organizer not found", "NOT_FOUND", 404);
        }

        const eventCount = await Event.countDocuments({ organizerId: organizer._id });

        return sendSuccess(res, "Organizer details fetched", {
            organizer,
            eventCount,
        }, 200);
    } catch (error) {
        return sendError(res, "Failed to fetch organizer", error.message, 500);
    }
}

export async function updateOrganizerAccountState(req, res) {
    try {
        const { action, reason } = req.body;
        const organizerId = req.params.id;

        const organizer = await Organizer.findById(organizerId);
        if (!organizer) {
            return sendError(res, "Organizer not found", "NOT_FOUND", 404);
        }

        const normalizedAction = String(action || "").toLowerCase();
        let nextStatus;

        if (normalizedAction === "disable") nextStatus = "DISABLED";
        else if (normalizedAction === "enable" || normalizedAction === "activate") nextStatus = "ACTIVE";
        else if (normalizedAction === "archive") nextStatus = "ARCHIVED";
        else {
            return sendError(res, "Invalid action. Use disable | enable | archive.", "INVALID_ACTION", 400);
        }

        organizer.accountStatus = nextStatus;
        organizer.accountStatusReason = reason || undefined;
        organizer.accountStatusUpdatedAt = new Date();
        await organizer.save();

        return sendSuccess(res, `Organizer account ${nextStatus.toLowerCase()} successfully`, sanitizeOrganizer(organizer), 200);
    } catch (error) {
        return sendError(res, "Failed to update organizer account state", error.message, 500);
    }
}

export async function deleteOrganizerPermanently(req, res) {
    try {
        const organizerId = req.params.id;

        const organizer = await Organizer.findById(organizerId);
        if (!organizer) {
            return sendError(res, "Organizer not found", "NOT_FOUND", 404);
        }

        const events = await Event.find({ organizerId }).select("_id");
        const eventIds = events.map((event) => event._id);

        let removedRegistrations = 0;
        if (eventIds.length) {
            const regDeleteResult = await Registration.deleteMany({ eventId: { $in: eventIds } });
            removedRegistrations = regDeleteResult.deletedCount || 0;
        }

        const eventDeleteResult = await Event.deleteMany({ organizerId });
        await Organizer.findByIdAndDelete(organizerId);

        return sendSuccess(res, "Organizer permanently deleted", {
            deletedOrganizerId: organizerId,
            deletedEvents: eventDeleteResult.deletedCount || 0,
            deletedRegistrations: removedRegistrations,
        }, 200);
    } catch (error) {
        return sendError(res, "Permanent deletion failed", error.message, 500);
    }
}

export async function getAdminDashboard(req, res) {
    try {
        const [
            totalParticipants,
            totalOrganizers,
            activeOrganizers,
            disabledOrganizers,
            archivedOrganizers,
            totalEvents,
            pendingResetRequests,
        ] = await Promise.all([
            Participant.countDocuments(),
            Organizer.countDocuments(),
            Organizer.countDocuments({ accountStatus: "ACTIVE" }),
            Organizer.countDocuments({ accountStatus: "DISABLED" }),
            Organizer.countDocuments({ accountStatus: "ARCHIVED" }),
            Event.countDocuments(),
            Organizer.countDocuments({ resetRequested: true }),
        ]);

        return sendSuccess(res, "Admin dashboard fetched", {
            participants: totalParticipants,
            organizers: {
                total: totalOrganizers,
                active: activeOrganizers,
                disabled: disabledOrganizers,
                archived: archivedOrganizers,
            },
            events: totalEvents,
            pendingResetRequests,
        }, 200);
    } catch (error) {
        return sendError(res, "Failed to fetch admin dashboard", error.message, 500);
    }
}

export async function getOrganizerPasswordResetRequests(req, res) {
    try {
        const { status = "pending" } = req.query;
        const query = {
            role: "Organizer",
        };

        if (status === "pending") {
            query.resetRequested = true;
        } else if (status.toLowerCase() !== "all") {
            query.resetRequestStatus = status[0].toUpperCase() + status.slice(1).toLowerCase();
        }

        const requests = await Organizer.find(query)
            .select("organizerName email contactEmail resetRequested resetReason resetRequestStatus resetRequestedAt resetResolvedAt resetResolutionComment")
            .sort({ resetRequestedAt: -1, createdAt: -1 });

        return sendSuccess(res, "Password reset requests fetched", requests, 200);
    } catch (error) {
        return sendError(res, "Failed to fetch reset requests", error.message, 500);
    }
}

export async function resolveOrganizerPasswordResetRequest(req, res) {
    try {
        const { action, comment } = req.body;
        const organizerId = req.params.id;

        const organizer = await Organizer.findById(organizerId);
        if (!organizer) {
            return sendError(res, "Organizer not found", "NOT_FOUND", 404);
        }

        if (!organizer.resetRequested && organizer.resetRequestStatus !== "Pending") {
            return sendError(res, "No pending reset request for this organizer", "NO_PENDING_REQUEST", 400);
        }

        const normalizedAction = String(action || "").toLowerCase();
        if (!["approve", "reject"].includes(normalizedAction)) {
            return sendError(res, "Invalid action. Use approve | reject.", "INVALID_ACTION", 400);
        }

        const resolvedAt = new Date();

        if (normalizedAction === "approve") {
            const temporaryPassword = generateTemporaryPassword(12);
            organizer.password = await hashPassword(temporaryPassword);
            organizer.resetRequested = false;
            organizer.resetRequestStatus = "Approved";
            organizer.resetResolvedAt = resolvedAt;
            organizer.resetResolutionComment = comment || "Approved by Admin";
            await organizer.save();

            return sendSuccess(res, "Reset request approved. New credentials generated.", {
                organizerId: organizer._id,
                organizerName: organizer.organizerName,
                loginEmail: organizer.email,
                temporaryPassword,
                status: organizer.resetRequestStatus,
            }, 200);
        }

        organizer.resetRequested = false;
        organizer.resetRequestStatus = "Rejected";
        organizer.resetResolvedAt = resolvedAt;
        organizer.resetResolutionComment = comment || "Rejected by Admin";
        await organizer.save();

        return sendSuccess(res, "Reset request rejected", {
            organizerId: organizer._id,
            organizerName: organizer.organizerName,
            status: organizer.resetRequestStatus,
        }, 200);
    } catch (error) {
        return sendError(res, "Failed to resolve reset request", error.message, 500);
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
        const events = await Event.find()
            .populate("organizerId", "organizerName category")
            .sort({ createdAt: -1 });
        return sendSuccess(res, "All system events fetched", events, 200);
    } catch (error) {
        return sendError(res, "Failed to fetch system events", error.message, 500);
    }
}

export async function deleteUser(req, res) {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return sendError(res, "User not found", "NOT_FOUND", 404);
        }

        if (user.role === "Admin") {
            return sendError(res, "Admin account cannot be deleted from this endpoint", "FORBIDDEN", 403);
        }

        await User.findByIdAndDelete(userId);
        return sendSuccess(res, "User removed successfully", null, 200);
    } catch (error) {
        return sendError(res, "Deletion failed", error.message, 500);
    }
}
