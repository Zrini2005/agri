import sqlite3
import os
from datetime import datetime

def fix_stuck_missions():
    """Fix missions that have 100% progress but wrong status."""
    
    db_file = "agriculture_gcs.db"
    if not os.path.exists(db_file):
        print("❌ Database file not found!")
        return
    
    print("🔧 Fixing Stuck Missions")
    print("=" * 40)
    
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    
    # Find missions with 100% progress but not completed status
    cursor.execute("""
        SELECT id, name, status, progress, current_waypoint_index 
        FROM missions 
        WHERE (progress >= 100.0 OR current_waypoint_index IS NOT NULL) 
        AND status != 'completed'
        ORDER BY id
    """)
    
    stuck_missions = cursor.fetchall()
    
    if not stuck_missions:
        print("✅ No stuck missions found!")
        conn.close()
        return
    
    print(f"Found {len(stuck_missions)} missions to fix:")
    for mission in stuck_missions:
        mission_id, name, status, progress, waypoint_idx = mission
        print(f"   Mission {mission_id}: '{name}' - Status: {status}, Progress: {progress}%")
    
    print(f"\n🔧 Fixing missions...")
    
    fixed_count = 0
    for mission in stuck_missions:
        mission_id, name, status, progress, waypoint_idx = mission
        
        # Check if mission should be completed
        should_complete = False
        reason = ""
        
        if progress is not None and progress >= 100.0:
            should_complete = True
            reason = f"progress {progress}%"
        elif waypoint_idx is not None:
            # Check total waypoints
            cursor.execute("SELECT COUNT(*) FROM waypoints WHERE mission_id = ?", (mission_id,))
            total_waypoints = cursor.fetchone()[0]
            if waypoint_idx >= total_waypoints:
                should_complete = True
                reason = f"waypoints {waypoint_idx}/{total_waypoints}"
        
        if should_complete:
            # Update mission status
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                UPDATE missions 
                SET status = 'completed', 
                    completed_at = ?,
                    progress = 100.0
                WHERE id = ?
            """, (now, mission_id))
            
            # Add log entry
            cursor.execute("""
                INSERT INTO mission_logs (mission_id, log_level, message, data, timestamp)
                VALUES (?, 'INFO', ?, '{"auto_fixed": true}', ?)
            """, (mission_id, f"Mission auto-fixed: {reason}", now))
            
            print(f"   ✅ Fixed Mission {mission_id}: {reason}")
            fixed_count += 1
        else:
            print(f"   ⏭️  Skipped Mission {mission_id}: No completion criteria met")
    
    conn.commit()
    conn.close()
    
    print(f"\n🎉 Fixed {fixed_count} missions!")
    print("💡 Refresh your browser to see the changes!")
    print("🔄 Your mission should now show 'completed' status!")

if __name__ == "__main__":
    fix_stuck_missions()