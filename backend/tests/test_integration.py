import pytest
from test_auth import *
from test_fields import *
from test_missions import *

def test_api_endpoints(client, auth_headers):
    """Test basic API health and structure"""
    # Health check
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_user_workflow(client):
    """Test complete user workflow from registration to field creation"""
    # Register user
    register_response = client.post("/auth/register", json={
        "username": "workflowuser",
        "email": "workflow@example.com",
        "password": "testpass123"
    })
    assert register_response.status_code == 200
    
    # Login
    login_response = client.post("/auth/login", json={
        "username": "workflowuser", 
        "password": "testpass123"
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create field
    field_data = {
        "name": "Test Farm Field",
        "coordinates": [
            [40.7128, -74.0060],
            [40.7130, -74.0060], 
            [40.7130, -74.0058],
            [40.7128, -74.0058]
        ],
        "crop_type": "corn",
        "area_hectares": 5.2
    }
    field_response = client.post("/fields", json=field_data, headers=headers)
    assert field_response.status_code == 200
    field_id = field_response.json()["id"]
    
    # Get fields
    fields_response = client.get("/fields", headers=headers)
    assert fields_response.status_code == 200
    assert len(fields_response.json()) == 1