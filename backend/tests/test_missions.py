import pytest

def test_create_mission(client, auth_headers):
    """Test mission creation"""
    # First create a field
    field_data = {
        "name": "Mission Test Field",
        "coordinates": [
            [40.7128, -74.0060],
            [40.7130, -74.0060],
            [40.7130, -74.0058],
            [40.7128, -74.0058]
        ],
        "crop_type": "wheat",
        "area_hectares": 10.0
    }
    field_response = client.post("/fields", json=field_data, headers=auth_headers)
    field_id = field_response.json()["id"]
    
    # Create mission
    mission_data = {
        "name": "Test Mission",
        "field_id": field_id,
        "mission_type": "survey",
        "altitude": 100.0,
        "speed": 5.0,
        "waypoints": [
            {"latitude": 40.7128, "longitude": -74.0060, "altitude": 100.0, "action": "photo"},
            {"latitude": 40.7129, "longitude": -74.0059, "altitude": 100.0, "action": "photo"},
            {"latitude": 40.7130, "longitude": -74.0058, "altitude": 100.0, "action": "land"}
        ]
    }
    
    response = client.post("/missions", json=mission_data, headers=auth_headers)
    assert response.status_code == 200
    
    mission = response.json()
    assert mission["name"] == "Test Mission"
    assert mission["field_id"] == field_id
    assert mission["mission_type"] == "survey"
    assert mission["altitude"] == 100.0
    assert mission["status"] == "planned"
    assert len(mission["waypoints"]) == 3

def test_get_missions(client, auth_headers):
    """Test getting user's missions"""
    # Create field and mission first
    field_data = {
        "name": "Get Mission Field",
        "coordinates": [
            [40.7128, -74.0060],
            [40.7130, -74.0060],
            [40.7130, -74.0058],
            [40.7128, -74.0058]
        ],
        "crop_type": "corn",
        "area_hectares": 8.0
    }
    field_response = client.post("/fields", json=field_data, headers=auth_headers)
    field_id = field_response.json()["id"]
    
    mission_data = {
        "name": "Get Test Mission",
        "field_id": field_id,
        "mission_type": "spray", 
        "altitude": 50.0,
        "speed": 3.0,
        "waypoints": [
            {"latitude": 40.7128, "longitude": -74.0060, "altitude": 50.0, "action": "spray"}
        ]
    }
    client.post("/missions", json=mission_data, headers=auth_headers)
    
    # Get missions
    response = client.get("/missions", headers=auth_headers)
    assert response.status_code == 200
    
    missions = response.json()
    assert len(missions) >= 1
    assert any(mission["name"] == "Get Test Mission" for mission in missions)

def test_start_mission(client, auth_headers):
    """Test starting a mission"""
    # Create field and mission
    field_data = {
        "name": "Start Mission Field",
        "coordinates": [
            [40.7128, -74.0060],
            [40.7130, -74.0060],
            [40.7130, -74.0058],
            [40.7128, -74.0058]
        ],
        "crop_type": "rice",
        "area_hectares": 6.0
    }
    field_response = client.post("/fields", json=field_data, headers=auth_headers)
    field_id = field_response.json()["id"]
    
    mission_data = {
        "name": "Start Test Mission",
        "field_id": field_id,
        "mission_type": "survey",
        "altitude": 75.0,
        "speed": 4.0,
        "waypoints": [
            {"latitude": 40.7128, "longitude": -74.0060, "altitude": 75.0, "action": "photo"},
            {"latitude": 40.7129, "longitude": -74.0059, "altitude": 75.0, "action": "photo"}
        ]
    }
    mission_response = client.post("/missions", json=mission_data, headers=auth_headers)
    mission_id = mission_response.json()["id"]
    
    # Start mission
    response = client.post(f"/missions/{mission_id}/start", headers=auth_headers)
    assert response.status_code == 200
    
    started_mission = response.json()
    assert started_mission["status"] == "active"

def test_pause_mission(client, auth_headers):
    """Test pausing an active mission"""
    # Create field and mission, then start it
    field_data = {
        "name": "Pause Mission Field",
        "coordinates": [
            [40.7128, -74.0060],
            [40.7130, -74.0060],
            [40.7130, -74.0058],
            [40.7128, -74.0058]
        ],
        "crop_type": "soy",
        "area_hectares": 4.0
    }
    field_response = client.post("/fields", json=field_data, headers=auth_headers)
    field_id = field_response.json()["id"]
    
    mission_data = {
        "name": "Pause Test Mission",
        "field_id": field_id,
        "mission_type": "survey",
        "altitude": 80.0,
        "speed": 5.5,
        "waypoints": [
            {"latitude": 40.7128, "longitude": -74.0060, "altitude": 80.0, "action": "photo"}
        ]
    }
    mission_response = client.post("/missions", json=mission_data, headers=auth_headers)
    mission_id = mission_response.json()["id"]
    
    # Start then pause mission
    client.post(f"/missions/{mission_id}/start", headers=auth_headers)
    response = client.post(f"/missions/{mission_id}/pause", headers=auth_headers)
    assert response.status_code == 200
    
    paused_mission = response.json()
    assert paused_mission["status"] == "paused"

def test_stop_mission(client, auth_headers):
    """Test stopping a mission"""
    # Create field and mission, then start it
    field_data = {
        "name": "Stop Mission Field",
        "coordinates": [
            [40.7128, -74.0060],
            [40.7130, -74.0060],
            [40.7130, -74.0058],
            [40.7128, -74.0058]
        ],
        "crop_type": "wheat",
        "area_hectares": 7.5
    }
    field_response = client.post("/fields", json=field_data, headers=auth_headers)
    field_id = field_response.json()["id"]
    
    mission_data = {
        "name": "Stop Test Mission",
        "field_id": field_id,
        "mission_type": "spray",
        "altitude": 60.0,
        "speed": 4.5,
        "waypoints": [
            {"latitude": 40.7128, "longitude": -74.0060, "altitude": 60.0, "action": "spray"}
        ]
    }
    mission_response = client.post("/missions", json=mission_data, headers=auth_headers)
    mission_id = mission_response.json()["id"]
    
    # Start then stop mission
    client.post(f"/missions/{mission_id}/start", headers=auth_headers)
    response = client.post(f"/missions/{mission_id}/stop", headers=auth_headers)
    assert response.status_code == 200
    
    stopped_mission = response.json()
    assert stopped_mission["status"] == "stopped"

def test_mission_validation(client, auth_headers):
    """Test mission data validation"""
    # Invalid mission - missing required fields
    invalid_data = {
        "name": "Invalid Mission"
        # Missing field_id, mission_type, etc.
    }
    
    response = client.post("/missions", json=invalid_data, headers=auth_headers)
    assert response.status_code == 422  # Validation error