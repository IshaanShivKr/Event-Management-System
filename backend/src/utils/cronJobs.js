import cron from "node-cron";
import Event from "../models/Event.js";

/**
 * Starts background cron jobs to auto-update event statuses.
 */
export function startCronJobs() {
    // Run every minute
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();

            // 1. Transition Published -> Ongoing when start date hits
            const ongoingResult = await Event.updateMany(
                {
                    status: "Published",
                    eventStartDate: { $lte: now },
                },
                {
                    $set: { status: "Ongoing" }
                }
            );

            // 2. Transition Ongoing -> Completed when end date hits
            const completedResult = await Event.updateMany(
                {
                    status: "Ongoing",
                    eventEndDate: { $lte: now },
                },
                {
                    $set: { status: "Completed" }
                }
            );

            if (ongoingResult.modifiedCount > 0 || completedResult.modifiedCount > 0) {
                console.log(`[Cron] Auto-updated event statuses: ${ongoingResult.modifiedCount} to Ongoing, ${completedResult.modifiedCount} to Completed.`);
            }

        } catch (error) {
            console.error("[Cron] Error updating event statuses:", error);
        }
    });

    console.log("Cron jobs started: Event Status Manager");
}
