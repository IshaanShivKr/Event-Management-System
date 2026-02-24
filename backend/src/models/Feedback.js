import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        default: ""
    }
}, {
    timestamps: true
});

export default mongoose.model('Feedback', FeedbackSchema);
