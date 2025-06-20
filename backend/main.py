
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import bcrypt
import jwt
import os
from datetime import datetime, timedelta

app = FastAPI(title="Resume Comparison API", version="1.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")

# Database initialization
def init_db():
    conn = sqlite3.connect("comparison.db")
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            jd_id TEXT NOT NULL,
            jd_pdf_url TEXT NOT NULL,
            annotator_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_complete BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (annotator_id) REFERENCES users (id)
        )
    """)
    
    # Comparisons table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comparisons (
            comparison_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            jd_id TEXT NOT NULL,
            resume_id_left TEXT NOT NULL,
            resume_id_right TEXT NOT NULL,
            selected_resume_id TEXT NOT NULL,
            unselected_resume_id TEXT NOT NULL,
            reasons_selected TEXT NOT NULL,
            other_reason_text TEXT,
            display_order_left_right TEXT NOT NULL,
            comparison_type TEXT NOT NULL,
            comparison_index_in_session INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions (session_id)
        )
    """)
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class FeedbackRequest(BaseModel):
    session_id: str
    selected_resume_id: str
    unselected_resume_id: str
    reasons_selected: List[str]
    other_reason_text: Optional[str] = None

class EqualFeedbackRequest(BaseModel):
    session_id: str
    resume_id_left: str
    resume_id_right: str
    reasons_selected: List[str]
    other_reason_text: Optional[str] = None

class BadFeedbackRequest(BaseModel):
    session_id: str
    resume_id_left: str
    resume_id_right: str
    reasons_selected: List[str]
    other_reason_text: Optional[str] = None

# Authentication functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: int, username: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return {"user_id": payload["user_id"], "username": payload["username"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# API Routes
@app.post("/api/auth/login")
async def login(request: LoginRequest):
    conn = sqlite3.connect("comparison.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (request.username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(request.password, user[2]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(user[0], user[1])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user[0], "username": user[1]}
    }

@app.post("/api/auth/register")
async def register(request: LoginRequest):
    conn = sqlite3.connect("comparison.db")
    cursor = conn.cursor()
    
    try:
        hashed_password = hash_password(request.password)
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", 
                      (request.username, hashed_password))
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        token = create_access_token(user_id, request.username)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {"id": user_id, "username": request.username}
        }
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Username already exists")

@app.get("/api/comparison/request-jd")
async def request_jd_comparison(annotator_id: int, current_user = Depends(get_current_user)):
    # Mock implementation - replace with your actual logic
    import uuid
    
    session_id = str(uuid.uuid4())
    jd_id = f"jd_{datetime.now().timestamp()}"
    
    conn = sqlite3.connect("comparison.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO sessions (session_id, jd_id, jd_pdf_url, annotator_id)
        VALUES (?, ?, ?, ?)
    """, (session_id, jd_id, "https://www.africau.edu/images/default/sample.pdf", current_user["user_id"]))
    
    conn.commit()
    conn.close()
    
    return {
        "jd_available": True,
        "session": {
            "session_id": session_id,
            "jd_id": jd_id,
            "jd_pdf_url": "https://www.africau.edu/images/default/sample.pdf",
            "annotator_id": current_user["user_id"]
        },
        "first_comparison": {
            "resume_id_left": "resume_1",
            "resume_id_right": "resume_2",
            "resume_pdf_url_left": "https://www.africau.edu/images/default/sample.pdf",
            "resume_pdf_url_right": "https://www.africau.edu/images/default/sample.pdf"
        }
    }

@app.post("/api/comparison/submit-feedback")
async def submit_feedback(request: FeedbackRequest, current_user = Depends(get_current_user)):
    import uuid
    import json
    
    conn = sqlite3.connect("comparison.db")
    cursor = conn.cursor()
    
    comparison_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO comparisons (
            comparison_id, session_id, jd_id, resume_id_left, resume_id_right,
            selected_resume_id, unselected_resume_id, reasons_selected,
            other_reason_text, display_order_left_right, comparison_type,
            comparison_index_in_session
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        comparison_id, request.session_id, "mock_jd", request.selected_resume_id,
        request.unselected_resume_id, request.selected_resume_id, request.unselected_resume_id,
        json.dumps(request.reasons_selected), request.other_reason_text,
        "left-right", "normal", 1
    ))
    
    conn.commit()
    conn.close()
    
    # Mock response - implement your ranking algorithm here
    return {
        "is_session_complete": True,
        "message": "Session complete"
    }

@app.post("/api/comparison/submit-equal")
async def submit_equal_feedback(request: EqualFeedbackRequest, current_user = Depends(get_current_user)):
    import uuid
    import json
    
    conn = sqlite3.connect("comparison.db")
    cursor = conn.cursor()
    
    comparison_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO comparisons (
            comparison_id, session_id, jd_id, resume_id_left, resume_id_right,
            selected_resume_id, unselected_resume_id, reasons_selected,
            other_reason_text, display_order_left_right, comparison_type,
            comparison_index_in_session
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        comparison_id, request.session_id, "mock_jd", request.resume_id_left,
        request.resume_id_right, "equal", "equal",
        json.dumps(request.reasons_selected), request.other_reason_text,
        "left-right", "equal", 1
    ))
    
    conn.commit()
    conn.close()
    
    return {
        "is_session_complete": True,
        "message": "Session complete"
    }

@app.post("/api/comparison/submit-bad")
async def submit_bad_feedback(request: BadFeedbackRequest, current_user = Depends(get_current_user)):
    import uuid
    import json
    
    conn = sqlite3.connect("comparison.db")
    cursor = conn.cursor()
    
    comparison_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO comparisons (
            comparison_id, session_id, jd_id, resume_id_left, resume_id_right,
            selected_resume_id, unselected_resume_id, reasons_selected,
            other_reason_text, display_order_left_right, comparison_type,
            comparison_index_in_session
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        comparison_id, request.session_id, "mock_jd", request.resume_id_left,
        request.resume_id_right, "bad", "bad",
        json.dumps(request.reasons_selected), request.other_reason_text,
        "left-right", "bad", 1
    ))
    
    conn.commit()
    conn.close()
    
    return {
        "is_session_complete": True,
        "message": "Session complete"
    }

@app.get("/api/comparison/session-results")
async def get_session_results(session_id: str, current_user = Depends(get_current_user)):
    conn = sqlite3.connect("comparison.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM comparisons WHERE session_id = ?", (session_id,))
    count = cursor.fetchone()[0]
    conn.close()
    
    return {"total_comparisons": count}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
