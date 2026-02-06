import mongoose from "mongoose";
import User from "./User.js";

const Participant = User.discriminator(
    "Participant",
    new mongoose.Schema({
        firstName: {
            type: String,
            required: true,
        },
        lastName: {
            type: String,
            required: true,
        },
        collegeOrOrg: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        participantType: {
            type: String,
            enum: ["IIIT", "NON_IIIT"],
            required: true,
        },
        interests: [String],
        followedClubs: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
    })
);

export default Participant;