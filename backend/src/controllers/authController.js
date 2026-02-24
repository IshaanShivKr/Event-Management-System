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
            accessToken, refreshToken, role: "Participant", user: { email: newParticipant.email, id: newParticipant._id }
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

        if (user.accountStatus && user.accountStatus !== "ACTIVE") {
            return sendError(
                res,
                `Account is ${user.accountStatus.toLowerCase()}. Please contact Admin.`,
                "ACCOUNT_INACTIVE",
                403,
            );
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
        if (!decoded) {
            return sendError(res, "Invalid or expired refresh token", "INVALID_REFRESH", 403);
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            return sendError(res, "User no longer exists", "NOT_FOUND", 404);
        }

        if (user.accountStatus && user.accountStatus !== "ACTIVE") {
            return sendError(
                res,
                `Account is ${user.accountStatus.toLowerCase()}. Please login after reactivation.`,
                "ACCOUNT_INACTIVE",
                403,
            );
        }

        const newAccessToken = await generateToken(user);
        return sendSuccess(res, "Token refreshed successfully", {
            accessToken: newAccessToken
        }, 200);

    } catch (error) {
        return sendError(res, "Invalid or expired refresh token", error.message, 403);
    }
}

export async function requestPasswordReset(req, res) {
    try {
        const { email, reason } = req.body;

        if (!email) {
            return sendError(res, "Email is required", "MISSING_EMAIL", 400);
        }

        const user = await User.findOne({ email });

        // Don't leak if user exists or not if they are a participant for security, 
        // but since this is assigned to Organizer we can enforce role.
        if (!user || user.role !== "Organizer") {
            // For security, you might want to return success anyway to prevent email enumeration,
            // but for a clear UI experience here, we'll return an error if not found/not organizer.
            return sendError(res, "Cannot request reset for this account. Only Organizers can request Admin resets.", "INVALID_ACCOUNT", 400);
        }

        user.resetRequested = true;
        user.resetRequestStatus = "Pending";
        user.resetRequestedAt = new Date();
        user.resetResolvedAt = null;
        user.resetResolutionComment = undefined;
        user.resetReason = reason || "Forgotten Password";
        await user.save();

        return sendSuccess(res, "Password reset request sent to Admin. Please wait for temporary credentials.", null, 200);

    } catch (error) {
        return sendError(res, "Failed to submit request", error.message, 500);
    }
}
