import jwt from "jsonwebtoken";
import { JWT_SECRET, } from "../config/env.js";
import User from "../models/User.js";
import { sendError } from "../utils/responseHandler.js";

export async function protect(req, res, next) {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
            if (!req.user) {
                return sendError(res, "The user belonging to this token no longer exists.", "NOT_FOUND", 401);
            }

            if (req.user.accountStatus && req.user.accountStatus !== "ACTIVE") {
                return sendError(
                    res,
                    `Account is ${req.user.accountStatus.toLowerCase()}. Access denied.`,
                    "ACCOUNT_INACTIVE",
                    403,
                );
            }
            return next();

        } catch (error) {
            const errorCode = error.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
            return sendError(res, "Not authorized, token failed.", errorCode, 401);
        }
    }

    if (!token) {
        return sendError(res, "Not authorized, no token provided.", "MISSING_TOKEN", 401);
    }
}

export function authorize(...roles) {
    return function (req, res, next) {
        if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
            return sendError(
                res, 
                `Role (${req.user?.role || "Unknown"}) is not authorized to access this resource.`, 
                "FORBIDDEN_ROLE", 
                403
            );
        }
        next();
    }
}
