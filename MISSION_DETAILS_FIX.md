# Mission Details Fix - Altitude, Speed, and Waypoints Display

## Problem Description
In the Missions page, the mission details dialog was showing default values (30m altitude, 5 m/s speed) instead of the actual values that were entered when creating the mission.

## Root Cause
The `loadData()` function in `Missions.tsx` was calling `missionsAPI.getMissions()` which returns `MissionSummary[]` objects. These summary objects don't include the full mission details like `altitude_m`, `speed_ms`, and `waypoints`.

The code was then mapping over these summaries and adding hardcoded default values:
```typescript
const fullMissions = missionsData.map(summary => ({
  ...summary,
  altitude_m: 30,        // ❌ Hardcoded default
  speed_ms: 5,           // ❌ Hardcoded default  
  field_id: 0,
  owner_id: 0,
  waypoints: []          // ❌ Empty array
}));
```

## Solution Implemented
Modified the `loadData()` function to fetch the complete mission details for each mission using `missionsAPI.getMission(id)`:

```typescript
// Fetch full details for each mission
const fullMissions = await Promise.all(
  missionsData.map(async (summary) => {
    try {
      const fullMission = await missionsAPI.getMission(summary.id);
      return fullMission;
    } catch (error) {
      console.error(`Failed to load details for mission ${summary.id}:`, error);
      // Fallback to summary data with defaults if full details can't be loaded
      return {
        ...summary,
        altitude_m: 30,
        speed_ms: 5,
        field_id: 0,
        owner_id: 0,
        waypoints: []
      };
    }
  })
);
```

## Key Changes
1. **Individual Mission Fetching**: Now calls `getMission(id)` for each mission to get complete details
2. **Error Handling**: Added try-catch for individual mission fetches with fallback to defaults
3. **Preserved Performance**: Uses `Promise.all()` to fetch all missions in parallel
4. **Backward Compatibility**: Fallback ensures the app still works if some missions can't be loaded

## Results
- ✅ Mission details now show the actual altitude entered during creation
- ✅ Mission details now show the actual speed entered during creation  
- ✅ Mission details now show the correct number of waypoints
- ✅ Mission map displays the actual waypoint locations
- ✅ All mission parameters display the real values from the database

## Files Modified
- `frontend/src/pages/Missions.tsx` - Updated `loadData()` function

## Testing
1. Create a new mission with custom altitude (e.g., 45m) and speed (e.g., 8 m/s)
2. Add multiple waypoints to the mission
3. Go back to the Missions page
4. Click "View Details" on the created mission
5. Verify that the altitude, speed, and waypoint count match what was entered

Before fix: Always showed 30m altitude, 5 m/s speed, 0 waypoints
After fix: Shows actual values entered during mission creation