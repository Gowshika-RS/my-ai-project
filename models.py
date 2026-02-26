from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    password = Column(String(100))

class CrimeRecord(Base):
    __tablename__ = "crime_records"
    
    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    severity = Column(Integer, default=1)
    crime_date = Column(String(10))  # YYYY-MM-DD
    time = Column(String(5))  # HH:MM
    crime_type = Column(String(100), default="Unknown")