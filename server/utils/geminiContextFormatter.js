/**
 * Enhanced Context Formatter for Gemini API
 * Ensures date context is unmissably clear to the model
 */

import { getCurrentDateContext } from "./contextGenerator.js";
import { getDetailedDateContext, formatForSystemPrompt } from "./realtimeData.js";

/**
 * Create an ultra-clear system instruction that Gemini will follow
 * @returns {string} System instruction maximizing context clarity
 */
export const createGeminiSystemInstruction = () => {
    const dateContext = getCurrentDateContext();
    const detailedContext = getDetailedDateContext();
    
    return `IMPORTANT: You MUST follow these instructions about the current date:

══════════════════════════════════════════════════════════════════════
⏰ CURRENT DATE AND TIME INFORMATION (USE THIS FOR ALL RESPONSES) ⏰
══════════════════════════════════════════════════════════════════════

📅 TODAY'S DATE: ${dateContext.currentDate} (${dateContext.formattedDate})
📅 DAY OF WEEK: ${dateContext.dayOfWeek}
⏰ CURRENT TIME: ${dateContext.currentTime}
🌍 TIMEZONE: ${dateContext.timezone}

Additional Context:
- Week Number: ${detailedContext.weekNumber}
- Day of Year: ${detailedContext.dayOfYear}
- Is Weekend: ${detailedContext.isWeekend ? 'YES' : 'NO'}
- Days Until Weekend: ${detailedContext.timeUntilWeekend.days}

══════════════════════════════════════════════════════════════════════

INSTRUCTIONS FOR ALL RESPONSES:
1. When user asks "what is today's date?" → Answer: "${dateContext.formattedDate} (${dateContext.dayOfWeek})"
2. When user asks "what day is it?" → Answer: "${dateContext.dayOfWeek}"
3. When user says "today" or "now" → Reference: ${dateContext.currentDate}
4. When calculating future dates → Base all calculations from: ${dateContext.currentDate}
5. For relative dates: Yesterday = ${new Date(Date.now() - 86400000).toISOString().split('T')[0]}, Tomorrow = ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
6. If user asks about "current events" or "latest news" → Base your knowledge from: ${dateContext.currentDate}
7. NEVER say "I don't have current date information" - You now have it: ${dateContext.currentDate}
8. ALWAYS mention today's date when it's relevant to the question

══════════════════════════════════════════════════════════════════════

You are a helpful AI assistant. Use the date information above for ALL date-related queries.`;
};

/**
 * Prepend unambiguous date context to user prompt
 * Makes it impossible for model to ignore
 * @param {string} prompt - User's original prompt
 * @returns {string} Prompt with prepended date context
 */
export const prependDateContextToPrompt = (prompt) => {
    const dateContext = getCurrentDateContext();
    
    return `[SYSTEM: Today's date is ${dateContext.currentDate} (${dateContext.formattedDate} - ${dateContext.dayOfWeek}). Current time: ${dateContext.currentTime} ${dateContext.timezone}. Base your response on this date.]

User Question: ${prompt}`;
};

/**
 * Create a combined context message for better clarity
 * @returns {string} Combined structured context
 */
export const createStructuredDateContext = () => {
    const dateContext = getCurrentDateContext();
    const detailedContext = getDetailedDateContext();
    
    return `
╔════════════════════════════════════════════════════════════════╗
║                    CONTEXT INFORMATION                         ║
╠════════════════════════════════════════════════════════════════╣
║ Current Date: ${dateContext.currentDate.padEnd(50)}║
║ Day: ${dateContext.dayOfWeek.padEnd(56)}║
║ Full Date: ${dateContext.formattedDate.padEnd(52)}║
║ Time: ${dateContext.currentTime.padEnd(56)}║
║ Timezone: ${dateContext.timezone.padEnd(52)}║
║ Week: ${detailedContext.weekNumber.toString().padEnd(52)}║
║ Weekend: ${(detailedContext.isWeekend ? 'YES' : 'NO').padEnd(51)}║
║ Days Left in Month: ${detailedContext.daysInMonth.toString().padEnd(43)}║
╚════════════════════════════════════════════════════════════════╝
`;
};

/**
 * Choose the best message format for Gemini
 * Uses structured approach that Gemini will respect
 * @param {string} userPrompt - The user's question
 * @param {Object} realtimeData - Optional real-time data (weather, crypto, etc.)
 * @returns {Object} Optimized message object
 */
export const createOptimizedGeminiMessage = (userPrompt, realtimeData = null) => {
    const systemInstruction = createGeminiSystemInstruction();
    const contextualPrompt = prependDateContextToPrompt(userPrompt);

    let fullContent = `${systemInstruction}\n\n${contextualPrompt}`;

    // Inject real-time data if available
    if (realtimeData && realtimeData.success && realtimeData.formatted) {
        fullContent += `\n${realtimeData.formatted}`;
    }

    return {
        role: "user",
        content: fullContent
    };
};

/**
 * Create assistant instruction about date context
 * @returns {string} Instruction for model behavior
 */
export const createDateContextInstruction = () => {
    const dateContext = getCurrentDateContext();
    
    return `Remember: You obtained this date context from the current system timestamp. Today is DEFINITIVELY ${dateContext.currentDate}. 
This is NOT from your training data - this is the ACTUAL current date as of when the user asked the question.
Reference this date for any question about "today", "now", "current", or "latest".`;
};

export default {
    createGeminiSystemInstruction,
    prependDateContextToPrompt,
    createStructuredDateContext,
    createOptimizedGeminiMessage,
    createDateContextInstruction
};
