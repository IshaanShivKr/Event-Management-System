import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import NormalEvent from "../models/NormalEvent.js";
import MerchandiseEvent from "../models/MerchandiseEvent.js";
import Participant from "../models/Participant.js";
import Organizer from "../models/Organizer.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { postEventAnnouncementToDiscord } from "../utils/discordWebhookService.js";

const ACTIVE_REGISTRATION_STATUSES = ["Registered", "Waitlisted", "Attended"];
const INACTIVE_REGISTRATION_STATUSES = ["Cancelled", "Rejected"];
const REGISTRABLE_STATUSES = ["Published"];

const STATUS_TRANSITIONS = {
    Draft: new Set(["Draft", "Published", "Closed"]),
    Published: new Set(["Published", "Ongoing", "Closed"]),
    Ongoing: new Set(["Ongoing", "Completed", "Closed"]),
    Completed: new Set(["Completed", "Closed"]),
    Closed: new Set(["Closed"]),
};
const EVENT_STATUSES = new Set(["Draft", "Published", "Ongoing", "Completed", "Closed"]);

const DRAFT_EDITABLE_FIELDS = new Set([
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

const PUBLISHED_EDITABLE_FIELDS = new Set([
    "description",
    "registrationDeadline",
    "registrationLimit",
]);

function normalizeText(value = "") {
    return String(value).toLowerCase().trim();
}

function toBoolean(value) {
    return String(value).toLowerCase() === "true";
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function validateEventDates({ registrationDeadline, eventStartDate, eventEndDate }) {
    const deadline = parseDate(registrationDeadline);
    const start = parseDate(eventStartDate);
    const end = parseDate(eventEndDate);

    if (!deadline || !start || !end) {
        return { valid: false, message: "Invalid event date values" };
    }

    if (deadline > start) {
        return { valid: false, message: "Registration deadline must be on or before event start date" };
    }

    if (start > end) {
        return { valid: false, message: "Event start date must be on or before event end date" };
    }

    return { valid: true };
}

function getEventUnitPrice(event) {
    if (event.eventType === "Merchandise") return Number(event.price || 0);
    return Number(event.registrationFee || 0);
}

function parseTeamName(responses = []) {
    const teamField = responses.find((field) => normalizeText(field.label).includes("team"));
    const teamValue = typeof teamField?.value === "string" ? teamField.value.trim() : "";
    return teamValue || "Individual";
}

function parseBooleanLike(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    if (typeof value === "string") {
        const normalized = normalizeText(value);
        return ["true", "yes", "1", "complete", "completed", "done"].includes(normalized);
    }
    return false;
}

function isTeamCompleteRegistration(registration) {
    const completionField = (registration.responses || []).find((field) => {
        const label = normalizeText(field.label || "");
        return label.includes("team complete")
            || label.includes("completion")
            || label.includes("final team");
    });

    if (!completionField) return true;
    return parseBooleanLike(completionField.value);
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

    if (event.eventType === "Merchandise" && Number(event.stockQuantity || 0) <= 0) {
        reasons.push("Stock exhausted");
    }

    return {
        canRegister: reasons.length === 0,
        blockedReasons: reasons,
        actionLabel: event.eventType === "Merchandise" ? "Purchase" : "Register",
        remainingSpots: event.eventType === "Normal" ? Math.max(0, Number(event.registrationLimit || 0) - activeRegistrationsCount) : undefined,
        remainingStock: event.eventType === "Merchandise" ? Math.max(0, Number(event.stockQuantity || 0)) : undefined,
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

function ensurePublishableEvent(event) {
    const requiredFields = [
        "name",
        "description",
        "eligibility",
        "registrationDeadline",
        "eventStartDate",
        "eventEndDate",
        "registrationLimit",
    ];

    const missing = requiredFields.filter((field) => event[field] === undefined || event[field] === null || event[field] === "");
    if (missing.length) {
        return { valid: false, message: `Cannot publish. Missing required fields: ${missing.join(", ")}` };
    }

    const dateValidation = validateEventDates({
        registrationDeadline: event.registrationDeadline,
        eventStartDate: event.eventStartDate,
        eventEndDate: event.eventEndDate,
    });
    if (!dateValidation.valid) return dateValidation;

    if (event.eventType === "Normal" && !Array.isArray(event.customFormFields)) {
        return { valid: false, message: "Normal event must include custom form fields configuration." };
    }

    if (event.eventType === "Merchandise") {
        if (event.price === undefined || event.stockQuantity === undefined) {
            return { valid: false, message: "Merchandise event must include price and stock quantity." };
        }
    }

    return { valid: true };
}

function filterEditableUpdates(event, rawUpdates = {}) {
    const updates = { ...rawUpdates };
    delete updates.status;
    delete updates.organizerId;
    delete updates.eventType;
    delete updates.formLocked;

    if (event.status === "Draft") {
        const sanitized = {};
        Object.keys(updates).forEach((key) => {
            if (DRAFT_EDITABLE_FIELDS.has(key)) sanitized[key] = updates[key];
        });
        return { allowed: true, updates: sanitized };
    }

    if (event.status === "Published") {
        const disallowed = Object.keys(updates).filter((key) => !PUBLISHED_EDITABLE_FIELDS.has(key));
        if (disallowed.length) {
            return {
                allowed: false,
                message: `Published events can only update description, registrationDeadline, and registrationLimit. Invalid fields: ${disallowed.join(", ")}`,
            };
        }

        return { allowed: true, updates };
    }

    return {
        allowed: false,
        message: `Events in ${event.status} state cannot be edited. Only status change is allowed.`,
    };
}

function buildParticipantRows(registrations) {
    return registrations.map((registration) => {
        const participant = registration.participantId || {};
        const fullName = `${participant.firstName || ""} ${participant.lastName || ""}`.trim();
        const teamName = parseTeamName(registration.responses || []);

        return {
            registrationId: String(registration._id),
            ticketId: registration.ticketId || "",
            name: fullName || participant.email || "Unknown Participant",
            email: participant.email || "",
            registrationDate: registration.createdAt,
            paymentStatus: registration.paymentStatus || "N/A",
            teamName,
            attendance: registration.status === "Attended",
            attendanceStatus: registration.status === "Attended" ? "Attended" : "Not Attended",
            status: registration.status,
            quantity: Number(registration.quantity || 1),
            transactionId: registration.transactionId || "",
        };
    });
}

function filterParticipantRows(rows, query) {
    const {
        search,
        paymentStatus,
        attendance,
        status,
        regStatus,
        team,
    } = query;

    let filtered = [...rows];

    if (search) {
        const q = normalizeText(search);
        filtered = filtered.filter((row) =>
            normalizeText(row.name).includes(q)
            || normalizeText(row.email).includes(q)
            || normalizeText(row.ticketId).includes(q)
            || normalizeText(row.teamName).includes(q)
        );
    }

    if (paymentStatus) {
        filtered = filtered.filter((row) => normalizeText(row.paymentStatus) === normalizeText(paymentStatus));
    }

    const statusFilter = regStatus || status;
    if (statusFilter) {
        filtered = filtered.filter((row) => normalizeText(row.status) === normalizeText(statusFilter));
    }

    if (attendance) {
        const normalizedAttendance = normalizeText(attendance);
        if (normalizedAttendance === "attended") {
            filtered = filtered.filter((row) => row.attendance);
        } else if (normalizedAttendance === "not_attended" || normalizedAttendance === "not-attended") {
            filtered = filtered.filter((row) => !row.attendance);
        }
    }

    if (team) {
        const teamQuery = normalizeText(team);
        filtered = filtered.filter((row) => normalizeText(row.teamName).includes(teamQuery));
    }

    return filtered;
}

function csvEscape(value) {
    const val = value === undefined || value === null ? "" : String(value);
    if (val.includes(",") || val.includes("\"") || val.includes("\n")) {
        return `"${val.replace(/"/g, "\"\"")}"`;
    }
    return val;
}

function convertRowsToCsv(rows) {
    const headers = [
        "Ticket ID",
        "Name",
        "Email",
        "Registration Date",
        "Payment Status",
        "Team",
        "Attendance",
        "Registration Status",
        "Quantity",
        "Transaction ID",
    ];

    const lines = rows.map((row) => [
        row.ticketId,
        row.name,
        row.email,
        row.registrationDate ? new Date(row.registrationDate).toISOString() : "",
        row.paymentStatus,
        row.teamName,
        row.attendanceStatus,
        row.status,
        row.quantity,
        row.transactionId,
    ].map(csvEscape).join(","));

    return `${headers.join(",")}\n${lines.join("\n")}`;
}

async function getEventRegistrationsForOrganizer(eventId) {
    return Registration.find({ eventId })
        .populate("participantId", "firstName lastName email phone participantType")
        .sort({ createdAt: 1 })
        .lean();
}

function computeEventAnalytics(event, registrations) {
    const unitPrice = getEventUnitPrice(event);
    const activeRegistrations = registrations.filter((reg) => ACTIVE_REGISTRATION_STATUSES.includes(reg.status));
    const attendanceCount = registrations.filter((reg) => reg.status === "Attended").length;

    const revenue = registrations.reduce((sum, reg) => {
        if (reg.paymentStatus !== "Completed") return sum;
        if (INACTIVE_REGISTRATION_STATUSES.includes(reg.status)) return sum;
        const quantity = event.eventType === "Merchandise" ? Number(reg.quantity || 1) : 1;
        return sum + (unitPrice * quantity);
    }, 0);

    const sales = event.eventType === "Merchandise"
        ? activeRegistrations.reduce((sum, reg) => sum + Number(reg.quantity || 1), 0)
        : 0;

    const teamRegistrations = registrations.filter((reg) => parseTeamName(reg.responses || []) !== "Individual");
    const completedTeams = teamRegistrations.filter((reg) => isTeamCompleteRegistration(reg));
    const teamCompletionRate = teamRegistrations.length
        ? Number(((completedTeams.length / teamRegistrations.length) * 100).toFixed(2))
        : 0;

    return {
        registrations: activeRegistrations.length,
        sales,
        revenue,
        attendance: {
            attended: attendanceCount,
            notAttended: Math.max(0, activeRegistrations.length - attendanceCount),
            totalTrackable: activeRegistrations.length,
        },
        teamCompletion: {
            completed: completedTeams.length,
            total: teamRegistrations.length,
            rate: teamCompletionRate,
        },
    };
}

export async function createEvent(req, res) {
    try {
        const { eventType, ...eventData } = req.body;
        const organizerId = req.user.id;

        if (!["Normal", "Merchandise"].includes(eventType)) {
            return sendError(res, "Invalid event type", "INVALID_EVENT_TYPE", 400);
        }

        const dateValidation = validateEventDates({
            registrationDeadline: eventData.registrationDeadline,
            eventStartDate: eventData.eventStartDate,
            eventEndDate: eventData.eventEndDate,
        });
        if (!dateValidation.valid) {
            return sendError(res, dateValidation.message, "INVALID_EVENT_DATES", 400);
        }

        let newEvent;
        if (eventType === "Normal") {
            const {
                name,
                description,
                eligibility,
                registrationDeadline,
                eventStartDate,
                eventEndDate,
                registrationLimit,
                eventTags,
                registrationFee,
                customFormFields = [],
            } = eventData;

            newEvent = new NormalEvent({
                name,
                description,
                eligibility,
                registrationDeadline,
                eventStartDate,
                eventEndDate,
                registrationLimit,
                eventTags,
                registrationFee,
                customFormFields: Array.isArray(customFormFields) ? customFormFields : [],
                organizerId,
                status: "Draft",
            });
        } else {
            const {
                name,
                description,
                eligibility,
                registrationDeadline,
                eventStartDate,
                eventEndDate,
                registrationLimit,
                eventTags,
                itemDetails,
                price,
                stockQuantity,
                purchaseLimit,
            } = eventData;

            newEvent = new MerchandiseEvent({
                name,
                description,
                eligibility,
                registrationDeadline,
                eventStartDate,
                eventEndDate,
                registrationLimit,
                eventTags,
                itemDetails,
                price,
                stockQuantity,
                purchaseLimit,
                organizerId,
                status: "Draft",
            });
        }

        await newEvent.save();
        return sendSuccess(res, `${eventType} event created as draft`, newEvent, 201);

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
        const events = await Event.find({ organizerId: req.user.id }).sort({ createdAt: -1 });
        const eventCards = events.map((event) => ({
            _id: event._id,
            name: event.name,
            eventType: event.eventType,
            status: event.status,
            registrationDeadline: event.registrationDeadline,
            eventStartDate: event.eventStartDate,
            eventEndDate: event.eventEndDate,
            manageLink: `/api/events/${event._id}/organizer-detail`,
        }));

        return sendSuccess(res, "Your events fetched successfully", eventCards, 200);
    } catch (error) {
        return sendError(res, "Failed to fetch your events", error.message, 500);
    }
}

export async function getOrganizerDashboard(req, res) {
    try {
        const organizerId = req.user.id;
        const now = new Date();

        const events = await Event.find({ organizerId }).sort({ createdAt: -1 }).lean();
        const carouselEvents = events.map((event) => ({
            _id: event._id,
            name: event.name,
            type: event.eventType,
            status: event.status,
            manageLink: `/api/events/${event._id}/organizer-detail`,
            schedule: {
                start: event.eventStartDate,
                end: event.eventEndDate,
            },
        }));

        const completedEvents = events.filter((event) =>
            event.status === "Completed"
            || (event.status === "Closed" && new Date(event.eventEndDate) <= now)
        );

        let aggregateAnalytics = {
            completedEvents: completedEvents.length,
            registrations: 0,
            sales: 0,
            revenue: 0,
            attendance: 0,
        };

        let completedEventAnalytics = [];

        if (completedEvents.length) {
            const completedEventIds = completedEvents.map((event) => event._id);
            const registrations = await Registration.find({
                eventId: { $in: completedEventIds },
            }).lean();

            const registrationMap = new Map();
            registrations.forEach((reg) => {
                const key = String(reg.eventId);
                if (!registrationMap.has(key)) registrationMap.set(key, []);
                registrationMap.get(key).push(reg);
            });

            completedEventAnalytics = completedEvents.map((event) => {
                const regs = registrationMap.get(String(event._id)) || [];
                const analytics = computeEventAnalytics(event, regs);

                aggregateAnalytics.registrations += analytics.registrations;
                aggregateAnalytics.sales += analytics.sales;
                aggregateAnalytics.revenue += analytics.revenue;
                aggregateAnalytics.attendance += analytics.attendance.attended;

                return {
                    eventId: event._id,
                    name: event.name,
                    type: event.eventType,
                    status: event.status,
                    analytics,
                };
            });
        }

        return sendSuccess(res, "Organizer dashboard fetched", {
            carouselEvents,
            completedEventAnalytics,
            aggregateAnalytics,
        }, 200);
    } catch (error) {
        return sendError(res, "Failed to fetch organizer dashboard", error.message, 500);
    }
}

export async function getOrganizerOngoingEvents(req, res) {
    try {
        const organizerId = req.user.id;
        const now = new Date();

        const events = await Event.find({
            organizerId,
            $or: [
                { status: "Ongoing" },
                {
                    status: "Published",
                    eventStartDate: { $lte: now },
                    eventEndDate: { $gte: now },
                },
            ],
        })
            .sort({ eventStartDate: 1 })
            .lean();

        return sendSuccess(res, "Ongoing events fetched", events, 200);
    } catch (error) {
        return sendError(res, "Failed to fetch ongoing events", error.message, 500);
    }
}

export async function getOrganizerEventDetail(req, res) {
    try {
        const eventId = req.params.id;
        const organizerId = req.user.id;

        const event = await Event.findById(eventId).populate("organizerId", "organizerName category contactEmail");
        if (!event) {
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        if (String(event.organizerId._id) !== String(organizerId)) {
            return sendError(res, "Unauthorized: You do not own this event", "UNAUTHORIZED", 403);
        }

        const registrations = await getEventRegistrationsForOrganizer(eventId);
        const analytics = computeEventAnalytics(event, registrations);

        const allRows = buildParticipantRows(registrations);
        const filteredRows = filterParticipantRows(allRows, req.query);

        const overview = {
            _id: event._id,
            name: event.name,
            eventType: event.eventType,
            status: event.status,
            description: event.description,
            eligibility: event.eligibility,
            registrationDeadline: event.registrationDeadline,
            eventStartDate: event.eventStartDate,
            eventEndDate: event.eventEndDate,
            registrationLimit: event.registrationLimit,
            pricing: {
                registrationFee: event.registrationFee ?? 0,
                price: event.price ?? 0,
            },
            organizer: event.organizerId,
        };

        return sendSuccess(res, "Organizer event detail fetched", {
            overview,
            analytics,
            participants: {
                total: allRows.length,
                filtered: filteredRows.length,
                records: filteredRows,
            },
        }, 200);
    } catch (error) {
        return sendError(res, "Failed to fetch organizer event detail", error.message, 500);
    }
}

export async function exportEventParticipantsCsv(req, res) {
    try {
        const eventId = req.params.id;
        const organizerId = req.user.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        if (String(event.organizerId) !== String(organizerId)) {
            return sendError(res, "Unauthorized: You do not own this event", "UNAUTHORIZED", 403);
        }

        const registrations = await getEventRegistrationsForOrganizer(eventId);
        const allRows = buildParticipantRows(registrations);
        const filteredRows = filterParticipantRows(allRows, req.query);
        const csv = convertRowsToCsv(filteredRows);

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="event-${eventId}-participants.csv"`);
        return res.status(200).send(csv);
    } catch (error) {
        return sendError(res, "Failed to export CSV", error.message, 500);
    }
}

export async function updateEventStatus(req, res) {
    try {
        const { status } = req.body;
        const eventId = req.params.id;

        if (!status || !EVENT_STATUSES.has(status)) {
            return sendError(res, "Invalid status value", "INVALID_STATUS", 400);
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        if (String(event.organizerId) !== String(req.user.id)) {
            return sendError(res, "Unauthorized: You do not own this event", "UNAUTHORIZED", 403);
        }

        const allowedTransitions = STATUS_TRANSITIONS[event.status] || new Set();
        if (!allowedTransitions.has(status)) {
            return sendError(
                res,
                `Invalid status transition from ${event.status} to ${status}`,
                "INVALID_TRANSITION",
                400,
            );
        }

        if (status === "Published") {
            const validation = ensurePublishableEvent(event);
            if (!validation.valid) {
                return sendError(res, validation.message, "PUBLISH_VALIDATION_FAILED", 400);
            }
        }

        const previousStatus = event.status;
        event.status = status;
        await event.save();

        let discord = { sent: false, skipped: true };
        if (previousStatus !== "Published" && status === "Published") {
            try {
                const organizer = await Organizer.findById(req.user.id).select("organizerName discordWebhookUrl").lean();
                if (organizer?.discordWebhookUrl) {
                    discord = await postEventAnnouncementToDiscord({
                        webhookUrl: organizer.discordWebhookUrl,
                        organizerName: organizer.organizerName,
                        event,
                    });
                }
            } catch (webhookError) {
                discord = { sent: false, skipped: false, error: webhookError.message };
            }
        }

        return sendSuccess(res, `Event status updated to ${status}`, {
            event,
            discord,
        }, 200);
    } catch (error) {
        return sendError(res, "Update status failed", error.message, 500);
    }
}

export async function updateEvent(req, res) {
    try {
        const eventId = req.params.id;
        const updates = req.body?.updates && typeof req.body.updates === "object" ? req.body.updates : req.body;

        const event = await Event.findById(eventId);
        if (!event) {
            return sendError(res, "Event not found", "NOT_FOUND", 404);
        }

        if (String(event.organizerId) !== String(req.user.id)) {
            return sendError(res, "Unauthorized", "UNAUTHORIZED", 403);
        }

        const editableResult = filterEditableUpdates(event, updates);
        if (!editableResult.allowed) {
            return sendError(res, editableResult.message, "EDIT_NOT_ALLOWED", 400);
        }

        const sanitizedUpdates = editableResult.updates;
        if (!Object.keys(sanitizedUpdates).length) {
            return sendError(res, "No valid update fields provided", "NO_UPDATES", 400);
        }

        if (sanitizedUpdates.customFormFields !== undefined) {
            if (event.eventType !== "Normal") {
                return sendError(res, "Only normal events support custom form fields", "INVALID_FORM_BUILDER_EVENT", 400);
            }
            if (event.formLocked) {
                return sendError(res, "Cannot edit form fields after registrations have started", "FORM_LOCKED", 400);
            }
            if (event.status !== "Draft") {
                return sendError(res, "Form builder can only be edited in draft state", "FORM_EDIT_NOT_ALLOWED", 400);
            }

            if (!Array.isArray(sanitizedUpdates.customFormFields)) {
                return sendError(res, "customFormFields must be an array", "INVALID_FORM_FIELDS", 400);
            }

            sanitizedUpdates.customFormFields = sanitizedUpdates.customFormFields.map((field, index) => ({
                ...field,
                order: field.order ?? index + 1,
            }));
        }

        if (event.status === "Published") {
            if (sanitizedUpdates.registrationDeadline !== undefined) {
                const newDeadline = parseDate(sanitizedUpdates.registrationDeadline);
                const oldDeadline = parseDate(event.registrationDeadline);
                if (!newDeadline || !oldDeadline || newDeadline < oldDeadline) {
                    return sendError(
                        res,
                        "For published events, registration deadline can only be extended.",
                        "DEADLINE_EXTENSION_REQUIRED",
                        400,
                    );
                }
            }

            if (sanitizedUpdates.registrationLimit !== undefined) {
                const newLimit = Number(sanitizedUpdates.registrationLimit);
                if (Number.isNaN(newLimit) || newLimit < Number(event.registrationLimit || 0)) {
                    return sendError(
                        res,
                        "For published events, registration limit can only be increased.",
                        "LIMIT_INCREASE_REQUIRED",
                        400,
                    );
                }
            }
        }

        const dateValidation = validateEventDates({
            registrationDeadline: sanitizedUpdates.registrationDeadline ?? event.registrationDeadline,
            eventStartDate: sanitizedUpdates.eventStartDate ?? event.eventStartDate,
            eventEndDate: sanitizedUpdates.eventEndDate ?? event.eventEndDate,
        });
        if (!dateValidation.valid) {
            return sendError(res, dateValidation.message, "INVALID_EVENT_DATES", 400);
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            eventId,
            { $set: sanitizedUpdates },
            { new: true, runValidators: true },
        );
        return sendSuccess(res, "Event updated successfully", updatedEvent, 200);
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

        if (String(event.organizerId) !== String(req.user.id)) {
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
        return sendSuccess(res, "Event deleted successfully", null, 200);
    } catch (error) {
        return sendError(res, "Deletion failed", error.message, 500);
    }
}
