import ms from "ms";

export function lastUpdatedString(when: number | Date) {
    if (when instanceof Date) {
        when = when.getTime();
    }
    const now = new Date();
    const difference = now.getTime() - when

    if (difference < ms("1 day")) {
        return "today"
    }

    // return the difference in days
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));

    if (days === 1) {
        return "yesterday"
    } else if (days < 30) {
        return `${days} days ago`
    } else if (days < 365) {
        return `${Math.floor(days / 30)} months ago`
    } else {
        return `${Math.floor(days / 365)} years ago`
    }

}