#!/usr/bin/env python
from database import engine
from sqlalchemy import text, inspect

# Check tables
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Tables: {tables}")

if 'crime_records' in tables:
    try:
        conn = engine.connect()
        result = conn.execute(text('SELECT COUNT(*) as count FROM crime_records')).fetchone()
        print(f"\n✅ Crime records found: {result[0]}")
        
        if result[0] > 0:
            sample = conn.execute(text('SELECT * FROM crime_records LIMIT 3')).fetchall()
            cols = inspector.get_columns('crime_records')
            col_names = [c['name'] for c in cols]
            print(f"Columns: {col_names}")
            print("\nSample data:")
            for row in sample:
                print(row)
        else:
            print("⚠️ No records in crime_records table")
            
        conn.close()
    except Exception as e:
        print(f"❌ Error querying: {e}")
else:
    print("❌ crime_records table not found")
