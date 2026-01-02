# Flight Price Integration

This document explains how to fetch and cache flight prices for the Travel Planner app.

## Overview

The Travel Planner now supports real flight price data through the AviationStack API. Flight prices are fetched separately via a Node.js script and cached locally, giving you full control over when to refresh the data.

## Important Note About AviationStack API

⚠️ **AviationStack's free tier does NOT provide flight pricing data.**

The AviationStack API provides flight routes, schedules, and airline information, but **not actual ticket prices**. The current implementation uses continent-based estimates as a fallback.

### For Real Flight Prices

If you need actual flight prices, consider using one of these alternatives:

1. **Kiwi.com Tequila API** (Recommended)
   - Provides real-time flight prices
   - Free tier available
   - Good documentation
   - URL: https://tequila.kiwi.com/

2. **Skyscanner Flight Search API**
   - Comprehensive flight data with pricing
   - Requires approval for access
   - URL: https://developers.skyscanner.net/

3. **Amadeus Flight Offers Search**
   - Professional-grade flight API
   - Free tier available
   - URL: https://developers.amadeus.com/

## Setup

### 1. Install Dependencies

The fetch script requires Node.js and the `dotenv` package:

```bash
npm install dotenv
```

### 2. Configure Home Airport

Before fetching flight prices, set your home airport in the app:

1. Open the Travel Planner in your browser
2. Navigate to the Settings page (⚙️ icon in sidebar)
3. Enter your home airport IATA code (e.g., SYD, LAX, LHR)
4. Click "Save Settings"

The home airport is stored in the browser's localStorage and will be read by the fetch script.

## Usage

### Fetching Flight Prices

Run the fetch script to update flight prices:

```bash
node fetch-flights.js
```

The script will:
- Read your home airport from the app settings
- Load all destinations from `data/locations.json`
- Generate continent-based estimates for each location
- Cache results to `data/flight-prices.json`

### Output

The script provides detailed console output:

```
🛫 Starting flight price fetch...

✈️  Home Airport: SYD

📍 Found 150 locations

✓ 120 locations have valid airport codes

⚠️  IMPORTANT NOTE:
   AviationStack API does NOT provide flight pricing data.
   This script will use continent-based estimates.
   For real prices, consider using Kiwi.com Tequila API or Skyscanner API.

────────────────────────────────────────────────────────────
[1/120] Tokyo (NRT)...
   → Estimated: A$800
[2/120] Bali (DPS)...
   → Estimated: A$800
...
────────────────────────────────────────────────────────────
✅ Flight prices cached to: data/flight-prices.json
📅 Cache expires: 2026-01-10T12:00:00.000Z

💡 To refresh prices, run: node fetch-flights.js
```

### Cached Data Format

The `data/flight-prices.json` file contains:

```json
{
  "metadata": {
    "homeAirport": "SYD",
    "lastUpdated": "2026-01-03T12:00:00.000Z",
    "totalLocations": 120,
    "expiresAt": "2026-01-10T12:00:00.000Z",
    "apiUsed": "AviationStack (estimates only)",
    "note": "AviationStack does not provide pricing. These are continent-based estimates."
  },
  "prices": {
    "NRT": {
      "destination": "NRT",
      "locationName": "Tokyo",
      "country": "Japan",
      "continent": "Asia",
      "price": 800,
      "currency": "AUD",
      "estimateType": "continent-based",
      "lastUpdated": "2026-01-03T12:00:00.000Z"
    }
  }
}
```

## How It Works

### In the App

1. When the app loads, it attempts to fetch `data/flight-prices.json`
2. If the file exists, cached prices are loaded into `STATE.flightPrices`
3. When rendering location cards, the app calls `estimateFlightCost(continent, airport)`
4. The function checks for cached prices by airport code first
5. If no cached price exists, it falls back to continent-based estimates

### Continent-Based Estimates (Fallback)

When cached data is not available or for airports without data:

| Continent       | Estimate (AUD) |
|----------------|----------------|
| Oceania        | $400          |
| Asia           | $800          |
| Europe         | $1,800        |
| North America  | $1,500        |
| South America  | $2,000        |
| Africa         | $1,600        |
| Other          | $1,200        |

These are rough estimates for return economy flights from Oceania.

## Refresh Schedule

The cached flight prices expire after **7 days** by default. You can manually refresh at any time by running:

```bash
node fetch-flights.js
```

There is no automatic refresh to avoid unexpected API usage and costs.

## Upgrading to Real Flight Prices

To upgrade to a real flight price API (e.g., Kiwi.com):

1. Sign up for API access at https://tequila.kiwi.com/
2. Add your API key to `.env`:
   ```
   KIWI_API_KEY=your_api_key_here
   ```
3. Update `fetch-flights.js` to use the Kiwi.com API endpoints
4. Modify the `fetchFlightPrice()` function to call the new API
5. Update the data structure if needed

### Example Kiwi.com API Call

```javascript
const url = `https://api.tequila.kiwi.com/v2/search?fly_from=${origin}&fly_to=${destination}&date_from=${dateFrom}&date_to=${dateTo}&partner=picky`;

const response = await fetch(url, {
    headers: {
        'apikey': process.env.KIWI_API_KEY
    }
});

const data = await response.json();
const price = data.data[0]?.price || null;
```

## Troubleshooting

### "No home airport configured" Warning

**Solution**: Set your home airport in the app's Settings page before running the script.

### "Error reading locations.json"

**Solution**: Ensure `data/locations.json` exists and contains valid JSON data.

### Flight Prices Not Showing in App

**Possible causes**:
1. No cached data file exists - run `node fetch-flights.js`
2. Home airport not set in app settings
3. Location doesn't have a valid airport code
4. Browser cache - try hard refresh (Ctrl+Shift+R)

**Solution**: Check browser console for messages like "Flight prices loaded" or "Flight prices not available".

## File Structure

```
Travel-Planner/
├── fetch-flights.js           # Script to fetch flight prices
├── data/
│   ├── locations.json         # Location data (input)
│   └── flight-prices.json     # Cached flight prices (generated)
├── app.js                     # Main app (reads cached prices)
└── .env                       # API keys (not committed to git)
```

## API Rate Limits

AviationStack free tier limits:
- 100 API calls per month
- 1 request per second

Since we're using estimates, the script doesn't make actual API calls currently. When upgrading to a real price API, be mindful of rate limits and costs.

## Future Enhancements

Potential improvements:
- [ ] Switch to Kiwi.com or Skyscanner API for real prices
- [ ] Add date-based pricing (peak vs off-peak seasons)
- [ ] Support multiple home airports
- [ ] Implement automatic refresh with configurable interval
- [ ] Add flight duration and stops information
- [ ] Cache multiple price points (budget, standard, premium)
