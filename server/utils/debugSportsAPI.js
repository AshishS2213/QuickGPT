/**
 * 🏏 SPORTS API DEBUG UTILITY
 * Tests the Cricket APIs directly to see what data they return
 */

console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║              🏏 SPORTS API DEBUG UTILITY - Direct API Testing       ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

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

async function testCricketAPI() {
    console.log('1️⃣ Testing CricketAPI.com');
    console.log('─────────────────────────────────────────────────────────────────────────────');

    try {
        console.log('   Fetching: https://api.cricketapi.com/v1/matches?apikey=free&type=live,upcoming');
        const response = await fetchWithTimeout(
            'https://api.cricketapi.com/v1/matches?apikey=free&type=live,upcoming',
            5000
        );

        console.log(`   ✅ Response received!`);
        console.log(`   Total matches: ${response.data?.length || 0}`);

        if (response.data && response.data.length > 0) {
            console.log(`\n   First 3 matches:`)
            response.data.slice(0, 3).forEach((match, i) => {
                console.log(`\n   Match ${i + 1}:`);
                console.log(`     Name: ${match.name || match.matchName || 'N/A'}`);
                console.log(`     Date: ${match.date}`);
                console.log(`     DateTimeGMT: ${match.dateTimeGMT}`);
                console.log(`     DateTime: ${match.dateTime}`);
                console.log(`     Team1: ${match.team1 || 'N/A'}`);
                console.log(`     Team2: ${match.team2 || 'N/A'}`);
                console.log(`     Venue: ${match.venue || 'N/A'}`);
                console.log(`     Status: ${match.status || 'N/A'}`);
                console.log(`     Series: ${match.series || 'N/A'}`);
            });
        } else {
            console.log(`   ⚠️ No matches in response`);
        }
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
    }

    console.log('\n');
}

async function testCricAPI() {
    console.log('2️⃣ Testing CricAPI.com');
    console.log('─────────────────────────────────────────────────────────────────────────────');

    try {
        console.log('   Fetching: https://api.cricapi.com/v1/matches?apikey=free');
        const response = await fetchWithTimeout(
            'https://api.cricapi.com/v1/matches?apikey=free',
            5000
        );

        console.log(`   ✅ Response received!`);
        console.log(`   Total matches: ${response.data?.length || 0}`);

        if (response.data && response.data.length > 0) {
            console.log(`\n   First 3 matches:`)
            response.data.slice(0, 3).forEach((match, i) => {
                console.log(`\n   Match ${i + 1}:`);
                console.log(`     Name: ${match.name || match.matchName || 'N/A'}`);
                console.log(`     Date: ${match.date}`);
                console.log(`     DateTimeGMT: ${match.dateTimeGMT}`);
                console.log(`     DateTime: ${match.dateTime}`);
                console.log(`     Team1: ${match.team1 || 'N/A'}`);
                console.log(`     Team2: ${match.team2 || 'N/A'}`);
                console.log(`     Venue: ${match.venue || 'N/A'}`);
                console.log(`     Status: ${match.status || 'N/A'}`);
                console.log(`     Series: ${match.series || 'N/A'}`);
            });
        } else {
            console.log(`   ⚠️ No matches in response`);
        }
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
    }

    console.log('\n');
}

async function testDateParsing() {
    console.log('3️⃣ Testing Date Parsing');
    console.log('─────────────────────────────────────────────────────────────────────────────');

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    console.log(`   Today: ${today.toISOString().split('T')[0]}`);
    console.log(`   Range: ${todayStart.toISOString()} - ${todayEnd.toISOString()}`);

    const testDates = [
        {
            name: 'Now (should be today)',
            value: new Date().toISOString()
        },
        {
            name: 'Unix timestamp (seconds)',
            value: Math.floor(Date.now() / 1000)
        },
        {
            name: 'Unix timestamp (milliseconds)',
            value: Date.now()
        },
        {
            name: 'Tomorrow',
            value: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
            name: 'Yesterday',
            value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
    ];

    testDates.forEach(test => {
        let matchTime;
        try {
            if (typeof test.value === 'number') {
                matchTime = test.value < 10000000000 ? test.value * 1000 : test.value;
            } else {
                matchTime = new Date(test.value).getTime();
            }

            const isToday = matchTime >= todayStart.getTime() && matchTime <= todayEnd.getTime();
            const status = isToday ? '✅' : '❌';
            const dateObj = new Date(matchTime);

            console.log(`   ${status} ${test.name}`);
            console.log(`      Input: ${test.value}`);
            console.log(`      Parsed: ${dateObj.toISOString()}`);
            console.log(`      IsToday: ${isToday}`);
        } catch (e) {
            console.log(`   ❌ ${test.name}`);
            console.log(`      Error: ${e.message}`);
        }
    });

    console.log('\n');
}

// Run all tests
async function runTests() {
    try {
        await testCricketAPI();
        await testCricAPI();
        testDateParsing();

        console.log('╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║                       🔍 ANALYSIS & RECOMMENDATIONS                      ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

        console.log('If you see match data above:');
        console.log('  1. Check the date format (ISO string, Unix timestamp, etc.)');
        console.log('  2. Verify the date is being parsed correctly');
        console.log('  3. Check if today\'s matches are being filtered properly\n');

        console.log('If you see "0 matches for today":');
        console.log('  1. The API might not have today\'s matches (check the dates above)');
        console.log('  2. Our fallback should return tomorrow\'s or upcoming matches');
        console.log('  3. If still no results, the free APIs might be unavailable\n');

        console.log('Server logs:');
        console.log('  Check your server console for [Sports] debug messages');
        console.log('  These will show the first match structure and filtering results\n');

    } catch (error) {
        console.error('Fatal error:', error);
    }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests();
}

export { testCricketAPI, testCricAPI, testDateParsing };
