import pandas as pd
import os
import json

# Configuration
SHEET_ID = "1wim_IcwX0OCJXeO65bQXkWdpY8Zv-zQVdZ2q72XNCpg"
BASE_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"

TABS = {
    "locations": {"gid": "0", "cols": []}, # fetching all for now
    "timeline": {"gid": "1665410250", "cols": []},
    "seasons": {"gid": "2088498144", "cols": []}
}

DATA_DIR = "data"

def fetch_and_process():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    # 1. Locations
    print("Fetching Locations...")
    url_loc = f"{BASE_URL}&gid={TABS['locations']['gid']}"
    df_loc = pd.read_csv(url_loc)
    # Basic cleaning
    df_loc = df_loc.fillna("") # Fill NaNs
    df_loc.to_json(f"{DATA_DIR}/locations.json", orient="records", indent=2)
    print(f"Saved {len(df_loc)} locations.")

    # 2. Timeline
    print("Fetching Timeline...")
    url_time = f"{BASE_URL}&gid={TABS['timeline']['gid']}"
    df_time = pd.read_csv(url_time)
    df_time = df_time.fillna("")
    df_time.to_json(f"{DATA_DIR}/timeline.json", orient="records", indent=2)
    print(f"Saved {len(df_time)} timeline entries.")

    # 3. Seasons
    print("Fetching Seasons...")
    url_seas = f"{BASE_URL}&gid={TABS['seasons']['gid']}"
    df_seas = pd.read_csv(url_seas)
    
    # Manual mapping based on inspection:
    # Col 0: Location (Events)
    # Col 1..12: Jan..Dec
    
    # We'll rename by index to be safe
    new_cols = ['Location', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    if len(df_seas.columns) >= 13:
        # Slice to first 13 columns just in case
        df_seas = df_seas.iloc[:, :13]
        df_seas.columns = new_cols
        
        # Now melt
        df_seas_melted = df_seas.melt(id_vars=['Location'], var_name='Month', value_name='Quality')
        df_seas_melted = df_seas_melted.fillna("")
        df_seas_melted.to_json(f"{DATA_DIR}/seasons.json", orient="records", indent=2)
        print(f"Saved {len(df_seas_melted)} season entries (melted with manual mapping).")
    else:
        print("Unexpected column count in Seasons, saving raw.")
        df_seas = df_seas.fillna("")
        df_seas.to_json(f"{DATA_DIR}/seasons.json", orient="records", indent=2)

if __name__ == "__main__":
    fetch_and_process()
