const STATE = {
    locations: [],
    seasons: [],
    timeline: []
};

// Config mapping for column names based on observed data
const COL_MAP = {
    loc: {
        name: 'Location',
        country: 'Country',
        city: 'City',
        sport: 'Sport',
        tags: 'Tags',
        currency: 'Money'
    },
    season: {
        location: 'Location',
        month: 'Month',
        quality: 'Quality'
    },
    timeline: {
        date: 'WeekDate',
        location: 'Location',
        cost: 'WeekTotal'
    }
};

async function init() {
    console.log('Initializing App...');

    try {
        // Parallel Fetch
        const [locRes, seasRes, timeRes] = await Promise.all([
            fetch('data/locations.json'),
            fetch('data/seasons.json'),
            fetch('data/timeline.json')
        ]);

        if (!locRes.ok || !seasRes.ok || !timeRes.ok) {
            throw new Error('Failed to load one or more data files.');
        }

        STATE.locations = await locRes.json();
        STATE.seasons = await seasRes.json();
        STATE.timeline = await timeRes.json();

        console.log('Data Loaded:', STATE);

        populateFilters();
        renderLocations();

        // Update stats
        document.getElementById('loc-count').textContent = `${STATE.locations.length} Destinations`;

    } catch (error) {
        console.error('Error loading data:', error);
        document.querySelector('.content-area').innerHTML = `<div class="loading-spinner" style="color:red">Error loading data. Run python script first.</div>`;
    }
}

function populateFilters() {
    // Unique Sports
    const sports = new Set();
    const regions = new Set();

    STATE.locations.forEach(row => {
        if (row[COL_MAP.loc.sport]) sports.add(row[COL_MAP.loc.sport]);
        if (row[COL_MAP.loc.country]) regions.add(row[COL_MAP.loc.country]); // Using Country as Region for now
        // if (row['Contin']) regions.add(row['Contin']); // If Continent column exists
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
    regions.forEach(r => {
        if (!r) return;
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        regionSelect.appendChild(opt);
    });
}

function renderLocations() {
    const grid = document.getElementById('locations-grid');
    grid.innerHTML = '';

    const sportFilter = document.getElementById('sport-filter').value;
    const regionFilter = document.getElementById('region-filter').value;
    const searchFilter = document.getElementById('search-input').value.toLowerCase();
    const cheapFilter = document.getElementById('cheap-toggle').checked;

    const filtered = STATE.locations.filter(item => {
        const sport = item[COL_MAP.loc.sport] || '';
        const country = item[COL_MAP.loc.country] || '';
        const location = item[COL_MAP.loc.name] || '';
        const tags = item[COL_MAP.loc.tags] || '';

        if (sportFilter !== 'all' && sport !== sportFilter) return false;
        if (regionFilter !== 'all' && country !== regionFilter) return false;
        if (searchFilter && !location.toLowerCase().includes(searchFilter) && !country.toLowerCase().includes(searchFilter)) return false;

        if (cheapFilter) {
            // Check if tags include 'Cheap' 
            if (!tags.includes('Cheap')) return false;
        }

        return true;
    });

    document.getElementById('loc-count').textContent = `${filtered.length} Destinations`;

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';

        const name = item[COL_MAP.loc.name] || 'Unknown';
        const country = item[COL_MAP.loc.country] || '';
        const sport = item[COL_MAP.loc.sport];
        const tags = item[COL_MAP.loc.tags];

        let tagsHtml = '';
        if (sport) tagsHtml += `<span class="tag sport">${sport}</span>`;
        if (tags && tags.includes('Cheap')) tagsHtml += `<span class="tag cheap">Budget</span>`;

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">${name}</div>
                    <div class="card-subtitle">${country}</div>
                </div>
            </div>
            <div class="card-body">
                <!-- Maybe add currency info here -->
            </div>
            <div class="card-footer">
                ${tagsHtml || '<span class="tag">Explore</span>'}
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderSeasons() {
    const grid = document.getElementById('seasons-grid');
    grid.innerHTML = '';

    // Attempt to detect structure. If using the melt approach:
    // We expect object keys like { Location: "...", Month: "...", Quality: "..." }

    const selectedMonth = document.getElementById('month-selector').value; // 'Jan', 'Feb' etc.

    // Filter logic needs to be robust against "January" vs "Jan"
    // The previous Python script might output full names or short. 
    // Assuming the script outputs whatever column header was there.
    // Let's matching partial.

    const filtered = STATE.seasons.filter(item => {
        if (item['Location'] === 'Location') return false;
        const m = item['Month'] || '';
        return m.includes(selectedMonth);
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color: #94a3b8;">No data for this month. (Check data extraction)</div>';
        return;
    }

    // Sort by Quality (Green first?)
    // Need custom sort logic if 'Quality' is text like 'Green', 'Orange'

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
    const container = document.getElementById('timeline-list');
    container.innerHTML = '';

    STATE.timeline.forEach(item => {
        const div = document.createElement('div');
        div.className = 'timeline-item';

        const date = item['WeekDate'] || 'Unknown Date';
        const loc = item['Location'] || 'Unknown';
        const cost = item['WeekTotal'] || '';

        div.innerHTML = `
            <div class="timeline-date">${date}</div>
            <div style="display:flex; justify-content:space-between">
                <span>${loc}</span>
                <span class="timeline-cost">${cost || ''}</span>
            </div>
        `;
        container.appendChild(div);
    });
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
        'timeline': 'Trip History'
    };
    document.getElementById('page-title').textContent = titles[viewName];

    // Initial Render call if needed (or just rely on init)
    if (viewName === 'seasons') renderSeasons();
    if (viewName === 'timeline') renderTimeline();
}

// Start
document.addEventListener('DOMContentLoaded', init);
