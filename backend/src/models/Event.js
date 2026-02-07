import mongoose from "mongoose";

const baseOptions = {
    discriminatorKey: "eventType",
    collection: "events",
    timestamps: true,
};

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: ["Draft", "Published", "Ongoing", "Completed", "Closed"],
        default: "Draft",
    },
    eligibility: {
        type: String,
        enum: ["IIIT", "NON_IIIT", "ALL"],
        required: true,
    },
    registrationDeadline: {
        type: Date,
        required: true,
    },
    eventStartDate: {
        type: Date,
        required: true,
    },
    eventEndDate: {
        type: Date,
        required: true,
    },
    registrationLimit: {
        type: Number,
        required: true,
    },
    eventTags: {
        type: [String],
    },
}, baseOptions);

const Event = mongoose.model("Event", eventSchema);
export default Event;