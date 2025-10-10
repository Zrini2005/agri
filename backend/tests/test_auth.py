import pytest

def test_register_user(client):
    """Test user registration"""
    response = client.post("/auth/register", json={
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert "id" in data

def test_register_duplicate_user(client):
    """Test registration with existing username fails"""
    # First registration
    client.post("/auth/register", json={
        "username": "dupuser",
        "email": "dup1@example.com", 
        "password": "password123"
    })
    
    # Duplicate registration should fail
    response = client.post("/auth/register", json={
        "username": "dupuser",
        "email": "dup2@example.com",
        "password": "password456"
    })
    assert response.status_code == 400

def test_login_valid_user(client):
    """Test login with valid credentials"""
    # Register first
    client.post("/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com",
        "password": "password123"
    })
    
    # Login
    response = client.post("/auth/login", json={
        "username": "loginuser",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(client):
    """Test login with invalid credentials fails"""
    response = client.post("/auth/login", json={
        "username": "nonexistent",
        "password": "wrongpass"
    })
    assert response.status_code == 401

def test_protected_endpoint_without_auth(client):
    """Test accessing protected endpoint without authentication"""
    response = client.get("/fields")
    assert response.status_code == 401

def test_protected_endpoint_with_auth(client, auth_headers):
    """Test accessing protected endpoint with valid authentication"""
    response = client.get("/fields", headers=auth_headers)
    assert response.status_code == 200