/**
 * Test Sports API Consistency
 * Ensures same query returns same results for the same date
 */

import { fetchRealtimeDataIfNeeded } from './smartRealtimeDataFetcher.js';
import { cacheManager } from './realtimeDataCache.js';

async function testConsistency() {
    const testQuery = "todays ipl match";

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🏏 SPORTS API CONSISTENCY TEST');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Query: "${testQuery}"`);
    console.log('Expected: Same match details (CSK vs RR or MI vs RCB - consistent)\n');

    // Clear cache to simulate fresh requests
    cacheManager.clear();

    try {
        // First request
        console.log('📍 Request #1 (Fresh):');
        const result1 = await fetchRealtimeDataIfNeeded(testQuery);
        console.log('Result:', JSON.stringify(result1, null, 2));

        const match1 = result1.data[0]?.matches?.[0];
        console.log('\nMatch Details:');
        console.log(`  Team1: ${match1?.team1}`);
        console.log(`  Team2: ${match1?.team2}`);
        console.log(`  Venue: ${match1?.venue}`);
        console.log(`  Status: ${match1?.status}`);
        console.log(`  Date: ${match1?.date}`);

        // Wait 2 seconds
        await new Promise(r => setTimeout(r, 2000));

        // Clear cache again
        cacheManager.clear();

        // Second request
        console.log('\n\n📍 Request #2 (Second Fresh):');
        const result2 = await fetchRealtimeDataIfNeeded(testQuery);
        console.log('Result:', JSON.stringify(result2, null, 2));

        const match2 = result2.data[0]?.matches?.[0];
        console.log('\nMatch Details:');
        console.log(`  Team1: ${match2?.team1}`);
        console.log(`  Team2: ${match2?.team2}`);
        console.log(`  Venue: ${match2?.venue}`);
        console.log(`  Status: ${match2?.status}`);
        console.log(`  Date: ${match2?.date}`);

        // Compare
        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('CONSISTENCY CHECK:');
        const isSame = match1?.team1 === match2?.team1 && match1?.team2 === match2?.team2;
        console.log(`✅ Same Match: ${isSame ? 'YES' : 'NO'}`);
        if (!isSame) {
            console.log(`  Request 1: ${match1?.team1} vs ${match1?.team2}`);
            console.log(`  Request 2: ${match2?.team1} vs ${match2?.team2}`);
        }

        console.log(`✅ Same Venue: ${match1?.venue === match2?.venue ? 'YES' : 'NO'}`);
        console.log(`✅ Same Date: ${match1?.date === match2?.date ? 'YES' : 'NO'}`);

        // Check if response has multiple matches
        console.log(`\n⚠️  Number of matches in response:`, result1.data[0]?.matches?.length);
        if (result1.data[0]?.matches?.length > 1) {
            console.log('  ❌ ISSUE: Multiple matches returned for same date!');
            result1.data[0].matches.forEach((m, i) => {
                console.log(`    Match ${i+1}: ${m.team1} vs ${m.team2}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
}

testConsistency();
