import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { JWT_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRATION, JWT_REFRESH_EXPIRATION } from "../config/env.js";

export async function hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
}

export async function comparePasswords(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

export async function generateToken(user) {
    const role = user.role || (user.constructor.modelName === 'User' ? 'User' : user.constructor.modelName);

    return jwt.sign(
        {
            id: user._id.toString(),
            role: role,
        },
        JWT_SECRET,
        {
            expiresIn: JWT_ACCESS_EXPIRATION || "15m",
        },
    );
}

export async function generateRefreshToken(user) {
    return jwt.sign(
        {
            id: user._id,
        },
        JWT_REFRESH_SECRET,
        {
            expiresIn: JWT_REFRESH_EXPIRATION || "7d",
        },
    );
}

export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
        return null; 
    }
}