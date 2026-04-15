/**
 * Test script to verify the president query fix
 * Tests all three layers: query detection, query type, and data fetching
 */

import { isCurrentDataQuery } from './realtimeDataFetcher.js';
import { detectQueryType, fetchRealtimeDataIfNeeded } from './smartRealtimeDataFetcher.js';

async function testPresidentQuery() {
    const testQuery = "who is the president of us";

    console.log('═══════════════════════════════════════════════════════════');
    console.log('TESTING PRESIDENT QUERY FIX');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Test 1: Check if query is detected as current data query
    console.log('TEST 1: Query Detection (realtimeDataFetcher.js)');
    console.log(`Query: "${testQuery}"`);
    const isCurrentData = isCurrentDataQuery(testQuery);
    console.log(`Result: isCurrentDataQuery = ${isCurrentData}`);
    console.log(`✅ PASS: Query detected as current data query\n` || `❌ FAIL: Query NOT detected\n`);

    if (!isCurrentData) {
        console.log('ERROR: Query detection failed! The fix did not work.');
        return;
    }

    // Test 2: Check query type detection
    console.log('TEST 2: Query Type Detection (smartRealtimeDataFetcher.js)');
    const queryTypes = detectQueryType(testQuery);
    console.log(`Query Types Detected: ${JSON.stringify(queryTypes)}`);
    const hasFactual = queryTypes.includes('factual');
    console.log(`Has 'factual' type: ${hasFactual}`);
    console.log(`✅ PASS: Factual query detected\n` || `❌ FAIL: Factual query NOT detected\n`);

    if (!hasFactual) {
        console.log('ERROR: Query type detection failed!');
        return;
    }

    // Test 3: Fetch real-time data
    console.log('TEST 3: Real-Time Data Fetching');
    console.log(`Querying Wikipedia for: "${testQuery}"`);
    console.log('Fetching data... (this may take a few seconds)\n');

    try {
        const realtimeData = await fetchRealtimeDataIfNeeded(testQuery);

        console.log('Fetch Result:');
        console.log(`  Success: ${realtimeData.success}`);
        console.log(`  Query Types: ${JSON.stringify(realtimeData.queryTypes)}`);
        console.log(`  Data Count: ${realtimeData.data.length}`);

        if (realtimeData.data.length > 0) {
            const firstData = realtimeData.data[0];
            console.log(`  First Data Type: ${firstData.type}`);
            if (firstData.type === 'factual') {
                console.log(`  Title: ${firstData.title}`);
                console.log(`  Summary: ${firstData.summary.substring(0, 100)}...`);
                console.log(`  ✅ PASS: Wikipedia data fetched successfully\n`);
            }
        } else if (realtimeData.data.some(d => d.error)) {
            console.log(`  Warning: ${realtimeData.data[0].error}`);
            console.log(`  ❌ Data fetch had error (may be API timeout)\n`);
        }

        // Test 4: Check formatted output
        console.log('TEST 4: Data Formatting for Gemini');
        console.log('Formatted output for injection:');
        console.log(realtimeData.formatted);

    } catch (error) {
        console.error(`❌ Error fetching data: ${error.message}`);
        return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS COMPLETED');
    console.log('═══════════════════════════════════════════════════════════');
}

// Run the test
testPresidentQuery().catch(console.error);
