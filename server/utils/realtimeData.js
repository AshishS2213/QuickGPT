/**
 * Real-Time Data Integration Service
 * Provides methods to fetch current data from various sources
 * This supplements the model's knowledge cutoff with live information
 */

/**
 * Fetch current weather data (using a free API)
 * @param {string} location - City name or coordinates
 * @returns {Promise<Object>} Weather data with current conditions
 */
export const getCurrentWeather = async (location) => {
    try {
        // Using Open-Meteo which doesn't require API key
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${location}&count=1&language=en&format=json`
        );
        const geoData = await response.json();
        
        if (!geoData.results || geoData.results.length === 0) {
            return { error: "Location not found" };
        }
        
        const { latitude, longitude, name, country } = geoData.results[0];
        
        const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius`
        );
        const weatherData = await weatherResponse.json();
        
        return {
            location: `${name}, ${country}`,
            current: weatherData.current || {},
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error("Weather fetch error:", error);
        return { error: "Unable to fetch weather data" };
    }
};

/**
 * Fetch current date with timezone-specific information
 * @param {string} timezone - IANA timezone identifier (e.g., 'America/New_York')
 * @returns {Object} Current date/time information in specified timezone
 */
export const getCurrentDateInTimezone = (timezone = 'UTC') => {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        const now = new Date();
        const parts = formatter.formatToParts(now);
        
        return {
            timezone,
            timestamp: now.toISOString(),
            formattedLocal: formatter.format(now),
            parts: Object.fromEntries((parts).map(({ type, value }) => [type, value]))
        };
    } catch (error) {
        console.error("Timezone conversion error:", error);
        return null;
    }
};

/**
 * Generate contextual information about the current date
 * Useful for questions about relative dates ("What day is it?", "Is it weekend?")
 * @returns {Object} Detailed date context information
 */
export const getDetailedDateContext = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();
    const monthOfYear = now.getMonth();
    
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMonday = dayOfWeek === 1;
    const isFriday = dayOfWeek === 5;
    
    return {
        currentDate: now.toISOString().split('T')[0],
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        dayOfMonth,
        month: now.toLocaleDateString('en-US', { month: 'long' }),
        year: now.getFullYear(),
        isWeekend,
        isMonday,
        isFriday,
        weekNumber: getWeekNumber(now),
        dayOfYear: getDayOfYear(now),
        daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
        timeUntilWeekend: getTimeUntilWeekend(),
        formattedFull: now.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    };
};

/**
 * Get week number of the year
 * @param {Date} date - Date object
 * @returns {number} Week number (1-53)
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

/**
 * Get day of year (1-366)
 * @param {Date} date - Date object
 * @returns {number} Day of year
 */
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

/**
 * Calculate time until next weekend
 * @returns {Object} Days and hours until Friday/Saturday depending on current day
 */
function getTimeUntilWeekend() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    let daysUntilWeekend;
    
    if (dayOfWeek === 0) { // Sunday
        daysUntilWeekend = 5;
    } else if (dayOfWeek === 6) { // Saturday
        daysUntilWeekend = 6;
    } else {
        daysUntilWeekend = 5 - dayOfWeek;
    }
    
    return {
        days: daysUntilWeekend,
        message: daysUntilWeekend === 0 ? "It's weekend!" : `${daysUntilWeekend} day(s) until the weekend`
    };
}

/**
 * Create formatted context string for AI models
 * Combines all real-time information for use in prompts
 * @returns {string} Formatted context string
 */
export const createRealtimeContextString = () => {
    const dateContext = getDetailedDateContext();
    const timezoneInfo = getCurrentDateInTimezone();
    
    return `
=== REAL-TIME CONTEXT ===
📅 Current Date: ${dateContext.currentDate}
📊 Full Date: ${dateContext.formattedFull}
🕐 ISO Timestamp: ${timezoneInfo.timestamp}
🌍 Timezone: ${timezoneInfo.timezone}
📆 Week Number: ${dateContext.weekNumber}
🎯 Day of Year: ${dateContext.dayOfYear}
🔄 ${dateContext.isWeekend ? '✓ It is WEEKEND' : '✗ It is WEEKDAY'}
⏰ ${dateContext.timeUntilWeekend.message}
========================
`;
};

/**
 * Format data for inclusion in system prompt
 * @returns {string} Formatted string for system prompt inclusion
 */
export const formatForSystemPrompt = () => {
    const now = new Date();
    const dateContext = getDetailedDateContext();
    
    return `Context: The current date is ${dateContext.formattedFull}. The time is ${now.toLocaleTimeString('en-US', { hour12: true })}. 
All responses should take today's date (${dateContext.currentDate}) into consideration.
If asked about dates in the future or past, calculate relative to today: ${dateContext.currentDate}.`;
};

export default {
    getCurrentWeather,
    getCurrentDateInTimezone,
    getDetailedDateContext,
    createRealtimeContextString,
    formatForSystemPrompt
};
