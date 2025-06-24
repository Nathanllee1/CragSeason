export function getSlashFormattedDate(date: string | undefined) {
    if (!date) {
        return ""
    }
    const d = new Date(date);

    return `${d.getMonth()}/${d.getDate()}/${d.getFullYear()}`
}