import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true,
        },
        leaderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Participant",
            required: true,
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Participant",
            },
        ],
        maxSize: {
            type: Number,
            required: true,
        },
        inviteCode: {
            type: String,
            required: true,
            unique: true,
        },
        status: {
            type: String,
            enum: ["Forming", "Completed"],
            default: "Forming",
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate team names per event
teamSchema.index({ name: 1, eventId: 1 }, { unique: true });

const Team = mongoose.model("Team", teamSchema);
export default Team;
