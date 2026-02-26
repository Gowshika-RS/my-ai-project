#!/usr/bin/env python
import requests
import json

base_url = "http://localhost:8000"

# Test 3 different locations
test_locations = [
    {"lat": 37.7749, "lon": -122.4194, "name": "Location 1"},
    {"lat": 37.8049, "lon": -122.2708, "name": "Location 2"},
    {"lat": 41.8781, "lon": -87.6298, "name": "Location 3 (Chicago)"},
]

print("Testing /analyze endpoint for location-specific trends:\n")

for loc in test_locations:
    try:
        url = f"{base_url}/analyze?lat={loc['lat']}&lon={loc['lon']}"
        resp = requests.get(url, timeout=5)
        
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ {loc['name']} ({loc['lat']}, {loc['lon']})")
            print(f"   Score: {data.get('risk_score')}")
            print(f"   Level: {data.get('risk_level')}")
            print(f"   Trend: {data.get('trend')}")
            print(f"   Peak Hours: {data.get('peak_hours')}")
            print()
        else:
            print(f"❌ {loc['name']}: HTTP {resp.status_code}")
    except Exception as e:
        print(f"❌ {loc['name']}: {e}")

print("\nIf trends are different (not [5,6,5,7,6,5]), then location-based analysis is working!")
