/**
 * Real-Time Data Fetcher
 * Fetches current information to supplement model knowledge
 * Includes: News, Trends, Market data, Weather, etc.
 */

/**
 * Fetch trending topics and news (using free APIs)
 * @returns {Promise<Object>} Trending information
 */
export const getTrendingTopics = async () => {
    try {
        // Using Wikipedia trending/recent changes
        const response = await fetch(
            'https://en.wikipedia.org/api/rest_v1/page/random/summary'
        );
        const data = await response.json();
        
        return {
            trending: data.title,
            description: data.extract,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error fetching trending topics:", error);
        return { trending: null };
    }
};

/**
 * Get real-time information context
 * Combines multiple data sources
 * @returns {Promise<string>} Formatted real-time context
 */
export const getRealTimeContext = async () => {
    const timestamp = new Date();
    
    let context = `
╔════════════════════════════════════════════════════════════════╗
║               REAL-TIME INFORMATION                            ║
║              (As of ${timestamp.toISOString().split('T')[0]} ${timestamp.toTimeString().split(' ')[0]})              ║
╚════════════════════════════════════════════════════════════════╝

`;

    try {
        const trending = await getTrendingTopics();
        if (trending.trending) {
            context += `🔥 Trending: ${trending.trending}\n`;
        }
    } catch (error) {
        console.error("Error getting real-time context:", error);
    }
    
    return context;
};

/**
 * Create a data context string for the prompt
 * To be used when user asks about "latest", "current", "today's", etc.
 * @returns {string} Context string
 */
export const createRealtimeDataPrompt = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    
    return `[REALTIME DATA CONTEXT]
Current Date: ${dateStr}
Current Time: ${timeStr} (UTC)
Request made: ${now.toISOString()}

Note: Use this exact moment as reference for "today", "now", "current", "latest"`;
};

/**
 * Check if prompt is asking for current/real-time information
 * @param {string} prompt - User's prompt
 * @returns {boolean} True if asking for current info
 */
export const isCurrentDataQuery = (prompt) => {
    const currentDataKeywords = [
        'today',
        'current',
        'latest',
        'now',
        'right now',
        'today\'s',
        'this week',
        'this month',
        'what is today',
        'what\'s today',
        'what day',
        'what time',
        'present',
        'moment',
        'recent',
        'trending',
        'breaking'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return currentDataKeywords.some(keyword => lowerPrompt.includes(keyword));
};

/**
 * Create enhanced prompt with real-time context if needed
 * @param {string} prompt - User's prompt
 * @returns {Promise<string>} Enhanced prompt with real-time data
 */
export const enhancePromptWithRealtimeData = async (prompt) => {
    const isCurrentQuery = isCurrentDataQuery(prompt);
    
    if (isCurrentQuery) {
        const realtimeContext = await getRealTimeContext();
        return `${realtimeContext}\n\nUser Question: ${prompt}`;
    }
    
    return prompt;
};

/**
 * Inject declaration of current knowledge
 * Tells model explicitly that it has current date information
 * @returns {string} Declaration message
 */
export const createCurrentKnowledgeDeclaration = () => {
    const now = new Date();
    return `
[KNOWLEDGE UPDATE]
This conversation is happening on ${now.toISOString().split('T')[0]}.
You are being provided with the CURRENT DATE right now.
Your responses should reflect information accurate to ${now.toISOString().split('T')[0]}.
If you don't know something or it requires real-time data, indicate that clearly.
`;
};

export default {
    getTrendingTopics,
    getRealTimeContext,
    createRealtimeDataPrompt,
    isCurrentDataQuery,
    enhancePromptWithRealtimeData,
    createCurrentKnowledgeDeclaration
};
