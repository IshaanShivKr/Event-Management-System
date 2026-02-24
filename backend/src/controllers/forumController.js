import Message from "../models/Message.js";
import Event from "../models/Event.js";
import Notification from "../models/Notification.js";
import Registration from "../models/Registration.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";

export async function getEventMessages(req, res) {
    try {
        const { eventId } = req.params;
        const messages = await Message.find({ eventId })
            .populate('replyTo')
            .sort({ createdAt: 1 }); // Oldest first to show logical chat flow 

        return sendSuccess(res, "Messages fetched", messages, 200);
    } catch (error) {
        return sendError(res, "Failed to fetch messages", error.message, 500);
    }
}

export async function postMessage(req, res) {
    try {
        const { eventId } = req.params;
        const { content, isAnnouncement, replyTo } = req.body;
        const userId = req.user.id;
        const role = req.user.role; // Organizer or Participant

        const event = await Event.findById(eventId);
        if (!event) return sendError(res, "Event not found", "NOT_FOUND", 404);

        if (role === "Participant") {
            const isRegistered = await Registration.exists({
                eventId,
                participantId: userId,
                status: { $in: ["Registered", "Attended"] }
            });
            if (!isRegistered) {
                return sendError(res, "You must be registered to post in the forum.", "FORBIDDEN", 403);
            }
        }

        const messageData = {
            eventId,
            senderId: userId,
            senderName: req.user.organizerName || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
            senderRole: role,
            content,
            isAnnouncement: role === "Organizer" ? isAnnouncement : false,
            replyTo: replyTo || null
        };

        const newMessage = await Message.create(messageData);
        await newMessage.populate('replyTo');

        // Emit via Socket.io
        req.io.to(eventId).emit("new_message", newMessage);

        // Optional: If it's an announcement, create Notifications for all registered participants.
        if (newMessage.isAnnouncement) {
            const regs = await Registration.find({ eventId, status: { $in: ["Registered", "Attended"] } });
            const notifications = regs.map(r => ({
                userId: r.participantId,
                eventId,
                message: `Organizer posted an announcement in ${event.name}`
            }));
            if (notifications.length) {
                await Notification.insertMany(notifications);
                // We'd ideally emit socket events to the users' personal rooms if implemented, 
                // but attendees can also pull notifications on page load.
            }
        }

        return sendSuccess(res, "Message posted", newMessage, 201);
    } catch (error) {
        return sendError(res, "Failed to post message", error.message, 500);
    }
}

export async function deleteMessage(req, res) {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId);
        if (!message) return sendError(res, "Message not found", "NOT_FOUND", 404);

        if (req.user.role !== "Organizer" && String(message.senderId) !== String(req.user.id)) {
            return sendError(res, "Unauthorized to delete this message", "FORBIDDEN", 403);
        }

        const eventId = String(message.eventId);
        await message.deleteOne();

        // Also delete any replies to this message
        await Message.deleteMany({ replyTo: messageId });

        req.io.to(eventId).emit("message_deleted", messageId);

        return sendSuccess(res, "Message deleted", null, 200);
    } catch (error) {
        return sendError(res, "Failed to delete message", error.message, 500);
    }
}

export async function togglePin(req, res) {
    try {
        if (req.user.role !== "Organizer") {
            return sendError(res, "Only Organizer can pin messages", "FORBIDDEN", 403);
        }

        const { messageId } = req.params;
        const message = await Message.findById(messageId);
        if (!message) return sendError(res, "Message not found", "NOT_FOUND", 404);

        message.isPinned = !message.isPinned;
        await message.save();

        req.io.to(String(message.eventId)).emit("message_pinned", message);

        return sendSuccess(res, "Message pin toggled", message, 200);
    } catch (error) {
        return sendError(res, "Failed to pin message", error.message, 500);
    }
}

export async function toggleReaction(req, res) {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        const message = await Message.findById(messageId);
        if (!message) return sendError(res, "Message not found", "NOT_FOUND", 404);

        const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);

        if (reactionIndex > -1) {
            const hasReactedIndex = message.reactions[reactionIndex].users.indexOf(userId);
            if (hasReactedIndex > -1) {
                // Remove reaction
                message.reactions[reactionIndex].users.splice(hasReactedIndex, 1);
                // Remove empty emoji groups entirely
                if (message.reactions[reactionIndex].users.length === 0) {
                    message.reactions.splice(reactionIndex, 1);
                }
            } else {
                // Add userId to existing emoji
                message.reactions[reactionIndex].users.push(userId);
            }
        } else {
            // New emoji reaction
            message.reactions.push({ emoji, users: [userId] });
        }

        await message.save();

        req.io.to(String(message.eventId)).emit("reaction_updated", message);

        return sendSuccess(res, "Reaction updated", message, 200);
    } catch (error) {
        return sendError(res, "Failed to toggle reaction", error.message, 500);
    }
}

export async function getNotifications(req, res) {
    try {
        const userId = req.user.id;
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('eventId', 'name');

        return sendSuccess(res, "Notifications fetched", notifications, 200);
    } catch (error) {
        return sendError(res, "Failed to fetch notifications", error.message, 500);
    }
}

export async function markNotificationAsRead(req, res) {
    try {
        const { id } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { isRead: true },
            { new: true }
        );
        if (!notification) return sendError(res, "Notification not found", "NOT_FOUND", 404);

        return sendSuccess(res, "Notification marked read", notification, 200);
    } catch (error) {
        return sendError(res, "Failed to mark read", error.message, 500);
    }
}
