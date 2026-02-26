# from fastapi import APIRouter, HTTPException
# from jose import jwt
# import bcrypt

# router = APIRouter()

# SECRET_KEY = "secretkey"

# fake_user = {
#     "email": "admin@gmail.com",
#     "password": bcrypt.hashpw("1234".encode(), bcrypt.gensalt())
# }

# @router.post("/login")
# def login(data: dict):
#     if data["email"] != fake_user["email"]:
#         raise HTTPException(status_code=400, detail="Invalid email")

#     if not bcrypt.checkpw(data["password"].encode(), fake_user["password"]):
#         raise HTTPException(status_code=400, detail="Invalid password")

#     token = jwt.encode({"email": data["email"]}, SECRET_KEY)

#     return {"token": token}

from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)