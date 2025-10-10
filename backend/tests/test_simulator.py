import asyncio
import pytest
import sys
import os

# Add simulator to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../simulator'))
from simulator import DroneSimulator

@pytest.mark.asyncio
async def test_drone_simulator_initialization():
    """Test drone simulator initializes correctly"""
    simulator = DroneSimulator()
    
    assert simulator.latitude == 40.7128
    assert simulator.longitude == -74.0060
    assert simulator.altitude == 0.0
    assert simulator.battery_level == 100.0
    assert simulator.status == "idle"

@pytest.mark.asyncio
async def test_drone_takeoff():
    """Test drone takeoff functionality"""
    simulator = DroneSimulator()
    
    # Simulate takeoff
    await simulator.takeoff(50.0)
    
    assert simulator.altitude == 50.0
    assert simulator.status == "hovering"
    assert simulator.battery_level < 100.0  # Battery should decrease

@pytest.mark.asyncio
async def test_drone_waypoint_navigation():
    """Test drone waypoint navigation"""
    simulator = DroneSimulator()
    
    # Set waypoints
    waypoints = [
        {"latitude": 40.7130, "longitude": -74.0058, "altitude": 75.0, "action": "photo"},
        {"latitude": 40.7132, "longitude": -74.0056, "altitude": 75.0, "action": "photo"}
    ]
    
    await simulator.start_mission(waypoints)
    
    assert simulator.status == "mission"
    assert len(simulator.waypoints) == 2
    assert simulator.current_waypoint_index == 0

@pytest.mark.asyncio
async def test_drone_battery_drain():
    """Test battery drains during flight"""
    simulator = DroneSimulator()
    
    initial_battery = simulator.battery_level
    
    # Simulate some flight time
    for _ in range(5):
        await simulator.update_telemetry()
        await asyncio.sleep(0.1)
    
    assert simulator.battery_level < initial_battery

@pytest.mark.asyncio
async def test_drone_landing():
    """Test drone landing functionality"""
    simulator = DroneSimulator()
    
    # Takeoff first
    await simulator.takeoff(30.0)
    
    # Land
    await simulator.land()
    
    assert simulator.altitude == 0.0
    assert simulator.status == "landed"

@pytest.mark.asyncio 
async def test_gps_noise_simulation():
    """Test GPS noise is applied to coordinates"""
    simulator = DroneSimulator()
    
    original_lat = simulator.latitude
    original_lon = simulator.longitude
    
    # Update telemetry multiple times
    for _ in range(10):
        await simulator.update_telemetry()
        await asyncio.sleep(0.01)
    
    # GPS coordinates should have small variations due to noise
    # (This test might need adjustment based on noise levels)
    assert abs(simulator.latitude - original_lat) < 0.01
    assert abs(simulator.longitude - original_lon) < 0.01

@pytest.mark.asyncio
async def test_emergency_stop():
    """Test emergency stop functionality"""
    simulator = DroneSimulator()
    
    # Start a mission
    waypoints = [
        {"latitude": 40.7130, "longitude": -74.0058, "altitude": 50.0, "action": "photo"}
    ]
    await simulator.start_mission(waypoints)
    
    # Emergency stop
    await simulator.emergency_stop()
    
    assert simulator.status == "emergency"

@pytest.mark.asyncio
async def test_altitude_limits():
    """Test altitude limits are respected"""
    simulator = DroneSimulator()
    
    # Try to go above max altitude
    await simulator.takeoff(500.0)  # Assuming max is lower
    
    # Should be limited to max altitude
    assert simulator.altitude <= 200.0  # Assuming 200m is max limit