/**
 * Test Sports API Integration
 * Tests the new sports data fetching functionality
 */

import {
    detectQueryType,
    fetchSportsData,
    formatRealtimeDataForContext,
    fetchRealtimeDataIfNeeded
} from './smartRealtimeDataFetcher.js';

console.log('════════════════════════════════════════════════════════');
console.log('        TESTING SPORTS API INTEGRATION');
console.log('════════════════════════════════════════════════════════\n');

// Test 1: Query Type Detection
console.log('TEST 1: Query Type Detection');
console.log('─────────────────────────────');

const testQueries = [
    'todays ipl match',
    'what is today\'s cricket match',
    'ipl match schedule today',
    'upcoming cricket games',
    'football match today',
    'nba game today',
    'what is today\'s match',
    'cricket score update',
    'live match information'
];

for (const query of testQueries) {
    const types = detectQueryType(query);
    console.log(`✓ "${query}" → ${types.length > 0 ? types.join(', ') : 'NO DETECTION'}`);
}

console.log('\n');

// Test 2: Direct Sports Data Fetch
console.log('TEST 2: Fetch Sports Data');
console.log('─────────────────────────');

(async () => {
    try {
        console.log('Fetching sports data...\n');
        const sportsData = await fetchSportsData();

        console.log('✓ Sports Data Fetched Successfully');
        console.log(`  Type: ${sportsData.type}`);
        console.log(`  Sport: ${sportsData.sport}`);
        console.log(`  Source: ${sportsData.source}`);
        console.log(`  Matches found: ${sportsData.matches?.length || 0}`);

        if (sportsData.matches && sportsData.matches.length > 0) {
            console.log('\n  Matches:');
            sportsData.matches.forEach((match, idx) => {
                console.log(`    ${idx + 1}. ${match.name || 'N/A'}`);
                if (match.team1 && match.team2) {
                    console.log(`       ${match.team1} vs ${match.team2}`);
                }
                if (match.venue) {
                    console.log(`       Venue: ${match.venue}`);
                }
                if (match.status) {
                    console.log(`       Status: ${match.status}`);
                }
            });
        }

        console.log('\n');

        // Test 3: Format Data
        console.log('TEST 3: Format Sports Data for Context');
        console.log('─────────────────────────────────────');

        const formatted = formatRealtimeDataForContext([sportsData]);
        console.log(formatted);
        console.log('\n');

        // Test 4: Full End-to-End (with cache)
        console.log('TEST 4: Full End-to-End Query Processing');
        console.log('──────────────────────────────────────');

        const endToEndQueries = [
            'what is todays ipl match',
            'cricket match today',
            'show me upcoming sports matches'
        ];

        for (const query of endToEndQueries) {
            console.log(`\nQuery: "${query}"`);
            const result = await fetchRealtimeDataIfNeeded(query);

            console.log(`  ✓ Query Types: ${result.queryTypes.join(', ')}`);
            console.log(`  ✓ Success: ${result.success}`);
            console.log(`  ✓ Data Fetched: ${result.data.length} item(s)`);

            if (result.formatted) {
                console.log(`  ✓ Formatted Context Generated`);
                const lines = result.formatted.split('\n').length;
                console.log(`    (${lines} lines of formatted output)`);
            }
        }

        console.log('\n');
        console.log('════════════════════════════════════════════════════════');
        console.log('             ✅ ALL TESTS COMPLETED SUCCESSFULLY');
        console.log('════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ TEST FAILED:', error.message);
        console.error(error.stack);
    }
})();
