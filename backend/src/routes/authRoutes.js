import express from "express";
import {
    registerParticipant,
    login,
    refreshToken,
} from "../controllers/authController.js";

const authRoutes = express.Router();

authRoutes.post("/register", registerParticipant);
authRoutes.post("/login", login);
authRoutes.post("/refresh-token", refreshToken);

export default authRoutes;