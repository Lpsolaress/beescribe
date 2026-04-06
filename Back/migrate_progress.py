
import sqlite3
import os

db_path = "/Users/luispe/Desktop/Bee-Scribe/Back/reuniones.db"

if not os.path.exists(db_path):
    print(f"Error: Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding 'progress' column...")
    cursor.execute("ALTER TABLE reuniones ADD COLUMN progress INTEGER DEFAULT 0")
    print("Column 'progress' added successfully.")
except sqlite3.OperationalError as e:
    print(f"Note: {e}")

conn.commit()
conn.close()
print("Migration completed.")
