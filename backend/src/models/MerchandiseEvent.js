import mongoose from "mongoose";
import Event from "./Event.js";

const MerchandiseEvent = Event.discriminator(
    "Merchandise",
    new mongoose.Schema({
        itemDetails: {
            sizes: [String],
            colors: [String],
            variants: [String],
        },
        price: {
            type: Number,
            required: true,
        },
        stockQuantity: {
            type: Number,
            required: true,
        },
        purchaseLimit: {
            type: Number,
            default: 1,
        },
    })
)

export default MerchandiseEvent;