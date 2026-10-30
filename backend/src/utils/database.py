import sqlite3
import json
from pathlib import Path
from datetime import datetime

class TradingDatabase:
    def __init__(self, db_path: str = "./data/trading.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.init_database()

    def init_database(self):
        """Initialize database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id TEXT PRIMARY KEY,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                symbol TEXT NOT NULL,
                prediction TEXT NOT NULL,
                confidence REAL NOT NULL,
                price REAL NOT NULL,
                target_price REAL NOT NULL,
                stop_loss REAL NOT NULL,
                model_version TEXT,
                features JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prediction_id TEXT NOT NULL,
                was_correct BOOLEAN NOT NULL,
                actual_outcome JSON NOT NULL,
                notes TEXT,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (prediction_id) REFERENCES predictions(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS model_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_version TEXT NOT NULL,
                accuracy REAL NOT NULL,
                total_predictions INTEGER,
                correct_predictions INTEGER,
                evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        conn.close()
        print("✓ Database initialized")

    def add_prediction(self, pred_id: str, symbol: str, prediction: dict,
                       features: dict, model_version: str = "v1"):
        """Save a prediction"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO predictions
            (id, symbol, prediction, confidence, price, target_price, stop_loss,
             model_version, features)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            pred_id,
            symbol,
            prediction['prediction'],   # CHANGED: was prediction['direction']
            prediction['confidence'],
            features['current_price'],
            prediction['target_price'],
            prediction['stop_loss'],
            model_version,
            json.dumps(features)
        ))

        conn.commit()
        conn.close()
        print(f"✓ Prediction {pred_id} saved")

    def add_feedback(self, prediction_id: str, was_correct: bool,
                     actual_outcome: dict, notes: str = ""):
        """Add feedback for a prediction"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO feedback (prediction_id, was_correct, actual_outcome, notes)
            VALUES (?, ?, ?, ?)
        """, (
            prediction_id,
            was_correct,
            json.dumps(actual_outcome),
            notes
        ))

        conn.commit()
        conn.close()
        print(f"✓ Feedback recorded")

    def get_predictions_accuracy(self):
        """Calculate accuracy"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                COUNT(CASE WHEN was_correct = 1 THEN 1 END) as correct,
                COUNT(*) as total
            FROM feedback
        """)

        result = cursor.fetchone()
        conn.close()

        if result[1] == 0:
            return {"accuracy": 0, "total": 0, "correct": 0}

        return {
            "accuracy": (result[0] / result[1]) * 100,
            "correct": result[0],
            "total": result[1]
        }

if __name__ == "__main__":
    db = TradingDatabase()
    print("Database ready!")
