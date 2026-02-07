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
        const { firstName, lastName, phone } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { firstName, lastName, phone } },
            { new: true, runValidators: true }
        ).select("-password");

        return sendSuccess(res, "Profile updated successfully", updatedUser);

    } catch (error) {
        return sendError(res, "Update failed", error.message, 500);
    }
}