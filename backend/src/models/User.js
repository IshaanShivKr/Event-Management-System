import mongoose from "mongoose";

const baseOptions = {
    discriminatorKey: "role",
    collection: "users",
    timestamps: true,
};

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    resetRequested: {
        type: Boolean,
        default: false,
    },
    resetReason: {
        type: String,
    },
    resetRequestStatus: {
        type: String,
        enum: ["None", "Pending", "Approved", "Rejected"],
        default: "None",
    },
    resetRequestedAt: {
        type: Date,
    },
    resetResolvedAt: {
        type: Date,
    },
    resetResolutionComment: {
        type: String,
    },
    resetToken: {
        type: String,
    },
    resetExpires: {
        type: Date,
    },
    accountStatus: {
        type: String,
        enum: ["ACTIVE", "DISABLED", "ARCHIVED"],
        default: "ACTIVE",
    },
    accountStatusReason: {
        type: String,
    },
    accountStatusUpdatedAt: {
        type: Date,
        default: Date.now,
    },
}, baseOptions);

const User = mongoose.model("User", userSchema);
export default User;
