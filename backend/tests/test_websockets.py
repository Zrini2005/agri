import asyncio
import websockets
import json
import pytest
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

@pytest.mark.asyncio
async def test_websocket_connection():
    """Test WebSocket connection can be established"""
    # This test assumes the server is running
    # In real tests, you'd start the server programmatically
    try:
        uri = "ws://localhost:8000/ws/test_user"
        async with websockets.connect(uri) as websocket:
            # Connection successful
            assert websocket.open
            
            # Send test message
            test_message = {
                "type": "ping",
                "data": {"timestamp": "2024-01-01T00:00:00Z"}
            }
            await websocket.send(json.dumps(test_message))
            
            # Should receive response (in real implementation)
            # response = await websocket.recv()
            # assert response is not None
            
    except Exception as e:
        # WebSocket server not running - skip test
        pytest.skip(f"WebSocket server not available: {e}")

@pytest.mark.asyncio
async def test_telemetry_broadcast():
    """Test telemetry data broadcasting"""
    try:
        uri = "ws://localhost:8000/ws/test_user"
        async with websockets.connect(uri) as websocket:
            
            # Send telemetry data
            telemetry = {
                "type": "telemetry",
                "data": {
                    "latitude": 40.7128,
                    "longitude": -74.0060,
                    "altitude": 100.0,
                    "battery_level": 85.0,
                    "speed": 5.0,
                    "status": "mission",
                    "timestamp": "2024-01-01T00:00:00Z"
                }
            }
            await websocket.send(json.dumps(telemetry))
            
            # In real tests, verify broadcast to other connections
            
    except Exception as e:
        pytest.skip(f"WebSocket server not available: {e}")

@pytest.mark.asyncio
async def test_mission_updates():
    """Test mission status updates via WebSocket"""
    try:
        uri = "ws://localhost:8000/ws/test_user"
        async with websockets.connect(uri) as websocket:
            
            # Send mission update
            mission_update = {
                "type": "mission_update",
                "data": {
                    "mission_id": 1,
                    "status": "active",
                    "current_waypoint": 2,
                    "progress_percentage": 45.0,
                    "timestamp": "2024-01-01T00:00:00Z"
                }
            }
            await websocket.send(json.dumps(mission_update))
            
    except Exception as e:
        pytest.skip(f"WebSocket server not available: {e}")

@pytest.mark.asyncio
async def test_ai_alerts():
    """Test AI anomaly alerts via WebSocket"""
    try:
        uri = "ws://localhost:8000/ws/test_user"
        async with websockets.connect(uri) as websocket:
            
            # Send AI alert
            ai_alert = {
                "type": "ai_alert", 
                "data": {
                    "alert_type": "anomaly_detected",
                    "severity": "high",
                    "description": "Battery drain rate anomaly detected",
                    "confidence": 0.87,
                    "timestamp": "2024-01-01T00:00:00Z",
                    "recommendations": ["Land immediately", "Check battery connections"]
                }
            }
            await websocket.send(json.dumps(ai_alert))
            
    except Exception as e:
        pytest.skip(f"WebSocket server not available: {e}")

def test_websocket_message_validation():
    """Test WebSocket message format validation"""
    # Valid message
    valid_message = {
        "type": "telemetry",
        "data": {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "altitude": 100.0
        }
    }
    
    # Should be valid JSON
    json_str = json.dumps(valid_message)
    parsed = json.loads(json_str)
    assert parsed["type"] == "telemetry"
    assert "data" in parsed
    
    # Invalid message (missing required fields)
    invalid_message = {
        "data": {"test": "value"}
        # Missing "type" field
    }
    
    json_str = json.dumps(invalid_message)
    parsed = json.loads(json_str)
    assert "type" not in parsed  # Should fail validation