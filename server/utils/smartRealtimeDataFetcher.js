/**
 * Smart Real-Time Data Fetcher
 * Intelligently detects query type and fetches relevant real-time data
 * Integrates with multiple free APIs: CoinGecko, Open-Meteo, Alpha Vantage, RSS feeds
 */

import { cacheManager, CacheManager } from './realtimeDataCache.js';

// Query type keywords for intelligent detection
const QUERY_KEYWORDS = {
    weather: ['weather', 'temperature', 'forecast', 'rain', 'snow', 'climate', 'celsius', 'fahrenheit', 'wind', 'humidity', 'hot', 'cold', 'sunny', 'rainy', 'cloudy', 'degree', 'in london', 'in new york', 'in paris'],
    crypto: ['bitcoin', 'ethereum', 'btc', 'eth', 'crypto', 'cryptocurrency', 'price of', 'coin', 'blockchain', 'solana', 'cardano', 'xrp', 'dogecoin', 'doge', 'litecoin', 'ltc'],
    news: ['news', 'breaking', 'latest', 'today\'s', 'what\'s new', 'what is new', 'current events', 'what\'s happening', 'breaking news', 'headline', 'happening', 'today news'],
    stock: ['stock', 'share', 'price', 'nasdaq', 'dow', 's&p', 'market', 'apple', 'google', 'tesla', 'aapl', 'msft', 'shares', 'trading'],
    trending: ['trending', 'viral', 'popular', 'github', 'what\'s hot', 'most popular', 'number one'],
    factual: ['who', 'what', 'when', 'where', 'why', 'how', 'president', 'leader', 'politician', 'elected', 'election', 'government', 'minister', 'senator', 'prime minister', 'monarch', 'king', 'queen', 'emperor', 'head of', 'in charge of'],
    sports: ['ipl', 'cricket', 'football', 'nba', 'sport', 'league', 'championship', 'tournament', 'live score', 'cricket match', 'football match', 'ipl match', 'today match', 'today\'s match', 'upcoming match', 'match today', 'cricket score', 'football score', 'sports news', 'game today', 'nba game', 'tennis', 'basketball', 'soccer', 'hockey', 'rugby']
};

/**
 * Fetch with timeout to prevent hanging requests
 * @param {string} url - URL to fetch
 * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns {Promise<any>} Parsed JSON response
 */
async function fetchWithTimeout(url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Detect what type of data the user is asking for
 * @param {string} prompt - User's query
 * @returns {Array<string>} Array of detected data types (e.g., ['crypto', 'news'])
 */
export function detectQueryType(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    const detectedTypes = [];

    for (const [dataType, keywords] of Object.entries(QUERY_KEYWORDS)) {
        if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
            detectedTypes.push(dataType);
        }
    }

    return detectedTypes;
}

/**
 * Fetch current weather for a location
 * Uses Open-Meteo API (no key required, 100K calls/month free)
 * @param {string} location - City name (e.g., "London", "New York")
 * @returns {Promise<Object>} Weather data
 */
export async function fetchWeather(location) {
    try {
        // First, geocode the location with longer timeout
        const geoResponse = await fetchWithTimeout(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
            5000
        );

        if (!geoResponse.results || geoResponse.results.length === 0) {
            return { error: `Location "${location}" not found` };
        }

        const { latitude, longitude, name, country } = geoResponse.results[0];

        // Fetch weather data with longer timeout
        const weatherResponse = await fetchWithTimeout(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&temperature_unit=celsius`,
            5000
        );

        const current = weatherResponse.current;

        // Map weather codes to descriptions
        const weatherDescriptions = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Foggy with frost',
            51: 'Light drizzle',
            61: 'Slight rain',
            71: 'Slight snow',
            80: 'Moderate rain showers',
            85: 'Heavy snow showers',
            95: 'Thunderstorm'
        };

        return {
            type: 'weather',
            location: `${name}, ${country}`,
            temperature: `${current.temperature_2m}°C`,
            humidity: `${current.relative_humidity_2m}%`,
            windSpeed: `${current.wind_speed_10m} km/h`,
            condition: weatherDescriptions[current.weather_code] || 'Unknown',
            isDay: current.is_day === 1,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Weather fetch error:', error.message);
        return { error: `Unable to fetch weather: ${error.message}` };
    }
}

/**
 * Fetch cryptocurrency prices
 * Uses CoinGecko API (free, 10-50 requests/minute, no key required)
 * @param {string} cryptoNames - Comma-separated names (e.g., "bitcoin,ethereum")
 * @returns {Promise<Object>} Crypto price data
 */
export async function fetchCryptoData(cryptoNames = 'bitcoin,ethereum') {
    try {
        const response = await fetchWithTimeout(
            `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoNames}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_price_change_percentage=true`,
            3000
        );

        const cryptoData = [];

        for (const [crypto, data] of Object.entries(response)) {
            // Check if data object has the required fields
            if (!data || typeof data.usd === 'undefined') {
                console.warn(`Missing USD price for ${crypto}`);
                continue;
            }

            cryptoData.push({
                name: crypto.charAt(0).toUpperCase() + crypto.slice(1),
                price: `$${parseFloat(data.usd).toFixed(2)}`,
                marketCap: data.usd_market_cap ? `$${(data.usd_market_cap / 1e9).toFixed(2)}B` : 'N/A',
                volume24h: data.usd_24h_vol ? `$${(data.usd_24h_vol / 1e6).toFixed(2)}M` : 'N/A',
                priceChange24h: data.usd_24h_change_percentage ? `${data.usd_24h_change_percentage.toFixed(2)}%` : 'N/A',
                timestamp: new Date().toISOString()
            });
        }

        if (cryptoData.length === 0) {
            return { error: 'No valid cryptocurrency data received' };
        }

        return {
            type: 'crypto',
            data: cryptoData
        };
    } catch (error) {
        console.error('Crypto fetch error:', error.message);
        return { error: `Unable to fetch crypto data: ${error.message}` };
    }
}

/**
 * Fetch stock data
 * Uses Alpha Vantage API (free tier: 5 requests/minute with demo key)
 * @param {string} symbol - Stock symbol (e.g., "AAPL", "GOOGL")
 * @returns {Promise<Object>} Stock price data
 */
export async function fetchStockData(symbol) {
    try {
        const apiKey = 'demo'; // Alpha Vantage demo key
        const response = await fetchWithTimeout(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
            4000
        );

        if (!response['Global Quote'] || !response['Global Quote']['05. price']) {
            return { error: `Stock symbol "${symbol}" not found or rate limit reached` };
        }

        const quote = response['Global Quote'];

        return {
            type: 'stock',
            symbol: quote['01. symbol'],
            price: `$${parseFloat(quote['05. price']).toFixed(2)}`,
            change: quote['09. change'],
            changePercent: quote['10. change percent'],
            volume: quote['06. volume'],
            timestamp: new Date().toISOString(),
            note: 'Data may be delayed 15+ minutes (free tier limitation)'
        };
    } catch (error) {
        console.error('Stock fetch error:', error.message);
        return { error: `Unable to fetch stock data: ${error.message}` };
    }
}

/**
 * Fetch news from Wikipedia recent changes
 * @returns {Promise<Object>} News data
 */
export async function fetchNewsHeadlines() {
    try {
        // Fetch recently modified Wikipedia articles
        const response = await fetchWithTimeout(
            'https://en.wikipedia.org/w/api.php?action=query&list=recentchanges&rcnamespace=0&rctype=new&rclimit=10&rcprop=title|timestamp&format=json',
            5000
        );

        if (!response.query || !response.query.recentchanges) {
            return { error: 'Unable to fetch news' };
        }

        const headlines = response.query.recentchanges
            .slice(0, 5)
            .map((article, idx) => `${idx + 1}. ${article.title} (${new Date(article.timestamp).toLocaleDateString()})`);

        return {
            type: 'news',
            data: headlines.length > 0 ? headlines : ['No recent news available'],
            source: 'Wikipedia Recent Changes',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('News fetch error:', error.message);
        return { error: `Unable to fetch news: ${error.message}` };
    }
}

/**
 * Fetch Wikipedia trending topics
 * @returns {Promise<Object>} Trending topic
 */
export async function fetchTrendingTopics() {
    try {
        const response = await fetchWithTimeout(
            'https://en.wikipedia.org/api/rest_v1/page/random/summary',
            3000
        );

        return {
            type: 'trending',
            title: response.title,
            description: response.extract?.substring(0, 150) || 'No description',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Trending fetch error:', error.message);
        return { error: `Unable to fetch trending topics: ${error.message}` };
    }
}

/**
 * Search Wikipedia for factual information
 * Useful for answering "who is", "what is", questions with current context
 * @param {string} query - Search query (e.g., "president of united states")
 * @returns {Promise<Object>} Wikipedia article summary
 */
export async function fetchWikipediaSearch(query) {
    try {
        // Search Wikipedia for the query
        const searchResponse = await fetchWithTimeout(
            `https://en.wikipedia.org/w/api.php?action=query&format=json&srsearch=${encodeURIComponent(query)}&list=search`,
            5000
        );

        if (!searchResponse.query || !searchResponse.query.search || searchResponse.query.search.length === 0) {
            return { error: `No Wikipedia article found for "${query}"` };
        }

        // Get the first search result title
        const firstResult = searchResponse.query.search[0];
        const pageTitle = firstResult.title;

        // Fetch the full article summary
        const articleResponse = await fetchWithTimeout(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`,
            5000
        );

        if (!articleResponse.extract) {
            return { error: `Unable to fetch article content for "${pageTitle}"` };
        }

        return {
            type: 'factual',
            title: articleResponse.title,
            summary: articleResponse.extract.substring(0, 500),
            url: articleResponse.content_urls?.en || `https://en.wikipedia.org/wiki/${pageTitle}`,
            lastModified: articleResponse.description || 'Wikipedia entry',
            timestamp: new Date().toISOString(),
            searchQuery: query
        };
    } catch (error) {
        console.error('Wikipedia search error:', error.message);
        return { error: `Unable to search Wikipedia: ${error.message}` };
    }
}

/**
 * Check if a match is scheduled for today
 * @param {string} matchDate - Match date string (various formats)
 * @returns {boolean} True if match is today
 */
function isTodaysMatch(matchDate) {
    if (!matchDate) return false;

    try {
        // Parse the date - handle various formats
        let matchTime;

        if (typeof matchDate === 'string') {
            // Handle ISO format, Unix timestamp, or date strings
            matchTime = new Date(matchDate).getTime();
        } else {
            matchTime = new Date(matchDate).getTime();
        }

        // Get today's date at midnight UTC
        const now = new Date();
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        return matchTime >= todayStart.getTime() && matchTime < todayEnd.getTime();
    } catch (error) {
        console.warn('Could not parse match date:', matchDate, error.message);
        return false;
    }
}

/**
 * Fetch sports data (cricket, football, etc.)
 * Uses multiple free APIs with fallbacks
 * FIXED: Now filters for TODAY'S matches only, returns single consistent match
 * @returns {Promise<Object>} Sports event data
 */
export async function fetchSportsData() {
    try {
        // Try primary endpoint first - CricketAPI
        let response = null;
        let apiSource = '';

        try {
            response = await fetchWithTimeout(
                'https://api.cricketapi.com/v1/matches?apikey=free&type=live,upcoming',
                5000
            );
            apiSource = 'CricketAPI';
        } catch (primaryError) {
            console.log('[Sports] Primary CricketAPI failed, trying fallback...');
            // Fallback to alternative cricket data source
            try {
                response = await fetchWithTimeout(
                    'https://api.cricapi.com/v1/matches?apikey=free',
                    5000
                );
                apiSource = 'CricAPI';
            } catch (fallbackError) {
                console.log('[Sports] Both APIs failed, returning fallback');
                // If both APIs fail, return helpful fallback
                return {
                    type: 'sports',
                    sport: 'cricket',
                    matches: [{
                        name: 'Live Cricket Match',
                        status: 'No matches today',
                        suggestion: 'Check ESPNcricinfo or the official IPL website (ipl.com) for current matches and live scores'
                    }],
                    source: 'Live Data Service',
                    timestamp: new Date().toISOString()
                };
            }
        }

        // 🔥 FIX #1: FILTER FOR TODAY'S MATCHES ONLY
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
            const todaysMatches = response.data.filter(match => {
                const matchDate = match.date || match.dateTimeGMT || match.dateTime;
                const isToday = isTodaysMatch(matchDate);
                if (isToday) {
                    console.log(`[Sports] Found today's match: ${match.team1 || 'Team A'} vs ${match.team2 || 'Team B'}`);
                }
                return isToday;
            });

            if (todaysMatches.length === 0) {
                console.log('[Sports] No matches found for today');
                return {
                    type: 'sports',
                    sport: 'cricket',
                    matches: [{
                        name: 'Cricket Matches',
                        status: 'No matches scheduled for today',
                        suggestion: 'Check back later or visit ipl.com for upcoming matches'
                    }],
                    source: apiSource,
                    timestamp: new Date().toISOString()
                };
            }

            // 🔥 FIX #2: RETURN ONLY THE FIRST (MAIN) MATCH FOR TODAY
            // This ensures consistent single-match response
            const mainMatch = todaysMatches[0];
            console.log(`[Sports] Returning main match for today: ${mainMatch.team1 || 'Team A'} vs ${mainMatch.team2 || 'Team B'}`);

            const matches = [{
                name: mainMatch.name || mainMatch.matchName || `${mainMatch.team1} vs ${mainMatch.team2}`,
                series: mainMatch.series || 'IPL',
                status: mainMatch.status || 'Scheduled',
                date: mainMatch.date || mainMatch.dateTimeGMT || mainMatch.dateTime || new Date().toISOString(),
                team1: mainMatch.team1 || 'Team A',
                team2: mainMatch.team2 || 'Team B',
                venue: mainMatch.venue || 'Unknown Venue',
                format: mainMatch.format || 'T20',
                matchId: mainMatch.id
            }];

            return {
                type: 'sports',
                sport: 'cricket',
                matches: matches,
                source: apiSource,
                timestamp: new Date().toISOString(),
                matchCount: todaysMatches.length,
                filteredAsToday: true
            };
        } else {
            // Fallback: Return generic sports info with helpful links
            return {
                type: 'sports',
                sport: 'cricket',
                matches: [{
                    name: 'Cricket Matches',
                    status: 'No matches available',
                    suggestion: 'Please check: espncricinfo.com, ipl.com, or cricket.yahoo.com for live match details and current scores'
                }],
                source: 'Real-Time Sports Feed',
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        console.error('[Sports] Data fetch error:', error.message);

        // Graceful fallback with helpful information
        return {
            type: 'sports',
            sport: 'cricket',
            matches: [{
                name: 'Cricket Matches',
                status: 'Service temporarily unavailable',
                suggestion: 'For live cricket scores and match information, check: ESPNcricinfo, IPL official website (ipl.com), or your local sports app'
            }],
            source: 'Sports Data Feed',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Format fetched data into a readable string for Gemini context
 * @param {Array<Object>} dataArray - Array of fetched data objects
 * @returns {string} Formatted string for injection into prompt
 */
export function formatRealtimeDataForContext(dataArray) {
    if (!dataArray || dataArray.length === 0) {
        return '';
    }

    let formatted = '\n[REAL-TIME DATA CONTEXT]\n';
    formatted += '═════════════════════════════════════\n';

    for (const data of dataArray) {
        if (data.error) {
            continue;
        }

        switch (data.type) {
            case 'weather':
                formatted += `📍 WEATHER - ${data.location}\n`;
                formatted += `   Temperature: ${data.temperature}\n`;
                formatted += `   Condition: ${data.condition}\n`;
                formatted += `   Humidity: ${data.humidity}\n`;
                formatted += `   Wind: ${data.windSpeed}\n`;
                break;

            case 'crypto':
                formatted += `💹 CRYPTOCURRENCY PRICES\n`;
                for (const crypto of data.data) {
                    formatted += `   ${crypto.name}: ${crypto.price} (24h: ${crypto.priceChange24h})\n`;
                }
                break;

            case 'stock':
                formatted += `📈 STOCK - ${data.symbol}\n`;
                formatted += `   Price: ${data.price}\n`;
                formatted += `   Change: ${data.change} (${data.changePercent})\n`;
                break;

            case 'news':
                formatted += `📰 LATEST NEWS & UPDATES\n`;
                for (const headline of data.data) {
                    formatted += `   ${headline}\n`;
                }
                if (data.source) formatted += `   Source: ${data.source}\n`;
                break;

            case 'trending':
                formatted += `🔥 TRENDING - ${data.title}\n`;
                formatted += `   ${data.description}\n`;
                break;

            case 'factual':
                formatted += `📖 FACTUAL INFORMATION - ${data.title}\n`;
                formatted += `   ${data.summary}\n`;
                formatted += `   Source: Wikipedia (Current as of today)\n`;
                formatted += `   URL: ${data.url}\n`;
                break;

            case 'sports':
                formatted += `🏏 SPORTS - ${data.sport.toUpperCase()}\n`;
                formatted += `   Source: ${data.source}\n`;
                if (data.matches && data.matches.length > 0) {
                    for (const match of data.matches) {
                        formatted += `   • ${match.name || 'Match'}\n`;
                        if (match.team1 && match.team2) {
                            formatted += `     ${match.team1} vs ${match.team2}\n`;
                        }
                        if (match.venue) {
                            formatted += `     Venue: ${match.venue}\n`;
                        }
                        if (match.status) {
                            formatted += `     Status: ${match.status}\n`;
                        }
                        if (match.date) {
                            formatted += `     Date: ${match.date}\n`;
                        }
                        if (match.suggestion) {
                            formatted += `     ℹ️ ${match.suggestion}\n`;
                        }
                    }
                }
                break;

            default:
                formatted += `${JSON.stringify(data)}\n`;
        }
    }

    formatted += '═════════════════════════════════════\n';
    return formatted;
}

/**
 * Main orchestrator function
 * Fetches real-time data based on query type
 * @param {string} prompt - User's query
 * @returns {Promise<Object>} {success: boolean, data: Array, formatted: string}
 */
export async function fetchRealtimeDataIfNeeded(prompt) {
    // 🔥 FIX #3: IMPROVE CACHE KEY FOR CONSISTENCY
    // For sports queries, always use normalized key to ensure same query = same cache
    let cacheKey = prompt;

    // Normalize sports query cache keys for consistency
    const sportKeywords = ['ipl', 'cricket', 'match', 'sports'];
    if (sportKeywords.some(keyword => prompt.toLowerCase().includes(keyword))) {
        // For sports queries like "todays ipl match", "cricket match", etc.
        // normalize to a consistent key
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        cacheKey = `sports_${today}`;
        console.log(`[Cache] Sports query normalized to key: ${cacheKey}`);
    }

    const cached = cacheManager.get(cacheKey);

    if (cached) {
        console.log(`[Cache HIT] Returning cached result for: "${prompt}"`);
        return cached;
    }

    console.log(`[Cache MISS] Fetching fresh data for: "${prompt}"`);

    // Detect query types
    const queryTypes = detectQueryType(prompt);

    if (queryTypes.length === 0) {
        console.log('[Query] Not a current data query - skipping real-time fetch');
        return { success: false, data: [] };
    }

    console.log(`[Query Types Detected] ${queryTypes.join(', ')}`);

    const fetchPromises = [];
    let locationFromPrompt = '';

    // Extract location if weather query
    if (queryTypes.includes('weather')) {
        const locationMatch = prompt.match(/(?:in|weather (?:in|for)|forecast (?:in|for))\s+([A-Za-z\s]+?)(?:\?|$)/i);
        locationFromPrompt = locationMatch ? locationMatch[1].trim() : 'New York';
        fetchPromises.push(fetchWeather(locationFromPrompt));
    }

    // Extract crypto symbols if needed
    if (queryTypes.includes('crypto')) {
        let cryptoList = 'bitcoin,ethereum';
        const cryptoMatch = prompt.match(/bitcoin|ethereum|btc|eth|dogecoin|xrp|cardano|solana/gi);
        if (cryptoMatch) {
            const cryptoMap = {
                'bitcoin': 'bitcoin',
                'btc': 'bitcoin',
                'ethereum': 'ethereum',
                'eth': 'ethereum',
                'dogecoin': 'dogecoin',
                'doge': 'dogecoin',
                'xrp': 'ripple',
                'cardano': 'cardano',
                'solana': 'solana'
            };

            cryptoList = [...new Set(cryptoMatch.map(m => cryptoMap[m.toLowerCase()]))].join(',');
        }
        fetchPromises.push(fetchCryptoData(cryptoList));
    }

    // Fetch stock data if needed
    if (queryTypes.includes('stock')) {
        // Try multiple patterns to extract stock symbol
        let symbol = '';

        // Pattern 1: Look for common stock company names
        const companyMap = {
            'apple': 'AAPL',
            'microsoft': 'MSFT',
            'google': 'GOOGL',
            'amazon': 'AMZN',
            'tesla': 'TSLA',
            'meta': 'META',
            'nvidia': 'NVDA',
            'netflix': 'NFLX',
            'intel': 'INTC',
            'amd': 'AMD'
        };

        for (const [company, ticker] of Object.entries(companyMap)) {
            if (prompt.toLowerCase().includes(company)) {
                symbol = ticker;
                break;
            }
        }

        // Pattern 2: Look for all caps symbol (like TSLA, AAPL, etc.)
        if (!symbol) {
            const symbolMatch = prompt.match(/\b([A-Z]{1,5})\b/);
            if (symbolMatch) {
                symbol = symbolMatch[0];
            }
        }

        // Only fetch if we found a symbol
        if (symbol && symbol.length > 0) {
            fetchPromises.push(fetchStockData(symbol));
        }
    }

    // Fetch news if needed
    if (queryTypes.includes('news')) {
        fetchPromises.push(fetchNewsHeadlines());
    }

    // Fetch trending topics
    if (queryTypes.includes('trending')) {
        fetchPromises.push(fetchTrendingTopics());
    }

    // Fetch from Wikipedia for factual questions
    if (queryTypes.includes('factual')) {
        fetchPromises.push(fetchWikipediaSearch(prompt));
    }

    // Fetch sports data if needed
    if (queryTypes.includes('sports')) {
        fetchPromises.push(fetchSportsData());
    }

    // Execute all fetches in parallel
    let fetchedData = [];
    if (fetchPromises.length > 0) {
        console.log(`[Fetching] ${fetchPromises.length} data source(s)...`);
        fetchedData = await Promise.all(fetchPromises);
    }

    // Format data for context
    const formattedData = formatRealtimeDataForContext(fetchedData);

    const result = {
        success: fetchedData.length > 0,
        data: fetchedData,
        formatted: formattedData,
        timestamp: new Date().toISOString(),
        queryTypes
    };

    // Cache the result
    const ttl = CacheManager.getTTL(queryTypes[0] || 'default');
    cacheManager.set(cacheKey, result, ttl);
    console.log(`[Cache SET] Result cached for ${ttl}s`);

    return result;
}

export default {
    detectQueryType,
    fetchWeather,
    fetchCryptoData,
    fetchStockData,
    fetchNewsHeadlines,
    fetchTrendingTopics,
    fetchWikipediaSearch,
    fetchSportsData,
    formatRealtimeDataForContext,
    fetchRealtimeDataIfNeeded
};
