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
    // Password reset/request fields
    resetRequested: {
        type: Boolean,
        default: false,
    },
    resetReason: {
        type: String,
    },
    resetToken: {
        type: String,
    },
    resetExpires: {
        type: Date,
    },
}, baseOptions);

const User = mongoose.model("User", userSchema);
export default User;