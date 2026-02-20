import mongoose from "mongoose";
import User from "./User.js";

const Admin = User.discriminator(
    "Admin",
    new mongoose.Schema({
        adminName: {
            type: String,
            default: "System Admin"
        }
    })
);

export default Admin;
