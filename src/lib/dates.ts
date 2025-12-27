import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';

/**
 * Format a date for display
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;

    if (isToday(d)) {
        return 'Today';
    }

    if (isYesterday(d)) {
        return 'Yesterday';
    }

    if (isThisWeek(d)) {
        return format(d, 'EEEE'); // Day name
    }

    return format(d, 'MMM d, yyyy');
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'MMM d, yyyy h:mm a');
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Get daily note title for a date
 */
export function getDailyNoteTitle(date: Date = new Date()): string {
    return format(date, 'yyyy-MM-dd');
}

/**
 * Get daily note filename for a date
 */
export function getDailyNoteFilename(date: Date = new Date()): string {
    return `${format(date, 'yyyy-MM-dd')}.md`;
}

/**
 * Get daily note folder path for a date
 */
export function getDailyNotePath(baseFolder: string, date: Date = new Date()): string {
    const year = format(date, 'yyyy');
    const month = format(date, 'MM');
    return `${baseFolder}/${year}/${month}`;
}

/**
 * Format time only
 */
export function formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'h:mm a');
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
        return 'Good morning';
    } else if (hour < 17) {
        return 'Good afternoon';
    } else {
        return 'Good evening';
    }
}
