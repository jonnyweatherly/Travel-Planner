// Get trip parameters from URL
const urlParams = new URLSearchParams(window.location.search);
const tripLocation = urlParams.get('location');
const startDate = urlParams.get('start');

// Reuse helper functions from app.js
function parseCurrency(value) {
    if (!value || value === '') return null;
    const cleaned = value.toString().replace(/[$,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

function getCurrencySymbol(currencyCode) {
    const symbols = {
        'AUD': 'A$', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CNY': '¥',
        'CAD': 'C$', 'NZD': 'NZ$', 'CHF': 'CHF', 'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr',
        'THB': '฿', 'SGD': 'S$', 'HKD': 'HK$', 'INR': '₹', 'MXN': 'Mex$', 'BRL': 'R$',
        'ZAR': 'R', 'KRW': '₩', 'TRY': '₺', 'RUB': '₽', 'PLN': 'zł', 'CZK': 'Kč',
        'HUF': 'Ft', 'IDR': 'Rp', 'MYR': 'RM', 'PHP': '₱', 'VND': '₫', 'AED': 'AED',
        'SAR': 'SAR', 'ILS': '₪', 'EGP': 'E£', 'CLP': 'CLP$', 'COP': 'COL$',
        'PEN': 'S/', 'ARS': 'AR$'
    };
    return symbols[currencyCode] || currencyCode;
}

function formatWithCommas(num) {
    if (!num && num !== 0) return '';
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function convertToAUD(amount, fromCurrency) {
    if (!amount || !fromCurrency) return amount;
    const rates = {
        'AUD': 1.0, 'USD': 1.52, 'EUR': 1.65, 'GBP': 1.95, 'JPY': 0.0103, 'CNY': 0.21,
        'CAD': 1.09, 'NZD': 0.91, 'CHF': 1.73, 'SEK': 0.15, 'NOK': 0.14, 'DKK': 0.22,
        'THB': 0.045, 'SGD': 1.14, 'HKD': 0.19, 'INR': 0.018, 'MXN': 0.075, 'BRL': 0.25,
        'ZAR': 0.084, 'KRW': 0.0011, 'TRY': 0.044, 'RUB': 0.015, 'PLN': 0.38, 'CZK': 0.065,
        'HUF': 0.0042, 'IDR': 0.000095, 'MYR': 0.34, 'PHP': 0.026, 'VND': 0.000060,
        'AED': 0.41, 'SAR': 0.40, 'ILS': 0.42, 'EGP': 0.030, 'CLP': 0.0016, 'COP': 0.00037,
        'PEN': 0.40, 'ARS': 0.0015
    };
    const rate = rates[fromCurrency] || 1.0;
    return amount * rate;
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

const COL_MAP = {
    loc: {
        name: 'Location',
        country: 'Country',
        continent: 'Continent',
        city: 'City',
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

async function loadTripDetails() {
    console.log('loadTripDetails called');

    // Validate parameters
    console.log('Trip page loaded with:', { location: tripLocation, startDate });

    if (!tripLocation || !startDate) {
        console.error('Missing location or startDate parameter');
        document.querySelector('.location-detail-container').innerHTML =
            '<div style="text-align:center; padding: 2rem; color: #ef4444;">Missing trip parameters. Redirecting...</div>';
        setTimeout(() => {
            window.location.href = 'index.html#timeline';
        }, 2000);
        return;
    }

    try {
        console.log('Fetching data files...');
        const [locRes, seasRes, timeRes] = await Promise.all([
            fetch('data/locations.json'),
            fetch('data/seasons.json'),
            fetch('data/timeline.json')
        ]);

        console.log('Data fetched, parsing JSON...');
        const locations = await locRes.json();
        const seasons = await seasRes.json();
        const timeline = await timeRes.json();

        console.log('Data loaded:', {
            locationsCount: locations.length,
            seasonsCount: seasons.length,
            timelineCount: timeline.length
        });

        // Find the location data
        const locationData = locations.find(loc => loc[COL_MAP.loc.name] === tripLocation);
        console.log('Looking for location:', tripLocation, 'Found:', !!locationData);

        if (!locationData) {
            console.error('Location not found:', tripLocation);
            document.querySelector('.location-detail-container').innerHTML =
                '<div style="text-align:center; padding: 2rem; color: #94a3b8;">Location not found</div>';
            return;
        }

        // Find all timeline entries for this trip (group sequential visits)
        const allTimelineEntries = timeline.filter(entry => entry[COL_MAP.timeline.location] === tripLocation);
        console.log('Timeline entries for location:', allTimelineEntries.length);

        // Sort by date
        allTimelineEntries.sort((a, b) => {
            const yearA = Math.floor(parseFloat(a[COL_MAP.timeline.year] || 0));
            const yearB = Math.floor(parseFloat(b[COL_MAP.timeline.year] || 0));
            const dateA = new Date(`${a['WeekDate']} ${yearA}`);
            const dateB = new Date(`${b['WeekDate']} ${yearB}`);
            return dateA - dateB;
        });

        // Find the specific trip group that matches our start date
        const startDateObj = new Date(startDate);
        let tripWeeks = [];
        let tripStartDate = null;
        let tripEndDate = null;

        for (let i = 0; i < allTimelineEntries.length; i++) {
            const entry = allTimelineEntries[i];
            const year = Math.floor(parseFloat(entry[COL_MAP.timeline.year] || new Date().getFullYear()));
            const entryDate = new Date(`${entry['WeekDate']} ${year}`);

            // Check if this is the start of our trip (within 7 days to account for timezone/date parsing differences)
            if (Math.abs(entryDate - startDateObj) < 1000 * 60 * 60 * 24 * 7) { // Within 7 days
                tripWeeks = [entry];
                tripStartDate = entryDate;
                tripEndDate = entryDate;

                // Collect sequential weeks
                for (let j = i + 1; j < allTimelineEntries.length; j++) {
                    const nextEntry = allTimelineEntries[j];
                    const nextYear = Math.floor(parseFloat(nextEntry[COL_MAP.timeline.year] || new Date().getFullYear()));
                    const nextDate = new Date(`${nextEntry['WeekDate']} ${nextYear}`);

                    const daysDiff = (nextDate - tripEndDate) / (1000 * 60 * 60 * 24);
                    if (daysDiff <= 8) {
                        tripWeeks.push(nextEntry);
                        tripEndDate = nextDate;
                    } else {
                        break;
                    }
                }
                break;
            }
        }

        if (tripWeeks.length === 0) {
            document.querySelector('.location-detail-container').innerHTML =
                '<div style="text-align:center; padding: 2rem; color: #94a3b8;">Trip not found</div>';
            return;
        }

        // Get season data for the trip months
        const tripMonths = new Set();
        tripWeeks.forEach(week => {
            const monthName = week[COL_MAP.timeline.month];
            if (monthName) tripMonths.add(monthName);
        });

        const seasonInfo = seasons.filter(s =>
            s[COL_MAP.season.location] === tripLocation &&
            Array.from(tripMonths).some(month => {
                const monthShort = month.substring(0, 3); // "January" -> "Jan"
                return (s[COL_MAP.season.month] || '').includes(monthShort);
            })
        );

        // Update page title
        const startStr = tripStartDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const endStr = tripEndDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const dateRange = startStr === endStr ? startStr : `${startStr} - ${endStr}`;

        document.title = `${tripLocation} Trip - Travel & Sport Planner`;
        document.getElementById('trip-title').textContent = `${tripLocation} Trip`;
        document.getElementById('trip-subtitle').textContent = dateRange;

        // Render the trip detail page
        renderTripDetail(locationData, tripWeeks, tripStartDate, tripEndDate, seasonInfo);

    } catch (error) {
        console.error('Error loading trip details:', error);
        document.querySelector('.location-detail-container').innerHTML =
            '<div style="text-align:center; padding: 2rem; color: #ef4444;">Error loading trip details</div>';
    }
}

function renderTripDetail(locationData, tripWeeks, startDate, endDate, seasonInfo) {
    const container = document.querySelector('.location-detail-container');

    const name = locationData[COL_MAP.loc.name] || 'Unknown';
    const country = locationData[COL_MAP.loc.country] || '';
    const continent = locationData[COL_MAP.loc.continent] || '';
    const schengen = locationData[COL_MAP.loc.schengen];
    const sport = locationData[COL_MAP.loc.sport] || '';
    const currency = locationData[COL_MAP.loc.currency] || '';
    const currencySymbol = getCurrencySymbol(currency);
    const weeklyCost = locationData[COL_MAP.loc.weeklyCost] || '';
    const foodCost = locationData[COL_MAP.loc.foodCost] || '';
    const rentCost = locationData[COL_MAP.loc.rentCost] || '';

    // Calculate visa region and days
    const visaRegion = getVisaRegion(country, schengen);
    const daysInRegion = tripWeeks.length * 7; // Approximate days (7 days per week)

    // Convert costs
    const weeklyCostNum = parseCurrency(weeklyCost);
    const weeklyCostAUD = weeklyCostNum ? convertToAUD(weeklyCostNum, currency) : null;
    const weeklyCostDisplay = weeklyCostAUD ?
        (currency === 'AUD' ? `A$${formatWithCommas(weeklyCostAUD)}` : `${currencySymbol}${formatWithCommas(weeklyCostNum)} (A$${formatWithCommas(weeklyCostAUD)})`) : 'N/A';

    const foodCostNum = parseCurrency(foodCost);
    const foodCostAUD = foodCostNum ? convertToAUD(foodCostNum, currency) : null;
    const monthlyFoodCost = foodCostAUD ?
        (currency === 'AUD' ? `A$${formatWithCommas(foodCostAUD)}` : `${currencySymbol}${formatWithCommas(foodCostNum)} (A$${formatWithCommas(foodCostAUD)})`) : 'N/A';

    const rentCostNum = parseCurrency(rentCost);
    const rentCostAUD = rentCostNum ? convertToAUD(rentCostNum, currency) : null;
    const monthlyRentCost = rentCostAUD ?
        (currency === 'AUD' ? `A$${formatWithCommas(rentCostAUD)}` : `${currencySymbol}${formatWithCommas(rentCostNum)} (A$${formatWithCommas(rentCostAUD)})`) : 'N/A';

    // Calculate total trip cost
    const weekCount = tripWeeks.length;
    const totalTripCostAUD = weeklyCostAUD ? weeklyCostAUD * weekCount : null;
    const totalTripCostDisplay = totalTripCostAUD ? `A$${formatWithCommas(totalTripCostAUD)}` : 'N/A';

    // Format dates
    const startStr = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build season info HTML
    let seasonHTML = '';
    if (seasonInfo.length > 0) {
        seasonHTML = '<div class="season-info">';
        seasonInfo.forEach(s => {
            const quality = s[COL_MAP.season.quality] || 'Unknown';
            const q = quality.toLowerCase();
            let colorClass = 'info';

            if (q.includes('summer')) colorClass = 'summer';
            else if (q.includes('spring')) colorClass = 'spring';
            else if (q.includes('autumn') || q.includes('fall')) colorClass = 'autumn';
            else if (q.includes('winter') || q.includes('cold')) colorClass = 'winter';
            else if (q.includes('monsoon') || q.includes('hurricane') || q.includes('storm')) colorClass = 'danger';
            else if (q.includes('good') || q.includes('green')) colorClass = 'good';

            seasonHTML += `<span class="tag status-tag status-${colorClass}">${quality}</span>`;
        });
        seasonHTML += '</div>';
    }

    // Build week-by-week breakdown
    let weeksHTML = '<div class="weeks-list">';
    tripWeeks.forEach((week, index) => {
        const year = Math.floor(parseFloat(week[COL_MAP.timeline.year] || new Date().getFullYear()));
        const weekDate = new Date(`${week['WeekDate']} ${year}`);
        const weekStr = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        weeksHTML += `<div class="week-item">Week ${index + 1}: ${weekStr}</div>`;
    });
    weeksHTML += '</div>';

    container.innerHTML = `
        <div class="detail-grid">
            <div class="detail-section">
                <h2>Trip Overview</h2>
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <strong>Location:</strong> ${name}
                    </div>
                    <div class="detail-info-item">
                        <strong>Country:</strong> ${country}
                    </div>
                    <div class="detail-info-item">
                        <strong>Continent:</strong> ${continent}
                    </div>
                    <div class="detail-info-item">
                        <strong>Duration:</strong> ${weekCount} week${weekCount > 1 ? 's' : ''}
                    </div>
                    <div class="detail-info-item">
                        <strong>Start Date:</strong> ${startStr}
                    </div>
                    <div class="detail-info-item">
                        <strong>End Date:</strong> ${endStr}
                    </div>
                    ${sport ? `<div class="detail-info-item"><strong>Sport:</strong> ${sport}</div>` : ''}
                    ${seasonHTML ? `<div class="detail-info-item"><strong>Season:</strong> ${seasonHTML}</div>` : ''}
                    ${visaRegion ? `<div class="detail-info-item"><strong>Visa Region:</strong> <span class="tag visa-tag">📋 ${visaRegion}</span></div>` : ''}
                    ${visaRegion ? `<div class="detail-info-item"><strong>Days in ${visaRegion}:</strong> ~${daysInRegion} days</div>` : ''}
                </div>
            </div>

            <div class="detail-section">
                <h2>Trip Costs</h2>
                <div class="cost-grid">
                    <div class="cost-item">
                        <div class="cost-label">Total Trip Cost</div>
                        <div class="cost-value">${totalTripCostDisplay}</div>
                    </div>
                    <div class="cost-item">
                        <div class="cost-label">Weekly Cost</div>
                        <div class="cost-value">${weeklyCostDisplay}</div>
                    </div>
                    <div class="cost-item">
                        <div class="cost-label">Food per Month</div>
                        <div class="cost-value">${monthlyFoodCost}</div>
                    </div>
                    <div class="cost-item">
                        <div class="cost-label">Rent per Month</div>
                        <div class="cost-value">${monthlyRentCost}</div>
                    </div>
                </div>
            </div>

            <div class="detail-section full-width">
                <h2>Week-by-Week Breakdown</h2>
                ${weeksHTML}
            </div>

            <div class="detail-section full-width">
                <h2>Location Details</h2>
                <div style="text-align: center; padding: 1rem;">
                    <button class="location-link-btn" onclick="window.location.href='location.html?name=${encodeURIComponent(name)}'">
                        View Full Location Details →
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', loadTripDetails);
