# Database Schema Documentation

## Overview
The Agriculture Drone GCS uses a SQLite database (development) with the following table structure designed to handle user management, field definitions, mission planning, telemetry logging, and AI insights.

## Tables

### Users
Stores user account information with authentication support.

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(100) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Key Fields:**
- `username`: Unique username for login
- `email`: User email address (must be unique)
- `hashed_password`: Bcrypt hashed password
- `is_active`: Account status flag
- `is_admin`: Administrator privilege flag

### Fields
Represents agricultural fields with geographic boundaries.

```sql
CREATE TABLE fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    polygon_coordinates JSON NOT NULL,
    area_hectares FLOAT,
    crop_type VARCHAR(50),
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

**Key Fields:**
- `polygon_coordinates`: GeoJSON polygon defining field boundaries
- `area_hectares`: Calculated field area
- `crop_type`: Type of crop grown (corn, wheat, soybeans, etc.)
- `owner_id`: Reference to the user who created the field

### Missions
Defines flight missions with parameters and waypoints.

```sql
CREATE TABLE missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    mission_type VARCHAR(20) NOT NULL, -- scouting, spraying, custom
    status VARCHAR(20) DEFAULT 'planned', -- planned, running, paused, completed, aborted
    altitude_m FLOAT NOT NULL,
    speed_ms FLOAT NOT NULL,
    field_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (field_id) REFERENCES fields(id),
    FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

**Mission Types:**
- `scouting`: Survey flights for crop monitoring
- `spraying`: Precision agriculture spraying missions
- `custom`: User-defined mission types

**Mission Status:**
- `planned`: Created but not started
- `running`: Currently executing
- `paused`: Temporarily stopped
- `completed`: Successfully finished
- `aborted`: Terminated due to error or user action

### Waypoints
Individual navigation points that define the mission flight path.

```sql
CREATE TABLE waypoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    altitude_m FLOAT NOT NULL,
    action VARCHAR(20), -- hover, photo, spray, etc.
    duration_s FLOAT DEFAULT 0,
    FOREIGN KEY (mission_id) REFERENCES missions(id)
);
```

**Key Fields:**
- `sequence`: Order of waypoint in mission
- `action`: Action to perform at waypoint (hover, take photo, spray, etc.)
- `duration_s`: Time to spend at waypoint

### Telemetry Logs
Real-time data from drone during flight execution.

```sql
CREATE TABLE telemetry_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    altitude_m FLOAT NOT NULL,
    speed_ms FLOAT NOT NULL,
    battery_percent FLOAT NOT NULL,
    heading_deg FLOAT NOT NULL,
    roll_deg FLOAT DEFAULT 0,
    pitch_deg FLOAT DEFAULT 0,
    yaw_deg FLOAT DEFAULT 0,
    gps_fix_type INTEGER DEFAULT 3, -- GPS fix quality (2D, 3D, etc.)
    satellites_visible INTEGER DEFAULT 12,
    ground_speed_ms FLOAT,
    vertical_speed_ms FLOAT,
    FOREIGN KEY (mission_id) REFERENCES missions(id)
);
```

**Telemetry Data:**
- Position: `latitude`, `longitude`, `altitude_m`
- Motion: `speed_ms`, `ground_speed_ms`, `vertical_speed_ms`, `heading_deg`
- Attitude: `roll_deg`, `pitch_deg`, `yaw_deg`
- Systems: `battery_percent`, `gps_fix_type`, `satellites_visible`

### Mission Logs
Event logging for mission execution and system messages.

```sql
CREATE TABLE mission_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    log_level VARCHAR(10) NOT NULL, -- INFO, WARNING, ERROR
    message TEXT NOT NULL,
    data JSON, -- Additional structured data
    FOREIGN KEY (mission_id) REFERENCES missions(id)
);
```

**Log Levels:**
- `INFO`: Normal operational messages
- `WARNING`: Non-critical issues that should be noted
- `ERROR`: Critical issues that may affect mission success

### AI Insights
Results from AI/ML analysis of telemetry and mission data.

```sql
CREATE TABLE ai_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    insight_type VARCHAR(50) NOT NULL, -- anomaly, battery_prediction, etc.
    confidence_score FLOAT NOT NULL, -- 0.0 to 1.0
    data JSON NOT NULL, -- Model outputs and parameters
    is_alert BOOLEAN DEFAULT FALSE,
    message TEXT,
    FOREIGN KEY (mission_id) REFERENCES missions(id)
);
```

**Insight Types:**
- `anomaly`: Detected anomalous behavior in telemetry
- `battery_prediction`: Battery drain rate and remaining time predictions
- `efficiency`: Flight path efficiency analysis
- `weather_impact`: Weather effects on flight performance

## Relationships

### One-to-Many Relationships
- **Users → Fields**: One user can own multiple fields
- **Users → Missions**: One user can create multiple missions
- **Fields → Missions**: One field can have multiple missions
- **Missions → Waypoints**: One mission has multiple waypoints
- **Missions → Telemetry Logs**: One mission generates multiple telemetry records
- **Missions → Mission Logs**: One mission has multiple log entries
- **Missions → AI Insights**: One mission can have multiple AI analysis results

### Data Integrity
- Foreign key constraints ensure referential integrity
- Cascade deletes remove related records when parent is deleted
- Unique constraints prevent duplicate usernames and emails
- Check constraints validate data ranges (e.g., battery percentage 0-100)

## Indexing Strategy

### Primary Indexes
- All tables have auto-incrementing integer primary keys
- Unique indexes on `users.username` and `users.email`

### Performance Indexes
```sql
-- Improve mission queries by user
CREATE INDEX idx_missions_owner_id ON missions(owner_id);
CREATE INDEX idx_fields_owner_id ON fields(owner_id);

-- Improve telemetry queries by mission and time
CREATE INDEX idx_telemetry_mission_time ON telemetry_logs(mission_id, timestamp);

-- Improve log queries by mission and level
CREATE INDEX idx_logs_mission_level ON mission_logs(mission_id, log_level);

-- Improve AI insight queries
CREATE INDEX idx_ai_insights_mission_type ON ai_insights(mission_id, insight_type);
```

## Data Volume Estimates

### Production Estimates (per day)
- **Users**: ~100 active users
- **Fields**: ~10 new fields
- **Missions**: ~50 missions
- **Telemetry**: ~500,000 records (10 Hz for 5-minute missions)
- **Logs**: ~5,000 entries
- **AI Insights**: ~500 insights

### Storage Growth
- Telemetry data will be the largest table
- Consider data archival strategy for telemetry older than 1 year
- Compress or aggregate historical data for reporting

## Migration Strategy

### SQLite to PostgreSQL
When scaling to production, migrate to PostgreSQL:

1. Export data using SQLAlchemy models
2. Update connection string in `config.py`
3. Run Alembic migrations for PostgreSQL
4. Import data with proper type conversions

### Schema Evolution
- Use Alembic for database migrations
- Version control all schema changes
- Test migrations on copy of production data
- Plan for zero-downtime deployments