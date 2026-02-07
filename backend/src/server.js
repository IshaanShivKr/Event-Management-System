import express from "express";
import cors from "cors";

import { connectDB } from "./config/db.js"
import { PORT } from "./config/env.js";

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventRoutes);

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