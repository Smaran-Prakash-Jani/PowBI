import jwt
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "powbi_default_secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

security = HTTPBearer()

# ── In-Memory User Store (Demo) ─────────────────────────────
users_db: dict = {}


def hash_password(password: str, salt: str = None) -> str:
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${hashed}"


def verify_password(plain: str, stored: str) -> bool:
    salt, _ = stored.split("$", 1)
    return hash_password(plain, salt) == stored


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def register_user(email: str, password: str, name: str, role: str = "analyst"):
    if email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    users_db[email] = {
        "email": email,
        "password": hash_password(password),
        "name": name,
        "role": role,
    }
    token = create_token({"sub": email, "role": role, "name": name})
    return token, {"email": email, "name": name, "role": role}


def login_user(email: str, password: str):
    user = users_db.get(email)
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": email, "role": user["role"], "name": user["name"]})
    return token, {"email": user["email"], "name": user["name"], "role": user["role"]}


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Allow mock token for easier testing/demo
    if credentials.credentials == "mocked_google_token":
        return {"sub": "google-mock@test.com", "name": "Google User", "role": "analyst"}
        
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
