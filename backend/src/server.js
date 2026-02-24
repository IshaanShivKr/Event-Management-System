import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import { connectDB } from "./config/db.js"
import { PORT, FRONTEND_URL } from "./config/env.js";
import { sendError } from "./utils/responseHandler.js";
import { startCronJobs } from "./utils/cronJobs.js";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import forumRoutes from "./routes/forumRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL, // Adjust for production
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});

// Middleware to expose io instance to routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: '10kb' }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/feedback", feedbackRoutes);

app.all("*path", (req, res) => {
    return sendError(res, `Can't find ${req.originalUrl} on this server!`, "ROUTE_NOT_FOUND", 404);
});

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    return sendError(res, message, err.code || "INTERNAL_ERROR", statusCode);
});

// Socket.io connection handling
io.on("connection", (socket) => {
    socket.on("join_event_room", (eventId) => {
        socket.join(eventId);
    });
    socket.on("leave_event_room", (eventId) => {
        socket.leave(eventId);
    });
});

async function startServer() {
    try {
        await connectDB();
        startCronJobs();
        server.listen(PORT, () => {
            console.log("Server running on port:", PORT);
        });

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();