import express from "express";
import cors from "cors";

import { connectDB } from "./config/db.js"
import { PORT } from "./config/env.js";
import { sendError } from "./utils/responseHandler.js";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/users", userRoutes);

app.all("*path", (req, res) => {
    return sendError(res, `Can't find ${req.originalUrl} on this server!`, "ROUTE_NOT_FOUND", 404);
});

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    return sendError(res, message, err.code || "INTERNAL_ERROR", statusCode);
});

async function startServer() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log("Server running on port:", PORT);
        });

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();