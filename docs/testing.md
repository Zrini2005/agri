# Tests and Quality Assurance

## Testing Strategy

This document outlines the testing approach for the Agriculture Drone GCS system, including unit tests, integration tests, and end-to-end testing procedures.

## Backend Testing

### Unit Tests
Test individual functions and classes in isolation.

**Location**: `/backend/tests/`

#### Test Structure
```
backend/tests/
├── test_auth.py          # Authentication tests
├── test_api_fields.py    # Field API tests  
├── test_api_missions.py  # Mission API tests
├── test_database.py      # Database model tests
├── test_ai_service.py    # AI service tests
├── test_websocket.py     # WebSocket tests
└── conftest.py          # Test configuration
```

#### Example Test Implementation

**conftest.py** - Test Configuration:
```python
import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def auth_headers(client):
    # Create test user and return auth headers
    response = client.post("/auth/register", json={
        "username": "testuser",
        "email": "test@example.com", 
        "password": "testpass123"
    })
    login_response = client.post("/auth/login", json={
        "username": "testuser",
        "password": "testpass123"
    })
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

**test_auth.py** - Authentication Tests:
```python
import pytest
from fastapi.testclient import TestClient

def test_user_registration(client: TestClient):
    response = client.post("/auth/register", json={
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "securepass123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert "id" in data

def test_user_login(client: TestClient):
    # Register user first
    client.post("/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com", 
        "password": "loginpass123"
    })
    
    # Test login
    response = client.post("/auth/login", json={
        "username": "loginuser",
        "password": "loginpass123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_invalid_login(client: TestClient):
    response = client.post("/auth/login", json={
        "username": "nonexistent",
        "password": "wrongpass"
    })
    assert response.status_code == 401

def test_protected_endpoint(client: TestClient, auth_headers):
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
```

**test_api_fields.py** - Field Management Tests:
```python
import pytest
from fastapi.testclient import TestClient

def test_create_field(client: TestClient, auth_headers):
    field_data = {
        "name": "Test Field",
        "description": "A test agricultural field",
        "polygon_coordinates": {
            "type": "Polygon",
            "coordinates": [[
                [-74.0, 40.7], [-74.0, 40.8], 
                [-73.9, 40.8], [-73.9, 40.7], 
                [-74.0, 40.7]
            ]]
        },
        "area_hectares": 25.5,
        "crop_type": "corn"
    }
    
    response = client.post("/fields", json=field_data, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Field"
    assert data["crop_type"] == "corn"
    assert "id" in data

def test_get_fields(client: TestClient, auth_headers):
    # Create a field first
    field_data = {
        "name": "List Test Field",
        "polygon_coordinates": {
            "type": "Polygon", 
            "coordinates": [[[-74.0, 40.7], [-74.0, 40.8], [-73.9, 40.8], [-73.9, 40.7], [-74.0, 40.7]]]
        }
    }
    client.post("/fields", json=field_data, headers=auth_headers)
    
    # Get fields
    response = client.get("/fields", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "List Test Field"

def test_unauthorized_field_access(client: TestClient):
    response = client.get("/fields")
    assert response.status_code == 401
```

**test_ai_service.py** - AI Service Tests:
```python
import pytest
import asyncio
from ai_service import AIService
from datetime import datetime

@pytest.fixture
def ai_service():
    return AIService()

@pytest.mark.asyncio
async def test_anomaly_detection_rule_based(ai_service):
    # Test with low battery
    telemetry_data = {
        "battery_percent": 10.0,
        "altitude_m": 50.0,
        "speed_ms": 10.0,
        "gps_fix_type": 3,
        "satellites_visible": 12
    }
    
    result = await ai_service.detect_anomaly(telemetry_data)
    assert result["is_anomaly"] == True
    assert "Low battery" in result["message"]
    assert result["confidence"] > 0.5

@pytest.mark.asyncio  
async def test_battery_prediction_insufficient_data(ai_service):
    # Test with insufficient data
    telemetry_history = []
    
    result = await ai_service.predict_battery_drain(telemetry_history)
    assert "error" in result
    assert result["confidence"] == 0.0

@pytest.mark.asyncio
async def test_battery_prediction_with_data(ai_service):
    # Mock telemetry data with declining battery
    telemetry_history = []
    for i in range(10):
        telemetry = type('obj', (object,), {
            'battery_percent': 100 - i * 2,  # 2% drop per reading
            'timestamp': datetime.utcnow()
        })
        telemetry_history.append(telemetry)
    
    result = await ai_service.predict_battery_drain(telemetry_history)
    assert "drain_rate" in result
    assert result["drain_rate"] > 0
    assert result["confidence"] > 0
```

#### Running Backend Tests
```bash
cd backend

# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v

# Run tests matching pattern
pytest -k "test_auth" -v
```

## Frontend Testing

### Component Tests
Test React components in isolation using Jest and React Testing Library.

**Location**: `/frontend/src/tests/`

#### Test Structure
```
frontend/src/
├── components/__tests__/
│   └── Layout.test.tsx
├── pages/__tests__/
│   ├── Dashboard.test.tsx
│   ├── Login.test.tsx
│   └── Fields.test.tsx
├── services/__tests__/
│   ├── api.test.ts
│   └── websocket.test.ts
└── utils/__tests__/
    └── helpers.test.ts
```

#### Example Frontend Tests

**Login.test.tsx**:
```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { AuthProvider } from '../contexts/AuthContext';

// Mock API
jest.mock('../services/api');

const LoginWrapper = () => (
  <BrowserRouter>
    <AuthProvider>
      <Login />
    </AuthProvider>
  </BrowserRouter>
);

describe('Login Component', () => {
  test('renders login form', () => {
    render(<LoginWrapper />);
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(<LoginWrapper />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    const mockLogin = jest.fn().mockResolvedValue({ access_token: 'test-token' });
    
    render(<LoginWrapper />);
    
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'testpass' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpass'
      });
    });
  });
});
```

#### Running Frontend Tests
```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage --watchAll=false

# Run specific test file
npm test -- Login.test.tsx
```

## Integration Testing

### API Integration Tests
Test complete API workflows with database interactions.

**test_integration_missions.py**:
```python
import pytest
from fastapi.testclient import TestClient

def test_complete_mission_workflow(client: TestClient, auth_headers):
    # 1. Create a field
    field_response = client.post("/fields", json={
        "name": "Integration Test Field",
        "polygon_coordinates": {
            "type": "Polygon",
            "coordinates": [[[-74.0, 40.7], [-74.0, 40.8], [-73.9, 40.8], [-73.9, 40.7], [-74.0, 40.7]]]
        }
    }, headers=auth_headers)
    field_id = field_response.json()["id"]
    
    # 2. Create a mission
    mission_response = client.post("/missions", json={
        "name": "Integration Test Mission",
        "mission_type": "scouting",
        "altitude_m": 50.0,
        "speed_ms": 10.0,
        "field_id": field_id,
        "waypoints": [
            {"sequence": 1, "latitude": 40.7, "longitude": -74.0, "altitude_m": 50, "duration_s": 0},
            {"sequence": 2, "latitude": 40.8, "longitude": -73.9, "altitude_m": 50, "duration_s": 5}
        ]
    }, headers=auth_headers)
    mission_id = mission_response.json()["id"]
    
    # 3. Start mission
    start_response = client.post(f"/missions/{mission_id}/start", headers=auth_headers)
    assert start_response.status_code == 200
    
    # 4. Check mission status
    mission_detail = client.get(f"/missions/{mission_id}", headers=auth_headers)
    assert mission_detail.json()["status"] == "running"
    
    # 5. Abort mission
    abort_response = client.post(f"/missions/{mission_id}/abort", headers=auth_headers)
    assert abort_response.status_code == 200
```

### WebSocket Integration Tests
```python
import pytest
import asyncio
import websockets
import json

@pytest.mark.asyncio
async def test_websocket_telemetry_stream():
    # Connect to telemetry WebSocket
    uri = "ws://localhost:8000/ws/telemetry/1"
    
    async with websockets.connect(uri) as websocket:
        # Send test telemetry message
        test_message = {
            "type": "telemetry",
            "mission_id": 1,
            "data": {
                "latitude": 40.7128,
                "longitude": -74.0060,
                "altitude_m": 50.0,
                "battery_percent": 85.0
            }
        }
        
        await websocket.send(json.dumps(test_message))
        
        # Wait for response
        response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
        data = json.loads(response)
        
        assert data["type"] == "telemetry"
        assert data["mission_id"] == 1
```

## End-to-End Testing

### Selenium Tests
Test complete user workflows in a real browser.

**e2e_tests/test_user_journey.py**:
```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pytest

@pytest.fixture
def driver():
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(10)
    yield driver
    driver.quit()

def test_user_registration_and_mission_creation(driver):
    # Navigate to application
    driver.get("http://localhost:3000")
    
    # Register new user
    driver.find_element(By.LINK_TEXT, "Sign Up").click()
    driver.find_element(By.NAME, "username").send_keys("e2etest")
    driver.find_element(By.NAME, "email").send_keys("e2e@test.com")
    driver.find_element(By.NAME, "password").send_keys("testpass123")
    driver.find_element(By.TYPE, "submit").click()
    
    # Wait for dashboard
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.TEXT, "Dashboard"))
    )
    
    # Navigate to fields
    driver.find_element(By.LINK_TEXT, "Fields").click()
    
    # Create new field (simplified - real test would interact with map)
    driver.find_element(By.BUTTON, "Create Field").click()
    driver.find_element(By.NAME, "fieldName").send_keys("E2E Test Field")
    driver.find_element(By.BUTTON, "Save Field").click()
    
    # Navigate to missions
    driver.find_element(By.LINK_TEXT, "Missions").click()
    
    # Create mission
    driver.find_element(By.BUTTON, "Create Mission").click()
    driver.find_element(By.NAME, "missionName").send_keys("E2E Test Mission")
    
    # Verify mission appears in list
    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.CLASS_NAME, "mission-list"), "E2E Test Mission")
    )
```

#### Running E2E Tests
```bash
# Install Selenium
pip install selenium pytest

# Download ChromeDriver
# https://chromedriver.chromium.org/

# Run E2E tests
pytest e2e_tests/ -v
```

## Performance Testing

### Load Testing with Locust
Test API performance under load.

**locustfile.py**:
```python
from locust import HttpUser, task, between
import random

class DroneGCSUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login to get auth token
        response = self.client.post("/auth/login", json={
            "username": "testuser",
            "password": "testpass123"
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        
    @task(3)
    def get_dashboard_data(self):
        self.client.get("/fields", headers=self.headers)
        self.client.get("/missions", headers=self.headers)
    
    @task(2) 
    def get_telemetry(self):
        mission_id = random.randint(1, 10)
        self.client.get(f"/telemetry/{mission_id}", headers=self.headers)
    
    @task(1)
    def create_field(self):
        field_data = {
            "name": f"Load Test Field {random.randint(1, 1000)}",
            "polygon_coordinates": {
                "type": "Polygon",
                "coordinates": [[
                    [-74.0, 40.7], [-74.0, 40.8], 
                    [-73.9, 40.8], [-73.9, 40.7], 
                    [-74.0, 40.7]
                ]]
            }
        }
        self.client.post("/fields", json=field_data, headers=self.headers)
```

#### Running Load Tests
```bash
# Install Locust
pip install locust

# Run load test
locust -f locustfile.py --host=http://localhost:8000

# Open browser to http://localhost:8089 for web UI
```

## Continuous Integration

### GitHub Actions Workflow
**.github/workflows/ci.yml**:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install pytest pytest-cov
    
    - name: Run tests
      run: |
        cd backend
        pytest --cov=. --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run tests
      run: |
        cd frontend
        npm test -- --coverage --watchAll=false
    
    - name: Build
      run: |
        cd frontend
        npm run build

  integration-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Start services
      run: |
        docker-compose -f docker-compose.test.yml up -d
        
    - name: Wait for services
      run: |
        sleep 30
        curl --retry 5 --retry-delay 5 http://localhost:8000/health
    
    - name: Run integration tests
      run: |
        pytest integration_tests/ -v
    
    - name: Cleanup
      run: |
        docker-compose -f docker-compose.test.yml down
```

## Quality Metrics

### Test Coverage Targets
- **Backend**: Minimum 80% code coverage
- **Frontend**: Minimum 70% code coverage
- **Integration**: Cover all critical user workflows
- **E2E**: Cover main user journeys

### Code Quality Tools

#### Backend Linting
```bash
# Install tools
pip install black isort flake8 mypy

# Format code
black .
isort .

# Lint code
flake8 .
mypy .
```

#### Frontend Linting
```bash
# Install tools  
npm install --save-dev eslint prettier @typescript-eslint/parser

# Format code
npm run format

# Lint code
npm run lint
```

### Quality Gates
All pull requests must pass:
1. All unit tests passing
2. Code coverage thresholds met
3. No linting errors
4. Security vulnerability scans clear
5. Integration tests passing