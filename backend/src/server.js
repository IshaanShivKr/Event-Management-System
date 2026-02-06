import express from "express";
import cors from "cors";

import { connectDB } from "./config/db.js"
import { PORT } from "./config/env.js";

import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

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