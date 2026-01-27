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
}, baseOptions);

const User = mongoose.model("User", userSchema);
export default User;