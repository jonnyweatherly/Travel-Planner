/**
 * Flight Price Fetcher Script
 *
 * This script fetches real flight prices from AviationStack API
 * and caches them locally for use in the Travel Planner app.
 *
 * Usage: node fetch-flights.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const API_KEY = process.env.AviationStack_API_KEY;
const LOCATIONS_FILE = path.join(__dirname, 'data', 'locations.json');
const OUTPUT_FILE = path.join(__dirname, 'data', 'flight-prices.json');
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Read home airport from localStorage equivalent (we'll use a config file)
const CONFIG_FILE = path.join(__dirname, 'data', 'flight-config.json');

/**
 * Get home airport from config file
 */
function getHomeAirport() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            return config.homeAirport;
        }
    } catch (error) {
        console.error('Error reading config file:', error.message);
    }
    return null;
}

/**
 * Fetch flight route information from AviationStack
 * Note: AviationStack's free tier provides flight routes but NOT real-time pricing
 * For actual prices, you'd need a different API like Skyscanner or Kiwi.com
 */
async function fetchFlightPrice(origin, destination) {
    return new Promise((resolve, reject) => {
        if (!origin || !destination) {
            resolve(null);
            return;
        }

        // AviationStack API endpoint for routes
        const url = `http://api.aviationstack.com/v1/routes?access_key=${API_KEY}&dep_iata=${origin}&arr_iata=${destination}`;

        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);

                    if (response.error) {
                        console.error(`API Error for ${origin}-${destination}:`, response.error);
                        resolve(null);
                        return;
                    }

                    // AviationStack doesn't provide pricing data
                    // We'll return route info if available, but note that we need a different API for prices
                    if (response.data && response.data.length > 0) {
                        resolve({
                            route: response.data[0],
                            note: 'AviationStack does not provide pricing data. Consider using Skyscanner or Kiwi.com API for actual prices.'
                        });
                    } else {
                        resolve(null);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Estimate flight cost based on continent (fallback method)
 * These are rough estimates in AUD
 */
function estimateFlightCostByContinent(continent, homeContinent = 'Oceania') {
    if (continent === homeContinent) return 400;

    const estimates = {
        'Asia': 800,
        'Europe': 1800,
        'North America': 1500,
        'South America': 2000,
        'Africa': 1600,
        'Oceania': 400
    };

    return estimates[continent] || 1200;
}

/**
 * Main function to fetch all flight prices
 */
async function fetchAllFlightPrices() {
    console.log('🛫 Starting flight price fetch...\n');

    // Check API key
    if (!API_KEY) {
        console.error('❌ Error: AviationStack_API_KEY not found in .env file');
        process.exit(1);
    }

    // Get home airport
    const homeAirport = getHomeAirport();
    if (!homeAirport) {
        console.log('⚠️  Warning: No home airport configured.');
        console.log('   Please set your home airport in the Settings page of the app.');
        console.log('   Using continent-based estimates only.\n');
    } else {
        console.log(`✈️  Home Airport: ${homeAirport}\n`);
    }

    // Read locations data
    let locations;
    try {
        const locationsData = fs.readFileSync(LOCATIONS_FILE, 'utf8');
        locations = JSON.parse(locationsData);
        console.log(`📍 Found ${locations.length} locations\n`);
    } catch (error) {
        console.error('❌ Error reading locations.json:', error.message);
        process.exit(1);
    }

    // Filter locations with valid airports
    const validLocations = locations.filter(loc =>
        loc.Airport &&
        loc.Airport.length === 3 &&
        loc.Location !== 'Work Trip'
    );

    console.log(`✓ ${validLocations.length} locations have valid airport codes\n`);
    console.log('⚠️  IMPORTANT NOTE:');
    console.log('   AviationStack API does NOT provide flight pricing data.');
    console.log('   This script will use continent-based estimates.');
    console.log('   For real prices, consider using Kiwi.com Tequila API or Skyscanner API.\n');
    console.log('─'.repeat(60));

    // Build flight prices cache
    const flightPrices = {};
    const timestamp = new Date().toISOString();

    for (let i = 0; i < validLocations.length; i++) {
        const location = validLocations[i];
        const destination = location.Airport;
        const locationName = location.Location || location.City;
        const continent = location.Continent;

        console.log(`[${i + 1}/${validLocations.length}] ${locationName} (${destination})...`);

        // Use continent-based estimate
        const estimatedPrice = estimateFlightCostByContinent(continent);

        flightPrices[destination] = {
            destination: destination,
            locationName: locationName,
            country: location.Country,
            continent: continent,
            price: estimatedPrice,
            currency: 'AUD',
            estimateType: 'continent-based',
            lastUpdated: timestamp
        };

        console.log(`   → Estimated: A$${estimatedPrice}`);

        // Small delay to avoid rate limiting (if we were making real API calls)
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Add metadata
    const output = {
        metadata: {
            homeAirport: homeAirport || 'Not configured',
            lastUpdated: timestamp,
            totalLocations: validLocations.length,
            expiresAt: new Date(Date.now() + CACHE_DURATION).toISOString(),
            apiUsed: 'AviationStack (estimates only)',
            note: 'AviationStack does not provide pricing. These are continent-based estimates. Consider using Kiwi.com or Skyscanner API for real prices.'
        },
        prices: flightPrices
    };

    // Save to file
    try {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log('\n' + '─'.repeat(60));
        console.log(`✅ Flight prices cached to: ${OUTPUT_FILE}`);
        console.log(`📅 Cache expires: ${output.metadata.expiresAt}`);
        console.log(`\n💡 To refresh prices, run: node fetch-flights.js`);
    } catch (error) {
        console.error('\n❌ Error writing cache file:', error.message);
        process.exit(1);
    }
}

// Run the script
fetchAllFlightPrices().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
