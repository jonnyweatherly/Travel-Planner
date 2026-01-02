const STATE = {
    locations: [],
    seasons: [],
    timeline: [],
    flightPrices: null,
    selectedMonth: 'Jan',
    filters: {
        sport: 'all',
        region: 'all',
        countries: [],
        season: 'all',
        visaRegion: 'all',
        search: '',
        minWeeklyCost: null,
        maxWeeklyCost: null,
        minFoodCost: null,
        maxFoodCost: null
    }
};

// Config mapping for column names based on observed data
const COL_MAP = {
    loc: {
        name: 'Location',
        country: 'Country',
        continent: 'Continent',
        city: 'City',
        airport: 'Airport',
        schengen: 'Shengen',
        sport: 'Sport',
        tags: 'Tags',
        currency: 'Money',
        weeklyCost: 'WeekTotalAUD',
        foodCost: 'Food',
        rentCost: 'RentLongTerm'
    },
    season: {
        location: 'Location',
        month: 'Month',
        quality: 'Quality'
    },
    timeline: {
        date: 'WeekDate',
        month: 'Month',
        year: '/',
        location: 'Location',
        cost: 'WeekTotal'
    }
};

async function init() {
    console.log('Initializing App...');

    try {
        // Parallel Fetch
        const [locRes, seasRes, timeRes, flightRes] = await Promise.all([
            fetch('data/locations.json'),
            fetch('data/seasons.json'),
            fetch('data/timeline.json'),
            fetch('data/flight-prices.json').catch(() => null) // Optional - don't fail if not present
        ]);

        if (!locRes.ok || !seasRes.ok || !timeRes.ok) {
            throw new Error('Failed to load one or more data files.');
        }

        STATE.locations = await locRes.json();
        STATE.seasons = await seasRes.json();
        STATE.timeline = await timeRes.json();

        // Load flight prices if available
        if (flightRes && flightRes.ok) {
            STATE.flightPrices = await flightRes.json();
            console.log('Flight prices loaded:', STATE.flightPrices.metadata);
        } else {
            console.log('Flight prices not available - using estimates');
        }

        console.log('Data Loaded:', STATE);

        populateFilters();
        renderLocations();

    } catch (error) {
        console.error('Error loading data:', error);
        document.querySelector('.content-area').innerHTML = `<div class="loading-spinner" style="color:red">Error loading data. Run python script first.</div>`;
    }
}

// Helper function to determine visa region from country and schengen flag
function getVisaRegion(country, schengenFlag) {
    if (!country || country === 'Anywhere') return null;

    // Schengen Area
    if (schengenFlag === 1 || schengenFlag === '1') return 'Schengen Area';

    // Australia
    if (country === 'Australia') return 'Australia';

    // New Zealand
    if (country === 'New Zealand') return 'New Zealand';

    // United Kingdom (post-Brexit, separate from Schengen)
    if (country === 'United Kingdom' || country === 'UK') return 'United Kingdom';

    // Thailand
    if (country === 'Thailand') return 'Thailand';

    // Indonesia
    if (country === 'Indonesia') return 'Indonesia';

    // Philippines
    if (country === 'Philippines') return 'Philippines';

    // For other countries, return the country name as the visa region
    return country;
}

function populateFilters() {
    // Unique Sports, Continents, Countries, Seasons, and Visa Regions
    const sports = new Set();
    const continents = new Set();
    const countries = new Set();
    const seasonQualities = new Set();
    const visaRegions = new Set();

    STATE.locations.forEach(row => {
        if (row[COL_MAP.loc.sport]) sports.add(row[COL_MAP.loc.sport]);
        if (row[COL_MAP.loc.continent]) continents.add(row[COL_MAP.loc.continent]);
        if (row[COL_MAP.loc.country]) countries.add(row[COL_MAP.loc.country]);

        // Get visa region for this location
        const visaRegion = getVisaRegion(row[COL_MAP.loc.country], row[COL_MAP.loc.schengen]);
        if (visaRegion) visaRegions.add(visaRegion);
    });

    // Collect unique season qualities from all months
    STATE.seasons.forEach(season => {
        const quality = season[COL_MAP.season.quality];
        if (quality && quality !== '') seasonQualities.add(quality);
    });

    const sportSelect = document.getElementById('sport-filter');
    sports.forEach(s => {
        if (!s) return;
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        sportSelect.appendChild(opt);
    });

    const regionSelect = document.getElementById('region-filter');
    continents.forEach(c => {
        if (!c) return;
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        regionSelect.appendChild(opt);
    });

    // Populate country multi-select
    const countrySelect = document.getElementById('country-filter');
    Array.from(countries).sort().forEach(c => {
        if (!c) return;
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        countrySelect.appendChild(opt);
    });

    // Populate season filter
    const seasonSelect = document.getElementById('season-filter');
    Array.from(seasonQualities).sort().forEach(quality => {
        const opt = document.createElement('option');
        opt.value = quality;
        opt.textContent = quality;
        seasonSelect.appendChild(opt);
    });

    // Populate visa region filter
    const visaSelect = document.getElementById('visa-filter');
    Array.from(visaRegions).sort().forEach(region => {
        const opt = document.createElement('option');
        opt.value = region;
        opt.textContent = region;
        visaSelect.appendChild(opt);
    });
}

// Helper function to parse currency string to number (e.g., "$1,234" -> 1234)
function parseCurrency(value) {
    if (!value || value === '') return null;
    const cleaned = value.toString().replace(/[$,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

// Helper function to get currency symbol from currency code
function getCurrencySymbol(currencyCode) {
    const symbols = {
        'AUD': 'A$',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'CAD': 'C$',
        'NZD': 'NZ$',
        'CHF': 'CHF',
        'SEK': 'kr',
        'NOK': 'kr',
        'DKK': 'kr',
        'THB': '฿',
        'SGD': 'S$',
        'HKD': 'HK$',
        'INR': '₹',
        'MXN': 'Mex$',
        'BRL': 'R$',
        'ZAR': 'R',
        'KRW': '₩',
        'TRY': '₺',
        'RUB': '₽',
        'PLN': 'zł',
        'CZK': 'Kč',
        'HUF': 'Ft',
        'IDR': 'Rp',
        'MYR': 'RM',
        'PHP': '₱',
        'VND': '₫',
        'AED': 'AED',
        'SAR': 'SAR',
        'ILS': '₪',
        'EGP': 'E£',
        'CLP': 'CLP$',
        'COP': 'COL$',
        'PEN': 'S/',
        'ARS': 'AR$'
    };
    return symbols[currencyCode] || currencyCode;
}

// Helper function to format numbers with thousand separators
function formatWithCommas(num) {
    if (!num && num !== 0) return '';
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Helper function to convert currency to AUD (approximate rates as of January 2025)
function convertToAUD(amount, fromCurrency) {
    if (!amount || !fromCurrency) return amount;

    // Exchange rates to AUD (1 unit of foreign currency = X AUD)
    const rates = {
        'AUD': 1.0,
        'USD': 1.52,      // 1 USD = 1.52 AUD
        'EUR': 1.65,      // 1 EUR = 1.65 AUD
        'GBP': 1.95,      // 1 GBP = 1.95 AUD
        'JPY': 0.0103,    // 1 JPY = 0.0103 AUD
        'CNY': 0.21,      // 1 CNY = 0.21 AUD
        'CAD': 1.09,      // 1 CAD = 1.09 AUD
        'NZD': 0.91,      // 1 NZD = 0.91 AUD
        'CHF': 1.73,      // 1 CHF = 1.73 AUD
        'SEK': 0.15,      // 1 SEK = 0.15 AUD
        'NOK': 0.14,      // 1 NOK = 0.14 AUD
        'DKK': 0.22,      // 1 DKK = 0.22 AUD
        'THB': 0.045,     // 1 THB = 0.045 AUD
        'SGD': 1.14,      // 1 SGD = 1.14 AUD
        'HKD': 0.19,      // 1 HKD = 0.19 AUD
        'INR': 0.018,     // 1 INR = 0.018 AUD
        'MXN': 0.075,     // 1 MXN = 0.075 AUD
        'BRL': 0.25,      // 1 BRL = 0.25 AUD
        'ZAR': 0.084,     // 1 ZAR = 0.084 AUD
        'KRW': 0.0011,    // 1 KRW = 0.0011 AUD
        'TRY': 0.044,     // 1 TRY = 0.044 AUD
        'RUB': 0.015,     // 1 RUB = 0.015 AUD
        'PLN': 0.38,      // 1 PLN = 0.38 AUD
        'CZK': 0.065,     // 1 CZK = 0.065 AUD
        'HUF': 0.0042,    // 1 HUF = 0.0042 AUD
        'IDR': 0.000095,  // 1 IDR = 0.000095 AUD
        'MYR': 0.34,      // 1 MYR = 0.34 AUD
        'PHP': 0.026,     // 1 PHP = 0.026 AUD
        'VND': 0.000060,  // 1 VND = 0.000060 AUD
        'AED': 0.41,      // 1 AED = 0.41 AUD
        'SAR': 0.40,      // 1 SAR = 0.40 AUD
        'ILS': 0.42,      // 1 ILS = 0.42 AUD
        'EGP': 0.030,     // 1 EGP = 0.030 AUD
        'CLP': 0.0016,    // 1 CLP = 0.0016 AUD
        'COP': 0.00037,   // 1 COP = 0.00037 AUD
        'PEN': 0.40,      // 1 PEN = 0.40 AUD
        'ARS': 0.0015     // 1 ARS = 0.0015 AUD
    };

    const rate = rates[fromCurrency] || 1.0;
    return amount * rate;
}

// Estimate flight cost based on cached data or continent estimates
function estimateFlightCost(toContinent, destinationAirport) {
    // If no home airport is set, return null
    const homeAirport = localStorage.getItem('homeAirport');
    if (!homeAirport) return null;

    // Try to use cached flight prices first
    if (STATE.flightPrices && STATE.flightPrices.prices && destinationAirport) {
        const cachedPrice = STATE.flightPrices.prices[destinationAirport];
        if (cachedPrice && cachedPrice.price) {
            return cachedPrice.price;
        }
    }

    // Fallback to continent-based estimates
    const assumedHomeContinent = 'Oceania';

    // Same continent or nearby
    if (toContinent === assumedHomeContinent) return 400;
    if (toContinent === 'Oceania') return 400;

    // Flight cost estimates (return flight, economy, rough averages in AUD)
    const estimates = {
        'Asia': 800,
        'Europe': 1800,
        'North America': 1500,
        'South America': 2000,
        'Africa': 1600,
        'Oceania': 400
    };

    return estimates[toContinent] || 1200;
}

// Centralized function to get current filter values from DOM
function updateFiltersFromDOM() {
    STATE.filters.sport = document.getElementById('sport-filter').value;
    STATE.filters.region = document.getElementById('region-filter').value;
    STATE.filters.season = document.getElementById('season-filter').value;
    STATE.filters.visaRegion = document.getElementById('visa-filter').value;
    STATE.filters.search = document.getElementById('search-input').value.toLowerCase();

    // Get selected countries from multi-select
    const countrySelect = document.getElementById('country-filter');
    STATE.filters.countries = Array.from(countrySelect.selectedOptions).map(opt => opt.value);

    // Cost range filters
    const minWeekly = document.getElementById('min-weekly-cost').value;
    const maxWeekly = document.getElementById('max-weekly-cost').value;
    const minFood = document.getElementById('min-food-cost').value;
    const maxFood = document.getElementById('max-food-cost').value;

    STATE.filters.minWeeklyCost = minWeekly ? parseFloat(minWeekly) : null;
    STATE.filters.maxWeeklyCost = maxWeekly ? parseFloat(maxWeekly) : null;
    STATE.filters.minFoodCost = minFood ? parseFloat(minFood) : null;
    STATE.filters.maxFoodCost = maxFood ? parseFloat(maxFood) : null;
}

// Centralized filter logic that can be applied to any location-based data
function applyLocationFilters(items, locationField = COL_MAP.loc.name, countryField = COL_MAP.loc.country, continentField = COL_MAP.loc.continent, sportField = COL_MAP.loc.sport, weeklyCostField = COL_MAP.loc.weeklyCost, foodCostField = COL_MAP.loc.foodCost, schengenField = COL_MAP.loc.schengen) {
    return items.filter(item => {
        const sport = item[sportField] || '';
        const country = item[countryField] || '';
        const continent = item[continentField] || '';
        const location = item[locationField] || '';
        const schengen = item[schengenField];

        // Text/Category filters
        if (STATE.filters.sport !== 'all' && sport !== STATE.filters.sport) return false;
        if (STATE.filters.region !== 'all' && continent !== STATE.filters.region) return false;
        if (STATE.filters.countries.length > 0 && !STATE.filters.countries.includes(country)) return false;
        if (STATE.filters.search && !location.toLowerCase().includes(STATE.filters.search) && !country.toLowerCase().includes(STATE.filters.search)) return false;

        // Visa region filter
        if (STATE.filters.visaRegion !== 'all') {
            const visaRegion = getVisaRegion(country, schengen);
            if (visaRegion !== STATE.filters.visaRegion) return false;
        }

        // Season quality filter
        if (STATE.filters.season !== 'all') {
            const seasonData = STATE.seasons.find(s =>
                s[COL_MAP.season.location] === location &&
                (s[COL_MAP.season.month] || '').includes(STATE.selectedMonth)
            );
            const seasonQuality = seasonData ? seasonData[COL_MAP.season.quality] : null;
            if (seasonQuality !== STATE.filters.season) return false;
        }

        // Cost range filters
        const weeklyCost = parseCurrency(item[weeklyCostField]);
        const foodCost = parseCurrency(item[foodCostField]);

        if (STATE.filters.minWeeklyCost !== null && weeklyCost !== null && weeklyCost < STATE.filters.minWeeklyCost) return false;
        if (STATE.filters.maxWeeklyCost !== null && weeklyCost !== null && weeklyCost > STATE.filters.maxWeeklyCost) return false;
        if (STATE.filters.minFoodCost !== null && foodCost !== null && foodCost < STATE.filters.minFoodCost) return false;
        if (STATE.filters.maxFoodCost !== null && foodCost !== null && foodCost > STATE.filters.maxFoodCost) return false;

        return true;
    });
}

function renderLocations() {
    updateFiltersFromDOM();

    const grid = document.getElementById('locations-grid');
    grid.innerHTML = '';

    let filtered = applyLocationFilters(STATE.locations);

    // Count visits and track first/last visited date for each location from timeline (excluding future dates)
    const visitCounts = {};
    const firstVisited = {};
    const lastVisited = {};
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    STATE.timeline.forEach(entry => {
        const loc = entry[COL_MAP.timeline.location];
        const yearValue = entry[COL_MAP.timeline.year];
        const monthName = entry[COL_MAP.timeline.month];

        if (!loc || !yearValue) return;

        // Parse year (it's stored as a float like 2022.0)
        const entryYear = Math.floor(parseFloat(yearValue));

        // Convert month name to month index (0-11)
        const monthMap = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3,
            'May': 4, 'June': 5, 'July': 6, 'August': 7,
            'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        const entryMonth = monthMap[monthName];

        // Only count if the date is in the past
        if (entryYear < currentYear || (entryYear === currentYear && entryMonth <= currentMonth)) {
            visitCounts[loc] = (visitCounts[loc] || 0) + 1;

            const visitDate = new Date(entryYear, entryMonth, 1);

            // Track first visited date
            if (!firstVisited[loc] || visitDate < firstVisited[loc]) {
                firstVisited[loc] = visitDate;
            }

            // Track last visited date
            if (!lastVisited[loc] || visitDate > lastVisited[loc]) {
                lastVisited[loc] = visitDate;
            }
        }
    });

    // Get sort preferences
    const sortValue = document.getElementById('sort-select').value;
    const secondarySortValue = document.getElementById('sort-select-secondary')?.value || 'none';

    // Define season quality ranking (best to worst)
    const seasonRanking = {
        'good': 1,
        'green season': 1,
        'spring': 2,
        'summer': 3,
        'autumn': 4,
        'fall': 4,
        'winter': 5,
        'cold': 5,
        'monsoon': 6,
        'hurricane': 6,
        'storm': 6,
        'closed': 7,
        'unknown': 8
    };

    // Helper function to get sort value for an item
    const getSortValue = (item, sortKey) => {
        if (sortKey === 'none') return null;

        const parts = sortKey.split('-');
        const sortBy = parts.slice(0, -1).join('-');
        const sortOrder = parts[parts.length - 1];
        const itemName = item[COL_MAP.loc.name];

        let value;
        switch (sortBy) {
            case 'name':
                value = (itemName || '').toLowerCase();
                break;
            case 'cost':
                value = parseCurrency(item[COL_MAP.loc.weeklyCost]) || 0;
                break;
            case 'visits':
                value = visitCounts[itemName] || 0;
                break;
            case 'food':
                value = parseCurrency(item[COL_MAP.loc.foodCost]) || 0;
                break;
            case 'first-visit':
                value = firstVisited[itemName] ? firstVisited[itemName].getTime() : Infinity;
                break;
            case 'last-visit':
                value = lastVisited[itemName] ? lastVisited[itemName].getTime() : 0;
                break;
            case 'season':
                const seasonData = STATE.seasons.find(s =>
                    s[COL_MAP.season.location] === itemName &&
                    (s[COL_MAP.season.month] || '').includes(STATE.selectedMonth)
                );
                const quality = (seasonData ? seasonData[COL_MAP.season.quality] : 'unknown').toLowerCase();
                let rank = 8;
                for (const [key, r] of Object.entries(seasonRanking)) {
                    if (quality.includes(key)) rank = Math.min(rank, r);
                }
                value = rank;
                break;
            default:
                value = 0;
        }

        return { value, order: sortOrder };
    };

    // Sort the filtered results with multi-level sorting
    filtered.sort((a, b) => {
        // Primary sort
        const aPrimary = getSortValue(a, sortValue);
        const bPrimary = getSortValue(b, sortValue);

        let result = 0;
        if (typeof aPrimary.value === 'number') {
            result = aPrimary.order === 'asc' ? aPrimary.value - bPrimary.value : bPrimary.value - aPrimary.value;
        } else {
            if (aPrimary.value < bPrimary.value) result = aPrimary.order === 'asc' ? -1 : 1;
            else if (aPrimary.value > bPrimary.value) result = aPrimary.order === 'asc' ? 1 : -1;
        }

        // If primary sort values are equal and secondary sort is set, use secondary sort
        if (result === 0 && secondarySortValue !== 'none') {
            const aSecondary = getSortValue(a, secondarySortValue);
            const bSecondary = getSortValue(b, secondarySortValue);

            if (typeof aSecondary.value === 'number') {
                result = aSecondary.order === 'asc' ? aSecondary.value - bSecondary.value : bSecondary.value - aSecondary.value;
            } else {
                if (aSecondary.value < bSecondary.value) result = aSecondary.order === 'asc' ? -1 : 1;
                else if (aSecondary.value > bSecondary.value) result = aSecondary.order === 'asc' ? 1 : -1;
            }
        }

        return result;
    });

    filtered.forEach(item => {
        const name = item[COL_MAP.loc.name] || 'Unknown';
        const country = item[COL_MAP.loc.country] || '';
        const continent = item[COL_MAP.loc.continent] || '';
        const airport = item[COL_MAP.loc.airport] || '';
        const schengen = item[COL_MAP.loc.schengen];
        const sport = item[COL_MAP.loc.sport];
        const tags = item[COL_MAP.loc.tags];
        const currency = item[COL_MAP.loc.currency] || '';
        const currencySymbol = getCurrencySymbol(currency);
        const weeklyCost = item[COL_MAP.loc.weeklyCost] || '';
        const foodCost = item[COL_MAP.loc.foodCost] || '';
        const rentCost = item[COL_MAP.loc.rentCost] || '';
        const visits = visitCounts[name] || 0;
        const visaRegion = getVisaRegion(country, schengen);

        // Look up season data for current selected month
        const seasonData = STATE.seasons.find(s =>
            s[COL_MAP.season.location] === name &&
            (s[COL_MAP.season.month] || '').includes(STATE.selectedMonth)
        );
        const seasonQuality = seasonData ? seasonData[COL_MAP.season.quality] : null;

        // Determine season color class
        let seasonColorClass = '';
        let seasonStatusText = '';
        if (seasonQuality) {
            const q = seasonQuality.toLowerCase();
            seasonStatusText = seasonQuality;

            if (q.includes('summer')) {
                seasonColorClass = 'summer';
            } else if (q.includes('spring')) {
                seasonColorClass = 'spring';
            } else if (q.includes('autumn') || q.includes('fall')) {
                seasonColorClass = 'autumn';
            } else if (q.includes('winter') || q.includes('cold')) {
                seasonColorClass = 'winter';
            } else if (q.includes('monsoon') || q.includes('hurricane') || q.includes('storm')) {
                seasonColorClass = 'danger';
            } else if (q.includes('good') || q.includes('green')) {
                seasonColorClass = 'good';
            } else if (q === 'closed' || q === '') {
                seasonColorClass = 'closed';
            } else {
                seasonColorClass = 'info';
            }
        }

        // Convert weekly cost to AUD with comma formatting
        const weeklyCostNum = parseCurrency(weeklyCost);
        const weeklyCostAUD = weeklyCostNum ? convertToAUD(weeklyCostNum, currency) : null;
        const weeklyCostDisplay = weeklyCostAUD ?
            (currency === 'AUD' ? `A$${formatWithCommas(weeklyCostAUD)}` : `${currencySymbol}${formatWithCommas(weeklyCostNum)} (A$${formatWithCommas(weeklyCostAUD)})`) : '';

        // Food column already contains monthly value - convert to AUD with comma formatting
        const foodCostNum = parseCurrency(foodCost);
        const foodCostAUD = foodCostNum ? convertToAUD(foodCostNum, currency) : null;
        const monthlyFoodCost = foodCostAUD ?
            (currency === 'AUD' ? `A$${formatWithCommas(foodCostAUD)}` : `${currencySymbol}${formatWithCommas(foodCostNum)} (A$${formatWithCommas(foodCostAUD)})`) : '';

        // Rent cost per month - convert to AUD with comma formatting
        const rentCostNum = parseCurrency(rentCost);
        const rentCostAUD = rentCostNum ? convertToAUD(rentCostNum, currency) : null;
        const monthlyRentCost = rentCostAUD ?
            (currency === 'AUD' ? `A$${formatWithCommas(rentCostAUD)}` : `${currencySymbol}${formatWithCommas(rentCostNum)} (A$${formatWithCommas(rentCostAUD)})`) : '';

        // Format last visited date
        let lastVisitedDisplay = '';
        if (lastVisited[name]) {
            const date = lastVisited[name];
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            lastVisitedDisplay = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        }

        // Estimate flight cost
        const flightEstimate = estimateFlightCost(continent, airport);
        const flightCostDisplay = flightEstimate ? `A$${formatWithCommas(flightEstimate)}` : null;

        let tagsHtml = '';
        if (sport) tagsHtml += `<span class="tag sport">${sport}</span>`;
        if (tags && tags.includes('Cheap')) tagsHtml += `<span class="tag cheap">Budget</span>`;
        if (seasonStatusText) tagsHtml += `<span class="tag status-tag">${seasonStatusText}</span>`;
        if (visaRegion) tagsHtml += `<span class="tag visa-tag">📋 ${visaRegion}</span>`;

        const card = document.createElement('div');
        card.className = seasonColorClass ? `card status-${seasonColorClass}` : 'card';
        card.style.cursor = 'pointer';
        card.onclick = () => {
            window.location.href = `location.html?name=${encodeURIComponent(name)}`;
        };

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">${name}</div>
                    <div class="card-subtitle">${country}</div>
                </div>
                ${weeklyCostDisplay ? `<div class="card-cost">${weeklyCostDisplay}/wk</div>` : ''}
            </div>
            <div class="card-body">
                ${currency ? `<div class="card-info">Currency: ${currency}</div>` : ''}
                ${flightCostDisplay ? `<div class="card-info">✈️ Flight: ~${flightCostDisplay}</div>` : ''}
                ${monthlyRentCost ? `<div class="card-info">Rent: ${monthlyRentCost}/mo</div>` : ''}
                ${monthlyFoodCost ? `<div class="card-info">Food: ${monthlyFoodCost}/mo</div>` : ''}
                ${visits > 0 ? `<div class="card-info visits">🏖️ ${visits} visit${visits > 1 ? 's' : ''}</div>` : ''}
                ${lastVisitedDisplay ? `<div class="card-info">Last visited: ${lastVisitedDisplay}</div>` : ''}
            </div>
            <div class="card-footer">
                ${tagsHtml || '<span class="tag">Explore</span>'}
            </div>
        `;
        grid.appendChild(card);
    });
}

// Month selection function
function selectMonth(month) {
    STATE.selectedMonth = month;

    // Update active button
    document.querySelectorAll('.month-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.month === month) {
            btn.classList.add('active');
        }
    });

    // Re-render both locations and seasons to show updated season data
    renderLocations();
    renderSeasons();
}

function renderSeasons() {
    updateFiltersFromDOM();

    const grid = document.getElementById('seasons-grid');
    grid.innerHTML = '';

    const selectedMonth = STATE.selectedMonth;

    // First filter by selected month
    let filtered = STATE.seasons.filter(item => {
        if (item['Location'] === 'Location') return false;
        const m = item['Month'] || '';
        return m.includes(selectedMonth);
    });

    // Then apply location-based filters
    // We need to match seasons data against locations data to get Sport, Country, Tags
    filtered = filtered.filter(seasonItem => {
        const locationName = seasonItem['Location'] || '';

        // Find matching location in STATE.locations
        const matchingLocation = STATE.locations.find(loc =>
            (loc[COL_MAP.loc.name] || '') === locationName
        );

        if (!matchingLocation) return true; // If no match found, include it (can't filter)

        // Apply filters using the matched location data
        const sport = matchingLocation[COL_MAP.loc.sport] || '';
        const country = matchingLocation[COL_MAP.loc.country] || '';
        const continent = matchingLocation[COL_MAP.loc.continent] || '';

        // Text/Category filters
        if (STATE.filters.sport !== 'all' && sport !== STATE.filters.sport) return false;
        if (STATE.filters.region !== 'all' && continent !== STATE.filters.region) return false;
        if (STATE.filters.countries.length > 0 && !STATE.filters.countries.includes(country)) return false;
        if (STATE.filters.search && !locationName.toLowerCase().includes(STATE.filters.search) && !country.toLowerCase().includes(STATE.filters.search)) return false;

        // Cost range filters
        const weeklyCost = parseCurrency(matchingLocation[COL_MAP.loc.weeklyCost]);
        const foodCost = parseCurrency(matchingLocation[COL_MAP.loc.foodCost]);

        if (STATE.filters.minWeeklyCost !== null && weeklyCost !== null && weeklyCost < STATE.filters.minWeeklyCost) return false;
        if (STATE.filters.maxWeeklyCost !== null && weeklyCost !== null && weeklyCost > STATE.filters.maxWeeklyCost) return false;
        if (STATE.filters.minFoodCost !== null && foodCost !== null && foodCost < STATE.filters.minFoodCost) return false;
        if (STATE.filters.maxFoodCost !== null && foodCost !== null && foodCost > STATE.filters.maxFoodCost) return false;

        return true;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color: #94a3b8;">No data for this month with current filters.</div>';
        return;
    }

    // Apply sorting
    const seasonSortValue = document.getElementById('season-sort-select')?.value || 'name-asc';
    const parts = seasonSortValue.split('-');
    const sortBy = parts.slice(0, -1).join('-');
    const sortOrder = parts[parts.length - 1];

    // Define season quality ranking (best to worst)
    const seasonRanking = {
        'good': 1,
        'green season': 1,
        'spring': 2,
        'summer': 3,
        'autumn': 4,
        'fall': 4,
        'winter': 5,
        'cold': 5,
        'monsoon': 6,
        'hurricane': 6,
        'storm': 6,
        'closed': 7,
        'unknown': 8
    };

    filtered.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
            case 'name':
                aValue = (a['Location'] || '').toLowerCase();
                bValue = (b['Location'] || '').toLowerCase();
                if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            case 'season':
                // Sort by quality ranking
                const qualityA = (a['Quality'] || 'unknown').toLowerCase();
                const qualityB = (b['Quality'] || 'unknown').toLowerCase();

                // Find the best matching ranking
                let rankA = 8;
                let rankB = 8;

                for (const [key, rank] of Object.entries(seasonRanking)) {
                    if (qualityA.includes(key)) rankA = Math.min(rankA, rank);
                    if (qualityB.includes(key)) rankB = Math.min(rankB, rank);
                }

                return rankA - rankB; // Lower rank = better quality
            default:
                return 0;
        }
    });

    filtered.forEach(item => {
        const q = (item['Quality'] || '').toLowerCase();
        let colorClass = 'neutral';
        let statusText = item['Quality'] || 'Unknown';

        // Mapping Logic
        if (q.includes('summer')) {
            colorClass = 'summer'; // Gold
        } else if (q.includes('spring')) {
            colorClass = 'spring'; // Fresh Green
        } else if (q.includes('autumn') || q.includes('fall')) {
            colorClass = 'autumn'; // Orange
        } else if (q.includes('winter') || q.includes('cold')) {
            colorClass = 'winter'; // Blue
        } else if (q.includes('monsoon') || q.includes('hurricane') || q.includes('storm')) {
            colorClass = 'danger'; // Red
        } else if (q.includes('good') || q.includes('green')) {
            colorClass = 'good'; // Green
        } else if (q === 'closed' || q === '') {
            colorClass = 'closed';
        } else {
            colorClass = 'info'; // Fallback
        }

        const card = document.createElement('div');
        card.className = `card status-${colorClass}`;

        card.innerHTML = `
             <div class="card-header">
                <div class="card-title">${item['Location']}</div>
            </div>
            <div class="card-body" style="margin-top: 1rem;">
                <span class="tag status-tag">
                    ${statusText}
                </span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderTimeline() {
    updateFiltersFromDOM();

    const container = document.getElementById('timeline-list');
    container.innerHTML = '';

    // Apply location-based filters to timeline data
    const filtered = STATE.timeline.filter(timelineItem => {
        const locationName = timelineItem['Location'] || '';

        // Find matching location in STATE.locations
        const matchingLocation = STATE.locations.find(loc =>
            (loc[COL_MAP.loc.name] || '') === locationName
        );

        if (!matchingLocation) return true; // If no match found, include it (can't filter)

        // Apply filters using the matched location data
        const sport = matchingLocation[COL_MAP.loc.sport] || '';
        const country = matchingLocation[COL_MAP.loc.country] || '';
        const continent = matchingLocation[COL_MAP.loc.continent] || '';

        // Text/Category filters
        if (STATE.filters.sport !== 'all' && sport !== STATE.filters.sport) return false;
        if (STATE.filters.region !== 'all' && continent !== STATE.filters.region) return false;
        if (STATE.filters.countries.length > 0 && !STATE.filters.countries.includes(country)) return false;
        if (STATE.filters.search && !locationName.toLowerCase().includes(STATE.filters.search) && !country.toLowerCase().includes(STATE.filters.search)) return false;

        // Cost range filters
        const weeklyCost = parseCurrency(matchingLocation[COL_MAP.loc.weeklyCost]);
        const foodCost = parseCurrency(matchingLocation[COL_MAP.loc.foodCost]);

        if (STATE.filters.minWeeklyCost !== null && weeklyCost !== null && weeklyCost < STATE.filters.minWeeklyCost) return false;
        if (STATE.filters.maxWeeklyCost !== null && weeklyCost !== null && weeklyCost > STATE.filters.maxWeeklyCost) return false;
        if (STATE.filters.minFoodCost !== null && foodCost !== null && foodCost < STATE.filters.minFoodCost) return false;
        if (STATE.filters.maxFoodCost !== null && foodCost !== null && foodCost > STATE.filters.maxFoodCost) return false;

        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 2rem; color: #94a3b8;">No timeline entries with current filters.</div>';
        return;
    }

    // Sort by date (construct from year and WeekDate)
    filtered.sort((a, b) => {
        const yearA = Math.floor(parseFloat(a[COL_MAP.timeline.year] || 0));
        const yearB = Math.floor(parseFloat(b[COL_MAP.timeline.year] || 0));
        const dateA = new Date(`${a['WeekDate']} ${yearA}`);
        const dateB = new Date(`${b['WeekDate']} ${yearB}`);
        return dateA - dateB;
    });

    // Group sequential visits to the same location
    const grouped = [];
    let currentGroup = null;

    filtered.forEach(item => {
        const loc = item['Location'] || 'Unknown';
        const year = Math.floor(parseFloat(item[COL_MAP.timeline.year] || new Date().getFullYear()));
        const date = new Date(`${item['WeekDate']} ${year}`);

        if (!currentGroup || currentGroup.location !== loc) {
            // Start a new group
            if (currentGroup) grouped.push(currentGroup);
            currentGroup = {
                location: loc,
                startDate: date,
                endDate: date,
                weeks: [item]
            };
        } else {
            // Check if this is sequential (within 8 days of last entry)
            const daysDiff = (date - currentGroup.endDate) / (1000 * 60 * 60 * 24);
            if (daysDiff <= 8) {
                // Add to current group
                currentGroup.endDate = date;
                currentGroup.weeks.push(item);
            } else {
                // Start a new group
                grouped.push(currentGroup);
                currentGroup = {
                    location: loc,
                    startDate: date,
                    endDate: date,
                    weeks: [item]
                };
            }
        }
    });
    if (currentGroup) grouped.push(currentGroup);

    // Apply timeline-specific sorting
    const timelineSortValue = document.getElementById('timeline-sort-select')?.value || 'chronological-asc';
    const [sortBy, sortOrder] = timelineSortValue.split('-');

    grouped.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
            case 'chronological':
                aValue = a.startDate.getTime();
                bValue = b.startDate.getTime();
                break;
            case 'location':
                aValue = (a.location || '').toLowerCase();
                bValue = (b.location || '').toLowerCase();
                break;
            default:
                return 0;
        }

        // Compare values
        if (typeof aValue === 'number') {
            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        } else {
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        }
    });

    // Render grouped entries
    grouped.forEach(group => {
        const div = document.createElement('div');
        div.className = 'timeline-item';

        const loc = group.location;

        // Make timeline item clickable
        const startDateISO = group.startDate.toISOString();
        div.style.cursor = 'pointer';
        div.onclick = () => {
            window.location.href = `trip.html?location=${encodeURIComponent(loc)}&start=${encodeURIComponent(startDateISO)}`;
        };

        // Get location data for cost columns
        const matchingLocation = STATE.locations.find(l => (l[COL_MAP.loc.name] || '') === loc);

        let costDetails = '';
        if (matchingLocation) {
            const currency = matchingLocation[COL_MAP.loc.currency] || 'AUD';
            const currencySymbol = getCurrencySymbol(currency);
            const weeklyCost = matchingLocation[COL_MAP.loc.weeklyCost] || '';
            const foodCost = matchingLocation[COL_MAP.loc.foodCost] || '';
            const rentCost = matchingLocation[COL_MAP.loc.rentCost] || '';

            // Convert and format costs
            const weeklyCostNum = parseCurrency(weeklyCost);
            const weeklyCostAUD = weeklyCostNum ? convertToAUD(weeklyCostNum, currency) : null;
            const weeklyCostDisplay = weeklyCostAUD ?
                (currency === 'AUD' ? `A$${formatWithCommas(weeklyCostAUD)}` : `${currencySymbol}${formatWithCommas(weeklyCostNum)} (A$${formatWithCommas(weeklyCostAUD)})`) : '';

            const foodCostNum = parseCurrency(foodCost);
            const foodCostAUD = foodCostNum ? convertToAUD(foodCostNum, currency) : null;
            const foodCostDisplay = foodCostAUD ?
                (currency === 'AUD' ? `A$${formatWithCommas(foodCostAUD)}` : `${currencySymbol}${formatWithCommas(foodCostNum)} (A$${formatWithCommas(foodCostAUD)})`) : '';

            const rentCostNum = parseCurrency(rentCost);
            const rentCostAUD = rentCostNum ? convertToAUD(rentCostNum, currency) : null;
            const rentCostDisplay = rentCostAUD ?
                (currency === 'AUD' ? `A$${formatWithCommas(rentCostAUD)}` : `${currencySymbol}${formatWithCommas(rentCostNum)} (A$${formatWithCommas(rentCostAUD)})`) : '';

            costDetails = `
                <div class="timeline-costs">
                    ${weeklyCostDisplay ? `<div><strong>Weekly:</strong> ${weeklyCostDisplay}</div>` : ''}
                    ${foodCostDisplay ? `<div><strong>Food/mo:</strong> ${foodCostDisplay}</div>` : ''}
                    ${rentCostDisplay ? `<div><strong>Rent/mo:</strong> ${rentCostDisplay}</div>` : ''}
                </div>
            `;
        }

        // Format date range
        const startDateStr = group.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const endDateStr = group.endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const dateRange = startDateStr === endDateStr ? startDateStr : `${startDateStr} - ${endDateStr}`;
        const weekCount = group.weeks.length;

        div.innerHTML = `
            <div class="timeline-header">
                <div class="timeline-location">${loc}</div>
                <div class="timeline-duration">${weekCount} week${weekCount > 1 ? 's' : ''}</div>
            </div>
            <div class="timeline-date">${dateRange}</div>
            ${costDetails}
        `;
        container.appendChild(div);
    });
}

// Universal render function that updates the current active view
function renderCurrentView() {
    const activeView = document.querySelector('.view-section.active');
    if (!activeView) return;

    const viewId = activeView.id;

    if (viewId === 'view-locations') {
        renderLocations();
    } else if (viewId === 'view-seasons') {
        renderSeasons();
    } else if (viewId === 'view-timeline') {
        renderTimeline();
    }
}

function switchView(viewName) {
    // Hide all
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));

    // Show active
    document.getElementById(`view-${viewName}`).classList.add('active');
    document.querySelector(`li[data-view="${viewName}"]`).classList.add('active');

    // Update Header
    const titles = {
        'locations': 'Explore Destinations',
        'seasons': 'Season Planner',
        'timeline': 'Trip History',
        'config': 'Settings'
    };
    document.getElementById('page-title').textContent = titles[viewName];

    // Initial Render call if needed (or just rely on init)
    if (viewName === 'seasons') renderSeasons();
    if (viewName === 'timeline') renderTimeline();
    if (viewName === 'config') loadConfig();
}

// Configuration functions
function loadConfig() {
    const homeAirport = localStorage.getItem('homeAirport') || '';
    const input = document.getElementById('home-airport-input');
    if (input) {
        input.value = homeAirport;
    }
}

function saveHomeAirport() {
    const input = document.getElementById('home-airport-input');
    const messageDiv = document.getElementById('config-message');

    if (!input || !messageDiv) return;

    const airportCode = input.value.trim().toUpperCase();

    // Basic validation - 3 letters
    if (airportCode.length === 0) {
        localStorage.removeItem('homeAirport');
        messageDiv.textContent = 'Home airport cleared';
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(34, 197, 94, 0.1)';
        messageDiv.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        messageDiv.style.color = 'var(--success-color)';
    } else if (airportCode.length !== 3 || !/^[A-Z]{3}$/.test(airportCode)) {
        messageDiv.textContent = 'Please enter a valid 3-letter IATA airport code';
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(239, 68, 68, 0.1)';
        messageDiv.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        messageDiv.style.color = '#ef4444';
        return;
    } else {
        localStorage.setItem('homeAirport', airportCode);
        messageDiv.textContent = `Home airport saved: ${airportCode}`;
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(34, 197, 94, 0.1)';
        messageDiv.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        messageDiv.style.color = 'var(--success-color)';
    }

    // Hide message after 3 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// Start
document.addEventListener('DOMContentLoaded', init);
