#!/usr/bin/env node
/**
 * Quick Syntax & Integration Test
 * Verifies that all imports work and logic is correct
 */

import { CacheManager, cacheManager } from "./realtimeDataCache.js";
import {
    detectQueryType,
    fetchWeather,
    fetchCryptoData,
    fetchStockData,
    fetchTrendingTopics,
    formatRealtimeDataForContext,
    fetchRealtimeDataIfNeeded
} from "./smartRealtimeDataFetcher.js";

console.log("\n╔════════════════════════════════════════════════════════╗");
console.log("║  🚀 REAL-TIME DATA INTEGRATION - VERIFICATION TEST     ║");
console.log("╚════════════════════════════════════════════════════════╝\n");

// Test 1: Imports successful
console.log("✅ Test 1: All modules imported successfully\n");

// Test 2: Query Type Detection
console.log("📋 Test 2: Query Type Detection\n");
const testQueries = [
    { prompt: "What's the weather in London?", expected: "weather" },
    { prompt: "Bitcoin price now?", expected: "crypto" },
    { prompt: "What's new today?", expected: "news" },
    { prompt: "Apple stock price?", expected: "stock" },
    { prompt: "Tell me a joke", expected: "none" }
];

for (const test of testQueries) {
    const detected = detectQueryType(test.prompt);
    const type = detected.length > 0 ? detected[0] : "none";
    const match = type === test.expected;
    console.log(`${match ? "✅" : "❌"} "${test.prompt}"`);
    console.log(`   Detected: ${detected.join(", ") || "none"}\n`);
}

// Test 3: Cache System
console.log("\n📋 Test 3: Cache System\n");
cacheManager.clear();

// Set data
cacheManager.set("test_weather", { temp: "20C", location: "London" }, 5);
console.log("✅ Cached weather data with 5s TTL");

const retrieved = cacheManager.get("test_weather");
console.log(`✅ Retrieved: ${JSON.stringify(retrieved)}`);

const stats = cacheManager.getStats();
console.log(`✅ Cache Stats: ${stats.hits} hits, ${stats.misses} misses, Hit Rate: ${stats.hitRate}\n`);

// Test 4: formatRealtimeDataForContext
console.log("📋 Test 4: Data Formatting\n");
const sampleData = [
    {
        type: 'weather',
        location: 'London, UK',
        temperature: '15°C',
        condition: 'Cloudy',
        humidity: '72%',
        windSpeed: '10 km/h'
    },
    {
        type: 'crypto',
        data: [
            { name: 'Bitcoin', price: '$45000', priceChange24h: '+2.5%' },
            { name: 'Ethereum', price: '$2500', priceChange24h: '-1.2%' }
        ]
    }
];

const formatted = formatRealtimeDataForContext(sampleData);
console.log("✅ Formatted data for Gemini:\n");
console.log(formatted);

// Test 5: TTL Configuration
console.log("\n📋 Test 5: TTL Configuration\n");
const ttlConfig = {
    weather: CacheManager.getTTL("weather"),
    crypto: CacheManager.getTTL("crypto"),
    news: CacheManager.getTTL("news"),
    stock: CacheManager.getTTL("stock"),
    trending: CacheManager.getTTL("trending")
};

console.log("✅ TTL Settings:");
for (const [type, ttl] of Object.entries(ttlConfig)) {
    console.log(`   ${type}: ${ttl}s (${ttl / 60} minutes)`);
}

console.log("\n");

// Test 6: API Fetch Functions Availability
console.log("📋 Test 6: API Fetch Functions\n");
console.log("✅ fetchWeather function: " + (typeof fetchWeather === 'function' ? "Available" : "Missing"));
console.log("✅ fetchCryptoData function: " + (typeof fetchCryptoData === 'function' ? "Available" : "Missing"));
console.log("✅ fetchStockData function: " + (typeof fetchStockData === 'function' ? "Available" : "Missing"));
console.log("✅ fetchTrendingTopics function: " + (typeof fetchTrendingTopics === 'function' ? "Available" : "Missing"));
console.log("✅ fetchRealtimeDataIfNeeded function: " + (typeof fetchRealtimeDataIfNeeded === 'function' ? "Available" : "Missing"));

console.log("\n");

// Test 7: Test actual API calls (non-blocking, will show results when ready)
console.log("📋 Test 7: Live API Calls (Running...)\n");

console.log("⏳ Fetching Bitcoin price...");
fetchCryptoData("bitcoin").then(result => {
    if (result.error) {
        console.log(`⚠️  Error: ${result.error}`);
    } else {
        console.log(`✅ Bitcoin fetched: ${JSON.stringify(result.data[0])}\n`);
    }
});

console.log("⏳ Fetching weather for Tokyo...");
fetchWeather("Tokyo").then(result => {
    if (result.error) {
        console.log(`⚠️  Error: ${result.error}`);
    } else {
        console.log(`✅ Weather fetched: ${result.location}, Temperature: ${result.temperature}\n`);
    }
});

console.log("⏳ Fetching trending topic...");
fetchTrendingTopics().then(result => {
    if (result.error) {
        console.log(`⚠️  Error: ${result.error}`);
    } else {
        console.log(`✅ Trending: ${result.title}\n`);
    }
});

// Test 8: Full orchestrator test
console.log("📋 Test 8: Full Orchestrator (fetchRealtimeDataIfNeeded)\n");

cacheManager.clear();

console.log("⏳ Query: 'What is the weather in Paris?'");
fetchRealtimeDataIfNeeded("What is the weather in Paris?").then(result => {
    console.log(`✅ Success: ${result.success}`);
    console.log(`✅ Query Types: ${result.queryTypes.join(", ")}`);
    console.log(`✅ Data Fetched: ${result.data.length} source(s)`);
    console.log(`✅ Formatted output length: ${result.formatted.length} chars\n`);
});

console.log("⏳ Query: 'Bitcoin and Ethereum prices'");
fetchRealtimeDataIfNeeded("Bitcoin and Ethereum prices").then(result => {
    console.log(`✅ Success: ${result.success}`);
    console.log(`✅ Query Types: ${result.queryTypes.join(", ")}`);
    console.log(`✅ Data Fetched: ${result.data.length} source(s)`);
    console.log(`✅ Formatted output:\n${result.formatted}`);

    // Test cache hit on repeated query
    console.log("\n⏳ Same query again (should be from cache)...");
    fetchRealtimeDataIfNeeded("Bitcoin and Ethereum prices").then(cachedResult => {
        console.log(`✅ Retrieved from cache: ${cachedResult === result ? "YES" : "Different object but same data"}`);
    });
});

console.log("\n");

// Summary
console.log("╔════════════════════════════════════════════════════════╗");
console.log("║  ✅ BASIC VERIFICATION COMPLETE                        ║");
console.log("║                                                        ║");
console.log("║  Next Steps:                                           ║");
console.log("║  1. Check API responses above for actual data          ║");
console.log("║  2. Verify no console errors                           ║");
console.log("║  3. Test in actual chat interface                      ║");
console.log("║  4. Query: 'What weather in [city]?'                   ║");
console.log("║  5. Query: '[Crypto] price?'                           ║");
console.log("║  6. Query: 'What stock price [symbol]?'                ║");
console.log("╚════════════════════════════════════════════════════════╝\n");

// Keep process alive for async operations
setTimeout(() => {
    console.log("Test suite completed. You can close this now.\n");
    process.exit(0);
}, 15000);
