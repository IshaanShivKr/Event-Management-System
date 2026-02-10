import { hashPassword, comparePasswords, generateToken, generateRefreshToken, verifyRefreshToken } from "../utils/authUtils.js";
import Participant from "../models/Participant.js";
import User from "../models/User.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

export async function registerParticipant(req, res) {
    try {
        const { email, password, firstName, lastName, collegeOrOrg, phone, participantType } = req.body;

        const iiitRegex = /^[a-zA-Z0-9._%+-]+@(students\.)?iiit\.ac\.in$/;
        if (participantType === "IIIT" && !iiitRegex.test(email)) {
            return sendError(res, "IIIT participants must use a valid IIIT email address.", "INVALID_IIIT_EMAIL", 400);
        }

        const existingUser = await User.findOne({ email, });
        if (existingUser) {
            return sendError(res, "Email already registered.", "EMAIL_EXISTS", 400);
        }

        const hashedPassword = await hashPassword(password);

        const newParticipant = new Participant({
            email, password: hashedPassword, firstName, lastName, collegeOrOrg, phone, participantType
        });

        await newParticipant.save();
        const accessToken = await generateToken(newParticipant);
        const refreshToken = await generateRefreshToken(newParticipant);

        return sendSuccess(res, "Registration successful", {
            accessToken, refreshToken, role: "Participant", user: {email: newParticipant.email, id: newParticipant._id }
        }, 201);
    
    } catch (error) {
        if (error.code === 11000) {
            return sendError(res, "Email already registered.", "EMAIL_EXISTS", 400);
        }
        return sendError(res, "Registration failed", error.message, 500);
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await comparePasswords(password, user.password))) {
            return sendError(res, "Invalid email or password", "INVALID_CREDENTIALS", 401);
        }

        const accessToken = await generateToken(user);
        const refreshToken = await generateRefreshToken(user);

        return sendSuccess(res, "Login successful", {
            accessToken, refreshToken, role: user.role, user: { email: user.email, id: user._id },
        }, 200);

    } catch (error) {
        return sendError(res, "Login failed", error.message, 500);
    }
}

export async function refreshToken(req, res) {
    const { token } = req.body;
    if (!token) {
        return sendError(res, "Refresh token required", "MISSING_TOKEN", 401);
    }

    try {
        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.id);
        if (!user) {
            return sendError(res, "User no longer exists", "NOT_FOUND", 404);
        }

        const newAccessToken = await generateToken(user);
        return sendSuccess(res, "Token refreshed successfully", {
            accessToken: newAccessToken
        }, 200);

    } catch (error) {
        return sendError(res, "Invalid or expired refresh token", error.message, 403);
    }
}