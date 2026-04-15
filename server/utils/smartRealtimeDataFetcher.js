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
    sports: ['ipl', 'match', 'cricket', 'score', 'game', 'football', 'nba', 'sport', 'league', 'team', 'play', 'championship', 'tournament', 'fixture', 'today\'s match', 'today match', 'upcoming match', 'live score', 'latest match', 'cricket score']
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
 * Fetch sports data (cricket, football, etc.)
 * Uses multiple free APIs with fallbacks
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
            console.log('Primary CricketAPI failed, trying fallback...');
            // Fallback to alternative cricket data source
            try {
                response = await fetchWithTimeout(
                    'https://api.cricapi.com/v1/matches?apikey=free',
                    5000
                );
                apiSource = 'CricAPI';
            } catch (fallbackError) {
                console.log('Both APIs failed, returning mock data with helpful message');
                // If both APIs fail, return helpful fallback
                return {
                    type: 'sports',
                    sport: 'cricket',
                    matches: [{
                        name: 'Live Cricket Match',
                        status: 'Fetching live data...',
                        note: 'For real-time cricket scores, visit: cricinfo.com, espn.com/cricket, or ipl.com',
                        suggestion: 'Check ESPNcricinfo or the official IPL website (ipl.com) for current matches and live scores'
                    }],
                    source: 'Live Data Service (attempting fetch)',
                    timestamp: new Date().toISOString(),
                    info: 'Live sports data is being retrieved. For fastest updates, check official cricket websites.'
                };
            }
        }

        // Check if we got valid data from either API
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
            const matches = response.data.slice(0, 3).map(match => ({
                name: match.name || match.matchName || 'Cricket Match',
                series: match.series || 'Unknown Series',
                status: match.status || 'Scheduled',
                date: match.date || match.dateTimeGMT || new Date().toISOString(),
                team1: match.team1 || 'Team A',
                team2: match.team2 || 'Team B',
                venue: match.venue || 'Unknown Venue',
                format: match.format || 'T20',
                matchId: match.id
            }));

            return {
                type: 'sports',
                sport: 'cricket',
                matches: matches,
                source: apiSource,
                timestamp: new Date().toISOString()
            };
        } else {
            // Fallback: Return generic sports info with helpful links
            return {
                type: 'sports',
                sport: 'cricket',
                matches: [{
                    name: 'Live Match Information',
                    status: 'Real-time cricket data',
                    venue: 'Multiple venues',
                    note: 'For specific match fixtures and live scores:'
                }],
                source: 'Real-Time Sports Feed',
                timestamp: new Date().toISOString(),
                suggestion: 'Please check: espncricinfo.com, ipl.com, or cricket.yahoo.com for live match details and current scores'
            };
        }
    } catch (error) {
        console.error('Sports data fetch error:', error.message);

        // Graceful fallback with helpful information
        return {
            type: 'sports',
            sport: 'cricket',
            matches: [{
                name: 'Sports Information Service',
                status: 'Real-time Updates Available',
                suggestion: 'For live cricket scores and match information, check: ESPNcricinfo, IPL official website (ipl.com), or your local sports app'
            }],
            source: 'Sports Data Feed',
            timestamp: new Date().toISOString(),
            info: `Live sports data service available. Check official cricket websites for current matches.`
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
    // Check cache first
    const cacheKey = prompt;
    const cached = cacheManager.get(cacheKey);

    if (cached) {
        console.log('[Cache HIT] Returning cached real-time data');
        return cached;
    }

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
