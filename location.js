// Get location name from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const locationName = urlParams.get('name');

if (!locationName) {
    window.location.href = 'index.html';
}

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

const COL_MAP = {
    loc: {
        name: 'Location',
        country: 'Country',
        continent: 'Continent',
        city: 'City',
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

function groupVisitsIntoTrips(visits) {
    if (visits.length === 0) return [];

    // Sort by date
    const sorted = [...visits].sort((a, b) => {
        const yearA = Math.floor(parseFloat(a[COL_MAP.timeline.year] || 0));
        const yearB = Math.floor(parseFloat(b[COL_MAP.timeline.year] || 0));
        const dateA = new Date(`${a['WeekDate']} ${yearA}`);
        const dateB = new Date(`${b['WeekDate']} ${yearB}`);
        return dateA - dateB;
    });

    // Group sequential visits into trips
    const trips = [];
    let currentTrip = null;

    sorted.forEach(visit => {
        const year = Math.floor(parseFloat(visit[COL_MAP.timeline.year] || new Date().getFullYear()));
        const date = new Date(`${visit['WeekDate']} ${year}`);

        if (!currentTrip) {
            // Start first trip
            currentTrip = {
                startDate: date,
                endDate: date,
                weeks: [visit]
            };
        } else {
            // Check if this is sequential (within 8 days of last entry)
            const daysDiff = (date - currentTrip.endDate) / (1000 * 60 * 60 * 24);
            if (daysDiff <= 8) {
                // Add to current trip
                currentTrip.endDate = date;
                currentTrip.weeks.push(visit);
            } else {
                // Start new trip
                trips.push(currentTrip);
                currentTrip = {
                    startDate: date,
                    endDate: date,
                    weeks: [visit]
                };
            }
        }
    });

    if (currentTrip) trips.push(currentTrip);

    return trips;
}

async function loadLocationDetails() {
    try {
        const [locRes, seasRes, timeRes] = await Promise.all([
            fetch('data/locations.json'),
            fetch('data/seasons.json'),
            fetch('data/timeline.json')
        ]);

        const locations = await locRes.json();
        const seasons = await seasRes.json();
        const timeline = await timeRes.json();

        // Find the location
        const location = locations.find(loc => loc[COL_MAP.loc.name] === locationName);

        if (!location) {
            document.querySelector('.location-detail-container').innerHTML =
                '<div style="text-align:center; padding: 2rem; color: #94a3b8;">Location not found</div>';
            return;
        }

        // Update page title
        document.title = `${locationName} - Travel & Sport Planner`;
        document.getElementById('location-name').textContent = locationName;
        document.getElementById('location-country').textContent = location[COL_MAP.loc.country] || '';

        // Get season data for all months
        const seasonByMonth = {};
        seasons.filter(s => s[COL_MAP.season.location] === locationName).forEach(s => {
            const month = s[COL_MAP.season.month] || '';
            const quality = s[COL_MAP.season.quality] || '';
            // Parse month (might be "Jan, Feb, Mar" or just "Jan")
            month.split(',').forEach(m => {
                const monthName = m.trim();
                if (monthName) {
                    seasonByMonth[monthName] = quality;
                }
            });
        });

        // Count visits and get visit history
        const visits = timeline.filter(entry => entry[COL_MAP.timeline.location] === locationName);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const pastVisits = visits.filter(entry => {
            const yearValue = entry[COL_MAP.timeline.year];
            const monthName = entry[COL_MAP.timeline.month];
            if (!yearValue) return false;

            const entryYear = Math.floor(parseFloat(yearValue));
            const monthMap = {
                'January': 0, 'February': 1, 'March': 2, 'April': 3,
                'May': 4, 'June': 5, 'July': 6, 'August': 7,
                'September': 8, 'October': 9, 'November': 10, 'December': 11
            };
            const entryMonth = monthMap[monthName];
            return entryYear < currentYear || (entryYear === currentYear && entryMonth <= currentMonth);
        });

        // Group visits into trips (sequential visits)
        const trips = groupVisitsIntoTrips(pastVisits);

        // Render the detail page
        renderLocationDetail(location, seasonByMonth, trips);

    } catch (error) {
        console.error('Error loading location details:', error);
        document.querySelector('.location-detail-container').innerHTML =
            '<div style="text-align:center; padding: 2rem; color: #ef4444;">Error loading location details</div>';
    }
}

function renderLocationDetail(location, seasonByMonth, trips) {
    const container = document.querySelector('.location-detail-container');

    const name = location[COL_MAP.loc.name] || 'Unknown';
    const country = location[COL_MAP.loc.country] || '';
    const continent = location[COL_MAP.loc.continent] || '';
    const sport = location[COL_MAP.loc.sport] || '';
    const tags = location[COL_MAP.loc.tags] || '';
    const currency = location[COL_MAP.loc.currency] || '';
    const currencySymbol = getCurrencySymbol(currency);
    const weeklyCost = location[COL_MAP.loc.weeklyCost] || '';
    const foodCost = location[COL_MAP.loc.foodCost] || '';
    const rentCost = location[COL_MAP.loc.rentCost] || '';

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

    // Build season calendar HTML
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let seasonCalendarHTML = '<div class="season-calendar">';
    months.forEach(month => {
        const quality = seasonByMonth[month] || 'Unknown';
        const q = quality.toLowerCase();
        let colorClass = 'info';

        if (q.includes('summer')) colorClass = 'summer';
        else if (q.includes('spring')) colorClass = 'spring';
        else if (q.includes('autumn') || q.includes('fall')) colorClass = 'autumn';
        else if (q.includes('winter') || q.includes('cold')) colorClass = 'winter';
        else if (q.includes('monsoon') || q.includes('hurricane') || q.includes('storm')) colorClass = 'danger';
        else if (q.includes('good') || q.includes('green')) colorClass = 'good';
        else if (q === 'closed' || q === '') colorClass = 'closed';

        seasonCalendarHTML += `
            <div class="season-month status-${colorClass}">
                <div class="season-month-name">${month}</div>
                <div class="season-month-quality">${quality}</div>
            </div>
        `;
    });
    seasonCalendarHTML += '</div>';

    // Build trips list HTML
    let tripsHTML = '';
    if (trips.length > 0) {
        tripsHTML = '<div class="visit-history"><h3>Trip History</h3><div class="visit-list">';
        trips.forEach(trip => {
            const startStr = trip.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const endStr = trip.endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const dateRange = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
            const weekCount = trip.weeks.length;
            const startDateISO = trip.startDate.toISOString();

            tripsHTML += `
                <div class="visit-item" style="cursor: pointer;" onclick="window.location.href='trip.html?location=${encodeURIComponent(name)}&start=${encodeURIComponent(startDateISO)}'">
                    ${dateRange} (${weekCount} week${weekCount > 1 ? 's' : ''})
                </div>
            `;
        });
        tripsHTML += '</div></div>';
    }

    container.innerHTML = `
        <div class="detail-grid">
            <div id="season-section" class="detail-section full-width">
                <h2>Season Calendar</h2>
                ${seasonCalendarHTML}
            </div>

            <div id="overview-section" class="detail-section">
                <h2>Overview</h2>
                <div class="detail-info-grid">
                    <div class="detail-info-item">
                        <strong>Country:</strong> ${country}
                    </div>
                    <div class="detail-info-item">
                        <strong>Continent:</strong> ${continent}
                    </div>
                    <div class="detail-info-item">
                        <strong>Sport:</strong> ${sport || 'N/A'}
                    </div>
                    <div class="detail-info-item">
                        <strong>Currency:</strong> ${currency}
                    </div>
                    <div class="detail-info-item">
                        <strong>Tags:</strong> ${tags || 'N/A'}
                    </div>
                    <div class="detail-info-item">
                        <strong>Total Trips:</strong> ${trips.length}
                    </div>
                </div>
            </div>

            <div id="costs-section" class="detail-section">
                <h2>Costs</h2>
                <div class="cost-grid">
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

            ${tripsHTML ? `<div id="trips-section" class="detail-section full-width">${tripsHTML}</div>` : ''}
        </div>
    `;
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', loadLocationDetails);
