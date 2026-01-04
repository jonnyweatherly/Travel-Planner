# Experience Wishlist Brainstorm Chatbot - Planning Document

## Overview
An AI-powered conversational assistant that helps users discover, brainstorm, and organize their travel experiences wishlist through natural dialogue.

## Goals
1. Help users articulate vague travel desires into specific experiences
2. Suggest experiences based on interests and past trips
3. Organize wishlist items by location, season, difficulty, cost
4. Link wishlist items to actual locations in the database
5. Create actionable travel plans from wishlist

## Core Concept

**The Problem:**
Users often have vague ideas like "I want adventure" or "something cultural" but struggle to translate these into specific, bookable experiences.

**The Solution:**
A chatbot that asks clarifying questions, suggests ideas, and helps build a structured wishlist of experiences that can be matched to locations and timelines.

## Chatbot Personality & Tone

**Character:**
- Enthusiastic travel companion
- Knowledgeable but not overwhelming
- Asks follow-up questions
- Celebrates user's choices
- Offers variety and alternatives

**Example Dialogue:**
```
Bot: "Hey! Let's brainstorm some amazing experiences for your travels!
What kind of adventure are you craving? Something active, cultural,
relaxing, or totally off-the-wall?"

User: "I love wakeboarding"

Bot: "Wakeboarding! That's awesome! 🏄‍♂️ Are you looking to:
• Learn/improve at a cable park
• Hit up world-class wakeboarding destinations
• Combine it with other water sports
• Or maybe teach others?"

User: "World-class destinations"

Bot: "Perfect! I know some incredible spots. Do you prefer:
• Warm tropical vibes (Thailand, Philippines)
• European style (Spain, Germany)
• Or something totally unique (NZ, Australia)?"
```

## Features

### 1. Conversation Flow

**Entry Points:**
- New "Wishlist" tab in navigation
- "Brainstorm experiences" button
- Quick add from location pages ("Add to wishlist")

**Conversation Paths:**

**Path A: Interest-Based Discovery**
1. Ask about general interests (adventure, culture, food, nature)
2. Drill down to specific activities
3. Suggest experience variations
4. Save to wishlist with metadata

**Path B: Location-Based Ideas**
1. User selects a location
2. Bot suggests experiences available there
3. User picks favorites
4. Bot suggests similar experiences in other locations

**Path C: Refinement Mode**
1. Bot shows existing wishlist
2. Asks clarifying questions to improve matches
3. Suggests additions based on patterns
4. Helps prioritize

### 2. Wishlist Structure

**Wishlist Item Schema:**
```javascript
{
  id: "uuid",
  title: "Wakeboarding at cable park",
  category: "Water Sports",
  description: "Learn tricks at a world-class cable park",
  difficulty: "Intermediate",
  estimatedCost: "$50-100",
  duration: "Half day",
  season: "Summer preferred",
  locations: ["Chiang Mai", "Phuket", "Manila"],
  tags: ["wakeboarding", "cable", "water-sports"],
  priority: "high",
  status: "wishlist", // wishlist, planned, completed
  addedDate: "2025-03-15",
  completedDate: null,
  notes: "Want to learn backflip"
}
```

### 3. AI Integration Options

**Option 1: Client-Side Rules Engine (No AI)**
- Pre-programmed conversation trees
- Pattern matching on keywords
- Deterministic responses
- **Pros:** Free, fast, works offline, privacy
- **Cons:** Limited flexibility, needs manual updates

**Option 2: Claude API (Current setup)**
- Use existing Anthropic API setup
- Natural conversation flow
- Context-aware suggestions
- **Pros:** Very natural, learns patterns, creative suggestions
- **Cons:** Requires API key, costs money, needs backend

**Option 3: Hybrid Approach**
- Use rules for common paths
- Fall back to AI for complex queries
- Cache AI responses for common questions
- **Pros:** Balance of cost and quality
- **Cons:** More complex to implement

**Recommendation:** Start with Option 1 (rules engine), upgrade to hybrid later

### 4. Question Templates

**Discovery Questions:**
```javascript
const questions = {
  interests: [
    "What type of experiences excite you most?",
    "Are you more into active adventures or relaxing escapes?",
    "Indoor or outdoor activities?",
    "Solo experiences or group activities?"
  ],

  specifics: {
    adventure: [
      "What's your comfort level with physical challenges?",
      "Water, land, or air-based adventures?",
      "Adrenaline rush or scenic exploration?"
    ],
    culture: [
      "Modern culture or historical sites?",
      "Museums, performances, or local interactions?",
      "Specific time periods or regions interest you?"
    ],
    food: [
      "Street food adventures or fine dining?",
      "Cooking classes or food tours?",
      "Any cuisines you're curious about?"
    ]
  },

  constraints: [
    "What's your budget range for experiences?",
    "Any physical limitations to consider?",
    "Traveling solo, couple, or group?",
    "Time commitments (hours, days, weeks)?"
  ]
}
```

### 5. Experience Database

**Pre-loaded Experiences:**
```javascript
const experienceTemplates = {
  waterSports: {
    wakeboarding: {
      title: "Wakeboarding",
      variations: [
        "Cable park session",
        "Boat wakeboarding",
        "Wakeboarding course (beginner)",
        "Advanced trick training",
        "Wakeboarding competition"
      ],
      locations: ["Chiang Mai", "Phuket", "Manila", "Bali"],
      season: "Year-round in tropical locations",
      cost: "$30-100 per session",
      difficulty: "Beginner to Advanced"
    },
    surfing: {
      // Similar structure
    }
  },
  cultural: {
    // Cultural experiences
  },
  food: {
    // Food experiences
  }
}
```

### 6. Matching Algorithm

**Location Matching:**
1. Extract keywords from wishlist item
2. Match against location tags and sport fields
3. Check season compatibility
4. Filter by budget if specified
5. Rank by relevance score

**Experience Suggestions:**
1. Analyze user's existing wishlist
2. Find patterns (e.g., all water sports, all budget-friendly)
3. Suggest similar experiences
4. Suggest complementary experiences

### 7. UI Components

**Chat Interface:**
- Message thread (user and bot messages)
- Quick reply buttons for common responses
- Input field with send button
- "Start over" and "Surprise me" options
- Typing indicator while bot "thinks"

**Wishlist View:**
- Card layout with experience details
- Filter by category, location, status
- Sort by priority, date added, cost
- Quick actions: Edit, Complete, Delete, Add to Timeline

**Integration Cards:**
- On location pages: "Experiences available here"
- On timeline: "Plan an experience for this trip"
- In reports: "Wishlist completion rate"

## Conversation Examples

### Example 1: Complete Flow
```
Bot: Welcome to the Experience Brainstorm! 🌟 Let's discover
     amazing things to do on your travels. What are you in the
     mood for today?

[Buttons: Adventure | Culture | Food | Relaxation | Surprise Me]

User: *clicks Adventure*

Bot: Adventure it is! 🏔️ Do you want to get your heart racing,
     or more of a scenic exploration vibe?

[Buttons: Adrenaline Rush | Scenic Exploration | Both Sound Good]

User: *clicks Adrenaline Rush*

Bot: Love it! Water, land, or air-based thrills?

[Buttons: Water 💦 | Land 🏔️ | Air ✈️]

User: *clicks Water*

Bot: Perfect! I've got some ideas:
     • Wakeboarding/Cable parks
     • White water rafting
     • Kitesurfing
     • Scuba diving (wreck/cave)
     • Jet skiing adventures

     Which catches your eye?

User: "Wakeboarding and kitesurfing"

Bot: Excellent choices! 🏄‍♂️ For wakeboarding, are you:
     • Complete beginner
     • Can get up on the board
     • Ready for tricks

User: "Ready for tricks"

Bot: Nice! I'll add "Advanced wakeboarding sessions" to your
     wishlist. I know some world-class cable parks in:
     • Chiang Mai, Thailand 🇹🇭
     • Phuket, Thailand 🇹🇭
     • CamSur, Philippines 🇵🇭

     Added to wishlist! ✅

     Want to explore kitesurfing next, or brainstorm something
     completely different?

[Buttons: Kitesurfing | Something New | See My Wishlist]
```

### Example 2: Refinement
```
User: "Show me my wishlist"

Bot: You've got 5 awesome experiences saved! I notice you're
     really into water sports (wakeboarding, kitesurfing,
     diving). Want me to suggest more in that vein, or help
     you explore other interests?

[Buttons: More Water Sports | Explore New Interests | I'm Happy]

User: *clicks More Water Sports*

Bot: Based on your love for board sports, you might enjoy:
     • Stand-up paddleboarding (SUP) yoga
     • Foilboarding (new and trendy!)
     • Wingfoiling
     • Surfing (if you haven't tried yet)

     Any of these sound fun?
```

## Technical Implementation

### Rules Engine Structure

```javascript
class WishlistChatbot {
  constructor() {
    this.conversationState = {
      stage: 'initial', // initial, category, specific, refinement
      context: {},
      wishlist: [],
      messageHistory: []
    };
  }

  processMessage(userInput) {
    const intent = this.detectIntent(userInput);
    const response = this.generateResponse(intent);
    this.updateState(intent, userInput);
    return response;
  }

  detectIntent(input) {
    // Pattern matching and keyword detection
    // Returns: { intent: 'select_adventure', confidence: 0.9, entities: [] }
  }

  generateResponse(intent) {
    // Look up response template
    // Fill in dynamic content
    // Return message + quick reply buttons
  }

  addToWishlist(experience) {
    // Validate and save
    // Return confirmation
  }
}
```

### Data Flow

1. User types message or clicks button
2. Send to chatbot engine
3. Engine processes and updates state
4. Generate response with options
5. Display in chat UI
6. If wishlist action, save to localStorage
7. Update wishlist view in real-time

### Storage

```javascript
// LocalStorage
{
  wishlistItems: [...],
  chatHistory: [...], // Optional: save conversations
  userPreferences: {
    favoriteCategories: ['water-sports', 'culture'],
    budgetRange: 'moderate',
    travelStyle: 'adventure'
  }
}
```

## Integration with Existing Features

### Locations
- "Experiences here" section on location detail pages
- Show count of wishlist items available at location
- Filter locations by wishlist experiences

### Timeline
- "Plan wishlist experience" when adding timeline entry
- Mark wishlist items as "completed" from timeline
- Suggest experiences for upcoming trips

### Reports
- Wishlist completion rate over time
- Category breakdown chart
- Experiences per location
- Budget spent on experiences vs planned

## Monetization Opportunities

1. **Premium Chatbot:**
   - AI-powered (Claude) instead of rules
   - Unlimited brainstorming sessions
   - Personalized recommendations

2. **Experience Booking:**
   - Affiliate links to GetYourGuide, Viator
   - Direct booking integration
   - Commission on bookings

3. **Curated Lists:**
   - "Top 50 Digital Nomad Experiences"
   - Location-specific experience guides
   - Sell as PDFs or in-app purchases

## Future Enhancements

1. **Social Features:**
   - Share wishlist with friends
   - See what other nomads wishlisted
   - Collaborative wishlists for group trips

2. **Gamification:**
   - Badges for completing experiences
   - "Bucket List Warrior" achievements
   - Challenges ("Complete 10 experiences in 3 months")

3. **Smart Notifications:**
   - "You're near a wishlist location!"
   - "Season starting for kitesurfing in Thailand"
   - "Price drop on experience you saved"

4. **AR Integration:**
   - Point camera at location, see wishlist items there
   - Virtual tour of experiences
   - Preview before booking

## Success Metrics

- Wishlist items added per user
- Conversion rate (wishlist → completed)
- Engagement: messages per session
- Retention: return visits to chatbot
- Booking conversion (if monetized)

## Implementation Priority

### Phase 1 (MVP):
- Basic rules-based chatbot
- Core question flow
- Wishlist CRUD operations
- Simple category-based suggestions

### Phase 2:
- Location matching
- Timeline integration
- Experience templates database
- Filtering and search

### Phase 3:
- AI upgrade (Claude API)
- Advanced pattern recognition
- Personalized suggestions
- Social sharing

### Phase 4:
- Booking integration
- Gamification
- Mobile app
- AR features

## Privacy Considerations

- All data stored locally
- No tracking of user preferences without consent
- Option to clear chat history
- Anonymous usage statistics only

## Testing Strategy

1. **Conversation Flow Testing:**
   - Test all question paths
   - Ensure no dead ends
   - Validate state transitions

2. **Edge Cases:**
   - Empty input
   - Very long messages
   - Rapid-fire clicking
   - Browser refresh mid-conversation

3. **Integration Testing:**
   - Wishlist save/load
   - Location matching accuracy
   - Timeline integration

4. **User Testing:**
   - A/B test conversation styles
   - Measure engagement metrics
   - Gather qualitative feedback
