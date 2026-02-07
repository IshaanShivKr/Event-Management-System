import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
    },
    participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    responses: [{
        fieldId: mongoose.Schema.Types.ObjectId,
        label: String,
        value: mongoose.Schema.Types.Mixed,
    }],
    selections: {
        size: String,
        color: String,
        variant: String,
    },
    quantity: {
        type: Number,
        default: 1,
    },
    status: {
        type: String,
        enum: ["Registered", "Cancelled", "Waitlisted", "Attended"],
        default: "Registered",
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Completed", "N/A", "Refunded"],
        default: "N/A",
    },
    transactionId: {
        type: String,
    }
}, { timestamps: true });

registrationSchema.index({ eventId: 1, participantId: 1 }, { unique: true });

const Registration = mongoose.model("Registration", registrationSchema);
export default Registration;