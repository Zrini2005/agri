# Database Migration Script
# Adds missing columns to existing missions table

import sqlite3
import os
import shutil
from datetime import datetime

DB_FILE = "agriculture_gcs.db"
BACKUP_FILE = f"agriculture_gcs.db.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

def migrate_database():
    """Add missing columns to missions table."""
    
    if not os.path.exists(DB_FILE):
        print(f"❌ Database file '{DB_FILE}' not found!")
        print("   The database will be created automatically when you start the server.")
        return
    
    # Create backup
    print(f"📦 Creating backup: {BACKUP_FILE}")
    shutil.copy(DB_FILE, BACKUP_FILE)
    print(f"✅ Backup created successfully")
    
    # Connect to database
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Check if columns already exist
    cursor.execute("PRAGMA table_info(missions)")
    columns = [col[1] for col in cursor.fetchall()]
    
    migrations_needed = []
    
    # Check for missing columns
    if 'current_waypoint_index' not in columns:
        migrations_needed.append(('current_waypoint_index', 'INTEGER DEFAULT 0'))
    
    if 'distance_traveled' not in columns:
        migrations_needed.append(('distance_traveled', 'REAL DEFAULT 0.0'))
    
    if 'progress' not in columns:
        migrations_needed.append(('progress', 'REAL DEFAULT 0.0'))
    
    if 'simulation_state' not in columns:
        migrations_needed.append(('simulation_state', 'TEXT'))
    
    if not migrations_needed:
        print("✅ Database is already up to date! No migrations needed.")
        conn.close()
        return
    
    # Apply migrations
    print(f"\n🔧 Applying {len(migrations_needed)} migrations...")
    
    for column_name, column_def in migrations_needed:
        try:
            sql = f"ALTER TABLE missions ADD COLUMN {column_name} {column_def}"
            print(f"   Adding column: {column_name}")
            cursor.execute(sql)
            print(f"   ✅ {column_name} added successfully")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"   ⚠️  {column_name} already exists, skipping")
            else:
                print(f"   ❌ Error adding {column_name}: {e}")
                raise
    
    conn.commit()
    conn.close()
    
    print("\n✅ Migration completed successfully!")
    print(f"📊 Backup saved at: {BACKUP_FILE}")
    print("\n🚀 You can now start the backend server:")
    print("   python main.py")

if __name__ == "__main__":
    print("=" * 60)
    print("  Agriculture GCS - Database Migration")
    print("=" * 60)
    print()
    
    migrate_database()
