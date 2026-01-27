export const DEFAULT_PORT = 3000;
export const PORT = Number(process.env.PORT ?? DEFAULT_PORT);

export const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
}