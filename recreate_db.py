#!/usr/bin/env python
from database import engine, Base
from models import User, CrimeRecord
from sqlalchemy import inspect, text

# Drop all tables and recreate
inspector = inspect(engine)
existing_tables = inspector.get_table_names()
print(f"Existing tables: {existing_tables}")

# Drop crime_records if it exists
if 'crime_records' in existing_tables:
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE crime_records"))
        conn.commit()
    print("✓ Dropped old crime_records table")

# Recreate all tables
Base.metadata.create_all(bind=engine)
print("✓ Recreated database schema")

# Verify
inspector = inspect(engine)
print(f"\nFinal tables: {inspector.get_table_names()}")

if 'crime_records' in inspector.get_table_names():
    cols = [c['name'] for c in inspector.get_columns('crime_records')]
    print(f"crime_records columns: {cols}")
