import {
    hashPassword,
    comparePasswords,
    generateToken,
    generateRefreshToken,
    verifyRefreshToken,
} from "../utils/authUtils.js";
import Participant from "../models/Participant.js";
import User from "../models/User.js";

export async function registerParticipant(req, res) {
    try {
        const {
            email,
            password,
            firstName,
            lastName,
            collegeOrOrg,
            phone,
            participantType,
        } = req.body;

        const iiitRegex = /^[a-zA-Z0-9._%+-]+@(students\.)?iiit\.ac\.in$/;
        if (participantType === "IIIT" && !iiitRegex.test(email)) {
            return res.status(400).json({
                message: "IIIT participants must use a valid IIIT email address.",
            });
        }

        const existingUser = await User.findOne({ email, });
        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered.",
            });
        }

        const hashedPassword = await hashPassword(password);

        const newParticipant = new Participant({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            collegeOrOrg,
            phone,
            participantType,
            role: "Participant",
        });

        await newParticipant.save();

        const accessToken = await generateToken(newParticipant);
        const refreshToken = await generateRefreshToken(newParticipant);

        res.status(201).json({
            accessToken,
            refreshToken,
            role: "Participant",
        });
    
    } catch (error) {
        res.status(500).json({
            message: "Registration failed",
            error: error.message,
        });
    }
}

export async function login(req, res) {
    try {
        const {
            email,
            password,
        } = req.body;

        const user = await User.findOne({ email, });
        if (!user) {
            return res.status(400).json({
                message: "Invalid credentials",
            });
        }

        const flag = await comparePasswords(password, user.password);
        if (!flag) {
            return res.status(400).json({
                message: "Invalid credentials",
            });
        }

        const accessToken = await generateToken(user);
        const refreshToken = await generateRefreshToken(user);

        res.status(200).json({
            accessToken,
            refreshToken,
            role: user.role,
            user: {
                email: user.email,
                id: user._id,
            },
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message,
        })
    }
}

export async function refreshToken(req, res) {
    const {
        token,
    } = req.body;
    if (!token) {
        return res.status(401).json({
            message: "Refresh token required",
        });
    }

    try {
        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(403).json({ message: "Invalid user" });
        }

        const newAccessToken = await generateToken(user);
        res.json({
            accessToken: newAccessToken
        });

    } catch (error) {
        res.status(403).json({
            message: "Invalid or expired refresh token"
        });
    }
}