import crypto from "crypto";
import QRCode from "qrcode";

export function generateTicketId() {
    const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
    const timePart = Date.now().toString(36).toUpperCase();
    return `FEL-${timePart}-${randomPart}`;
}

export async function generateTicketBundle({ event, participant, registrationId, organizerName }) {
    const ticketId = generateTicketId();
    const participantName = `${participant.firstName || ""} ${participant.lastName || ""}`.trim();

    const qrPayload = {
        ticketId,
        registrationId: registrationId.toString(),
        eventId: event._id.toString(),
        participantId: participant._id.toString(),
        issuedAt: new Date().toISOString(),
    };

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 280,
    });

    const ticketSnapshot = {
        eventName: event.name,
        eventType: event.eventType,
        organizerName: organizerName || "Unknown Organizer",
        participantName: participantName || participant.email,
        participantEmail: participant.email,
    };

    return {
        ticketId,
        qrCodeDataUrl,
        ticketSnapshot,
    };
}
