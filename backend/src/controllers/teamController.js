import crypto from "crypto";
import Team from "../models/Team.js";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import Participant from "../models/Participant.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { finalizeRegistrationTicket, sendConfirmationEmail } from "./registrationController.js";

// Helper to generate a unique invite code
const generateInviteCode = () => {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
};

export async function createTeam(req, res) {
    try {
        const { eventId, name, memberEmails } = req.body;
        const leaderId = req.user.id;

        if (!eventId || !name) {
            return sendError(res, "Event ID and Team Name are required", "MISSING_FIELDS", 400);
        }

        const event = await Event.findById(eventId);
        if (!event) return sendError(res, "Event not found", "NOT_FOUND", 404);
        if (event.maxTeamSize <= 1) return sendError(res, "This is not a team event", "INVALID_EVENT", 400);

        // Check if user is already in a team or registered for this event
        const existingReg = await Registration.findOne({ eventId, participantId: leaderId });
        if (existingReg) {
            return sendError(res, "You are already registered or in a team for this event", "ALREADY_REGISTERED", 400);
        }

        const existingTeam = await Team.findOne({ name, eventId });
        if (existingTeam) {
            return sendError(res, "Team name already taken for this event", "NAME_TAKEN", 400);
        }

        const inviteCode = generateInviteCode();

        const newTeam = new Team({
            name,
            eventId,
            leaderId,
            members: [leaderId],
            maxSize: event.maxTeamSize,
            inviteCode,
            status: "Forming"
        });

        await newTeam.save();

        return sendSuccess(res, "Team created successfully", { team: newTeam }, 201);
    } catch (error) {
        return sendError(res, "Failed to create team", error.message, 500);
    }
}

export async function joinTeam(req, res) {
    try {
        const { inviteCode } = req.body;
        const participantId = req.user.id;

        const team = await Team.findOne({ inviteCode }).populate("eventId");
        if (!team) return sendError(res, "Invalid invite code", "NOT_FOUND", 404);

        const eventId = team.eventId._id;

        if (team.status === "Completed") {
            return sendError(res, "This team is already full", "TEAM_FULL", 400);
        }

        if (team.members.includes(participantId)) {
            return sendError(res, "You are already in this team", "ALREADY_MEMBER", 400);
        }

        const existingReg = await Registration.findOne({ eventId, participantId });
        if (existingReg) {
            return sendError(res, "You are already registered for this event", "ALREADY_REGISTERED", 400);
        }

        // Add member
        team.members.push(participantId);

        // Check if team is complete
        if (team.members.length === team.maxSize) {
            team.status = "Completed";
        }

        await team.save();

        // If completed, trigger registration and ticket generation for ALL members
        if (team.status === "Completed") {
            for (const memberId of team.members) {
                const participant = await Participant.findById(memberId);
                const reg = new Registration({
                    eventId,
                    participantId: memberId,
                    teamId: team._id,
                    status: "Registered",
                    paymentStatus: "N/A"
                });

                await finalizeRegistrationTicket({ registration: reg, participant, event });
                await sendConfirmationEmail(reg._id, participant, event);
            }
        }

        return sendSuccess(res, "Joined team successfully", { team }, 200);

    } catch (error) {
        return sendError(res, "Failed to join team", error.message, 500);
    }
}

export async function getMyTeams(req, res) {
    try {
        const participantId = req.user.id;
        const teams = await Team.find({ members: participantId }).populate("eventId");
        return sendSuccess(res, "Teams retrieved successfully", { teams }, 200);
    } catch (err) {
        return sendError(res, "Failed to retrieve teams", err.message, 500);
    }
}
