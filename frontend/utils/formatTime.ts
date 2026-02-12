export function formattedTime(schedule: string) {
    if (!schedule) return { start: "", end: "" };

    // Take the first line, remove "+1 More" info
    const cleanSchedule = schedule.split("\n")[0];
    const times = cleanSchedule.split(",").map(t => t.trim());

    // Return the first two times as start and end
    return {
        startDate: times[0] || "",
        endDate: times[1] || "",
    };
}
