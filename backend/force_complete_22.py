import sqlite3
import os
from datetime import datetime

def force_complete_mission_22():
    """Force complete mission 22 regardless of progress."""
    
    db_file = "agriculture_gcs.db"
    if not os.path.exists(db_file):
        print("❌ Database file not found!")
        return
    
    print("🔧 Force Completing Mission 22")
    print("=" * 40)
    
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    
    # Get current mission 22 status
    cursor.execute("SELECT id, name, status, progress FROM missions WHERE id = 22")
    mission = cursor.fetchone()
    
    if not mission:
        print("❌ Mission 22 not found!")
        conn.close()
        return
    
    mission_id, name, old_status, old_progress = mission
    print(f"Mission 22: '{name}'")
    print(f"Current Status: {old_status}")
    print(f"Current Progress: {old_progress}%")
    
    # Force update to completed
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        UPDATE missions 
        SET status = 'completed', 
            completed_at = ?,
            progress = 100.0
        WHERE id = 22
    """, (now,))
    
    # Add log entry
    cursor.execute("""
        INSERT INTO mission_logs (mission_id, log_level, message, data, timestamp)
        VALUES (22, 'INFO', ?, '{"force_completed": true}', ?)
    """, (f"Mission force-completed from {old_status} to completed", now))
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Mission 22 force-completed!")
    print(f"   Old Status: {old_status} → New Status: completed")
    print(f"   Progress set to: 100%")
    print(f"   Completed at: {now}")
    print("\n🎉 DONE! Refresh your browser to see the change!")

if __name__ == "__main__":
    force_complete_mission_22()