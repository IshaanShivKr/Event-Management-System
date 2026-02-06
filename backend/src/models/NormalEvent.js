import mongoose from "mongoose";
import Event from "./Event.js";

const NormalEvent = Event.Discriminator(
    "Normal",
    new mongoose.Schema({
        registrationFee: {
            type: Number,
            default: 0,
        },
        customFormFields: [{
            label: String,
            fieldType: {
                type: String,
                enum: ["text", "dropdown", "checkbox", "file"],
            },
            required: Boolean,
            options: [String],
            order: Number,
        }],
        formLocked: {
            type: Boolean,
            default: false,
        },
    })
);

export default NormalEvent;