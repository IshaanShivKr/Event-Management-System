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