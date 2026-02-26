#!/usr/bin/env python
import pandas as pd
from database import engine
from models import CrimeRecord
from sqlalchemy.orm import sessionmaker

# Try to load CSV
try:
    df = pd.read_csv('crime_dataset.csv', nrows=5000)  # Load first 5000 rows
    print(f"Loaded {len(df)} records from CSV")
    print(f"Columns: {df.columns.tolist()}")
except Exception as e:
    print(f"❌ Error reading CSV: {e}")
    exit(1)

# Prepare data - map CSV columns to model
required_cols = ['Latitude', 'Longitude']
missing = [c for c in required_cols if c not in df.columns]
if missing:
    print(f"❌ Missing columns in CSV: {missing}")
    print(f"Available columns: {df.columns.tolist()}")
    exit(1)

# Create session
Session = sessionmaker(bind=engine)
session = Session()

try:
    # Clear existing records
    session.query(CrimeRecord).delete()
    session.commit()
    print("Cleared existing crime records")
    
    # Insert new records
    count = 0
    for idx, row in df.iterrows():
        try:
            record = CrimeRecord(
                latitude=float(row.get('Latitude', 0)),
                longitude=float(row.get('Longitude', 0)),
                severity=int(row.get('severity', 1)) if 'severity' in row else 1,
                crime_date=str(row.get('Date', '2024-01-01'))[:10] if 'Date' in row else '2024-01-01',
                time=str(row.get('time', '12:00'))[:5] if 'time' in row else '12:00',
                crime_type=str(row.get('Primary Type', 'Unknown'))[:100] if 'Primary Type' in row else 'Unknown'
            )
            session.add(record)
            count += 1
            
            if count % 500 == 0:
                print(f"✓ Inserted {count} records...")
        except Exception as e:
            print(f"Skipping row {idx}: {e}")
            continue
    
    session.commit()
    print(f"\n✅ Successfully inserted {count} crime records!")
    
except Exception as e:
    session.rollback()
    print(f"❌ Error inserting records: {e}")
finally:
    session.close()
