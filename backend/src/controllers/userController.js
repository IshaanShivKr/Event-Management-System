import User from "../models/User.js";
import Participant from "../models/Participant.js";
import Organizer from "../models/Organizer.js";
import { hashPassword, comparePassword } from "../utils/authUtils.js";
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
            const { firstName, lastName, phone, interests } = req.body;
            updateData = { firstName, lastName, phone, interests };
            Model = Participant;
        } else if (role === "Organizer") {
            const { organizerName, description, phone, contactEmail } = req.body;
            updateData = { organizerName, description, phone, contactEmail };
            Model = Organizer;
        } else {
            return sendError(res, "Unauthorized role update", "UNAUTHORIZED_ROLE", 403);
        }

        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const updatedUser = await Model.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
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

        const user = await findById(userId).select("+password");

        const isMatch = await comparePassword(oldPassword, user.password);
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

        if (userRole === "Organizer") {
            const activeEvents = await Event.countDocuments({ 
                organizerId: userId,
                status: { $ne: "Cancelled" }
            });

            if (activeEvents > 0) {
                return sendError(
                    res, 
                    "Cannot delete account with active events. Please cancel or delete your events first.", 
                    "ACTIVE_EVENTS_EXIST", 
                    400
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
        const { email, reason } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return sendError(res, "Email not registered", "NOT_FOUND", 404);
        }

        user.resetRequested = true;
        user.resetReason = reason || "Forgotten Password";
        await user.save();

        return sendSuccess(res, "Request sent to Admin. Please wait for approval.", null, 200);

    } catch (error) {
        return sendError(res, "Failed to submit request", error.message, 500);
    }
}