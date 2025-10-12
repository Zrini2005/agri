# Bug Fix: Reports Page Issues

## Date: October 12, 2025
## Issues Fixed:

### 1. ✅ Missions Not Reaching Completed Status

**Problem:** 
- When the simulator completed a mission, the mission status in the database remained "running" instead of updating to "completed"
- The simulator sent `mission_status` messages with status `"completed"`, but the backend only listened for `mission_complete` type messages

**Root Cause:**
- In `backend/main.py`, the websocket handler only processed two message types:
  - `telemetry` - for drone position updates
  - `mission_complete` - for mission completion (but simulator never sent this)
- The simulator in `simulator/simulator.py` sent `mission_status` messages with different status values (started, waypoint_reached, completed)

**Solution:**
- Added a new handler `handle_mission_status_update()` in `backend/main.py` that:
  - Listens for `mission_status` type messages
  - Updates `mission.status` to "completed" when status is "completed"
  - Sets `mission.completed_at` timestamp
  - Logs mission completion to mission_logs table
  - Also handles "started" status to set `mission.started_at`
  - Logs waypoint progress
- Updated the websocket message router to call the new handler

**Files Changed:**
- `backend/main.py` (lines 813-819, added new handler at line 885-940)

---

### 2. ✅ No Data in Reports (Empty Start Date, End Date)

**Problem:**
- Reports page showed "N/A" for start dates and duration
- The page was looking for `start_time` and `end_time` fields that don't exist in the API response

**Root Cause:**
- Frontend `Reports.tsx` used `mission.start_time` and `mission.end_time`
- Backend schema and database use `started_at` and `completed_at`
- Field name mismatch between frontend and backend

**Solution:**
- Updated `frontend/src/pages/Reports.tsx`:
  - Changed `mission.start_time` to `mission.started_at`
  - Changed `mission.end_time` to `mission.completed_at`
  - Updated both in `formatDate()` and `formatDuration()` function calls

**Files Changed:**
- `frontend/src/pages/Reports.tsx` (lines 430, 438)

---

### 3. ✅ CSV Export Empty

**Problem:**
- CSV exports were empty because missions had no telemetry or log data
- This was actually a secondary issue - missions weren't completing, so no complete mission data existed

**Root Cause:**
- Missions stuck in "running" status (Issue #1)
- No `started_at` or `completed_at` timestamps being saved

**Solution:**
- Fixed by solving Issue #1 (mission status updates)
- Fixed by solving Issue #2 (date field names)
- The export endpoint `/logs/{mission_id}/export` was already working correctly

---

### 4. ✅ Mission Type Filter Mismatch

**Problem:**
- Mission type filter in Reports page didn't work
- Filter showed "Survey", "Spray", "Monitoring" but missions had types "scouting", "spraying", "custom"

**Root Cause:**
- Frontend filter options didn't match backend enum values
- Backend `schemas.py` defines MissionType as: scouting, spraying, custom
- Reports page filter used: survey, spray, monitoring

**Solution:**
- Updated `frontend/src/pages/Reports.tsx` mission type filter:
  - Changed "Survey" → "Scouting"
  - Changed "Spray" → "Spraying"  
  - Changed "Monitoring" → "Custom"
- Values now match backend schema

**Files Changed:**
- `frontend/src/pages/Reports.tsx` (lines 335-340)

---

## Testing Checklist

To verify the fixes:

1. **Start Backend**
   ```powershell
   cd backend
   python main.py
   ```

2. **Start Frontend**
   ```powershell
   cd frontend
   npm start
   ```

3. **Start Simulator**
   ```powershell
   cd simulator
   python simulator.py
   ```

4. **Create and Run a Test Mission:**
   - Login to the app
   - Create a new field (if needed)
   - Create a new mission with at least 3 waypoints
   - Start the mission
   - Wait for mission to complete (simulator will auto-complete)

5. **Verify Fixes:**
   - ✅ Mission status changes to "completed" (check Missions page)
   - ✅ Reports page shows start date/time
   - ✅ Reports page shows duration
   - ✅ Export CSV button works and contains telemetry data
   - ✅ Mission type filter works correctly
   - ✅ Status filter shows completed missions

---

## Code Changes Summary

### backend/main.py

**Added handler for mission_status messages (new function):**
```python
async def handle_mission_status_update(data: dict):
    """Handle mission status updates from simulator."""
    db = SessionLocal()
    try:
        mission_id = data.get("mission_id")
        status = data.get("status")
        
        mission = db.query(Mission).filter(Mission.id == mission_id).first()
        if not mission:
            return
        
        if status == "completed":
            mission.status = "completed"
            if not mission.completed_at:
                mission.completed_at = datetime.utcnow()
            # Log completion
            log_entry = MissionLog(...)
            db.add(log_entry)
            
        elif status == "started":
            if not mission.started_at:
                mission.started_at = datetime.utcnow()
        
        db.commit()
    finally:
        db.close()
```

**Updated websocket message router:**
```python
elif message.get("type") == "mission_status":
    await handle_mission_status_update(message["data"])
```

### frontend/src/pages/Reports.tsx

**Fixed field names:**
```tsx
// Before:
{formatDate(mission.start_time)}
{formatDuration(mission.start_time, mission.end_time)}

// After:
{formatDate(mission.started_at)}
{formatDuration(mission.started_at, mission.completed_at)}
```

**Fixed mission type filter:**
```tsx
// Before:
<MenuItem value="survey">Survey</MenuItem>
<MenuItem value="spray">Spray</MenuItem>
<MenuItem value="monitoring">Monitoring</MenuItem>

// After:
<MenuItem value="scouting">Scouting</MenuItem>
<MenuItem value="spraying">Spraying</MenuItem>
<MenuItem value="custom">Custom</MenuItem>
```

---

## Database Schema Reference

The Mission table has these timestamp fields:
- `created_at` - When mission was created
- `started_at` - When mission execution started
- `completed_at` - When mission finished
- `updated_at` - Last update timestamp

Frontend should always use `started_at` and `completed_at` for displaying mission dates.

---

## Known Issues (if any)

None - all reported issues have been fixed.

---

## Related Documentation

- See `docs/reports-feature.md` for full Reports page documentation
- See `docs/database-schema.md` for database structure
- See `backend/schemas.py` for API data models
- See `frontend/src/types/index.ts` for TypeScript types

---

**Status:** ✅ All bugs fixed and ready for testing
**Next Steps:** Test the application with a complete mission workflow
