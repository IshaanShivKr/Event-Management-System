import express from "express";
import cors from "cors";

import { connectDB } from "./config/db.js"
import { PORT } from "./config/env.js";

const app = express();

app.use(cors());
app.use(express.json());

await connectDB();

app.listen(PORT, () => {
    console.log("Server running on port:", PORT);
});