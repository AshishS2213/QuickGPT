/**
 * Date Helper Utilities
 * Common date operations and formatting for QuickGPT
 */

/**
 * Get relative date description
 * Converts dates to human-readable relative format
 * @param {Date|string|number} date - Date to convert (Date object, ISO string, or timestamp)
 * @param {Date} referenceDate - Reference date (defaults to now)
 * @returns {string} Relative date description (e.g., "2 days ago", "in 3 days")
 */
export const getRelativeDate = (date, referenceDate = new Date()) => {
    const targetDate = new Date(date);
    const timeDiff = targetDate - referenceDate;
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return "Today";
    if (daysDiff === 1) return "Tomorrow";
    if (daysDiff === -1) return "Yesterday";
    if (daysDiff > 0) return `In ${daysDiff} days`;
    if (daysDiff < 0) return `${Math.abs(daysDiff)} days ago`;
};

/**
 * Check if a date is today
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
    const checkDate = new Date(date);
    const today = new Date();
    return checkDate.toDateString() === today.toDateString();
};

/**
 * Check if a date is in the past
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export const isPast = (date) => {
    return new Date(date) < new Date();
};

/**
 * Check if a date is in the future
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is in the future
 */
export const isFuture = (date) => {
    return new Date(date) > new Date();
};

/**
 * Check if a date is this week
 * @param {Date|string|number} date - Date to check
 * @param {Date} referenceDate - Reference date (defaults to now)
 * @returns {boolean} True if date is this week
 */
export const isThisWeek = (date, referenceDate = new Date()) => {
    const checkDate = new Date(date);
    const weekStart = new Date(referenceDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return checkDate >= weekStart && checkDate <= weekEnd;
};

/**
 * Check if a date is this month
 * @param {Date|string|number} date - Date to check
 * @param {Date} referenceDate - Reference date (defaults to now)
 * @returns {boolean} True if date is this month
 */
export const isThisMonth = (date, referenceDate = new Date()) => {
    const checkDate = new Date(date);
    return checkDate.getMonth() === referenceDate.getMonth() && 
           checkDate.getFullYear() === referenceDate.getFullYear();
};

/**
 * Get days difference between two dates
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date (defaults to now)
 * @returns {number} Number of days between dates (negative if date1 is before date2)
 */
export const daysBetween = (date1, date2 = new Date()) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const timeDiff = d1 - d2;
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
};

/**
 * Get hours difference between two dates
 * @param {Date|string|number} date1 - First date
 * @param {Date|string|number} date2 - Second date (defaults to now)
 * @returns {number} Number of hours between dates
 */
export const hoursBetween = (date1, date2 = new Date()) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const timeDiff = d1 - d2;
    return Math.floor(timeDiff / (1000 * 60 * 60));
};

/**
 * Format date for display
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Format type: 'short', 'long', 'full', 'time'
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'short') => {
    const d = new Date(date);
    
    const formats = {
        short: () => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
        long: () => d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        full: () => d.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        time: () => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        iso: () => d.toISOString().split('T')[0],
        timestamp: () => d.toISOString()
    };
    
    return formats[format] ? formats[format]() : d.toString();
};

/**
 * Get start of day
 * @param {Date|string|number} date - Reference date (defaults to now)
 * @returns {Date} Start of day (00:00:00)
 */
export const getStartOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get end of day
 * @param {Date|string|number} date - Reference date (defaults to now)
 * @returns {Date} End of day (23:59:59)
 */
export const getEndOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

/**
 * Add days to a date
 * @param {Date|string|number} date - Base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date with days added
 */
export const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

/**
 * Add months to a date
 * @param {Date|string|number} date - Base date
 * @param {number} months - Number of months to add
 * @returns {Date} New date with months added
 */
export const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
};

/**
 * Get business days between two dates (excludes weekends)
 * @param {Date|string|number} startDate - Start date
 * @param {Date|string|number} endDate - End date
 * @returns {number} Number of business days
 */
export const getBusinessDaysBetween = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    
    const current = new Date(start);
    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    
    return count;
};

/**
 * Check if a year is leap year
 * @param {number} year - Year to check
 * @returns {boolean} True if leap year
 */
export const isLeapYear = (year) => {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

/**
 * Get next occurrence of a day
 * @param {number} dayOfWeek - Day of week (0 = Sunday, 6 = Saturday)
 * @param {Date} referenceDate - Reference date (defaults to now)
 * @returns {Date} Next occurrence of that day
 */
export const getNextDayOfWeek = (dayOfWeek, referenceDate = new Date()) => {
    const date = new Date(referenceDate);
    date.setDate(date.getDate() + ((dayOfWeek + 7 - date.getDay()) % 7) || 7);
    return date;
};

/**
 * Get next business day
 * @param {Date|string|number} date - Reference date (defaults to now)
 * @returns {Date} Next business day (skips weekends)
 */
export const getNextBusinessDay = (date = new Date()) => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    
    while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
    }
    
    return next;
};

/**
 * Create a date range object
 * Useful for describing date ranges in prompts
 * @param {Date|string|number} startDate - Start date
 * @param {Date|string|number} endDate - End date
 * @returns {Object} Date range information
 */
export const getDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = daysBetween(end, start) + 1;
    const businessDays = getBusinessDaysBetween(start, end) + 1;
    
    return {
        startDate: formatDate(start, 'iso'),
        endDate: formatDate(end, 'iso'),
        startFormatted: formatDate(start, 'long'),
        endFormatted: formatDate(end, 'long'),
        totalDays: Math.abs(days),
        businessDays,
        weekendDays: Math.abs(days) - businessDays,
        description: `${formatDate(start, 'short')} to ${formatDate(end, 'short')} (${Math.abs(days)} days)`
    };
};

export default {
    getRelativeDate,
    isToday,
    isPast,
    isFuture,
    isThisWeek,
    isThisMonth,
    daysBetween,
    hoursBetween,
    formatDate,
    getStartOfDay,
    getEndOfDay,
    addDays,
    addMonths,
    getBusinessDaysBetween,
    isLeapYear,
    getNextDayOfWeek,
    getNextBusinessDay,
    getDateRange
};
