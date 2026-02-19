const DISCORD_WEBHOOK_REGEX = /^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/[^/\s]+\/[^/\s]+$/i;

export function isValidDiscordWebhookUrl(url = "") {
    if (!url) return true;
    return DISCORD_WEBHOOK_REGEX.test(String(url).trim());
}

export async function postEventAnnouncementToDiscord({ webhookUrl, organizerName, event }) {
    if (!webhookUrl) {
        return { sent: false, skipped: true };
    }

    const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username: "Felicity Event Bot",
            embeds: [
                {
                    title: `New Event Published: ${event.name}`,
                    description: event.description,
                    color: 3447003,
                    fields: [
                        { name: "Organizer", value: organizerName || "Unknown", inline: true },
                        { name: "Type", value: event.eventType, inline: true },
                        { name: "Eligibility", value: event.eligibility, inline: true },
                        { name: "Registration Deadline", value: new Date(event.registrationDeadline).toLocaleString(), inline: false },
                        { name: "Schedule", value: `${new Date(event.eventStartDate).toLocaleString()} - ${new Date(event.eventEndDate).toLocaleString()}`, inline: false },
                    ],
                    timestamp: new Date().toISOString(),
                },
            ],
        }),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Discord webhook failed (${response.status}): ${text || "Unknown error"}`);
    }

    return { sent: true, skipped: false };
}
