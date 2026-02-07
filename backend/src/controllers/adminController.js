import { hashPassword } from "../utils/authUtils.js";
import Organizer from "../models/Organizer.js";
import User from "../models/User.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

export async function createOrganizer(req, res) {
    try {
        const { email, password, organizerName, category, description, contactEmail, phone } = req.body;

        const existingUser = await User.findOne({ email, });
        if (existingUser) {
            return sendError(res, "Email already registered", "EMAIL_EXISTS", 400);
        }

        const hashedPassword = await hashPassword(password);

        const newOrganizer = new Organizer({ email, password: hashedPassword, organizerName, category, description, contactEmail, phone, role: "Organizer" });

        await newOrganizer.save();

        return sendSuccess(res, "Organizer created successfully", {
            id: newOrganizer._id,
            name: newOrganizer.organizerName,
            category: newOrganizer.category,
        }, 201);

    } catch (error) {
        return sendError(res, "Failed to create organizer", error.message, 500);
    }
}