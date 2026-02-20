/**
 * Utility to generate current date/time context for AI models
 * Ensures the model has awareness of the current date when responding
 */

/**
 * Get formatted current date information
 * @returns {Object} Object containing current date information
 */
export const getCurrentDateContext = () => {
    const now = new Date();
    
    return {
        currentDate: now.toISOString().split('T')[0], // YYYY-MM-DD
        currentDateTime: now.toISOString(), // Full ISO format
        currentTime: now.toLocaleTimeString('en-US', { 
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }),
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        formattedDate: now.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        timestamp: now.getTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
};

/**
 * Generate a system message that provides current context
 * @returns {string} System message with current date/time context
 */
export const generateSystemMessage = () => {
    const context = getCurrentDateContext();
    
    return `You are a helpful AI assistant. 
Important: Today's date is ${context.formattedDate} (${context.dayOfWeek}) at ${context.currentTime}.
Current timestamp: ${context.currentDateTime}
Timezone: ${context.timezone}

When answering questions:
1. Always be aware that today is ${context.currentDate}
2. Use relative dates appropriately (e.g., "today", "tomorrow", "next week")
3. If asked about "now", "today", "current", reference ${context.currentDate}
4. If the user mentions a specific date, compare it relative to ${context.currentDate}
5. Provide the most up-to-date information available to you
6. When discussing events or news, remember your knowledge cutoff and acknowledge it if relevant
7. Always mention the current date when it's relevant to the answer`;
};

/**
 * Inject current context into message array
 * Creates a system message with current date/time context
 * @param {Array} messages - Array of messages to enhance
 * @returns {Array} Enhanced messages array with context
 */
export const injectCurrentContext = (messages) => {
    const context = getCurrentDateContext();
    
    const systemMessage = {
        role: "user",
        content: `[SYSTEM CONTEXT - Keep this in mind for all responses]
Current Date: ${context.formattedDate} (${context.dayOfWeek})
Current Time: ${context.currentTime}
Timezone: ${context.timezone}
Timestamp: ${context.currentDateTime}

Remember to use this date context when answering questions about "today", "now", or any time-relative queries.`
    };
    
    return [systemMessage, ...messages];
};

/**
 * Create an enhanced prompt with date context
 * @param {string} userPrompt - The original user prompt
 * @returns {string} Enhanced prompt with date context
 */
export const enhancePromptWithContext = (userPrompt) => {
    const context = getCurrentDateContext();
    
    return `[Current Context - Date: ${context.formattedDate}, Time: ${context.currentTime}, Timezone: ${context.timezone}]

User Query: ${userPrompt}`;
};

/**
 * Get a human-readable date string for any future date
 * Useful for when users ask about data "till tomorrow" or "till next week"
 * @param {number} daysOffset - Number of days from today (0 = today, 1 = tomorrow, etc.)
 * @returns {Object} Object with date information for the specified offset
 */
export const getFutureDate = (daysOffset = 0) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysOffset);
    
    return {
        date: futureDate.toISOString().split('T')[0],
        formatted: futureDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        dayOfWeek: futureDate.toLocaleDateString('en-US', { weekday: 'long' })
    };
};

export default {
    getCurrentDateContext,
    generateSystemMessage,
    injectCurrentContext,
    enhancePromptWithContext,
    getFutureDate
};
