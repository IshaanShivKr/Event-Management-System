import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Participant from "../models/Participant.js";
import User from "../models/User.js";
import { JWT_SECRET } from "../config/env.js"

export async function registerParticipant(req, res) {
    try {
        const {
            email,
            password,
            firstName,
            lastName,
            particpantType,
            collegeOrOrg,
            phone,
        } = req.body;

        //todo: configure email
        if (particpantType === "IIIT" && !email.endsWith("@iiit.ac.in")) {
            return res.status(400).json({ 
                message: "IIIT Participants must use an institutional @iiit.ac.in email." 
            });
        }

        

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}