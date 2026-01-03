import json

def clean_locations():
    path = r'c:\Users\Jonny.Weatherly\Dev\Travel-Planner\data\locations.json'
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    fields_to_remove = [
        "OpenDate", "CloseMonth", "CamperMon", "Campground", 
        "OtherCost", "CamperCity", "CarHire", "Bike Hire", "DuoAccom"
    ]
    
    cleaned_data = []
    for item in data:
        cleaned_item = {k: v for k, v in item.items() if k not in fields_to_remove}
        cleaned_data.append(cleaned_item)
        
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, indent=2)

if __name__ == '__main__':
    clean_locations()
