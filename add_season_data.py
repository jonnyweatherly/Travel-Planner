import json

# Load the current seasons data
with open('data/seasons.json', 'r') as f:
    seasons_data = json.load(f)

# Define estimated season data for missing locations
# Based on typical seasonal patterns for these locations
estimated_seasons = {
    'France': {
        'Jan': 'Winter', 'Feb': 'Winter', 'Mar': 'Spring', 'Apr': 'Spring',
        'May': 'Spring', 'Jun': 'Summer', 'Jul': 'Summer', 'Aug': 'Summer',
        'Sep': 'Autumn', 'Oct': 'Autumn', 'Nov': 'Autumn', 'Dec': 'Winter'
    },
    'Romania': {
        'Jan': 'Winter', 'Feb': 'Winter', 'Mar': 'Spring', 'Apr': 'Spring',
        'May': 'Spring', 'Jun': 'Summer', 'Jul': 'Summer', 'Aug': 'Summer',
        'Sep': 'Autumn', 'Oct': 'Autumn', 'Nov': 'Autumn', 'Dec': 'Winter'
    },
    'Hungary': {
        'Jan': 'Winter', 'Feb': 'Winter', 'Mar': 'Spring', 'Apr': 'Spring',
        'May': 'Spring', 'Jun': 'Summer', 'Jul': 'Summer', 'Aug': 'Summer',
        'Sep': 'Autumn', 'Oct': 'Autumn', 'Nov': 'Autumn', 'Dec': 'Winter'
    },
    'Japan': {
        'Jan': 'Winter', 'Feb': 'Winter', 'Mar': 'Spring', 'Apr': 'Spring',
        'May': 'Spring', 'Jun': 'Summer', 'Jul': 'Summer', 'Aug': 'Summer',
        'Sep': 'Autumn', 'Oct': 'Autumn', 'Nov': 'Autumn', 'Dec': 'Winter'
    },
    'California': {
        'Jan': 'Mild Winter', 'Feb': 'Mild Winter', 'Mar': 'Spring', 'Apr': 'Spring',
        'May': 'Spring', 'Jun': 'Summer', 'Jul': 'Summer', 'Aug': 'Summer',
        'Sep': 'Autumn', 'Oct': 'Autumn', 'Nov': 'Autumn', 'Dec': 'Mild Winter'
    },
    'Vietnam': {
        'Jan': 'Winter', 'Feb': 'Spring', 'Mar': 'Spring', 'Apr': 'Spring',
        'May': 'Summer', 'Jun': 'Monsoon', 'Jul': 'Monsoon', 'Aug': 'Monsoon',
        'Sep': 'Monsoon', 'Oct': 'Autumn', 'Nov': 'Autumn', 'Dec': 'Winter'
    },
    'Mexico': {
        'Jan': 'Winter', 'Feb': 'Winter', 'Mar': 'Spring', 'Apr': 'Spring',
        'May': 'Spring', 'Jun': 'Summer', 'Jul': 'Summer', 'Aug': 'Summer',
        'Sep': 'Autumn', 'Oct': 'Autumn', 'Nov': 'Autumn', 'Dec': 'Winter'
    },
    'Baltics': {
        'Jan': 'Winter', 'Feb': 'Winter', 'Mar': 'Spring', 'Apr': 'Spring',
        'May': 'Spring', 'Jun': 'Summer', 'Jul': 'Summer', 'Aug': 'Summer',
        'Sep': 'Autumn', 'Oct': 'Autumn', 'Nov': 'Autumn', 'Dec': 'Winter'
    },
    'Italy': {
        'Jan': 'Winter', 'Feb': 'Winter', 'Mar': 'Spring', 'Apr': 'Spring',
        'May': 'Spring', 'Jun': 'Summer', 'Jul': 'Summer', 'Aug': 'Summer',
        'Sep': 'Autumn', 'Oct': 'Autumn', 'Nov': 'Autumn', 'Dec': 'Winter'
    },
    'Greece': {
        'Jan': 'Winter', 'Feb': 'Winter', 'Mar': 'Spring', 'Apr': 'Spring',
        'May': 'Spring', 'Jun': 'Summer', 'Jul': 'Summer', 'Aug': 'Summer',
        'Sep': 'Autumn', 'Oct': 'Autumn', 'Nov': 'Autumn', 'Dec': 'Winter'
    },
    'NZ': {
        # Southern hemisphere - opposite seasons
        'Jan': 'Summer', 'Feb': 'Summer', 'Mar': 'Autumn', 'Apr': 'Autumn',
        'May': 'Autumn', 'Jun': 'Winter', 'Jul': 'Winter', 'Aug': 'Winter',
        'Sep': 'Spring', 'Oct': 'Spring', 'Nov': 'Spring', 'Dec': 'Summer'
    },
    'Events': {
        # Keep empty for Events
        'Jan': '', 'Feb': '', 'Mar': '', 'Apr': '',
        'May': '', 'Jun': '', 'Jul': '', 'Aug': '',
        'Sep': '', 'Oct': '', 'Nov': '', 'Dec': ''
    }
}

# Update season data
for entry in seasons_data:
    location = entry['Location']
    month = entry['Month']

    if location in estimated_seasons and entry['Quality'] == '':
        entry['Quality'] = estimated_seasons[location][month]

# Save the updated data
with open('data/seasons.json', 'w') as f:
    json.dump(seasons_data, f, indent=2)

print("Season data updated successfully!")
print(f"Total entries: {len(seasons_data)}")

# Count how many entries were updated
updated_count = sum(1 for entry in seasons_data if entry['Location'] in estimated_seasons and entry['Quality'] != '')
print(f"Updated entries: {updated_count}")
