import nodemailer from "nodemailer";
import { MAIL_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_USER } from "../config/env.js";

let transporter;

function getTransporter() {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        return null;
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
    }

    return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
    const transport = getTransporter();
    if (!transport) {
        console.warn("Email skipped: SMTP settings are missing.");
        return {
            sent: false,
            skipped: true,
        };
    }

    await transport.sendMail({
        from: MAIL_FROM,
        to,
        subject,
        text,
        html,
    });

    return {
        sent: true,
        skipped: false,
    };
}

export async function sendTicketConfirmationEmail({ participant, event, registration }) {
    const participantName = `${participant.firstName || ""} ${participant.lastName || ""}`.trim() || participant.email;
    const subject = `Ticket Confirmation: ${event.name}`;
    const text = [
        `Hello ${participantName},`,
        "",
        `Your registration for ${event.name} is confirmed.`,
        `Ticket ID: ${registration.ticketId}`,
        `Event Type: ${event.eventType}`,
        `Organizer: ${registration.ticketSnapshot?.organizerName || "N/A"}`,
        "",
        "Please keep this ticket ID for check-in.",
    ].join("\n");

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Registration Confirmed</h2>
            <p>Hello ${participantName},</p>
            <p>Your registration for <strong>${event.name}</strong> is confirmed.</p>
            <p><strong>Ticket ID:</strong> ${registration.ticketId}</p>
            <p><strong>Event Type:</strong> ${event.eventType}</p>
            <p><strong>Organizer:</strong> ${registration.ticketSnapshot?.organizerName || "N/A"}</p>
            <p><strong>Schedule:</strong> ${new Date(event.eventStartDate).toLocaleString()} to ${new Date(event.eventEndDate).toLocaleString()}</p>
            ${
                registration.qrCodeDataUrl
                    ? `<p><img alt="Ticket QR" src="${registration.qrCodeDataUrl}" style="max-width: 220px; border: 1px solid #ddd; padding: 6px;" /></p>`
                    : ""
            }
            <p>Please carry this ticket ID for reference during entry.</p>
        </div>
    `;

    return sendEmail({
        to: participant.email,
        subject,
        text,
        html,
    });
}
