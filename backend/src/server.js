import express from "express";

import { connectDB } from "./config/db.js"
import { PORT } from "./config/env.js";

const app = express();

await connectDB();

app.listen(PORT, () => {
    console.log("Server running on port:", PORT);
});