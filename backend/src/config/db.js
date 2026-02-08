import mongoose from "mongoose";
import { MONGODB_URI } from "./env.js";

export async function connectDB() {
    mongoose.connection.on("error", (err) => {
        console.error("MongoDB runtime error:", err);
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("MongoDB disconnected. Attempting to reconnect...");
    });

    try {
        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection failed", error);
        process.exit(1);
    }
}