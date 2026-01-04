# Expense Tracking System - Planning Document

## Overview
A comprehensive expense tracking system to help users estimate and monitor costs for specific locations, improving budget accuracy and travel planning.

## Goals
1. Allow users to track actual expenses in visited locations
2. Compare actual vs. estimated costs
3. Build personalized cost database over time
4. Share insights with other users (optional anonymized data)
5. Improve cost estimates based on historical data

## Core Features

### 1. Expense Entry
**Location:** Timeline view or new "Expenses" tab

**Data Fields:**
- Date (auto-populated from timeline if applicable)
- Location (dropdown from visited locations)
- Category (Food, Accommodation, Transport, Activities, Other)
- Amount (number)
- Currency (auto-detect from location, allow manual override)
- Description (optional text)
- Tags (optional: breakfast, dinner, taxi, hotel, etc.)
- Receipt photo upload (stretch goal)

**Entry Methods:**
- Manual entry form
- Quick-add button with minimal fields
- Bulk import from CSV/Excel
- Integration with timeline entries

### 2. Expense Categories
**Standard Categories:**
- 🍽️ Food & Dining (Groceries, Restaurants, Street Food, Cafes)
- 🏨 Accommodation (Hotels, Airbnb, Hostels, Long-term rental)
- 🚗 Transportation (Flights, Trains, Buses, Taxis, Car rental, Fuel)
- 🎭 Activities & Entertainment (Tours, Museums, Events, Nightlife)
- 🛒 Shopping (Clothing, Souvenirs, Gear)
- 📱 Utilities & Services (Phone, Internet, Laundry, Gym)
- 💊 Health & Medical (Insurance, Medications, Doctor visits)
- 📝 Other

**Customizable:**
- Users can create custom categories
- Sub-categories for detailed tracking

### 3. Data Visualization

**Views:**
- Daily spending graph
- Category breakdown (pie chart)
- Location comparison (bar chart)
- Budget vs. actual (line graph over time)
- Trend analysis (spending patterns over months)

**Filters:**
- Date range
- Location
- Category
- Currency

### 4. Cost Comparison

**Features:**
- Compare actual expenses to location.json estimates
- Show variance percentage
- Highlight areas of over/under spending
- Suggest budget adjustments

**Display:**
```
Location: Chiang Mai, Thailand
Estimated Weekly Cost: A$650
Your Actual Average: A$520 (20% under budget)

Breakdown:
Food: A$150 (est: A$200) ✅ Under by 25%
Accommodation: A$280 (est: A$300) ✅ Under by 7%
Transport: A$90 (est: A$150) ✅ Under by 40%
```

### 5. Personal Cost Database

**Auto-calculation:**
- Calculate user's average weekly cost per location
- Update estimates based on user's spending patterns
- Consider inflation and exchange rate changes

**Intelligence:**
- Learn user's spending style (budget, moderate, luxury)
- Adjust future estimates based on historical patterns
- Suggest similar cost locations

## Technical Implementation

### Data Storage
**LocalStorage Structure:**
```javascript
{
  expenses: [
    {
      id: "uuid",
      date: "2025-03-15",
      location: "Chiang Mai",
      country: "Thailand",
      category: "Food",
      subcategory: "Restaurant",
      amount: 250,
      currency: "THB",
      amountAUD: 10.50,
      description: "Lunch at local restaurant",
      tags: ["lunch", "thai-food"],
      receiptUrl: "optional"
    }
  ],
  userCostAverages: {
    "Chiang Mai": {
      weeklyTotal: 520,
      foodWeekly: 150,
      accommodationWeekly: 280,
      lastUpdated: "2025-03-20"
    }
  }
}
```

### Currency Conversion
**Options:**
1. Use exchange rates API (https://exchangerate-api.com - free tier: 1500 requests/month)
2. Store historical rates for past expenses
3. Allow manual rate entry for offline use
4. Cache rates daily to reduce API calls

### UI Components

**Quick Add Widget:**
- Floating action button on Timeline page
- Click to expand quick-add form
- Minimal fields: amount, category, location (pre-filled)
- "Add another" to batch add expenses

**Expense List:**
- Table view with sorting/filtering
- Edit and delete inline
- Group by date, location, or category
- Export to CSV

**Analytics Dashboard:**
- Cards showing key metrics (total spent, daily average, budget remaining)
- Interactive charts
- Date range selector
- Location filter

## Integration Points

### With Existing Features

**Timeline:**
- Link expenses to timeline entries
- Show expense summary on timeline cards
- "Add expense" button on each timeline entry

**Locations:**
- Show "Your actual cost: X" on location cards if user has data
- Replace estimated costs with personalized costs
- Badge showing "Based on your spending"

**Budget:**
- Compare total expenses to annual budget
- Show budget burn rate
- Alert when approaching budget limits
- Project budget remaining based on burn rate

**Reports:**
- Add "Expense Analysis" report
- Year-over-year comparison
- Location cost comparison
- Category spending trends

## Monetization Opportunities

1. **Premium Features:**
   - Unlimited receipt photo uploads
   - Advanced analytics and trends
   - Multi-currency portfolio tracking
   - Expense prediction AI

2. **Referral Integration:**
   - Link to expense tracking apps (Splitwise, YNAB)
   - Banking/Credit card affiliate links
   - Travel insurance with expense coverage

3. **Data Insights (Anonymized):**
   - Aggregate user data to improve cost estimates
   - Sell location cost reports to tourism boards
   - Partner with booking platforms for dynamic pricing

## Privacy & Security

**Considerations:**
- All data stored locally by default
- Optional cloud backup (encrypted)
- Anonymized data sharing opt-in
- No sharing of personal spending without consent
- GDPR compliant data export/deletion

## Future Enhancements

1. **Receipt Scanning:**
   - OCR to extract amount, date, merchant
   - Automatic categorization

2. **Shared Expenses:**
   - Split bills with travel companions
   - Group trip expense tracking

3. **Forecasting:**
   - ML predictions for future costs
   - Seasonal cost variations
   - Inflation-adjusted estimates

4. **Integrations:**
   - Import from banking apps
   - Sync with Wise, Revolut, etc.
   - Connect to credit card statements

5. **Challenges & Gamification:**
   - "Under budget" achievement badges
   - Spending challenges (e.g., "$10 food day")
   - Compare with global nomad averages

## Implementation Priority

### Phase 1 (MVP):
- Basic expense entry form
- Simple list view
- Category breakdown chart
- Local storage only

### Phase 2:
- Currency conversion
- Budget comparison
- Timeline integration
- CSV export

### Phase 3:
- Advanced analytics
- Cost predictions
- Cloud sync option
- Receipt uploads

### Phase 4:
- Mobile app
- Shared expenses
- Banking integrations
- AI predictions

## Success Metrics

- % of users who track expenses
- Average expenses tracked per user
- Accuracy improvement in cost estimates
- User retention increase
- Premium feature adoption rate

## Technical Considerations

**Performance:**
- Index expenses by date and location
- Lazy load historical data
- Cache exchange rates
- Optimize charts for large datasets

**Browser Compatibility:**
- LocalStorage limit: 5-10MB (sufficient for ~10,000 expenses)
- IndexedDB for larger datasets (future)
- Service Worker for offline capability

**Testing:**
- Unit tests for currency conversion
- Integration tests for budget calculations
- E2E tests for expense workflows
- Performance tests with large datasets
