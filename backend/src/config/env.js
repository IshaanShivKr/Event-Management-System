import dotenv from "dotenv";

dotenv.config();

export const DEFAULT_PORT = 3000;
export const PORT = Number(process.env.PORT ?? DEFAULT_PORT);

export const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
}

export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET");
}

export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_REFRESH_SECRET) {
    throw new Error("Missing JWT_REFRESH_SECRET");
}

export const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || "15m";
export const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || "7d";

// Optional SMTP settings used for ticket confirmation emails.
export const SMTP_HOST = process.env.SMTP_HOST || "";
export const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
export const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASS = process.env.SMTP_PASS || "";
export const MAIL_FROM = process.env.MAIL_FROM || "Felicity Fest <no-reply@felicity.local>";

// Organizer account provisioning settings.
export const ORGANIZER_LOGIN_DOMAIN = process.env.ORGANIZER_LOGIN_DOMAIN || "felicity.local";
