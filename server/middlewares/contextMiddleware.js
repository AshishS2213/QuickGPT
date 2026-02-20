/**
 * Middleware to attach current date/time context to every request
 * This ensures all handlers have access to current date information
 */

import { getCurrentDateContext, formatForSystemPrompt } from "../utils/contextGenerator.js";
import { getDetailedDateContext, formatForSystemPrompt as formatRealtimeSystemPrompt } from "../utils/realtimeData.js";

/**
 * Middleware to enrich requests with date/time context
 * Attaches context information to req.dateContext for use in handlers
 */
export const contextMiddleware = (req, res, next) => {
    try {
        // Attach comprehensive date context to request
        req.dateContext = {
            ...getCurrentDateContext(),
            ...getDetailedDateContext(),
            systemPromptAddition: formatForSystemPrompt(),
            realtimeSystemPrompt: formatRealtimeSystemPrompt()
        };
        
        // Also attach as response header for debugging
        res.set('X-Server-Date', req.dateContext.currentDate);
        res.set('X-Server-Time', req.dateContext.currentTime);
        
        next();
    } catch (error) {
        console.error("Context middleware error:", error);
        // Continue even if context generation fails
        next();
    }
};

export default contextMiddleware;
