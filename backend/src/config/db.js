import mongoose from "mongoose";
import { MONGODB_URI } from "./env.js";

export async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection failed", error);
        process.exit(1);
    }
}