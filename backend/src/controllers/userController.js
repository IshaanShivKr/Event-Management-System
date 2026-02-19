import mongoose from "mongoose";
import User from "../models/User.js";
import Participant from "../models/Participant.js";
import Organizer from "../models/Organizer.js";
import Event from "../models/Event.js";
import { hashPassword, comparePasswords } from "../utils/authUtils.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

export async function getMe(req, res) {
    try {
        if (!req.user) {
            return sendError(res, "User not found", "NOT_FOUND", 404);
        }
        return sendSuccess(res, "User profile fetched", req.user);

    } catch (error) {
        return sendError(res, "Error fetching profile", error.message, 500);
    }
}

export async function updateProfile(req, res) {
    try {
        const { role, id } = req.user;
        let updateData = {};
        let Model = User;

        if (role === "Participant") {
            const { firstName, lastName, phone, collegeOrOrg, interests, followedClubs } = req.body;
            updateData = { firstName, lastName, phone, collegeOrOrg, interests };
            Model = Participant;

            if (followedClubs !== undefined) {
                if (!Array.isArray(followedClubs)) {
                    return sendError(res, "followedClubs must be an array", "INVALID_FOLLOWED_CLUBS", 400);
                }

                const sanitizedIds = followedClubs.filter((clubId) => mongoose.Types.ObjectId.isValid(clubId));
                const organizerCount = await Organizer.countDocuments({ _id: { $in: sanitizedIds } });
                if (organizerCount !== sanitizedIds.length) {
                    return sendError(res, "One or more followed clubs are invalid", "INVALID_ORGANIZER_IDS", 400);
                }

                updateData.followedClubs = sanitizedIds;
            }
        } else if (role === "Organizer") {
            const { organizerName, description, phone, contactEmail, category } = req.body;
            updateData = { organizerName, description, phone, contactEmail, category };
            Model = Organizer;
        } else {
            return sendError(res, "Unauthorized role update", "UNAUTHORIZED_ROLE", 403);
        }

        Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

        const updatedUser = await Model.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true },
        ).select("-password");

        return sendSuccess(res, "Profile updated successfully", updatedUser);
    } catch (error) {
        return sendError(res, "Update failed", error.message, 500);
    }
}

export async function updatePassword(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!oldPassword || !newPassword) {
            return sendError(res, "Old and new passwords are required", "MISSING_PASSWORD_FIELDS", 400);
        }

        if (newPassword.length < 6) {
            return sendError(res, "New password must be at least 6 characters long", "WEAK_PASSWORD", 400);
        }

        const user = await User.findById(userId).select("+password");
        if (!user) {
            return sendError(res, "User not found", "NOT_FOUND", 404);
        }

        const isMatch = await comparePasswords(oldPassword, user.password);
        if (!isMatch) {
            return sendError(res, "Current password incorrect", "INVALID_CREDENTIALS", 401);
        }

        user.password = await hashPassword(newPassword);
        await user.save();

        return sendSuccess(res, "Password updated successfully", null, 200);

    } catch (error) {
        return sendError(res, "Password update failed", error.message, 500);
    }
}

export async function deleteMyAccount(req, res) {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        if (role === "Organizer") {
            const activeEvents = await Event.countDocuments({
                organizerId: userId,
                status: { $in: ["Draft", "Published", "Ongoing", "Closed"] },
            });

            if (activeEvents > 0) {
                return sendError(
                    res,
                    "Cannot delete account with active events. Please close or delete your events first.",
                    "ACTIVE_EVENTS_EXIST",
                    400,
                );
            }
        }

        await User.findByIdAndDelete(userId);
        return sendSuccess(res, "Account deleted successfully", null, 200);

    } catch (error) {
        return sendError(res, "Account deletion failed", error.message, 500);
    }
}

export async function requestPasswordReset(req, res) {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return sendError(res, "User not found", "NOT_FOUND", 404);
        }

        user.resetRequested = true;
        user.resetReason = reason || "Forgotten Password";
        await user.save();

        return sendSuccess(res, "Request sent to Admin. Please wait for approval.", null, 200);

    } catch (error) {
        return sendError(res, "Failed to submit request", error.message, 500);
    }
}

export async function getAllOrganizers(req, res) {
    try {
        const organizers = await Organizer.find()
            .select("organizerName category description contactEmail phone");

        let followedSet = new Set();
        if (req.user?.role === "Participant") {
            const participant = await Participant.findById(req.user.id).select("followedClubs").lean();
            followedSet = new Set((participant?.followedClubs || []).map((id) => String(id)));
        }

        const organizerList = organizers.map((organizer) => ({
            _id: organizer._id,
            organizerName: organizer.organizerName,
            category: organizer.category,
            description: organizer.description,
            contactEmail: organizer.contactEmail,
            phone: organizer.phone,
            isFollowed: followedSet.has(String(organizer._id)),
        }));

        return sendSuccess(res, "All organizers fetched", organizerList, 200);

    } catch (error) {
        return sendError(res, "Failed to fetch organizers", error.message, 500);
    }
}

export async function getOrganizerById(req, res) {
    try {
        const organizer = await Organizer.findById(req.params.id)
            .select("organizerName category description contactEmail phone");

        if (!organizer) {
            return sendError(res, "Organizer not found", "NOT_FOUND", 404);
        }

        const now = new Date();
        const events = await Event.find({
            organizerId: organizer._id,
            status: { $ne: "Draft" },
        })
            .select("name eventType status registrationDeadline eventStartDate eventEndDate")
            .sort({ eventStartDate: 1 })
            .lean();

        const upcomingEvents = events.filter((event) => new Date(event.eventStartDate) >= now);
        const pastEvents = events.filter((event) => new Date(event.eventStartDate) < now);

        return sendSuccess(res, "Organizer details fetched", {
            organizer,
            events: {
                upcoming: upcomingEvents,
                past: pastEvents,
            },
        }, 200);

    } catch (error) {
        return sendError(res, "Error fetching organizer", error.message, 500);
    }
}

export async function followOrganizer(req, res) {
    try {
        const participantId = req.user.id;
        const organizerId = req.params.id;

        const organizer = await Organizer.findById(organizerId);
        if (!organizer) {
            return sendError(res, "Organizer not found", "NOT_FOUND", 404);
        }

        await Participant.findByIdAndUpdate(participantId, {
            $addToSet: { followedClubs: organizerId },
        });

        return sendSuccess(res, "Followed successfully", null, 200);

    } catch (error) {
        return sendError(res, "Follow action failed", error.message, 500);
    }
}

export async function unfollowOrganizer(req, res) {
    try {
        const participantId = req.user.id;
        const organizerId = req.params.id;

        const result = await Participant.updateOne(
            { _id: participantId, followedClubs: organizerId },
            { $pull: { followedClubs: organizerId } },
        );

        if (result.matchedCount === 0) {
            return sendError(res, "You are not following this organizer", "NOT_FOLLOWING", 400);
        }

        return sendSuccess(res, "Unfollowed successfully", null, 200);

    } catch (error) {
        return sendError(res, "Unfollow action failed", error.message, 500);
    }
}
