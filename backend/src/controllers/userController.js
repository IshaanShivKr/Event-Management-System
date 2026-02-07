import User from "../models/User.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

export async function getMe(req, res) {
    try {
        if (!req.user) {
            return sendError(res, "User not found", "USER_NOT_FOUND", 404);
        }
        return sendSuccess(res, "User profile fetched", req.user);

    } catch (error) {
        return sendError(res, "Error fetching profile", error.message, 500);
    }
}

export async function updateProfile(req, res) {
    try {
        const { role } = req.user;
        let updateData = {};

        if (role === "Participant") {
            const { firstName, lastName, phone, interests } = req.body;
            updateData = { firstName, lastName, phone, interests };
        } else if (role === "Organizer") {
            const { organizerName, description, phone, contactEmail } = req.body;
            updateData = { organizerName, description, phone, contactEmail };
        } else {
            return sendError(res, "This role cannot update profile fields via this route.", "UNAUTHORIZED_ROLE", 403);
        }

        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password");

        return sendSuccess(res, "Profile updated successfully", updatedUser);

    } catch (error) {
        return sendError(res, "Update failed", error.message, 500);
    }
}