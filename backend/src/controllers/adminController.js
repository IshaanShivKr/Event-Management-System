import { hashPassword } from "../utils/authUtils.js";
import Organizer from "../models/Organizer.js";
import User from "../models/User.js";

export async function createOrganizer(req, res) {
    try {
        const {
            email,
            password,
            organizerName,
            category,
            description,
            contactEmail,
            phone,
        } = req.body;

        const existingUser = await User.findOne({ email, });
        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered.",
            });
        }

        const hashedPassword = await hashPassword(password);

        const newOrganizer = new Organizer({
            email,
            password: hashedPassword,
            organizerName,
            category,
            description,
            contactEmail,
            phone,
            role: "Organizer",
        });

        await newOrganizer.save();

        res.status(201).json({
            message: "Organizer created succesfully",
            organizer: {
                id: newOrganizer._id,
                name: newOrganizer.organizerName,
                category: newOrganizer.category,
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create organizer", 
            error: error.message,
        });
    }
}