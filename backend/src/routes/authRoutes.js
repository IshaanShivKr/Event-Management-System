import express from "express";
import { registerParticipant, login, refreshToken, requestPasswordReset } from "../controllers/authController.js";

const authRoutes = express.Router();

authRoutes.post("/register", registerParticipant);
authRoutes.post("/login", login);
authRoutes.post("/refresh-token", refreshToken);
authRoutes.post("/request-reset", requestPasswordReset);

export default authRoutes;