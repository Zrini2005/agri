import pytest

def test_create_field(client, auth_headers):
    """Test field creation"""
    field_data = {
        "name": "Test Field",
        "coordinates": [
            [40.7128, -74.0060],
            [40.7130, -74.0060],
            [40.7130, -74.0058], 
            [40.7128, -74.0058]
        ],
        "crop_type": "wheat",
        "area_hectares": 10.5
    }
    
    response = client.post("/fields", json=field_data, headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["name"] == "Test Field"
    assert data["crop_type"] == "wheat"
    assert data["area_hectares"] == 10.5
    assert len(data["coordinates"]) == 4
    assert "id" in data

def test_get_fields(client, auth_headers):
    """Test getting user's fields"""
    # Create a field first
    field_data = {
        "name": "Get Test Field",
        "coordinates": [
            [40.7128, -74.0060],
            [40.7130, -74.0060],
            [40.7130, -74.0058],
            [40.7128, -74.0058]
        ],
        "crop_type": "corn",
        "area_hectares": 8.0
    }
    client.post("/fields", json=field_data, headers=auth_headers)
    
    # Get fields
    response = client.get("/fields", headers=auth_headers)
    assert response.status_code == 200
    
    fields = response.json()
    assert len(fields) >= 1
    assert any(field["name"] == "Get Test Field" for field in fields)

def test_get_field_by_id(client, auth_headers):
    """Test getting specific field by ID"""
    # Create field
    field_data = {
        "name": "ID Test Field",
        "coordinates": [
            [40.7128, -74.0060],
            [40.7130, -74.0060],
            [40.7130, -74.0058],
            [40.7128, -74.0058]
        ],
        "crop_type": "soy",
        "area_hectares": 12.3
    }
    create_response = client.post("/fields", json=field_data, headers=auth_headers)
    field_id = create_response.json()["id"]
    
    # Get specific field
    response = client.get(f"/fields/{field_id}", headers=auth_headers)
    assert response.status_code == 200
    
    field = response.json()
    assert field["id"] == field_id
    assert field["name"] == "ID Test Field"

def test_update_field(client, auth_headers):
    """Test field update"""
    # Create field
    field_data = {
        "name": "Update Test Field",
        "coordinates": [
            [40.7128, -74.0060],
            [40.7130, -74.0060],
            [40.7130, -74.0058],
            [40.7128, -74.0058]
        ],
        "crop_type": "wheat",
        "area_hectares": 5.0
    }
    create_response = client.post("/fields", json=field_data, headers=auth_headers)
    field_id = create_response.json()["id"]
    
    # Update field
    update_data = {
        "name": "Updated Field Name",
        "crop_type": "corn",
        "area_hectares": 6.0
    }
    response = client.put(f"/fields/{field_id}", json=update_data, headers=auth_headers)
    assert response.status_code == 200
    
    updated_field = response.json()
    assert updated_field["name"] == "Updated Field Name"
    assert updated_field["crop_type"] == "corn"
    assert updated_field["area_hectares"] == 6.0

def test_delete_field(client, auth_headers):
    """Test field deletion"""
    # Create field
    field_data = {
        "name": "Delete Test Field",
        "coordinates": [
            [40.7128, -74.0060],
            [40.7130, -74.0060],
            [40.7130, -74.0058],
            [40.7128, -74.0058]
        ],
        "crop_type": "rice",
        "area_hectares": 3.5
    }
    create_response = client.post("/fields", json=field_data, headers=auth_headers)
    field_id = create_response.json()["id"]
    
    # Delete field
    response = client.delete(f"/fields/{field_id}", headers=auth_headers)
    assert response.status_code == 200
    
    # Verify deletion
    get_response = client.get(f"/fields/{field_id}", headers=auth_headers)
    assert get_response.status_code == 404

def test_field_validation(client, auth_headers):
    """Test field data validation"""
    # Invalid field - missing required fields
    invalid_data = {
        "name": "Invalid Field"
        # Missing coordinates, crop_type, area_hectares
    }
    
    response = client.post("/fields", json=invalid_data, headers=auth_headers)
    assert response.status_code == 422  # Validation error