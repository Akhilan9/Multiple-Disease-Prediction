import sqlite3
import pandas as pd
import os

def inspect_database():
    db_path = 'local_health.db'
    
    if not os.path.exists(db_path):
        print(f"❌ Database file '{db_path}' not found. Run the app or setup script first!")
        return

    try:
        conn = sqlite3.connect(db_path)
        
        print("\n" + "="*60)
        print("📋 BIOLOGICAL PROFILES (User Baselines)")
        print("="*60)
        profiles = pd.read_sql_query("SELECT * FROM profiles", conn)
        if profiles.empty:
            print("No profiles found.")
        else:
            print(profiles.to_string(index=False))

        print("\n" + "="*60)
        print("🏥 DIAGNOSTIC HISTORY (Recent Predictions)")
        print("="*60)
        # Limit to last 10 for readability
        predictions = pd.read_sql_query("SELECT disease, confidence, risk_level, timestamp FROM predictions ORDER BY timestamp DESC LIMIT 10", conn)
        if predictions.empty:
            print("No prediction history found.")
        else:
            # Convert timestamp to readable date
            predictions['date'] = pd.to_datetime(predictions['timestamp'], unit='ms')
            print(predictions[['date', 'disease', 'confidence', 'risk_level']].to_string(index=False))

        conn.close()
        print("\n" + "="*60)
        
    except Exception as e:
        print(f"❌ Error reading database: {e}")

if __name__ == "__main__":
    inspect_database()
