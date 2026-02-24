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
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
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
        enum: ["Pending", "Registered", "Cancelled", "Rejected", "Waitlisted", "Attended"],
        default: "Registered",
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Completed", "N/A", "Refunded"],
        default: "N/A",
    },
    transactionId: {
        type: String,
    },
    paymentProof: {
        type: String, // Base64 image
    },
    ticketId: {
        type: String,
        unique: true,
        sparse: true,
    },
    qrCodeDataUrl: {
        type: String,
    },
    ticketSnapshot: {
        eventName: String,
        eventType: String,
        organizerName: String,
        participantName: String,
        participantEmail: String,
    },
    confirmationEmailSent: {
        type: Boolean,
        default: false,
    },
    feedbackSubmitted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

registrationSchema.index({ eventId: 1, participantId: 1 }, { unique: true });

const Registration = mongoose.model("Registration", registrationSchema);
export default Registration;
