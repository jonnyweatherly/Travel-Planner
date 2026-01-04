# Enhancements Backlog

## Issues
- 

## Immediate Goals
- Custom text-based query tool? (e.g. "Good places for wakeboarding that speak english") - Request from Paul. Add to top of explore page. Might need to send to AI, with some data about the table structure, and user preferences, to design a custom query, then reflect that in the UI.
- Add a toggle to set travel budget as being per week, per month, or per year when inputting the data.
- Allow the Transport budget to have start and end dates, using same widget construction as Annual Budget
- Write a planning document for an expense tracking so people can better estimate costs for themselves in specific locations
- Write a planning document for an experience wishlist brainstorm chatbot
- Add a search bar for medicine rules for each country (E.g. what can you bring in, how much, etc), with no information storage
- Add start and end dates for transport budget
- Add fuzzy search to the AI search bar (when using Non-AI functionality) - So that results update as letters are entered
- Allow user to favourite items in filters, such as languages, visas.
- Automatically add spoken languages to language favourites.
- Allow user to list current visas held in configuration.
- Allow user to tag items in packing list as "favorite" and display them in a separate list.
- Add a "Weight estimate" to each bag in the packing list, which the user can set (using their preferred unit of measurement from the metric/imperial picker)
- Allow user to tag items in packing list as "to buy" and display them in a separate list.
- Write a planning document for API Uses: up to 3 API options per stretch goal where it is relevant. Review all stretch goals first.
- Add a "Travel Insurance" page with insurance requirements for all locations, based on user's passports
- Add a link to Travel Insurance provider "Safety Wing" - Placeholder link for now
- Add a "travel shop" page, with placeholder links for: Esims, travel insurance, seasonal clothing (Puffers, swimwear, etc)
- Add a "public transport payment method" property to the locations details page (E.g. Opal cards or payway for some parts of Australia, pasmo in Japan, etc)
- Add a phone number management system, in config. Each phone number should have a country and a PIN (optional), and an expiry date (optional).
- Add a travel logistics page, with placeholder links for: VPN, Esim, Visas, Etc.
- Add a "Visa" page with visa requirements for all locations, based on user's passports, using visa_requirement_API_key from .env

## Stretch Goals
- Add Nomad Visa requirements list
    No central API exists.
    Could build one? Build a static DB in the interim.
    Scrape this? https://citizenremote.com/blog/digital-nomad-visa-countries/
- Add flight scenario comparison tool? (Compare costs/dates/availability across several multi-city trip options) (like the "Flight Scenario Tab)
- Add trip comparison (tick 2-3 locations to get side by side of costs with relevant dates displayed)
- AI can suggest actions/links?
- List of things like taxi /uber services, food delivery, etc per country.  
- User can request a packing list based on an itinerary of locations (implement after itinerary planner)

## Monetisation
- Add booking etc and swap to https://duffel.com/pricing
    Requires business email
- Add safetywing referral program (Travel Insurance)
    Requires business email https://safetywing.com/ambassador/registration/info
- Add finance tool referrals (Wise, Revolut, etc)
- Add locations for tax purposes? (E.g. US States)
- Add accommodation search?
- Add local experiences + courses?
- Add Referral to immigration services/lawyers?
- Credit card referrals?
- 313 cable park referrals?
- Phone number management - sell eSims?
- Links to products like go-pros, drones, seasonal clothes (puffer jackets, etc)? Tie into packing list + planned locations from scenario planner?
- VPN referral program?
- Travel QOL, supplements, lounge access, etc?
- Advertise experiences relating to the user's interests. 

