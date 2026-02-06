import mongoose from "mongoose";
import User from "./User.js";

const Organizer = User.discriminator(
    "Organizer",
    new mongoose.Schema({
        organizerName: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            enum: ["CLUB", "COUNCIL", "FEST_TEAM"],
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        contactEmail: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true,
        },
    })
)

export default Organizer;