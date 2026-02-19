import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import NormalEvent from "../models/NormalEvent.js";
import MerchandiseEvent from "../models/MerchandiseEvent.js";
import Participant from "../models/Participant.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

const ACTIVE_REGISTRATION_STATUSES = ["Registered", "Waitlisted", "Attended"];
const REGISTRABLE_STATUSES = ["Published"];

function normalizeText(value = "") {
    return String(value).toLowerCase().trim();
}

function toBoolean(value) {
    return String(value).toLowerCase() === "true";
}

function levenshteinDistance(a, b) {
    const x = normalizeText(a);
    const y = normalizeText(b);

    if (!x.length) return y.length;
    if (!y.length) return x.length;

    const matrix = Array.from({ length: x.length + 1 }, () => Array(y.length + 1).fill(0));
    for (let i = 0; i <= x.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= y.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= x.length; i += 1) {
        for (let j = 1; j <= y.length; j += 1) {
            const cost = x[i - 1] === y[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost,
            );
        }
    }

    return matrix[x.length][y.length];
}

function computeSearchScore(query, event) {
    const q = normalizeText(query);
    if (!q) return 0;

    const fields = [
        event.name || "",
        event.description || "",
        event.organizerId?.organizerName || "",
        ...(event.eventTags || []),
    ];

    let bestScore = 0;

    fields.forEach((field) => {
        const normalizedField = normalizeText(field);
        if (!normalizedField) return;

        if (normalizedField.includes(q)) {
            bestScore = Math.max(bestScore, 100);
            return;
        }

        const tokens = normalizedField.split(/\s+/).filter(Boolean);
        tokens.forEach((token) => {
            const distance = levenshteinDistance(q, token);
            const maxLen = Math.max(q.length, token.length) || 1;
            const similarity = 1 - (distance / maxLen);
            if (similarity >= 0.62) {
                bestScore = Math.max(bestScore, Math.round(similarity * 90));
            }
        });
    });

    return bestScore;
}

function buildAvailability(event, activeRegistrationsCount) {
    const reasons = [];
    const now = new Date();

    if (!REGISTRABLE_STATUSES.includes(event.status)) {
        reasons.push(`Event status is ${event.status}`);
    }

    if (new Date(event.registrationDeadline) < now) {
        reasons.push("Registration deadline passed");
    }

    if (event.eventType === "Normal" && activeRegistrationsCount >= event.registrationLimit) {
        reasons.push("Registration limit reached");
    }

    if (event.eventType === "Merchandise" && event.stockQuantity <= 0) {
        reasons.push("Stock exhausted");
    }

    return {
        canRegister: reasons.length === 0,
        blockedReasons: reasons,
        actionLabel: event.eventType === "Merchandise" ? "Purchase" : "Register",
        remainingSpots: event.eventType === "Normal" ? Math.max(0, event.registrationLimit - activeRegistrationsCount) : undefined,
        remainingStock: event.eventType === "Merchandise" ? Math.max(0, event.stockQuantity) : undefined,
    };
}

async function getActiveRegistrationCountMap(eventIds) {
    if (!eventIds.length) return new Map();

    const counts = await Registration.aggregate([
        {
            $match: {
                eventId: { $in: eventIds },
                status: { $in: ACTIVE_REGISTRATION_STATUSES },
            },
        },
        {
            $group: {
                _id: "$eventId",
                count: { $sum: 1 },
            },
        },
    ]);

    const countMap = new Map();
    counts.forEach((item) => countMap.set(String(item._id), item.count));
    return countMap;
}

async function getTrendingCountMap(eventIds = null) {
    const since = new Date(Date.now() - (24 * 60 * 60 * 1000));
    const match = {
        createdAt: { $gte: since },
        status: { $in: ACTIVE_REGISTRATION_STATUSES },
    };

    if (eventIds?.length) {
        match.eventId = { $in: eventIds };
    }

    const trends = await Registration.aggregate([
        { $match: match },
        {
            $group: {
                _id: "$eventId",
                registrations: { $sum: 1 },
            },
        },
    ]);

    const trendMap = new Map();
    trends.forEach((item) => trendMap.set(String(item._id), item.registrations));
    return trendMap;
}

async function loadParticipantContext(req) {
    if (!req.user || req.user.role !== "Participant") return null;
    return Participant.findById(req.user.id).select("participantType interests followedClubs").lean();
}

async function getFilteredEvents(req, { requireParticipant = false } = {}) {
    const {
        eventType,
        eligibility,
        startDate,
        endDate,
        followedOnly,
        search,
        q,
        trending,
    } = req.query;

    const participant = await loadParticipantContext(req);
    if (requireParticipant && !participant) {
        throw new Error("PARTICIPANT_REQUIRED");
    }

    const searchQuery = search || q || "";

    const query = {
        status: { $in: ["Published", "Ongoing"] },
    };

    if (eventType) {
        query.eventType = eventType;
    }

    if (eligibility) {
        query.eligibility = eligibility;
    } else if (participant?.participantType) {
        query.eligibility = { $in: ["ALL", participant.participantType] };
    }

    if (startDate || endDate) {
        query.eventStartDate = {};
        if (startDate) query.eventStartDate.$gte = new Date(startDate);
        if (endDate) query.eventStartDate.$lte = new Date(endDate);
    }

    let events = await Event.find(query)
        .populate("organizerId", "organizerName category description contactEmail")
        .sort({ createdAt: -1 })
        .lean();

    const followedSet = new Set((participant?.followedClubs || []).map((id) => String(id)));
    if (toBoolean(followedOnly)) {
        events = events.filter((event) => followedSet.has(String(event.organizerId?._id || event.organizerId)));
    }

    if (searchQuery) {
        events = events
            .map((event) => ({
                ...event,
                _searchScore: computeSearchScore(searchQuery, event),
            }))
            .filter((event) => event._searchScore > 0);
    }

    const eventIds = events.map((event) => event._id);
    const countMap = await getActiveRegistrationCountMap(eventIds);
    const trendMap = await getTrendingCountMap(eventIds);
    const interestSet = new Set((participant?.interests || []).map(normalizeText));

    let enriched = events.map((event) => {
        const activeCount = countMap.get(String(event._id)) || 0;
        const trendingCount = trendMap.get(String(event._id)) || 0;
        const recommendationScore = (() => {
            let score = 0;
            if (followedSet.has(String(event.organizerId?._id || event.organizerId))) {
                score += 30;
            }

            (event.eventTags || []).forEach((tag) => {
                if (interestSet.has(normalizeText(tag))) {
                    score += 10;
                }
            });

            score += Math.min(20, trendingCount * 2);
            score += event._searchScore || 0;
            return score;
        })();

        return {
            ...event,
            availability: buildAvailability(event, activeCount),
            analytics: {
                activeRegistrations: activeCount,
                trending24h: trendingCount,
            },
            recommendationScore,
        };
    });

    if (toBoolean(trending)) {
        enriched = enriched
            .filter((event) => event.analytics.trending24h > 0)
            .sort((a, b) => b.analytics.trending24h - a.analytics.trending24h || b.recommendationScore - a.recommendationScore)
            .slice(0, 5);
    } else if (searchQuery) {
        enriched = enriched.sort((a, b) => b._searchScore - a._searchScore || b.recommendationScore - a.recommendationScore);
    } else {
        enriched = enriched.sort((a, b) => b.recommendationScore - a.recommendationScore || new Date(a.eventStartDate) - new Date(b.eventStartDate));
    }

    return enriched.map((event) => {
        const { _searchScore, ...rest } = event;
        return rest;
    });
}

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
        const events = await getFilteredEvents(req);
        return sendSuccess(res, "Events fetched successfully", events, 200);

    } catch (error) {
        return sendError(res, "Failed to fetch events", error.message, 500);
    }
}

export async function browseEvents(req, res) {
    try {
        const events = await getFilteredEvents(req, { requireParticipant: true });
        return sendSuccess(res, "Browse events fetched successfully", {
            total: events.length,
            events,
        }, 200);

    } catch (error) {
        if (error.message === "PARTICIPANT_REQUIRED") {
            return sendError(res, "Participant authentication is required for this endpoint", "FORBIDDEN_ROLE", 403);
        }
        return sendError(res, "Failed to fetch browse events", error.message, 500);
    }
}

export async function getTrendingEvents(req, res) {
    try {
        req.query.trending = "true";
        const events = await getFilteredEvents(req);
        return sendSuccess(res, "Trending events fetched successfully", events.slice(0, 5), 200);

    } catch (error) {
        return sendError(res, "Failed to fetch trending events", error.message, 500);
    }
}

export async function getEventById(req, res) {
    try {
        const event = await Event.findById(req.params.id).populate("organizerId", "organizerName category description contactEmail phone");
        if (!event) {
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        const activeCount = await Registration.countDocuments({
            eventId: event._id,
            status: { $in: ACTIVE_REGISTRATION_STATUSES },
        });

        const response = {
            ...event.toObject(),
            availability: buildAvailability(event, activeCount),
            analytics: {
                activeRegistrations: activeCount,
            },
        };

        return sendSuccess(res, "Event details fetched successfully", response, 200);

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

        const registrationCount = await Registration.countDocuments({
            eventId,
            status: { $in: ACTIVE_REGISTRATION_STATUSES },
        });
        if (registrationCount > 0) {
            return sendError(res, "Cannot delete event with active registrations. Cancel them first.", "HAS_REGISTRATIONS", 400);
        }

        await Event.findByIdAndDelete(eventId);
        return sendSuccess(res, "Event deleted successfully", null);

    } catch (error) {
        return sendError(res, "Deletion failed", error.message, 500);
    }
}
