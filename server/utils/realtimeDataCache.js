/**
 * Real-Time Data Cache Manager
 * Manages in-memory caching with TTL (Time To Live) expiration
 * Prevents excessive API calls and improves response time
 */

class CacheEntry {
    constructor(data, ttlSeconds) {
        this.data = data;
        this.createdAt = Date.now();
        this.expiresAt = Date.now() + (ttlSeconds * 1000);
    }

    isExpired() {
        return Date.now() > this.expiresAt;
    }
}

export class CacheManager {
    constructor() {
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }

    /**
     * Generate a normalized cache key from a query
     * @param {string} query - User's query string
     * @returns {string} Normalized cache key
     */
    generateKey(query) {
        if (!query) return '';
        return query
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
    }

    /**
     * Get data from cache if it exists and is not expired
     * @param {string} query - Query string or normalized key
     * @returns {Object|null} Cached data or null if expired/missing
     */
    get(query) {
        const key = this.generateKey(query);
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        if (entry.isExpired()) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        return entry.data;
    }

    /**
     * Set data in cache with TTL
     * @param {string} query - Query string or normalized key
     * @param {Object} data - Data to cache
     * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 min)
     */
    set(query, data, ttlSeconds = 300) {
        const key = this.generateKey(query);

        // Limit cache size to prevent memory bloat (max 100 entries)
        if (this.cache.size >= 100 && !this.cache.has(key)) {
            this.evictOldest();
        }

        this.cache.set(key, new CacheEntry(data, ttlSeconds));
    }

    /**
     * Check if key exists in cache and is not expired
     * @param {string} query - Query string
     * @returns {boolean} True if cached and valid
     */
    has(query) {
        return this.get(query) !== null;
    }

    /**
     * Manually remove expired entries from cache
     * Called periodically to free up memory
     */
    pruneExpired() {
        let pruned = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.isExpired()) {
                this.cache.delete(key);
                pruned++;
            }
        }
        return pruned;
    }

    /**
     * Remove oldest entry when cache is full
     * Uses simple FIFO strategy based on createdAt time
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.createdAt < oldestTime) {
                oldestTime = entry.createdAt;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.stats.evictions++;
        }
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0, evictions: 0 };
    }

    /**
     * Get cache statistics
     * @returns {Object} Stats object with hits, misses, evictions, hitRate
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            totalRequests: total,
            hitRate: `${hitRate}%`,
            cacheSize: this.cache.size
        };
    }

    /**
     * Get TTL configuration for different data types
     * @param {string} dataType - Type of data (weather, news, crypto, stock, trending)
     * @returns {number} TTL in seconds
     */
    static getTTL(dataType) {
        const ttlMap = {
            weather: 1800,     // 30 minutes
            news: 900,         // 15 minutes
            crypto: 300,       // 5 minutes
            stock: 600,        // 10 minutes
            trending: 1200,    // 20 minutes
            default: 600       // 10 minutes
        };

        return ttlMap[dataType] || ttlMap.default;
    }
}

// Create a singleton instance for use throughout the app
export const cacheManager = new CacheManager();

export default cacheManager;
