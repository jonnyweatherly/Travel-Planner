const STATE = {
    locations: [],
    seasons: [],
    timeline: [],
    flightPrices: null,
    languages: {},
    events: [],
    selectedMonth: 'Jan',
    filters: {
        sport: 'all',
        region: 'all',
        countries: [],
        season: 'all',
        visaRegion: 'all',
        languages: [],
        interests: [],
        search: '',
        minWeeklyCost: null,
        maxWeeklyCost: null,
        minFoodCost: null,
        maxFoodCost: null,
        favoritesOnly: false
    },
    filterFavs: {
        languages: [],
        visaRegions: []
    },
    userVisas: []
};

// Favorites management
function getFavoriteLocations() {
    const favoritesStr = localStorage.getItem('favoriteLocations');
    return favoritesStr ? JSON.parse(favoritesStr) : [];
}

function saveFavoriteLocations(favorites) {
    localStorage.setItem('favoriteLocations', JSON.stringify(favorites));
}

function toggleFavorite(locationName) {
    const favorites = getFavoriteLocations();
    const index = favorites.indexOf(locationName);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(locationName);
    }

    saveFavoriteLocations(favorites);
    renderLocations();
}

function isFavorite(locationName) {
    return getFavoriteLocations().includes(locationName);
}

// Filter Favorites management
function getFilterFavs() {
    const favsJSON = localStorage.getItem('filterFavorites');
    if (!favsJSON) return { languages: [], visaRegions: [] };
    try {
        const favs = JSON.parse(favsJSON);
        return {
            languages: favs.languages || [],
            visaRegions: favs.visaRegions || []
        };
    } catch (e) {
        console.error('Error parsing filter favorites:', e);
        return { languages: [], visaRegions: [] };
    }
}

function saveFilterFavs(favs) {
    localStorage.setItem('filterFavorites', JSON.stringify(favs));
}

function toggleFilterFav(type, value) {
    const favs = getFilterFavs();
    const list = favs[type];
    const index = list.indexOf(value);

    if (index > -1) {
        list.splice(index, 1);
    } else {
        list.push(value);
    }

    saveFilterFavs(favs);
    populateFilters();
    renderCurrentView();
}

// User Visas management
function getUserVisas() {
    const visasJSON = localStorage.getItem('userVisas');
    if (!visasJSON) return [];
    try {
        return JSON.parse(visasJSON);
    } catch (e) {
        console.error('Error parsing user visas:', e);
        return [];
    }
}

function saveUserVisas(visas) {
    localStorage.setItem('userVisas', JSON.stringify(visas));
}

function toggleFavoritesFilter() {
    const checkbox = document.getElementById('favorites-filter');
    STATE.filters.favoritesOnly = checkbox ? checkbox.checked : false;

    // Update label color
    const label = document.getElementById('favorites-label');
    if (label) {
        label.style.color = STATE.filters.favoritesOnly ? '#f43f5e' : 'rgba(148, 163, 184, 0.3)';
    }

    renderCurrentView();
}

// Fuse.js instances cache for each select element
const fuseInstances = {};

// Fuzzy search for filter select boxes using Fuse.js
function filterSelectOptions(selectId, searchInputId) {
    const select = document.getElementById(selectId);
    const searchInput = document.getElementById(searchInputId);

    if (!select || !searchInput) return;

    const searchTerm = searchInput.value.trim();
    const options = Array.from(select.options);

    // If search is empty, show all options
    if (!searchTerm) {
        options.forEach(option => {
            option.style.display = '';
        });
        return;
    }

    // Initialize Fuse.js instance for this select if not already created
    if (!fuseInstances[selectId]) {
        const optionsData = options.map((option, index) => ({
            text: option.textContent,
            index: index
        }));

        fuseInstances[selectId] = new Fuse(optionsData, {
            keys: ['text'],
            threshold: 0.5,        // 0.0 = perfect match, 1.0 = match anything
            distance: 100,         // How far to search for matches
            ignoreLocation: true,  // Don't care where in the string the match is
            minMatchCharLength: 1  // Minimum character length to match
        });
    }

    // Perform fuzzy search
    const results = fuseInstances[selectId].search(searchTerm);
    const matchedIndices = new Set(results.map(result => result.item.index));

    // Show/hide options based on fuzzy search results
    options.forEach((option, index) => {
        option.style.display = matchedIndices.has(index) ? '' : 'none';
    });
}

function handleInterestSearchKey(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        const input = event.target;
        const interest = input.value.trim();
        if (interest) {
            // Check if already in list
            const interests = getInterests();
            if (!interests.some(i => i.toLowerCase() === interest.toLowerCase())) {
                interests.push(interest);
                saveInterests(interests);

                // Refresh interest filter dropdown
                const interestsSelect = document.getElementById('interests-filter');
                if (interestsSelect) {
                    const opt = document.createElement('option');
                    opt.value = interest;
                    opt.textContent = interest;
                    opt.selected = true; // Automatically select the new interest
                    interestsSelect.appendChild(opt);

                    // Update current filters state
                    STATE.filters.interests = Array.from(interestsSelect.selectedOptions).map(opt => opt.value);
                }

                renderInterestsList(); // Refresh the list in the config view if open
                renderCurrentView(); // Refresh location results
                showMessage(`Interest added: ${interest}`, 'success');
            }
            input.value = '';
            filterSelectOptions('interests-filter', 'interests-search');
        }
    }
}

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
        rentCost: 'RentLongTerm',
        transport: 'Transport'
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

const SPORT_SYNONYMS = {
    'wakeboarding': ['cable', 'wake'],
    'surfing': ['surf'],
    'volleyball': ['volley', 'vb']
};

async function init() {
    console.log('Initializing App...');

    try {
        // Parallel Fetch
        const [locRes, seasRes, timeRes, flightRes, langRes, eventsRes] = await Promise.all([
            fetch('data/locations.json'),
            fetch('data/seasons.json'),
            fetch('data/timeline.json'),
            fetch('data/flight-prices.json').catch(() => null), // Optional - don't fail if not present
            fetch('data/languages.json').catch(() => null), // Optional - don't fail if not present
            fetch('data/events.json').catch(() => null) // Optional - don't fail if not present
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

        // Load languages if available
        if (langRes && langRes.ok) {
            STATE.languages = await langRes.json();
            console.log('Languages loaded');
        } else {
            console.log('Languages data not available');
        }

        // Load events if available
        if (eventsRes && eventsRes.ok) {
            STATE.events = await eventsRes.json();
            console.log('Events loaded');
        } else {
            console.log('Events data not available');
        }

        console.log('Data Loaded:', STATE);

        // Merge user events with default events
        updateCombinedEvents();

        populateFilters();
        renderLocations();
        displayMonthEvents(STATE.selectedMonth);

        // Handle view parameter from URL
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        if (viewParam) {
            switchView(viewParam);
        }

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

// Helper function to get season data for a location, with fallback to country-level seasons
function getSeasonData(locationName, month, country = null) {
    // First, try to find season data for the specific location
    let seasonData = STATE.seasons.find(s =>
        s[COL_MAP.season.location] === locationName &&
        (s[COL_MAP.season.month] || '').includes(month)
    );

    // If no location-specific data found and country is provided, try country-level data
    if (!seasonData && country) {
        seasonData = STATE.seasons.find(s =>
            s[COL_MAP.season.location] === country &&
            (s[COL_MAP.season.month] || '').includes(month)
        );
    }

    return seasonData;
}

function populateFilters() {
    // Unique Sports, Continents, Countries, Seasons, Visa Regions, and Languages
    const sports = new Set();
    const continents = new Set();
    const countries = new Set();
    const seasonQualities = new Set();
    const visaRegions = new Set();
    const allLanguages = new Set();

    STATE.locations.forEach(row => {
        if (row[COL_MAP.loc.sport]) sports.add(row[COL_MAP.loc.sport]);
        if (row[COL_MAP.loc.continent]) continents.add(row[COL_MAP.loc.continent]);
        const country = row[COL_MAP.loc.country];
        if (country) {
            countries.add(country);
            // Add languages for this country
            const langs = STATE.languages[country] || [];
            langs.forEach(lang => allLanguages.add(lang));
        }

        // Get visa region for this location
        const visaRegion = getVisaRegion(row[COL_MAP.loc.country], row[COL_MAP.loc.schengen]);
        if (visaRegion) visaRegions.add(visaRegion);
    });

    // Collect unique season qualities from all months
    // Filter out non-season values (sports, ISO codes, etc.)
    const validSeasonKeywords = ['summer', 'winter', 'spring', 'autumn', 'fall', 'monsoon', 'harvest', 'hurricane', 'closed', 'mild'];

    STATE.seasons.forEach(season => {
        const quality = season[COL_MAP.season.quality];
        if (quality && quality !== '') {
            // Only add if it contains season-related keywords
            const qualityLower = quality.toLowerCase();
            const isValidSeason = validSeasonKeywords.some(keyword => qualityLower.includes(keyword));
            if (isValidSeason) {
                seasonQualities.add(quality);
            }
        }
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

    // Add "Anywhere" at the top
    const anywhereOpt = document.createElement('option');
    anywhereOpt.value = 'Anywhere';
    anywhereOpt.textContent = 'Anywhere';
    countrySelect.appendChild(anywhereOpt);

    Array.from(countries).sort().forEach(c => {
        if (!c || c === 'Anywhere') return;
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

    // Populate language filter (multiselect)
    const languageSelect = document.getElementById('language-filter');
    if (languageSelect) {
        const favLanguages = getFilterFavs().languages;
        const sortedLanguages = Array.from(allLanguages).sort((a, b) => {
            const aFav = favLanguages.includes(a);
            const bFav = favLanguages.includes(b);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return a.localeCompare(b);
        });

        sortedLanguages.forEach(language => {
            const opt = document.createElement('option');
            opt.value = language;
            const isFav = favLanguages.includes(language);
            opt.textContent = isFav ? `❤️ ${language}` : language;
            languageSelect.appendChild(opt);
        });
    }

    // Populate interests filter (multiselect) from user's saved interests
    const interestsSelect = document.getElementById('interests-filter');
    if (interestsSelect) {
        const userInterests = getInterests();
        userInterests.forEach(interest => {
            const opt = document.createElement('option');
            opt.value = interest;
            opt.textContent = interest;
            interestsSelect.appendChild(opt);
        });
    }

    // Populate visa region filter (will be updated dynamically)
    updateVisaRegionFilter();
}

// Update visa region filter based on selected continent
function updateVisaRegionFilter() {
    const visaSelect = document.getElementById('visa-filter');
    if (!visaSelect) return;

    const selectedContinent = STATE.filters.region;
    const currentValue = STATE.filters.visaRegion;

    // Clear existing options
    visaSelect.innerHTML = '<option value="all">All Visa Regions</option>';

    // Collect visa regions for locations in the selected continent
    const relevantVisaRegions = new Set();

    STATE.locations.forEach(row => {
        const continent = row[COL_MAP.loc.continent] || '';

        // If a continent is selected, only show visa regions for that continent
        if (selectedContinent !== 'all' && continent !== selectedContinent) {
            return;
        }

        const visaRegion = getVisaRegion(row[COL_MAP.loc.country], row[COL_MAP.loc.schengen]);
        if (visaRegion) relevantVisaRegions.add(visaRegion);
    });

    // Populate with filtered visa regions
    const favVisaRegions = getFilterFavs().visaRegions;
    const sortedVisaRegions = Array.from(relevantVisaRegions).sort((a, b) => {
        const aFav = favVisaRegions.includes(a);
        const bFav = favVisaRegions.includes(b);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.localeCompare(b);
    });

    sortedVisaRegions.forEach(region => {
        const opt = document.createElement('option');
        opt.value = region;
        const isFav = favVisaRegions.includes(region);
        opt.textContent = isFav ? `❤️ ${region}` : region;
        visaSelect.appendChild(opt);
    });

    // Restore previous selection if it's still valid
    if (currentValue !== 'all' && relevantVisaRegions.has(currentValue)) {
        visaSelect.value = currentValue;
    } else {
        STATE.filters.visaRegion = 'all';
    }
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

    // Get selected languages from multi-select
    const languageSelect = document.getElementById('language-filter');
    if (languageSelect) {
        STATE.filters.languages = Array.from(languageSelect.selectedOptions).map(opt => opt.value);
    }

    // Get selected interests from multi-select
    const interestsSelect = document.getElementById('interests-filter');
    if (interestsSelect) {
        STATE.filters.interests = Array.from(interestsSelect.selectedOptions).map(opt => opt.value);
    }

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
function applyLocationFilters(items, locationField = COL_MAP.loc.name, countryField = COL_MAP.loc.country, continentField = COL_MAP.loc.continent, sportField = COL_MAP.loc.sport, weeklyCostField = COL_MAP.loc.weeklyCost, foodCostField = COL_MAP.loc.foodCost, rentCostField = COL_MAP.loc.rentCost, schengenField = COL_MAP.loc.schengen, tagsField = COL_MAP.loc.tags) {
    return items.filter(item => {
        const sport = item[sportField] || '';
        const country = item[countryField] || '';
        const continent = item[continentField] || '';
        const location = item[locationField] || '';
        const schengen = item[schengenField];
        const tags = item[tagsField] || '';

        // Favorites filter
        if (STATE.filters.favoritesOnly && !isFavorite(location)) return false;

        // Text/Category filters
        if (STATE.filters.sport !== 'all' && sport !== STATE.filters.sport) return false;
        if (STATE.filters.region !== 'all' && continent !== STATE.filters.region) return false;
        if (STATE.filters.countries.length > 0 &&
            !STATE.filters.countries.includes('Anywhere') &&
            !STATE.filters.countries.includes(country)) return false;
        if (STATE.filters.search) {
            const searchLower = STATE.filters.search;
            const matchesLocation = location.toLowerCase().includes(searchLower);
            const matchesCountry = country.toLowerCase().includes(searchLower);
            const matchesSport = sport.toLowerCase().includes(searchLower);

            // Check synonyms
            let matchesSynonym = false;
            for (const [canonical, synonyms] of Object.entries(SPORT_SYNONYMS)) {
                if (sport.toLowerCase() === canonical.toLowerCase()) {
                    if (synonyms.some(s => s.toLowerCase().includes(searchLower) || searchLower.includes(s.toLowerCase()))) {
                        matchesSynonym = true;
                        break;
                    }
                }
            }

            if (!matchesLocation && !matchesCountry && !matchesSport && !matchesSynonym) return false;
        }

        // Visa region filter
        if (STATE.filters.visaRegion !== 'all') {
            const visaRegion = getVisaRegion(country, schengen);
            if (visaRegion !== STATE.filters.visaRegion) return false;
        }

        // Season quality filter
        if (STATE.filters.season !== 'all') {
            const seasonData = getSeasonData(location, STATE.selectedMonth, country);
            const seasonQuality = seasonData ? seasonData[COL_MAP.season.quality] : null;
            if (seasonQuality !== STATE.filters.season) return false;
        }

        // Language filter
        if (STATE.filters.languages.length > 0) {
            const countryLanguages = STATE.languages[country] || [];
            const hasMatchingLanguage = STATE.filters.languages.some(lang =>
                countryLanguages.includes(lang)
            );
            if (!hasMatchingLanguage) return false;
        }

        // Interests filter (check if location tags contain any selected interests)
        if (STATE.filters.interests.length > 0) {
            const tagsLower = tags.toLowerCase();
            const hasMatchingInterest = STATE.filters.interests.some(interest =>
                tagsLower.includes(interest.toLowerCase())
            );
            if (!hasMatchingInterest) return false;
        }

        // Cost range filters
        let weeklyCost = parseCurrency(item[weeklyCostField]);
        if (weeklyCost === null) {
            // Try calculating
            const monthlyTotal = parseCurrency(item[foodCostField]) +
                parseCurrency(item[rentCostField]);
            weeklyCost = monthlyTotal > 0 ? (monthlyTotal / 4.33) : null;
        }
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

    // Define season ranking (best to worst: Summer, Autumn, Spring, All Year, Winter)
    const seasonRanking = {
        'summer': 1,
        'autumn': 2,
        'fall': 2,
        'spring': 3,
        'all year': 4,
        'good': 4, // "Good" or "Green" usually implies all year or pleasant
        'green': 4,
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
            case 'favorites':
                // Favorites first returns 1 for favorites, 0 for non-favorites
                // With "first" (non-asc) order, it uses (not-fav - fav) = (0 - 1) = -1. Favs first.
                value = isFavorite(itemName) ? 1 : 0;
                break;
            case 'name':
                value = (itemName || '').toLowerCase();
                break;
            case 'cost':
                const weeklyRaw = item[COL_MAP.loc.weeklyCost];
                if (weeklyRaw) {
                    value = parseCurrency(weeklyRaw) || 0;
                } else {
                    const monthlyTotal = parseCurrency(item[COL_MAP.loc.foodCost]) +
                        parseCurrency(item[COL_MAP.loc.rentCost]);
                    value = monthlyTotal > 0 ? (monthlyTotal / 4.33) : 0;
                }
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
                const country = item[COL_MAP.loc.country] || '';
                const seasonData = getSeasonData(itemName, STATE.selectedMonth, country);
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
            const isAsc = aPrimary.order === 'asc' || aPrimary.order === 'quality';
            result = isAsc ? aPrimary.value - bPrimary.value : bPrimary.value - aPrimary.value;
        } else {
            const isAsc = aPrimary.order === 'asc' || aPrimary.order === 'quality';
            if (aPrimary.value < bPrimary.value) result = isAsc ? -1 : 1;
            else if (aPrimary.value > bPrimary.value) result = isAsc ? 1 : -1;
        }

        // If primary sort values are equal and secondary sort is set, use secondary sort
        if (result === 0 && secondarySortValue !== 'none') {
            const aSecondary = getSortValue(a, secondarySortValue);
            const bSecondary = getSortValue(b, secondarySortValue);

            if (typeof aSecondary.value === 'number') {
                const isAsc = aSecondary.order === 'asc' || aSecondary.order === 'quality';
                result = isAsc ? aSecondary.value - bSecondary.value : bSecondary.value - aSecondary.value;
            } else {
                const isAsc = aSecondary.order === 'asc' || aSecondary.order === 'quality';
                if (aSecondary.value < bSecondary.value) result = isAsc ? -1 : 1;
                else if (aSecondary.value > bSecondary.value) result = isAsc ? 1 : -1;
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
        const weeklyCostVal = item[COL_MAP.loc.weeklyCost];
        const foodCostVal = item[COL_MAP.loc.foodCost] || '0';
        const rentCostVal = item[COL_MAP.loc.rentCost] || '0';
        const otherCostVal = item['OtherCost'] || '0';

        let weeklyCost;
        if (weeklyCostVal) {
            weeklyCost = weeklyCostVal;
        } else {
            // Calculate weekly from monthly (Rent + Food) / 4.33
            const monthlyTotal = parseCurrency(foodCostVal) + parseCurrency(rentCostVal);
            weeklyCost = monthlyTotal > 0 ? (monthlyTotal / 4.33).toFixed(0) : '';
        }

        const foodCost = foodCostVal;
        const rentCost = rentCostVal;
        const visits = visitCounts[name] || 0;
        const visaRegion = getVisaRegion(country, schengen);

        // Look up season data for current selected month (with country fallback)
        const seasonData = getSeasonData(name, STATE.selectedMonth, country);
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

        // Determine cost color based on user's weekly budget
        let costColor = '';
        const weeklyBudget = getWeeklyBudget();
        if (weeklyCostAUD && weeklyBudget) {
            if (weeklyCostAUD > weeklyBudget) {
                costColor = 'color: #ef4444;'; // red - exceeds budget
            } else if (weeklyCostAUD > weeklyBudget * 0.8) {
                costColor = 'color: #f59e0b;'; // orange - over 80% of budget
            }
        }

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

        // Get languages for this country
        const languages = STATE.languages[country] || [];
        const languagesDisplay = languages.length > 0 ? languages.join(', ') : '';

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

        const favoriteIcon = '♥';
        const favoriteColor = isFavorite(name) ? '#f43f5e' : 'rgba(148, 163, 184, 0.3)';

        // Get transport payment method from localStorage overrides
        const transportPayments = (typeof getTransportPayments === 'function') ? getTransportPayments() : {};
        const transportPayment = transportPayments[name] || (item[COL_MAP.loc.transport]) || '';

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">
                        ${name}
                        <button onclick="event.stopPropagation(); toggleFavorite('${name.replace(/'/g, "\\'")}')"
                            style="background: none; border: none; cursor: pointer; font-size: 1.4rem; margin-left: 0.5rem; color: ${favoriteColor}; padding: 0; line-height: 1; transition: color 0.2s;"
                            title="${isFavorite(name) ? 'Remove from favorites' : 'Add to favorites'}">
                            ${favoriteIcon}
                        </button>
                    </div>
                    <div class="card-subtitle">${country}</div>
                </div>
                ${weeklyCostDisplay ? `<div class="card-cost" style="${costColor}">${weeklyCostDisplay}/wk</div>` : ''}
            </div>
            <div class="card-body">
                ${currency ? `<div class="card-info">Currency: ${currency}</div>` : ''}
                ${languagesDisplay ? `<div class="card-info">🗣️ ${languagesDisplay}</div>` : ''}
                ${flightCostDisplay ? `<div class="card-info">✈️ Flight: ~${flightCostDisplay}</div>` : ''}
                ${monthlyRentCost ? `<div class="card-info">Rent: ${monthlyRentCost}/mo</div>` : ''}
                ${monthlyFoodCost ? `<div class="card-info">Food: ${monthlyFoodCost}/mo</div>` : ''}
                ${transportPayment ? `<div class="card-info">🚇 ${transportPayment}</div>` : ''}
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

    // Display events for this month
    displayMonthEvents(month);

    // Re-render both locations and seasons to show updated season data
    renderLocations();
    renderSeasons();
}

// Display events for the selected month
function displayMonthEvents(month) {
    const eventsDisplay = document.getElementById('month-events-display');
    const eventsText = document.getElementById('events-text');

    if (!eventsDisplay || !eventsText || !STATE.events || STATE.events.length === 0) {
        if (eventsDisplay) eventsDisplay.style.display = 'none';
        return;
    }

    // Find events for this month
    const monthData = STATE.events.find(e => e.month === month);

    if (!monthData || !monthData.events || monthData.events.length === 0) {
        eventsDisplay.style.display = 'none';
        return;
    }

    // Display events
    const eventsList = monthData.events.join(', ');
    eventsText.textContent = `${month} events: ${eventsList}`;
    eventsDisplay.style.display = 'block';
}

// ===== USER EVENTS MANAGEMENT =====

function getUserEvents() {
    const eventsStr = localStorage.getItem('userEvents');
    return eventsStr ? JSON.parse(eventsStr) : [];
}

function saveUserEvents(events) {
    localStorage.setItem('userEvents', JSON.stringify(events));
}

function addUserEvent() {
    const monthSelect = document.getElementById('new-event-month');
    const nameInput = document.getElementById('new-event-name');

    if (!monthSelect || !nameInput) return;

    const month = monthSelect.value;
    const name = nameInput.value.trim();

    if (!name) {
        showMessage('Please enter an event name', 'warning');
        return;
    }

    const userEvents = getUserEvents();

    // Add event
    userEvents.push({
        month: month,
        name: name
    });

    saveUserEvents(userEvents);
    nameInput.value = '';
    renderUserEventsList();

    // Update the events display on explore page
    updateCombinedEvents();
    displayMonthEvents(STATE.selectedMonth);

    showMessage('Event added', 'success');
}

function removeUserEvent(index) {
    const userEvents = getUserEvents();
    userEvents.splice(index, 1);
    saveUserEvents(userEvents);
    renderUserEventsList();

    // Update the events display
    updateCombinedEvents();
    displayMonthEvents(STATE.selectedMonth);

    showMessage('Event removed', 'success');
}

function renderUserEventsList() {
    const listDiv = document.getElementById('user-events-list');
    if (!listDiv) return;

    const userEvents = getUserEvents();

    if (userEvents.length === 0) {
        listDiv.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No events added yet</p>';
        return;
    }

    // Group events by month
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const eventsByMonth = {};

    userEvents.forEach((event, index) => {
        if (!eventsByMonth[event.month]) {
            eventsByMonth[event.month] = [];
        }
        eventsByMonth[event.month].push({ ...event, index });
    });

    let html = '';
    monthOrder.forEach(month => {
        if (eventsByMonth[month]) {
            const monthName = {
                'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
                'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
                'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
            }[month];

            html += `
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin: 0 0 0.75rem 0; color: var(--accent-color); font-size: 1rem;">${monthName}</h4>
                    ${eventsByMonth[month].map(event => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; margin-bottom: 0.5rem; background: var(--sidebar-bg); border-radius: 6px;">
                            <span style="color: var(--text-primary);">${event.name}</span>
                            <button onclick="removeUserEvent(${event.index})"
                                style="padding: 0.5rem 1rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                                Remove
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    });

    listDiv.innerHTML = html;
}

function updateCombinedEvents() {
    // Merge default events from events.json with user events
    const userEvents = getUserEvents();
    const defaultEvents = STATE.events || [];

    // Create a deep copy of default events
    const combined = defaultEvents.map(monthData => ({
        month: monthData.month,
        events: [...monthData.events]
    }));

    // Add user events to the combined array
    userEvents.forEach(userEvent => {
        const monthData = combined.find(m => m.month === userEvent.month);
        if (monthData) {
            monthData.events.push(userEvent.name);
        }
    });

    // Update STATE.events with combined data
    STATE.events = combined;
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
    document.querySelectorAll('.navbar-nav-links li').forEach(el => el.classList.remove('active'));

    // Show active
    const viewElement = document.getElementById(`view-${viewName}`);
    const navElement = document.querySelector(`.navbar-nav-links li[data-view="${viewName}"]`);

    if (viewElement) viewElement.classList.add('active');
    if (navElement) navElement.classList.add('active');

    // Update Header
    const titles = {
        'locations': 'Explore Destinations',
        'seasons': 'Season Planner',
        'timeline': 'Trip History',
        'events': 'Manage Events',
        'reports': 'Trip Reports',
        'todo': 'Travel To-Do List',
        'packing': 'Packing List',
        'friends': 'Friends & Family',
        'finances': 'Finances',
        'insurance': 'Travel Insurance',
        'shop': 'Travel Shop',
        'logistics': 'Travel Logistics',
        'config': 'Settings'
    };
    const pageTitleElement = document.getElementById('page-title');
    if (pageTitleElement) pageTitleElement.textContent = titles[viewName] || 'Travel Planner';

    // Initial Render call if needed (or just rely on init)
    if (viewName === 'seasons') renderSeasons();
    if (viewName === 'timeline') renderTimeline();
    if (viewName === 'events') renderUserEventsList();
    if (viewName === 'todo') renderTodoList();
    if (viewName === 'packing') {
        renderPackingFolderSelect();
        renderPackingList();
    }
    if (viewName === 'friends') renderFriendsList();
    if (viewName === 'finances') loadFinances();
    if (viewName === 'config') loadConfig();
}

// Configuration functions
function loadConfig() {
    const homeAirport = localStorage.getItem('homeAirport') || '';
    const unitSystem = localStorage.getItem('unitSystem') || 'metric';

    const homeAirportInput = document.getElementById('home-airport-input');
    const unitSystemSelect = document.getElementById('unit-system-select');

    if (homeAirportInput) homeAirportInput.value = homeAirport;
    if (unitSystemSelect) unitSystemSelect.value = unitSystem;

    // Load annual budget
    const annualBudget = localStorage.getItem('annualBudget') || '';
    const budgetInput = document.getElementById('annual-budget-input');
    if (budgetInput) {
        budgetInput.value = annualBudget;
        updateBudgetDisplay();
    }

    // Load passports and other lists
    renderPassportList();
    renderUserLanguagesList();
    renderPhoneNumbersList();
    renderTransportPaymentsList();

    // Load interests
    renderInterestsList();
}

function renderPassportList() {
    const passportListDiv = document.getElementById('passport-list');
    if (!passportListDiv) return;

    const passports = getPassports();

    if (passports.length === 0) {
        passportListDiv.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No passports added yet.</p>';
        return;
    }

    passportListDiv.innerHTML = passports.map((passport, index) => {
        const expiryDate = new Date(passport.expiry);
        const today = new Date();
        const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
        const monthsUntilExpiry = Math.floor(daysUntilExpiry / 30);

        let warningClass = '';
        let warningText = '';

        if (daysUntilExpiry < 0) {
            warningClass = 'danger';
            warningText = 'EXPIRED';
        } else if (monthsUntilExpiry < 6) {
            warningClass = 'danger';
            warningText = `Expires in ${monthsUntilExpiry} months`;
        } else if (monthsUntilExpiry < 12) {
            warningClass = 'warning';
            warningText = `Expires in ${monthsUntilExpiry} months`;
        } else {
            warningClass = 'info';
            warningText = `Valid for ${monthsUntilExpiry} months`;
        }

        return `
            <div style="padding: 1rem; margin-bottom: 1rem; background: rgba(100, 116, 139, 0.1); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; position: relative;">
                <button onclick="removePassport(${index})" style="position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Remove</button>
                <div style="margin-bottom: 0.5rem;">
                    <strong style="color: var(--text-primary); font-size: 1.1rem;">${passport.country}</strong>
                </div>
                <div style="color: var(--text-secondary); margin-bottom: 0.5rem;">
                    <strong>Number:</strong> ${passport.number}
                </div>
                <div style="color: var(--text-secondary); margin-bottom: 0.5rem;">
                    <strong>Expiry:</strong> ${new Date(passport.expiry).toLocaleDateString()}
                </div>
                <div>
                    <span class="tag status-tag status-${warningClass}">${warningText}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getPassports() {
    const passportsJSON = localStorage.getItem('passports');
    if (!passportsJSON) return [];
    try {
        return JSON.parse(passportsJSON);
    } catch (e) {
        console.error('Error parsing passports:', e);
        return [];
    }
}

function savePassports(passports) {
    localStorage.setItem('passports', JSON.stringify(passports));
}

function addPassport() {
    const countryInput = document.getElementById('new-passport-country');
    const numberInput = document.getElementById('new-passport-number');
    const expiryInput = document.getElementById('new-passport-expiry');
    const messageDiv = document.getElementById('config-message');

    if (!countryInput || !numberInput || !expiryInput || !messageDiv) return;

    const country = countryInput.value.trim();
    const number = numberInput.value.trim();
    const expiry = expiryInput.value;

    // Validation
    if (!country) {
        showMessage('Please enter a country', 'error');
        return;
    }
    if (!number) {
        showMessage('Please enter a passport number', 'error');
        return;
    }
    if (!expiry) {
        showMessage('Please enter an expiry date', 'error');
        return;
    }

    // Check if expiry is in the past
    const expiryDate = new Date(expiry);
    const today = new Date();
    if (expiryDate < today) {
        showMessage('Warning: This passport is already expired', 'warning');
    }

    // Add to passports array
    const passports = getPassports();
    passports.push({ country, number, expiry });
    savePassports(passports);

    // Clear inputs
    countryInput.value = '';
    numberInput.value = '';
    expiryInput.value = '';

    // Refresh list
    renderPassportList();
    showMessage('Passport added successfully', 'success');
}

function removePassport(index) {
    const passports = getPassports();
    passports.splice(index, 1);
    savePassports(passports);
    renderPassportList();
    showMessage('Passport removed', 'success');
}

// ===== INTERESTS =====

function getInterests() {
    const interestsJSON = localStorage.getItem('interests');
    if (!interestsJSON) return [];
    try {
        return JSON.parse(interestsJSON);
    } catch (e) {
        console.error('Error parsing interests:', e);
        return [];
    }
}

function saveInterests(interests) {
    localStorage.setItem('interests', JSON.stringify(interests));
}

function renderInterestsList() {
    const interestsListDiv = document.getElementById('interests-list');
    if (!interestsListDiv) return;

    const interests = getInterests();

    if (interests.length === 0) {
        interestsListDiv.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No interests added yet.</p>';
        return;
    }

    interestsListDiv.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
            ${interests.map((interest, index) => `
                <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 20px;">
                    <span style="color: var(--text-primary);">${interest}</span>
                    <button onclick="removeInterest(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; font-size: 1.1rem; line-height: 1;" title="Remove interest">×</button>
                </div>
            `).join('')}
        </div>
    `;
}

function addInterest() {
    const input = document.getElementById('new-interest-input');
    if (!input) return;

    const interest = input.value.trim();

    if (!interest) {
        showMessage('Please enter an interest', 'error');
        return;
    }

    // Check for duplicates
    const interests = getInterests();
    if (interests.some(i => i.toLowerCase() === interest.toLowerCase())) {
        showMessage('This interest has already been added', 'warning');
        return;
    }

    // Add to interests array
    interests.push(interest);
    saveInterests(interests);

    // Clear input
    input.value = '';

    // Refresh list
    renderInterestsList();
    showMessage('Interest added successfully', 'success');
}

function removeInterest(index) {
    const interests = getInterests();
    interests.splice(index, 1);
    saveInterests(interests);
    renderInterestsList();
    showMessage('Interest removed', 'success');
}

// ===== USER LANGUAGES =====

function getUserLanguages() {
    const languagesJSON = localStorage.getItem('userLanguages');
    if (!languagesJSON) return [];
    try {
        return JSON.parse(languagesJSON);
    } catch (e) {
        console.error('Error parsing user languages:', e);
        return [];
    }
}

function saveUserLanguages(languages) {
    localStorage.setItem('userLanguages', JSON.stringify(languages));
}

function renderUserLanguagesList() {
    const languagesListDiv = document.getElementById('user-languages-list');
    if (!languagesListDiv) return;

    const languages = getUserLanguages();

    if (languages.length === 0) {
        languagesListDiv.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No languages added yet.</p>';
        return;
    }

    languagesListDiv.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
            ${languages.map((language, index) => `
                <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 20px;">
                    <span style="color: var(--text-primary);">🗣️ ${language}</span>
                    <button onclick="removeUserLanguage(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; font-size: 1.1rem; line-height: 1;" title="Remove language">×</button>
                </div>
            `).join('')}
        </div>
    `;
}

function addUserLanguage() {
    const input = document.getElementById('new-language-input');
    if (!input) return;

    const language = input.value.trim();

    if (!language) {
        showMessage('Please enter a language', 'error');
        return;
    }

    // Check for duplicates
    const languages = getUserLanguages();
    if (languages.some(l => l.toLowerCase() === language.toLowerCase())) {
        showMessage('This language has already been added', 'warning');
        return;
    }

    // Add to languages array
    languages.push(language);
    saveUserLanguages(languages);

    // Clear input
    input.value = '';

    // Refresh list
    renderUserLanguagesList();

    // Automatically add to language favorites
    const favs = getFilterFavs();
    if (!favs.languages.includes(language)) {
        favs.languages.push(language);
        saveFilterFavs(favs);
        populateFilters();
    }

    showMessage('Language added successfully', 'success');
}

function removeUserLanguage(index) {
    const languages = getUserLanguages();
    languages.splice(index, 1);
    saveUserLanguages(languages);
    renderUserLanguagesList();
    showMessage('Language removed', 'success');
}

// ===== PHONE NUMBER MANAGEMENT =====

function getPhoneNumbers() {
    const phonesStr = localStorage.getItem('phoneNumbers');
    return phonesStr ? JSON.parse(phonesStr) : [];
}

function savePhoneNumbers(phones) {
    localStorage.setItem('phoneNumbers', JSON.stringify(phones));
}

function addPhoneNumber() {
    const countryInput = document.getElementById('new-phone-country');
    const numberInput = document.getElementById('new-phone-number');
    const pinInput = document.getElementById('new-phone-pin');
    const expiryInput = document.getElementById('new-phone-expiry');

    if (!countryInput || !numberInput) return;

    const country = countryInput.value.trim();
    const number = numberInput.value.trim();
    const pin = pinInput ? pinInput.value.trim() : '';
    const expiry = expiryInput ? expiryInput.value : '';

    if (!country || !number) {
        showMessage('Please enter both country and phone number', 'warning');
        return;
    }

    const phones = getPhoneNumbers();
    phones.push({
        country: country,
        number: number,
        pin: pin,
        expiry: expiry
    });

    savePhoneNumbers(phones);

    // Clear inputs
    countryInput.value = '';
    numberInput.value = '';
    if (pinInput) pinInput.value = '';
    if (expiryInput) expiryInput.value = '';

    renderPhoneNumbersList();
    showMessage('Phone number added', 'success');
}

function removePhoneNumber(index) {
    const phones = getPhoneNumbers();
    phones.splice(index, 1);
    savePhoneNumbers(phones);
    renderPhoneNumbersList();
    showMessage('Phone number removed', 'success');
}

function renderPhoneNumbersList() {
    const listDiv = document.getElementById('phone-numbers-list');
    if (!listDiv) return;

    const phones = getPhoneNumbers();

    if (phones.length === 0) {
        listDiv.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No phone numbers added yet</p>';
        return;
    }

    listDiv.innerHTML = phones.map((phone, index) => {
        const expiryDate = phone.expiry ? new Date(phone.expiry) : null;
        const isExpired = expiryDate && expiryDate < new Date();
        const expiryDisplay = phone.expiry ? `Expires: ${new Date(phone.expiry).toLocaleDateString()}` : 'No expiry';
        const expiryColor = isExpired ? '#ef4444' : 'var(--text-secondary)';

        return `
            <div style="padding: 1rem; margin-bottom: 0.75rem; background: var(--sidebar-bg); border-radius: 8px; border: 1px solid ${isExpired ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                    <div style="flex: 1;">
                        <div style="color: var(--accent-color); font-weight: 600; margin-bottom: 0.25rem;">${phone.country}</div>
                        <div style="color: var(--text-primary); font-size: 1.05rem; margin-bottom: 0.25rem;">${phone.number}</div>
                        ${phone.pin ? `<div style="color: var(--text-secondary); font-size: 0.85rem;">PIN: ${phone.pin}</div>` : ''}
                        <div style="color: ${expiryColor}; font-size: 0.85rem; margin-top: 0.25rem;">${expiryDisplay}</div>
                    </div>
                    <button onclick="removePhoneNumber(${index})"
                        style="padding: 0.5rem 1rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== TRANSPORT PAYMENT MANAGEMENT =====

function getTransportPayments() {
    const paymentsStr = localStorage.getItem('transportPayments');
    return paymentsStr ? JSON.parse(paymentsStr) : {};
}

function saveTransportPayments(payments) {
    localStorage.setItem('transportPayments', JSON.stringify(payments));
}

function setTransportPayment(locationName, paymentMethod) {
    const payments = getTransportPayments();
    if (paymentMethod && paymentMethod.trim()) {
        payments[locationName] = paymentMethod.trim();
    } else {
        delete payments[locationName];
    }
    saveTransportPayments(payments);
}

function addTransportPaymentEntry() {
    const locationInput = document.getElementById('transport-location-input');
    const paymentInput = document.getElementById('transport-payment-input');

    if (!locationInput || !paymentInput) return;

    const location = locationInput.value.trim();
    const payment = paymentInput.value.trim();

    if (!location || !payment) {
        showMessage('Please enter both location and payment method', 'warning');
        return;
    }

    setTransportPayment(location, payment);

    locationInput.value = '';
    paymentInput.value = '';

    renderTransportPaymentsList();
    showMessage('Transport payment method added', 'success');

    // Re-render location cards to show the new transport method
    renderLocations();
}

function removeTransportPayment(locationName) {
    const payments = getTransportPayments();
    delete payments[locationName];
    saveTransportPayments(payments);
    renderTransportPaymentsList();
    showMessage('Transport payment method removed', 'success');

    // Re-render location cards to update the display
    renderLocations();
}

function renderTransportPaymentsList() {
    const listDiv = document.getElementById('transport-payments-list');
    if (!listDiv) return;

    const payments = getTransportPayments();
    const locations = Object.keys(payments);

    if (locations.length === 0) {
        listDiv.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No transport payment methods added yet</p>';
        return;
    }

    listDiv.innerHTML = locations.map(location => `
        <div style="padding: 1rem; margin-bottom: 0.75rem; background: var(--sidebar-bg); border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <div style="color: var(--accent-color); font-weight: 600; margin-bottom: 0.25rem;">${location}</div>
                    <div style="color: var(--text-primary); font-size: 1.05rem;">🚇 ${payments[location]}</div>
                </div>
                <button onclick="removeTransportPayment('${location.replace(/'/g, "\\'")}')"
                    style="padding: 0.5rem 1rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                    Remove
                </button>
            </div>
        </div>
    `).join('');
}

// Medication functions - Search only
function searchMedicationRequirements() {
    const input = document.getElementById('medication-search-input');
    const resultDiv = document.getElementById('medication-search-results');
    if (!input || !resultDiv) return;

    const query = input.value.trim().toLowerCase();
    if (!query) {
        resultDiv.innerHTML = '';
        resultDiv.style.display = 'none';
        return;
    }

    // Placeholder results
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div style="padding: 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px;">
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">Results for: "${query}"</div>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.75rem;">
                General Pharmaceutical Travel Rules:
            </p>
            <ul style="color: var(--text-secondary); font-size: 0.85rem; padding-left: 1.2rem; margin: 0;">
                <li>Always carry a copy of your prescription.</li>
                <li>Keep medications in their original packaging.</li>
                <li>Check the "Entry Requirements" tab for specific country bans on certain stimulants or painkillers.</li>
                <li>For specific results, please consult the embassy website of your destination country.</li>
            </ul>
        </div>
    `;
}

function saveSettings() {
    const input = document.getElementById('home-airport-input');
    const budgetInput = document.getElementById('annual-budget-input');
    const unitSystemSelect = document.getElementById('unit-system-select');
    const messageDiv = document.getElementById('config-message');

    if (!input || !messageDiv) return;

    const airportCode = input.value.trim().toUpperCase();

    // Save unit system preference
    if (unitSystemSelect) {
        localStorage.setItem('unitSystem', unitSystemSelect.value);
    }

    // Basic validation - 3 letters
    if (airportCode.length === 0) {
        localStorage.removeItem('homeAirport');
    } else if (airportCode.length !== 3 || !/^[A-Z]{3}$/.test(airportCode)) {
        showMessage('Please enter a valid 3-letter IATA airport code', 'error');
        return;
    } else {
        localStorage.setItem('homeAirport', airportCode);
    }

    // Save annual budget
    if (budgetInput) {
        const annualBudget = budgetInput.value.trim();
        if (annualBudget === '' || annualBudget === '0') {
            localStorage.removeItem('annualBudget');
        } else {
            const budgetNum = parseFloat(annualBudget);
            if (isNaN(budgetNum) || budgetNum < 0) {
                showMessage('Please enter a valid annual budget', 'error');
                return;
            }
            localStorage.setItem('annualBudget', budgetNum.toString());
        }
    }

    showMessage('Settings saved successfully', 'success');
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('config-message');
    if (!messageDiv) return;

    messageDiv.textContent = text;
    messageDiv.style.display = 'block';

    if (type === 'success') {
        messageDiv.style.background = 'rgba(34, 197, 94, 0.1)';
        messageDiv.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        messageDiv.style.color = 'var(--success-color)';
    } else if (type === 'error') {
        messageDiv.style.background = 'rgba(239, 68, 68, 0.1)';
        messageDiv.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        messageDiv.style.color = '#ef4444';
    } else if (type === 'warning') {
        messageDiv.style.background = 'rgba(251, 191, 36, 0.1)';
        messageDiv.style.border = '1px solid rgba(251, 191, 36, 0.3)';
        messageDiv.style.color = '#f59e0b';
    }

    // Hide message after 3 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// Budget display functions
let budgetViewMode = 'monthly'; // 'monthly' or 'weekly'

function updateBudgetDisplay() {
    const budgetInput = document.getElementById('annual-budget-input');
    const breakdown = document.getElementById('budget-breakdown');
    const amountSpan = document.getElementById('budget-amount');
    const periodLabel = document.getElementById('budget-period-label');

    if (!budgetInput || !breakdown || !amountSpan || !periodLabel) return;

    const annualBudget = parseFloat(budgetInput.value);

    if (isNaN(annualBudget) || annualBudget <= 0) {
        breakdown.style.display = 'none';
        return;
    }

    breakdown.style.display = 'block';

    if (budgetViewMode === 'monthly') {
        const monthlyBudget = annualBudget / 12;
        periodLabel.textContent = 'Monthly Budget:';
        amountSpan.textContent = `A$${formatWithCommas(Math.round(monthlyBudget))}`;
    } else {
        const weeklyBudget = annualBudget / 52;
        periodLabel.textContent = 'Weekly Budget:';
        amountSpan.textContent = `A$${formatWithCommas(Math.round(weeklyBudget))}`;
    }
}

function toggleBudgetView() {
    const toggleBtn = document.getElementById('budget-toggle-btn');

    if (budgetViewMode === 'monthly') {
        budgetViewMode = 'weekly';
        if (toggleBtn) toggleBtn.textContent = 'Show Monthly';
    } else {
        budgetViewMode = 'monthly';
        if (toggleBtn) toggleBtn.textContent = 'Show Weekly';
    }

    updateBudgetDisplay();
}

function getWeeklyBudget() {
    const annualBudget = parseFloat(localStorage.getItem('annualBudget') || '0');
    if (isNaN(annualBudget) || annualBudget <= 0) return null;
    return annualBudget / 52;
}

// Finances page functions
function getBudgetPeriods() {
    const periodsJSON = localStorage.getItem('budgetPeriods');
    if (!periodsJSON) return [];
    try {
        return JSON.parse(periodsJSON);
    } catch (e) {
        console.error('Error parsing budget periods:', e);
        return [];
    }
}

function saveBudgetPeriods(periods) {
    localStorage.setItem('budgetPeriods', JSON.stringify(periods));
}

function renderBudgetPeriodsList() {
    const listDiv = document.getElementById('budget-periods-list');
    if (!listDiv) return;

    const periods = getBudgetPeriods();

    if (periods.length === 0) {
        listDiv.innerHTML = '';
        return;
    }

    listDiv.innerHTML = periods.map((period, index) => {
        let dateDisplay;
        if (period.startDate && period.endDate) {
            dateDisplay = `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`;
        } else if (period.startDate) {
            dateDisplay = `From ${new Date(period.startDate).toLocaleDateString()}`;
        } else if (period.endDate) {
            dateDisplay = `Until ${new Date(period.endDate).toLocaleDateString()}`;
        } else {
            dateDisplay = 'General Budget (No specific dates)';
        }

        const periodType = period.periodType || 'yearly';
        const periodLabel = periodType === 'weekly' ? '/wk' : periodType === 'monthly' ? '/mo' : '/yr';

        return `
        <div style="padding: 1rem; margin-bottom: 0.75rem; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="color: var(--text-primary); font-weight: 600; margin-bottom: 0.25rem;">
                        ${dateDisplay}
                    </div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">
                        Budget: ${period.currency || 'AUD'}$${formatWithCommas(period.amount)}${periodLabel}
                    </div>
                </div>
                <button onclick="removeBudgetPeriod(${index})" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                    Remove
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function addBudgetPeriod() {
    const startDateInput = document.getElementById('budget-start-date');
    const endDateInput = document.getElementById('budget-end-date');
    const amountInput = document.getElementById('budget-amount-input');
    const periodTypeSelect = document.getElementById('budget-period-type');
    const currencySelect = document.getElementById('main-currency-select');

    if (!startDateInput || !endDateInput || !amountInput || !periodTypeSelect) return;

    const startDate = startDateInput.value || null;
    const endDate = endDateInput.value || null;
    const amount = parseFloat(amountInput.value);
    const periodType = periodTypeSelect.value;

    if (!amount || amount <= 0) {
        alert('Please enter a valid budget amount');
        return;
    }

    // Only validate date logic if both dates are provided
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        alert('End date must be after start date');
        return;
    }

    // Warn if only one date is provided
    if ((startDate && !endDate) || (!startDate && endDate)) {
        if (!confirm('You have only provided one date. The budget period will be created without a complete date range. Continue?')) {
            return;
        }
    }

    const periods = getBudgetPeriods();
    periods.push({
        startDate,
        endDate,
        amount,
        periodType,
        currency: currencySelect ? currencySelect.value : 'AUD'
    });

    // Sort periods by start date (put entries without dates at the end)
    periods.sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(a.startDate) - new Date(b.startDate);
    });

    saveBudgetPeriods(periods);

    // Clear inputs
    startDateInput.value = '';
    endDateInput.value = '';
    amountInput.value = '';

    renderBudgetPeriodsList();
}

function removeBudgetPeriod(index) {
    const periods = getBudgetPeriods();
    if (index >= 0 && index < periods.length) {
        periods.splice(index, 1);
        saveBudgetPeriods(periods);
        renderBudgetPeriodsList();
    }
}

// ===== TRANSPORT BUDGET PERIODS =====

function getTransportBudgetPeriods() {
    const periodsStr = localStorage.getItem('transportBudgetPeriods');
    return periodsStr ? JSON.parse(periodsStr) : [];
}

function saveTransportBudgetPeriods(periods) {
    localStorage.setItem('transportBudgetPeriods', JSON.stringify(periods));
}

function addTransportBudget() {
    const startDateInput = document.getElementById('transport-budget-start-date');
    const endDateInput = document.getElementById('transport-budget-end-date');
    const amountInput = document.getElementById('transport-budget-amount');
    const periodSelect = document.getElementById('transport-budget-period');
    const currencySelect = document.getElementById('main-currency-select');

    if (!startDateInput || !endDateInput || !amountInput || !periodSelect) return;

    const startDate = startDateInput.value || null;
    const endDate = endDateInput.value || null;
    const amount = parseFloat(amountInput.value);
    const periodType = periodSelect.value;

    if (!amount || amount <= 0) {
        alert('Please enter a valid budget amount');
        return;
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        alert('End date must be after start date');
        return;
    }

    const periods = getTransportBudgetPeriods();
    periods.push({
        startDate,
        endDate,
        amount,
        periodType,
        currency: currencySelect ? currencySelect.value : 'AUD'
    });

    periods.sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(a.startDate) - new Date(b.startDate);
    });

    saveTransportBudgetPeriods(periods);

    startDateInput.value = '';
    endDateInput.value = '';
    amountInput.value = '';

    renderTransportBudgetPeriodsList();
    showMessage('Transport budget added', 'success');
}

function removeTransportBudgetPeriod(index) {
    const periods = getTransportBudgetPeriods();
    if (index >= 0 && index < periods.length) {
        periods.splice(index, 1);
        saveTransportBudgetPeriods(periods);
        renderTransportBudgetPeriodsList();
        showMessage('Transport budget removed', 'success');
    }
}

function renderTransportBudgetPeriodsList() {
    const listDiv = document.getElementById('transport-budget-periods-list');
    if (!listDiv) return;

    const periods = getTransportBudgetPeriods();

    if (periods.length === 0) {
        listDiv.innerHTML = '';
        return;
    }

    listDiv.innerHTML = periods.map((period, index) => {
        let dateDisplay;
        if (period.startDate && period.endDate) {
            dateDisplay = `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`;
        } else if (period.startDate) {
            dateDisplay = `From ${new Date(period.startDate).toLocaleDateString()}`;
        } else if (period.endDate) {
            dateDisplay = `Until ${new Date(period.endDate).toLocaleDateString()}`;
        } else {
            dateDisplay = 'General Transport Budget';
        }

        const periodType = period.periodType || 'yearly';
        const periodLabel = periodType === 'weekly' ? '/wk' : periodType === 'monthly' ? '/mo' : '/yr';

        return `
        <div style="padding: 1rem; margin-bottom: 0.75rem; background: rgba(251, 146, 60, 0.05); border: 1px solid rgba(251, 146, 60, 0.3); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="color: var(--text-primary); font-weight: 600; margin-bottom: 0.25rem;">
                        ${dateDisplay}
                    </div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">
                        Transport Budget: ${period.currency || 'AUD'}$${formatWithCommas(period.amount)}${periodLabel}
                    </div>
                </div>
                <button onclick="removeTransportBudgetPeriod(${index})" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 0.5rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                    Remove
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function getCurrentBudgetPeriod(date = new Date()) {
    const periods = getBudgetPeriods();
    const targetDate = new Date(date);

    for (const period of periods) {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        if (targetDate >= startDate && targetDate <= endDate) {
            return period;
        }
    }

    return null;
}

function loadFinances() {
    const mainCurrency = localStorage.getItem('mainCurrency') || 'AUD';
    const travelBudget = localStorage.getItem('travelBudget') || '';
    const transportBudgetPeriod = localStorage.getItem('transportBudgetPeriod') || 'yearly';

    const currencySelect = document.getElementById('main-currency-select');
    const travelBudgetInput = document.getElementById('travel-budget-input');
    const transportBudgetPeriodSelect = document.getElementById('transport-budget-period');

    if (currencySelect) currencySelect.value = mainCurrency;
    if (travelBudgetInput) travelBudgetInput.value = travelBudget;
    if (transportBudgetPeriodSelect) {
        transportBudgetPeriodSelect.value = transportBudgetPeriod;
        updateTransportBudgetLabel(transportBudgetPeriod);

        // Add event listener for period changes
        transportBudgetPeriodSelect.addEventListener('change', function () {
            updateTransportBudgetLabel(this.value);
        });
    }

    renderBudgetPeriodsList();
    renderTransportBudgetPeriodsList();
}

function updateTransportBudgetLabel(period) {
    const label = document.getElementById('transport-budget-label');
    if (!label) return;

    switch (period) {
        case 'weekly':
            label.textContent = 'Weekly Transport Budget';
            break;
        case 'monthly':
            label.textContent = 'Monthly Transport Budget';
            break;
        case 'yearly':
            label.textContent = 'Annual Transport Budget';
            break;
        default:
            label.textContent = 'Annual Transport Budget';
    }
}

function saveFinances() {
    const currencySelect = document.getElementById('main-currency-select');
    const travelBudgetInput = document.getElementById('travel-budget-input');
    const transportBudgetPeriodSelect = document.getElementById('transport-budget-period');

    const mainCurrency = currencySelect ? currencySelect.value : 'AUD';
    const travelBudget = travelBudgetInput ? travelBudgetInput.value : '';
    const transportBudgetPeriod = transportBudgetPeriodSelect ? transportBudgetPeriodSelect.value : 'yearly';

    localStorage.setItem('mainCurrency', mainCurrency);
    localStorage.setItem('travelBudget', travelBudget);
    localStorage.setItem('transportBudgetPeriod', transportBudgetPeriod);

    const messageDiv = document.getElementById('finances-message');
    if (messageDiv) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = 'rgba(34, 197, 94, 0.1)';
        messageDiv.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        messageDiv.style.color = '#22c55e';
        messageDiv.textContent = 'Finances saved successfully!';

        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }

    renderLocations();
}

// Filter category toggle function
function toggleFilterCategory(headerElement) {
    const content = headerElement.nextElementSibling;
    const isActive = content.classList.contains('active');

    if (isActive) {
        content.classList.remove('active');
        headerElement.classList.add('collapsed');
    } else {
        content.classList.add('active');
        headerElement.classList.remove('collapsed');
    }
}

// Reports functionality
function generateReport() {
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    const resultsDiv = document.getElementById('report-results');

    if (!startDateInput || !endDateInput || !resultsDiv) return;

    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);

    if (!startDateInput.value || !endDateInput.value) {
        resultsDiv.innerHTML = '<p style="color: #ef4444; text-align: center;">Please select both start and end dates.</p>';
        return;
    }

    if (startDate > endDate) {
        resultsDiv.innerHTML = '<p style="color: #ef4444; text-align: center;">Start date must be before end date.</p>';
        return;
    }

    // Filter timeline entries within date range
    const filteredTrips = STATE.timeline.filter(entry => {
        const year = Math.floor(parseFloat(entry[COL_MAP.timeline.year] || 0));
        const entryDate = new Date(`${entry['WeekDate']} ${year}`);
        return entryDate >= startDate && entryDate <= endDate;
    });

    if (filteredTrips.length === 0) {
        resultsDiv.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No trips found in selected date range.</p>';
        return;
    }

    // Calculate statistics
    const locationCounts = {};
    const countryCounts = {};
    const continentCounts = {};
    let totalWeeks = 0;
    let totalCost = 0;

    filteredTrips.forEach(trip => {
        const locationName = trip[COL_MAP.timeline.location];
        const weekCost = parseCurrency(trip[COL_MAP.timeline.cost]);

        // Find matching location for additional details
        const location = STATE.locations.find(loc => loc[COL_MAP.loc.name] === locationName);

        if (location) {
            const country = location[COL_MAP.loc.country] || 'Unknown';
            const continent = location[COL_MAP.loc.continent] || 'Unknown';

            locationCounts[locationName] = (locationCounts[locationName] || 0) + 1;
            countryCounts[country] = (countryCounts[country] || 0) + 1;
            continentCounts[continent] = (continentCounts[continent] || 0) + 1;
        }

        totalWeeks++;
        if (weekCost) {
            totalCost += weekCost;
        }
    });

    // Calculate visa days
    const visaDays = {};
    filteredTrips.forEach(trip => {
        const locationName = trip[COL_MAP.timeline.location];
        const location = STATE.locations.find(loc => loc[COL_MAP.loc.name] === locationName);

        if (location) {
            const country = location[COL_MAP.loc.country];
            const schengen = location[COL_MAP.loc.schengen];
            const visaRegion = getVisaRegion(country, schengen);

            if (visaRegion) {
                visaDays[visaRegion] = (visaDays[visaRegion] || 0) + 7;
            }
        }
    });

    // Sort locations by visit count
    const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
    const sortedContinents = Object.entries(continentCounts).sort((a, b) => b[1] - a[1]);

    // Build report HTML
    const avgWeeklyCost = totalWeeks > 0 ? totalCost / totalWeeks : 0;
    const totalDays = totalWeeks * 7;

    let reportHTML = `
        <div style="background: var(--card-bg); padding: 2rem; border-radius: 12px; border: 1px solid var(--border-color);">
            <h3 style="margin-top: 0; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
                Summary (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="cost-item"><div class="cost-label">Total Weeks</div><div class="cost-value">${totalWeeks}</div></div>
                <div class="cost-item"><div class="cost-label">Total Days</div><div class="cost-value">${totalDays}</div></div>
                <div class="cost-item"><div class="cost-label">Total Cost (AUD)</div><div class="cost-value">A$${formatWithCommas(Math.round(totalCost))}</div></div>
                <div class="cost-item"><div class="cost-label">Avg Weekly Cost</div><div class="cost-value">A$${formatWithCommas(Math.round(avgWeeklyCost))}</div></div>
            </div>
            <h4 style="color: var(--text-primary); margin-bottom: 1rem;">Top Locations</h4>
            <div style="margin-bottom: 2rem;">${sortedLocations.map(([location, weeks]) =>
        `<div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(100, 116, 139, 0.2);">
                    <span style="color: var(--text-primary);">${location}</span>
                    <span style="color: var(--accent-color); font-weight: 600;">${weeks} week${weeks > 1 ? 's' : ''}</span>
                </div>`).join('')}</div>
            <h4 style="color: var(--text-primary); margin-bottom: 1rem;">Countries Visited</h4>
            <div style="margin-bottom: 2rem;">${sortedCountries.map(([country, weeks]) =>
            `<div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(100, 116, 139, 0.2);">
                    <span style="color: var(--text-primary);">${country}</span>
                    <span style="color: var(--accent-color); font-weight: 600;">${weeks} week${weeks > 1 ? 's' : ''}</span>
                </div>`).join('')}</div>
            <h4 style="color: var(--text-primary); margin-bottom: 1rem;">Continents Visited</h4>
            <div style="margin-bottom: 2rem;">${sortedContinents.map(([continent, weeks]) =>
                `<div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(100, 116, 139, 0.2);">
                    <span style="color: var(--text-primary);">${continent}</span>
                    <span style="color: var(--accent-color); font-weight: 600;">${weeks} week${weeks > 1 ? 's' : ''}</span>
                </div>`).join('')}</div>
            ${Object.keys(visaDays).length > 0 ? `<h4 style="color: var(--text-primary); margin-bottom: 1rem;">Visa Region Days</h4>
                <div>${Object.entries(visaDays).sort((a, b) => b[1] - a[1]).map(([region, days]) =>
                    `<div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(100, 116, 139, 0.2);">
                        <span style="color: var(--text-primary);">📋 ${region}</span>
                        <span style="color: var(--accent-color); font-weight: 600;">~${days} days</span>
                    </div>`).join('')}</div>` : ''}
        </div>
    `;

    resultsDiv.innerHTML = reportHTML;
}

// Travel To-Do List functionality
function getTodoItems() {
    const todosJSON = localStorage.getItem('travelTodos');
    if (!todosJSON) return [];
    try {
        return JSON.parse(todosJSON);
    } catch (e) {
        console.error('Error parsing todos:', e);
        return [];
    }
}

function saveTodoItems(todos) {
    localStorage.setItem('travelTodos', JSON.stringify(todos));
}

function renderTodoList() {
    const listDiv = document.getElementById('todo-list');
    if (!listDiv) return;

    const todos = getTodoItems();

    if (todos.length === 0) {
        listDiv.innerHTML = '<p style="color: var(--text-secondary); font-style: italic; text-align: center;">No tasks yet. Add your first travel logistics task above!</p>';
        return;
    }

    listDiv.innerHTML = todos.map((todo, index) => `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; margin-bottom: 0.75rem; background: ${todo.completed ? 'rgba(34, 197, 94, 0.1)' : 'var(--card-bg)'}; border: 1px solid ${todo.completed ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'}; border-radius: 8px;">
            <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodoItem(${index})" style="width: 20px; height: 20px; cursor: pointer;" />
            <span style="flex: 1; color: var(--text-primary); ${todo.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${todo.text}</span>
            <button onclick="removeTodoItem(${index})" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                Remove
            </button>
        </div>
    `).join('');
}

function addTodoItem() {
    const input = document.getElementById('todo-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const todos = getTodoItems();
    todos.push({ text, completed: false, createdAt: new Date().toISOString() });
    saveTodoItems(todos);

    input.value = '';
    renderTodoList();
}

function toggleTodoItem(index) {
    const todos = getTodoItems();
    if (index >= 0 && index < todos.length) {
        todos[index].completed = !todos[index].completed;
        saveTodoItems(todos);
        renderTodoList();
    }
}

function removeTodoItem(index) {
    const todos = getTodoItems();
    if (index >= 0 && index < todos.length) {
        todos.splice(index, 1);
        saveTodoItems(todos);
        renderTodoList();
    }
}

// Packing List functionality
function getPackingItems() {
    const packingJSON = localStorage.getItem('packingList');
    if (!packingJSON) return [];
    try {
        return JSON.parse(packingJSON);
    } catch (e) {
        console.error('Error parsing packing list:', e);
        return [];
    }
}

function savePackingItems(items) {
    localStorage.setItem('packingList', JSON.stringify(items));
}

function getPackingFolders() {
    const foldersJSON = localStorage.getItem('packingFolders');
    if (!foldersJSON) return [];
    try {
        const folders = JSON.parse(foldersJSON);
        // Migrate old string-based folders to new object structure
        if (folders.length > 0 && typeof folders[0] === 'string') {
            const migratedFolders = folders.map(name => ({
                name: name,
                weight: null,
                unit: 'kg'
            }));
            savePackingFolders(migratedFolders);
            return migratedFolders;
        }
        return folders;
    } catch (e) {
        console.error('Error parsing packing folders:', e);
        return [];
    }
}

function savePackingFolders(folders) {
    localStorage.setItem('packingFolders', JSON.stringify(folders));
}

function renderPackingFolderSelect() {
    const select = document.getElementById('packing-folder-select');
    if (!select) return;

    const folders = getPackingFolders();
    const currentValue = select.value;

    select.innerHTML = '<option value="">No Bag</option>' +
        folders.map(folder => `<option value="${folder.name}">${folder.name}</option>`).join('');

    if (currentValue && folders.find(f => f.name === currentValue)) {
        select.value = currentValue;
    }
}

function addPackingFolder() {
    const input = document.getElementById('new-folder-input');
    if (!input) return;

    const folderName = input.value.trim();
    if (!folderName) return;

    const folders = getPackingFolders();
    if (folders.find(f => f.name === folderName)) {
        alert('This bag already exists!');
        return;
    }

    const unitSystem = localStorage.getItem('unitSystem') || 'metric';
    folders.push({
        name: folderName,
        weight: null,
        unit: unitSystem === 'metric' ? 'kg' : 'lbs'
    });
    savePackingFolders(folders);

    input.value = '';
    renderPackingFolderSelect();
    renderPackingList();
}

function removePackingFolder(folderName) {
    if (!confirm(`Remove bag "${folderName}"? Items in this bag will be moved to "No Bag".`)) return;

    const folders = getPackingFolders();
    const updatedFolders = folders.filter(f => f.name !== folderName);
    savePackingFolders(updatedFolders);

    const items = getPackingItems();
    items.forEach(item => {
        if (item.folder === folderName) {
            item.folder = '';
        }
    });
    savePackingItems(items);

    renderPackingFolderSelect();
    renderPackingList();
}

function updateBagWeight(folderName) {
    const weightInput = document.getElementById(`bag-weight-${folderName.replace(/\s+/g, '-')}`);
    const unitSelect = document.getElementById(`bag-unit-${folderName.replace(/\s+/g, '-')}`);

    if (!weightInput || !unitSelect) return;

    const weight = weightInput.value ? parseFloat(weightInput.value) : null;
    const unit = unitSelect.value;

    const folders = getPackingFolders();
    const folder = folders.find(f => f.name === folderName);

    if (folder) {
        folder.weight = weight;
        folder.unit = unit;
        savePackingFolders(folders);
        showMessage('Bag weight updated', 'success');
    }
}

function renderPackingItemCard(item, index) {
    const favoriteIcon = item.favorite ? '⭐' : '☆';
    const toBuyBadge = item.toBuy ? '<span style="background: rgba(251, 146, 60, 0.2); color: #fb923c; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">TO BUY</span>' : '';

    return `
        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 1rem; margin-bottom: 0.5rem; margin-left: 1rem; background: ${item.packed ? 'rgba(34, 197, 94, 0.1)' : 'var(--card-bg)'}; border: 1px solid ${item.packed ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'}; border-radius: 8px;">
            <input type="checkbox" ${item.packed ? 'checked' : ''} onchange="togglePackingItem(${index})" style="width: 20px; height: 20px; cursor: pointer;" />
            <span style="flex: 1; color: var(--text-primary); ${item.packed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${item.text}${toBuyBadge}</span>
            <button onclick="togglePackingFavorite(${index})" title="${item.favorite ? 'Remove from favorites' : 'Add to favorites'}" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; padding: 0.25rem; line-height: 1;">
                ${favoriteIcon}
            </button>
            <button onclick="togglePackingToBuy(${index})" title="${item.toBuy ? 'Remove from to-buy list' : 'Add to to-buy list'}" style="background: ${item.toBuy ? 'rgba(251, 146, 60, 0.2)' : 'rgba(100, 116, 139, 0.1)'}; border: 1px solid ${item.toBuy ? 'rgba(251, 146, 60, 0.3)' : 'rgba(100, 116, 139, 0.3)'}; color: ${item.toBuy ? '#fb923c' : 'var(--text-secondary)'}; padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem;">
                ${item.toBuy ? '✓ BUY' : 'BUY'}
            </button>
            <button onclick="removePackingItem(${index})" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                Remove
            </button>
        </div>
    `;
}

function renderPackingList() {
    const listDiv = document.getElementById('packing-list');
    if (!listDiv) return;

    const items = getPackingItems();
    const folders = getPackingFolders();

    if (items.length === 0) {
        listDiv.innerHTML = '<p style="color: var(--text-secondary); font-style: italic; text-align: center;">No items yet. Add your first packing item above!</p>';
        return;
    }

    const packedCount = items.filter(item => item.packed).length;
    const totalCount = items.length;
    const favoriteItems = items.filter(item => item.favorite);
    const toBuyItems = items.filter(item => item.toBuy);

    // Group items by folder
    const itemsByFolder = {};
    itemsByFolder[''] = []; // No Bag group

    folders.forEach(folder => {
        itemsByFolder[folder.name] = [];
    });

    items.forEach((item, index) => {
        const folder = item.folder || '';
        if (!itemsByFolder[folder]) {
            itemsByFolder[folder] = [];
        }
        itemsByFolder[folder].push({ ...item, originalIndex: index });
    });

    let html = `
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px;">
            <div style="color: var(--text-primary); font-size: 1.1rem; font-weight: 600;">
                Progress: ${packedCount} / ${totalCount} items packed (${Math.round((packedCount / totalCount) * 100)}%)
            </div>
            <div style="margin-top: 0.5rem; height: 8px; background: rgba(100, 116, 139, 0.2); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; background: var(--accent-color); width: ${(packedCount / totalCount) * 100}%; transition: width 0.3s;"></div>
            </div>
        </div>
    `;

    // Favorite items section
    if (favoriteItems.length > 0) {
        html += `
            <div style="margin-bottom: 1.5rem;">
                <div style="padding: 0.75rem; background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 8px; margin-bottom: 0.75rem;">
                    <h3 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">⭐ Favorites <span style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 400;">(${favoriteItems.length})</span></h3>
                </div>
                ${favoriteItems.map((item, idx) => {
                    const originalIndex = items.findIndex(i => i === item);
                    return renderPackingItemCard(item, originalIndex);
                }).join('')}
            </div>
        `;
    }

    // To-buy items section
    if (toBuyItems.length > 0) {
        html += `
            <div style="margin-bottom: 1.5rem;">
                <div style="padding: 0.75rem; background: rgba(251, 146, 60, 0.1); border: 1px solid rgba(251, 146, 60, 0.3); border-radius: 8px; margin-bottom: 0.75rem;">
                    <h3 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">🛒 To Buy <span style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 400;">(${toBuyItems.length})</span></h3>
                </div>
                ${toBuyItems.map((item, idx) => {
                    const originalIndex = items.findIndex(i => i === item);
                    return renderPackingItemCard(item, originalIndex);
                }).join('')}
            </div>
        `;
    }

    // Render folders
    folders.forEach(folder => {
        const folderName = folder.name;
        const safeId = folderName.replace(/\s+/g, '-');

        if (itemsByFolder[folderName] && itemsByFolder[folderName].length > 0) {
            const folderPackedCount = itemsByFolder[folderName].filter(item => item.packed).length;
            const folderTotalCount = itemsByFolder[folderName].length;
            const weightDisplay = folder.weight ? `${folder.weight} ${folder.unit}` : 'Not set';

            html += `
                <div style="margin-bottom: 1.5rem;">
                    <div style="padding: 0.75rem; background: rgba(147, 51, 234, 0.1); border: 1px solid rgba(147, 51, 234, 0.3); border-radius: 8px; margin-bottom: 0.75rem;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                            <h3 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">🎒 ${folderName} <span style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 400;">(${folderPackedCount}/${folderTotalCount})</span></h3>
                            <button onclick="removePackingFolder('${folderName}')" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                                Remove Bag
                            </button>
                        </div>
                        <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.75rem;">
                            <span style="color: var(--text-secondary); font-size: 0.9rem; min-width: 100px;">Weight: ${weightDisplay}</span>
                            <input type="number" id="bag-weight-${safeId}" placeholder="Weight" value="${folder.weight || ''}" min="0" step="0.1"
                                style="width: 100px; padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary); font-size: 0.85rem;" />
                            <select id="bag-unit-${safeId}"
                                style="padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary); font-size: 0.85rem;">
                                <option value="kg" ${folder.unit === 'kg' ? 'selected' : ''}>kg</option>
                                <option value="lbs" ${folder.unit === 'lbs' ? 'selected' : ''}>lbs</option>
                            </select>
                            <button onclick="updateBagWeight('${folderName}')" class="location-link-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; white-space: nowrap;">
                                Update
                            </button>
                        </div>
                    </div>
                    ${itemsByFolder[folderName].map(item => renderPackingItemCard(item, item.originalIndex)).join('')}
                </div>
            `;
        }
    });

    // Render "No Bag" items
    if (itemsByFolder[''].length > 0) {
        const noBagPackedCount = itemsByFolder[''].filter(item => item.packed).length;
        const noBagTotalCount = itemsByFolder[''].length;

        html += `
            <div style="margin-bottom: 1.5rem;">
                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background: rgba(100, 116, 139, 0.1); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 8px;">
                    <h3 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">📦 No Bag <span style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 400;">(${noBagPackedCount}/${noBagTotalCount})</span></h3>
                </div>
                ${itemsByFolder[''].map(item => renderPackingItemCard(item, item.originalIndex)).join('')}
            </div>
        `;
    }

    listDiv.innerHTML = html;
}

function addPackingItem() {
    const input = document.getElementById('packing-input');
    const folderSelect = document.getElementById('packing-folder-select');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const folder = folderSelect ? folderSelect.value : '';

    const items = getPackingItems();
    items.push({
        text,
        packed: false,
        folder,
        favorite: false,
        toBuy: false,
        createdAt: new Date().toISOString()
    });
    savePackingItems(items);

    input.value = '';
    renderPackingList();
}

function togglePackingFavorite(index) {
    const items = getPackingItems();
    if (index >= 0 && index < items.length) {
        items[index].favorite = !items[index].favorite;
        savePackingItems(items);
        renderPackingList();
    }
}

function togglePackingToBuy(index) {
    const items = getPackingItems();
    if (index >= 0 && index < items.length) {
        items[index].toBuy = !items[index].toBuy;
        savePackingItems(items);
        renderPackingList();
    }
}

function togglePackingItem(index) {
    const items = getPackingItems();
    if (index >= 0 && index < items.length) {
        items[index].packed = !items[index].packed;
        savePackingItems(items);
        renderPackingList();
    }
}

function removePackingItem(index) {
    const items = getPackingItems();
    if (index >= 0 && index < items.length) {
        items.splice(index, 1);
        savePackingItems(items);
        renderPackingList();
    }
}

function clearPackedItems() {
    const items = getPackingItems();
    const unpacked = items.filter(item => !item.packed);
    savePackingItems(unpacked);
    renderPackingList();
}

// ===== FRIENDS & FAMILY =====

function getFriends() {
    const stored = localStorage.getItem('friendsList');
    return stored ? JSON.parse(stored) : [];
}

function saveFriends(friends) {
    localStorage.setItem('friendsList', JSON.stringify(friends));
}

function renderFriendsList() {
    const listDiv = document.getElementById('friends-list');
    if (!listDiv) return;

    const friends = getFriends();
    if (friends.length === 0) {
        listDiv.innerHTML = '<p style="color: var(--text-secondary); font-style: italic; text-align: center;">No people added yet. Add your first friend or family member above!</p>';
        return;
    }

    // Sort by start date (most recent first)
    const sortedFriends = [...friends].sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(b.startDate) - new Date(a.startDate);
    });

    listDiv.innerHTML = sortedFriends.map((friend, index) => {
        const originalIndex = friends.indexOf(friend);
        const dateRange = friend.startDate && friend.endDate
            ? `${formatDate(friend.startDate)} - ${formatDate(friend.endDate)}`
            : friend.startDate
                ? `From ${formatDate(friend.startDate)}`
                : 'No dates specified';

        return `
            <div style="padding: 1.25rem; margin-bottom: 1rem; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <div style="flex: 1;">
                        <h3 style="color: var(--text-primary); margin: 0 0 0.5rem 0;">${friend.name}</h3>
                        <div style="color: var(--text-secondary); margin-bottom: 0.5rem;">
                            <span style="display: inline-block; margin-right: 0.5rem;">📍</span>
                            ${friend.location || 'Location not specified'}
                        </div>
                        <div style="color: var(--text-secondary); margin-bottom: 0.5rem;">
                            <span style="display: inline-block; margin-right: 0.5rem;">📅</span>
                            ${dateRange}
                        </div>
                        ${friend.socialUrl ? `
                            <div style="margin-top: 0.75rem;">
                                <a href="${friend.socialUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 0.5rem 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: var(--accent-color); border-radius: 6px; text-decoration: none; font-size: 0.9rem;">
                                    View Social Media
                                </a>
                            </div>
                        ` : ''}
                    </div>
                    <button onclick="removeFriend(${originalIndex})" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function addFriend() {
    const nameInput = document.getElementById('friend-name-input');
    const locationInput = document.getElementById('friend-location-input');
    const startDateInput = document.getElementById('friend-start-date-input');
    const endDateInput = document.getElementById('friend-end-date-input');
    const socialInput = document.getElementById('friend-social-input');

    if (!nameInput || !locationInput) return;

    const name = nameInput.value.trim();
    const location = locationInput.value.trim();
    const startDate = startDateInput?.value || '';
    const endDate = endDateInput?.value || '';
    const socialUrl = socialInput?.value.trim() || '';

    if (!name) {
        alert('Please enter a name');
        return;
    }

    const friends = getFriends();
    friends.push({
        name,
        location,
        startDate,
        endDate,
        socialUrl,
        createdAt: new Date().toISOString()
    });
    saveFriends(friends);

    // Clear inputs
    nameInput.value = '';
    locationInput.value = '';
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (socialInput) socialInput.value = '';

    renderFriendsList();
}

function removeFriend(index) {
    const friends = getFriends();
    if (index >= 0 && index < friends.length) {
        friends.splice(index, 1);
        saveFriends(friends);
        renderFriendsList();
    }
}

// ===== SMART QUERY TOOL =====

function handleSmartSearch(event) {
    const input = document.getElementById('search-input');
    const feedback = document.getElementById('smart-query-feedback');

    if (!input || !feedback) return;

    const query = input.value.trim();

    // Trigger AI search on Enter key
    if (event.key === 'Enter' && query) {
        processAIQuery();
        return;
    }

    // For simple typing, just do basic text search
    if (!query) {
        feedback.style.display = 'none';
        renderCurrentView();
    }
}

async function processAIQuery() {
    const input = document.getElementById('search-input');
    const feedback = document.getElementById('smart-query-feedback');
    const aiButton = document.getElementById('ai-search-btn');

    if (!input || !feedback) return;

    const query = input.value.trim();

    if (!query) {
        feedback.style.display = 'none';
        return;
    }

    // Show loading state
    const originalButtonText = aiButton ? aiButton.innerHTML : '';
    if (aiButton) aiButton.innerHTML = '⏳ Thinking...';

    feedback.style.display = 'block';
    feedback.style.background = 'rgba(59, 130, 246, 0.1)';
    feedback.style.border = '1px solid rgba(59, 130, 246, 0.3)';
    feedback.style.color = 'var(--text-primary)';
    feedback.innerHTML = '<div style="display: flex; align-items: center; gap: 0.5rem;"><div style="width: 16px; height: 16px; border: 2px solid var(--accent-color); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div><span>AI is analyzing your query...</span></div>';

    try {
        // Get available data context for AI
        const availableSports = ['Wakeboarding', 'Surfing', 'Skiing', 'Snowboarding', 'Kitesurfing', 'Diving', 'Climbing'];
        const availableRegions = ['Asia', 'Europe', 'Oceania', 'North America', 'South America', 'Africa'];
        const availableLanguages = ['English', 'Spanish', 'French', 'Portuguese', 'German', 'Italian', 'Mandarin Chinese', 'Japanese', 'Thai', 'Arabic'];
        const availableSeasons = ['Summer', 'Winter', 'Spring', 'Autumn'];

        const userPreferences = {
            homeAirport: localStorage.getItem('homeAirport') || 'Not set',
            passports: JSON.parse(localStorage.getItem('passports') || '[]'),
            interests: JSON.parse(localStorage.getItem('userInterests') || '[]'),
            languages: JSON.parse(localStorage.getItem('userLanguages') || '[]'),
            annualBudget: localStorage.getItem('annualBudget') || 'Not set'
        };

        // SECURITY WARNING: API keys should NEVER be in client-side code
        // This AI search feature requires a backend server or serverless function
        // For production, implement a server endpoint that proxies requests to Anthropic API
        // The .env file cannot be accessed from client-side JavaScript

        // TODO: Replace with backend API call
        // Example: const response = await fetch('/api/ai-search', { ... })

        console.error('AI Search disabled: API key must be moved to backend server for security');
        throw new Error('AI Search requires backend implementation for security. API keys cannot be exposed in client-side code.');

        /* REMOVED FOR SECURITY - This code must be moved to a backend server
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'REMOVED_FOR_SECURITY',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: `You are a travel destination search assistant. A user is searching for travel destinations with this query: "${query}"

Available filter options:
- Sports: ${availableSports.join(', ')}
- Regions: ${availableRegions.join(', ')}
- Languages: ${availableLanguages.join(', ')}
- Seasons: ${availableSeasons.join(', ')}

User preferences:
- Home Airport: ${userPreferences.homeAirport}
- Passports: ${userPreferences.passports.join(', ') || 'None set'}
- Interests: ${userPreferences.interests.join(', ') || 'None set'}
- Languages Spoken: ${userPreferences.languages.join(', ') || 'None set'}
- Annual Budget: ${userPreferences.annualBudget}

Analyze the query and respond with ONLY a JSON object (no other text) with these fields:
{
  "sport": "Sport name or null",
  "region": "Region name or null",
  "languages": ["Array of language names or empty array"],
  "season": "Season name or null",
  "costLevel": "cheap/affordable/moderate/expensive or null",
  "maxWeeklyCost": number or null,
  "explanation": "Brief explanation of how you interpreted the query"
}

Rules:
- Use exact names from the available options
- For cost terms like "cheap", "affordable", "budget": set maxWeeklyCost to appropriate AUD value (cheap: 300, affordable: 500, moderate: 800, expensive: null)
- If specific cost mentioned (e.g., "under $500/week"), use that number
- Return null for fields that aren't mentioned in the query`
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.content[0].text;

        // Parse AI response
        let filters;
        try {
            filters = JSON.parse(aiResponse);
        } catch (e) {
            console.error('Failed to parse AI response:', aiResponse);
            throw new Error('AI returned invalid response format');
        }

        // Apply filters based on AI interpretation
        applyAIFilters(filters);

        // Show success feedback
        feedback.style.background = 'rgba(34, 197, 94, 0.1)';
        feedback.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        feedback.style.color = '#22c55e';
        feedback.innerHTML = `
            <div style="margin-bottom: 0.5rem;"><strong>🤖 AI Interpretation:</strong> ${filters.explanation}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">Filters have been applied. Results updated below.</div>
        `;
        */ // END OF REMOVED CODE BLOCK

    } catch (error) {
        console.error('AI Query Error:', error);

        // Fallback to basic keyword search
        feedback.style.background = 'rgba(251, 146, 60, 0.1)';
        feedback.style.border = '1px solid rgba(251, 146, 60, 0.3)';
        feedback.style.color = '#fb923c';
        feedback.innerHTML = `
            <div><strong>⚠️ AI search unavailable</strong></div>
            <div style="font-size: 0.85rem; margin-top: 0.25rem;">Falling back to basic keyword search. Try again or contact support if the issue persists.</div>
        `;

        // Use the existing basic search as fallback
        processSmartQuery();
    } finally {
        // Restore button state
        if (aiButton) aiButton.innerHTML = originalButtonText;
    }
}

function applyAIFilters(filters) {
    // Reset filters
    STATE.filters = {
        sport: 'all',
        region: 'all',
        countries: [],
        season: 'all',
        visaRegion: 'all',
        languages: [],
        interests: [],
        search: '',
        minWeeklyCost: null,
        maxWeeklyCost: null,
        minFoodCost: null,
        maxFoodCost: null
    };

    let filtersApplied = [];

    // Apply sport filter
    if (filters.sport) {
        STATE.filters.sport = filters.sport;
        const sportFilter = document.getElementById('sport-filter');
        if (sportFilter) sportFilter.value = filters.sport;
        filtersApplied.push(`Sport: ${filters.sport}`);
    }

    // Apply region filter
    if (filters.region) {
        STATE.filters.region = filters.region;
        const regionFilter = document.getElementById('region-filter');
        if (regionFilter) regionFilter.value = filters.region;
        filtersApplied.push(`Region: ${filters.region}`);
    }

    // Apply language filters
    if (filters.languages && filters.languages.length > 0) {
        STATE.filters.languages = filters.languages;
        const languageFilter = document.getElementById('language-filter');
        if (languageFilter) {
            Array.from(languageFilter.options).forEach(opt => {
                opt.selected = filters.languages.includes(opt.value);
            });
        }
        filtersApplied.push(`Languages: ${filters.languages.join(', ')}`);
    }

    // Apply season filter
    if (filters.season) {
        STATE.filters.season = filters.season;
        const seasonFilter = document.getElementById('season-filter');
        if (seasonFilter) seasonFilter.value = filters.season;
        filtersApplied.push(`Season: ${filters.season}`);
    }

    // Apply cost filter
    if (filters.maxWeeklyCost) {
        STATE.filters.maxWeeklyCost = filters.maxWeeklyCost;
        filtersApplied.push(`Max Cost: $${filters.maxWeeklyCost}/week`);
    }

    // Update UI and render
    renderLocations();
}

function processSmartQuery() {
    const input = document.getElementById('search-input');
    const feedback = document.getElementById('smart-query-feedback');

    if (!input || !feedback) return;

    const query = input.value.trim().toLowerCase();

    if (!query) {
        feedback.style.display = 'none';
        return;
    }

    // Parse the query for keywords and apply filters
    let filtersApplied = [];

    // Reset filters first
    STATE.filters = {
        sport: 'all',
        region: 'all',
        countries: [],
        season: 'all',
        visaRegion: 'all',
        languages: [],
        interests: [],
        search: '',
        minWeeklyCost: null,
        maxWeeklyCost: null,
        minFoodCost: null,
        maxFoodCost: null
    };

    // Detect sports with synonyms
    const sportSynonyms = {
        'Wakeboarding': ['wakeboard', 'wake', 'cable'],
        'Surfing': ['surf', 'surfing'],
        'Skiing': ['ski', 'skiing'],
        'Snowboarding': ['snowboard', 'snowboarding'],
        'Kitesurfing': ['kite', 'kitesurfing', 'kitesurf'],
        'Diving': ['dive', 'diving', 'scuba'],
        'Climbing': ['climb', 'climbing', 'bouldering'],
        'Volleyball': ['volley', 'volleyball', 'vb']
    };

    let sportFound = false;
    for (const [sport, synonyms] of Object.entries(sportSynonyms)) {
        for (const synonym of synonyms) {
            if (query.includes(synonym)) {
                STATE.filters.sport = sport;
                document.getElementById('sport-filter').value = sport;
                filtersApplied.push(`Sport: ${sport}`);
                sportFound = true;
                break;
            }
        }
        if (sportFound) break;
    }

    // Detect continents/regions
    const regions = {
        'asia': 'Asia',
        'europe': 'Europe',
        'oceania': 'Oceania',
        'north america': 'North America',
        'south america': 'South America',
        'africa': 'Africa'
    };
    for (const [keyword, region] of Object.entries(regions)) {
        if (query.includes(keyword)) {
            STATE.filters.region = region;
            document.getElementById('region-filter').value = region;
            filtersApplied.push(`Region: ${region}`);
            break;
        }
    }

    // Detect languages
    const languageKeywords = {
        'english': 'English',
        'spanish': 'Spanish',
        'french': 'French',
        'portuguese': 'Portuguese',
        'german': 'German',
        'italian': 'Italian',
        'mandarin': 'Mandarin Chinese',
        'chinese': 'Mandarin Chinese',
        'japanese': 'Japanese',
        'thai': 'Thai',
        'arabic': 'Arabic'
    };

    for (const [keyword, language] of Object.entries(languageKeywords)) {
        if (query.includes(keyword) || query.includes(`speak ${keyword}`) || query.includes(`speaks ${keyword}`)) {
            STATE.filters.languages = [language];
            const languageSelect = document.getElementById('language-filter');
            if (languageSelect) {
                Array.from(languageSelect.options).forEach(opt => {
                    opt.selected = opt.value === language;
                });
            }
            filtersApplied.push(`Language: ${language}`);
            break;
        }
    }

    // Detect season preferences
    const seasons = {
        'winter': 'Winter',
        'summer': 'Summer',
        'spring': 'Spring',
        'autumn': 'Autumn',
        'fall': 'Autumn'
    };
    for (const [keyword, season] of Object.entries(seasons)) {
        if (query.includes(keyword)) {
            STATE.filters.season = season;
            document.getElementById('season-filter').value = season;
            filtersApplied.push(`Season: ${season}`);
            break;
        }
    }

    // Detect cost preferences
    if (query.includes('cheap') || query.includes('budget') || query.includes('affordable') || query.includes('inexpensive')) {
        STATE.filters.maxWeeklyCost = 800;
        document.getElementById('max-weekly-cost').value = '800';
        filtersApplied.push('Budget: Under A$800/week');
    } else if (query.includes('expensive') || query.includes('luxury') || query.includes('high-end')) {
        STATE.filters.minWeeklyCost = 1500;
        document.getElementById('min-weekly-cost').value = '1500';
        filtersApplied.push('Budget: Over A$1500/week');
    } else if (query.includes('mid-range') || query.includes('moderate')) {
        STATE.filters.minWeeklyCost = 800;
        STATE.filters.maxWeeklyCost = 1500;
        document.getElementById('min-weekly-cost').value = '800';
        document.getElementById('max-weekly-cost').value = '1500';
        filtersApplied.push('Budget: A$800-1500/week');
    }

    // Detect quality keywords
    if (query.includes('good') || query.includes('best') || query.includes('top') || query.includes('great')) {
        // These don't directly map to filters but we can note them
        filtersApplied.push('Quality: Looking for top destinations');
    }

    // Show feedback
    if (filtersApplied.length > 0) {
        feedback.style.display = 'block';
        feedback.style.background = 'rgba(34, 197, 94, 0.1)';
        feedback.style.border = '1px solid rgba(34, 197, 94, 0.3)';
        feedback.style.color = 'var(--text-primary)';
        feedback.innerHTML = `
            <strong>🎯 Applied filters:</strong>
            <ul style="margin: 0.5rem 0 0 1.5rem; padding: 0;">
                ${filtersApplied.map(f => `<li>${f}</li>`).join('')}
            </ul>
        `;
    } else {
        feedback.style.display = 'block';
        feedback.style.background = 'rgba(251, 191, 36, 0.1)';
        feedback.style.border = '1px solid rgba(251, 191, 36, 0.3)';
        feedback.style.color = 'var(--text-primary)';
        feedback.innerHTML = `
            <strong>💡 Tip:</strong> Try including keywords like sports (wakeboarding, surfing), regions (Asia, Europe),
            languages (English, Spanish), seasons (summer, winter), or budget terms (cheap, luxury).
        `;
    }

    // Render with new filters
    renderLocations();
}

function clearAllFilters() {
    const input = document.getElementById('search-input');
    const feedback = document.getElementById('smart-query-feedback');

    if (input) input.value = '';
    if (feedback) feedback.style.display = 'none';

    // Reset all filters
    STATE.filters = {
        sport: 'all',
        region: 'all',
        countries: [],
        season: 'all',
        visaRegion: 'all',
        languages: [],
        interests: [],
        search: '',
        minWeeklyCost: null,
        maxWeeklyCost: null,
        minFoodCost: null,
        maxFoodCost: null,
        favoritesOnly: false
    };

    // Reset UI elements
    document.getElementById('sport-filter').value = 'all';
    document.getElementById('region-filter').value = 'all';
    document.getElementById('season-filter').value = 'all';
    document.getElementById('visa-filter').value = 'all';
    document.getElementById('search-input').value = '';
    document.getElementById('min-weekly-cost').value = '';
    document.getElementById('max-weekly-cost').value = '';
    document.getElementById('min-food-cost').value = '';
    const favCheckbox = document.getElementById('favorites-filter');
    if (favCheckbox) favCheckbox.checked = false;
    const favLabel = document.getElementById('favorites-label');
    if (favLabel) favLabel.style.color = 'rgba(148, 163, 184, 0.3)';
    document.getElementById('max-food-cost').value = '';

    const countrySelect = document.getElementById('country-filter');
    if (countrySelect) {
        Array.from(countrySelect.options).forEach(opt => opt.selected = false);
    }

    const languageSelect = document.getElementById('language-filter');
    if (languageSelect) {
        Array.from(languageSelect.options).forEach(opt => opt.selected = false);
    }

    const interestsSelect = document.getElementById('interests-filter');
    if (interestsSelect) {
        Array.from(interestsSelect.options).forEach(opt => opt.selected = false);
    }

    // Re-render
    renderLocations();
}

// Start
document.addEventListener('DOMContentLoaded', init);
