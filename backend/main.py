from fastapi import FastAPI, HTTPException, WebSocket, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import numpy as np
import pandas as pd
import asyncio
import os
import sqlite3
import json
import tempfile

# Determine base paths robustly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "disease_predictor.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "models", "features.pkl")
DB_PATH = os.getenv("DB_PATH", os.path.join(tempfile.gettempdir() if "VERCEL" in os.environ else BASE_DIR, "local_health.db"))

# Create FastAPI app
app = FastAPI(title="Disease Prediction API", version="1.0.0")

# Setup CORS with non-wildcard credentials support
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
).split(",")
parsed_origins = [o.strip() for o in ALLOWED_ORIGINS if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=parsed_origins if parsed_origins else ["*"],
    allow_credentials=True if parsed_origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI LLM Pipeline Init
import google.generativeai as genai
from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))
try:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        genai.configure(api_key=gemini_key)
        genai_model = genai.GenerativeModel('gemini-1.5-flash')
    else:
        genai_model = None
except Exception as e:
    print(f"Warning: Gemini API Key not found or invalid: {e}")
    genai_model = None

model = None
features = []

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            disease TEXT,
            confidence REAL,
            risk_level TEXT,
            input_data TEXT,
            timestamp INTEGER
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            medicine_name TEXT,
            dosage TEXT,
            frequency TEXT,
            time TEXT,
            timestamp INTEGER
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            user_id TEXT PRIMARY KEY,
            age INTEGER,
            gender INTEGER,
            bmi REAL,
            blood_pressure_sys INTEGER,
            blood_pressure_dia INTEGER,
            sugar_level REAL,
            temperature REAL,
            cholesterol INTEGER,
            heart_rate INTEGER,
            smoking_status INTEGER,
            updated_at INTEGER
        )
    ''')
    # Auto-migrate columns if table already existed with older schema
    c.execute('PRAGMA table_info(profiles)')
    existing_cols = [col[1] for col in c.fetchall()]
    for col_name, col_type in [("cholesterol", "INTEGER"), ("heart_rate", "INTEGER"), ("smoking_status", "INTEGER")]:
        if col_name not in existing_cols:
            try:
                c.execute(f"ALTER TABLE profiles ADD COLUMN {col_name} {col_type}")
            except Exception:
                pass
    conn.commit()
    conn.close()

@app.on_event("startup")
def load_model():
    global model, features
    
    # Initialize DB
    init_db()
    
    if os.path.exists(MODEL_PATH) and os.path.exists(FEATURES_PATH):
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        with open(FEATURES_PATH, "rb") as f:
            features = pickle.load(f)
    else:
        print(f"Warning: Model or features not found at {MODEL_PATH} / {FEATURES_PATH}. Please run train_model.py.")

class PredictionRequest(BaseModel):
    age: float
    gender: int
    bmi: float
    blood_pressure_sys: float
    blood_pressure_dia: float
    sugar_level: float
    cholesterol: float
    heart_rate: float
    temperature: float
    smoking_status: int
    chest_pain: int
    polyuria: int
    fatigue: int
    cough: int
    sore_throat: int
    weight_change: int
    sudden_numbness: int
    slurred_speech: int
    thyroid_swelling: int
    unexplained_lump: int
    night_sweats: int
    user_id: str = None  # Optional: If provided, backend will handle persistence internally

class PredictionResponse(BaseModel):
    disease: str
    confidence: float
    risk_level: str
    suggested_medicines: list[str] = []

def calculate_risk_level(confidence: float) -> str:
    if confidence < 0.31:
        return "Low"
    elif confidence <= 0.70:
        return "Medium"
    else:
        return "High"

api_router = APIRouter()

@api_router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "features_loaded": len(features) > 0
    }

@api_router.post("/predict", response_model=PredictionResponse)
async def predict_disease(data: PredictionRequest):
    if not model:
        raise HTTPException(status_code=500, detail="Model is not loaded.")
    
    input_data = pd.DataFrame([data.dict(exclude={"user_id"})])
    for col in features:
        if col not in input_data.columns:
            input_data[col] = 0
            
    input_data = input_data[features]
    
    try:
        prediction = model.predict(input_data)[0]
        probabilities = model.predict_proba(input_data)[0]
        confidence = float(np.max(probabilities))
        risk_level = calculate_risk_level(confidence)
        
        if prediction == "Healthy":
            risk_level = "Low"
            if confidence > 0.5:
                 confidence = 1.0 - confidence
                 
        # ASYNC Neural Consultation - Consistently retrieving 3 interventions
        suggested_medicines = []
        if genai_model:
            try:
                system_prompt = f"List exactly 3 standard over-the-counter medicines or common lifestyle interventions for a patient with '{prediction}'. Output strictly as a valid JSON array of strings, nothing else. Example: [\"Aspirin\", \"Bed Rest\", \"Vitamin C\"]"
                response = await genai_model.generate_content_async(system_prompt)
                res_text = response.text.strip()
                if res_text.startswith("```json"):
                    res_text = res_text[7:-3].strip()
                elif res_text.startswith("```"):
                    res_text = res_text[3:-3].strip()
                suggested_medicines = json.loads(res_text)
            except Exception as e:
                print(f"Async GenAI extraction failure: {e}")
                
        # Fail-safe static lookup if AI is rate-limited
        if type(suggested_medicines) != list or len(suggested_medicines) == 0:
            if prediction == "Healthy":
                suggested_medicines = ["Maintain Balanced Diet", "Daily Multivitamins", "Routine Cardio"]
            elif prediction == "Heart Disease":
                 suggested_medicines = ["Aspirin (Consult Doctor)", "Reduce Sodium Intake", "Monitor Blood Pressure"]
            elif prediction == "Diabetes":
                 suggested_medicines = ["Monitor Blood Sugar", "Eliminate Processed Sugars", "Metformin (Prescription Only)"]
            elif prediction == "Tumor":
                 suggested_medicines = ["Consult Oncologist Immediately", "Diagnostic Biopsy (Prescription)", "PET/CT Scan Referral"]
            else:
                 suggested_medicines = ["Aggressive Hydration", "Bed Rest", "Consult Remote Physician"]
        
        # INTERNAL PERSISTENCE CONSOLIDATION 
        if data.user_id:
            try:
                import time
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute('''
                    INSERT INTO predictions (user_id, disease, confidence, risk_level, input_data, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (data.user_id, prediction, round(confidence, 2), risk_level, json.dumps(data.dict(exclude={"user_id"})), int(time.time()*1000)))
                conn.commit()
                conn.close()
            except Exception as db_err:
                print(f"Internal Persistance failure: {db_err}")

        return PredictionResponse(
            disease=prediction,
            confidence=round(confidence, 2),
            risk_level=risk_level,
            suggested_medicines=suggested_medicines
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SavePredictionRequest(BaseModel):
    userId: str
    disease: str
    confidence: float
    riskLevel: str
    inputData: dict
    timestamp: int

@api_router.post("/history/predict")
def save_prediction(data: SavePredictionRequest):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO predictions (user_id, disease, confidence, risk_level, input_data, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data.userId, data.disease, data.confidence, data.riskLevel, json.dumps(data.inputData), data.timestamp))
    conn.commit()
    conn.close()
    return {"status": "success"}

@api_router.get("/history/predict/{uid}")
def get_predictions(uid: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM predictions WHERE user_id = ? ORDER BY timestamp DESC", (uid,))
    rows = c.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        results.append({
            "id": str(row["id"]),
            "userId": row["user_id"],
            "disease": row["disease"],
            "confidence": row["confidence"],
            "riskLevel": row["risk_level"],
            "inputData": json.loads(row["input_data"]),
            "timestamp": row["timestamp"]
        })
    return results

class ReminderRequest(BaseModel):
    userId: str
    medicineName: str
    dosage: str
    frequency: str
    time: str
    timestamp: int

@api_router.post("/history/reminders")
def create_reminder(data: ReminderRequest):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO reminders (user_id, medicine_name, dosage, frequency, time, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data.userId, data.medicineName, data.dosage, data.frequency, data.time, data.timestamp))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    return {"status": "success", "id": str(new_id)}

@api_router.get("/history/reminders/{uid}")
def get_reminders(uid: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM reminders WHERE user_id = ? ORDER BY timestamp DESC", (uid,))
    rows = c.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        results.append({
            "id": str(row["id"]),
            "userId": row["user_id"],
            "medicineName": row["medicine_name"],
            "dosage": row["dosage"],
            "frequency": row["frequency"],
            "time": row["time"],
            "timestamp": row["timestamp"]
        })
    return results

@api_router.put("/history/reminders/{rem_id}")
def update_reminder(rem_id: int, data: ReminderRequest):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        UPDATE reminders 
        SET medicine_name=?, dosage=?, frequency=?, time=?, timestamp=?
        WHERE id=? AND user_id=?
    ''', (data.medicineName, data.dosage, data.frequency, data.time, data.timestamp, rem_id, data.userId))
    conn.commit()
    conn.close()
    return {"status": "success"}

class UserProfile(BaseModel):
    userId: str
    age: int
    gender: int
    bmi: float
    blood_pressure_sys: int
    blood_pressure_dia: int
    sugar_level: float
    temperature: float
    cholesterol: int
    heart_rate: int
    smoking_status: int

@api_router.get("/profile/{uid}")
def get_profile(uid: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM profiles WHERE user_id = ?", (uid,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return {
            "userId": row["user_id"],
            "age": row["age"],
            "gender": row["gender"],
            "bmi": row["bmi"],
            "blood_pressure_sys": row["blood_pressure_sys"],
            "blood_pressure_dia": row["blood_pressure_dia"],
            "sugar_level": row["sugar_level"],
            "temperature": row["temperature"],
            "cholesterol": row["cholesterol"],
            "heart_rate": row["heart_rate"],
            "smoking_status": row["smoking_status"]
        }
    return None

@api_router.post("/profile")
def save_profile(data: UserProfile):
    import time
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT OR REPLACE INTO profiles 
        (user_id, age, gender, bmi, blood_pressure_sys, blood_pressure_dia, sugar_level, temperature, cholesterol, heart_rate, smoking_status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.userId, data.age, data.gender, data.bmi,
        data.blood_pressure_sys, data.blood_pressure_dia,
        data.sugar_level, data.temperature, data.cholesterol, data.heart_rate, data.smoking_status, int(time.time()*1000)
    ))
    conn.commit()
    conn.close()
    return {"status": "success"}

# Mount API router both with and without /api prefix
# This guarantees that requests with or without /api reach the correct endpoint seamlessly
app.include_router(api_router, prefix="/api")
app.include_router(api_router)

@app.get("/")
@app.get("/api")
def read_root():
    return {
        "status": "HealthPredict API running",
        "version": "1.0.0",
        "health": "/health",
        "api_health": "/api/health"
    }
