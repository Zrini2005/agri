import asyncio
import json
import random
try:
    import websockets
except Exception:  # websockets not installed
    websockets = None

try:
    import numpy as np
except Exception:
    np = None
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import logging
import math
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DroneState:
    """Represents the current state of the simulated drone."""
    
    def __init__(self):
        # Position and motion
        self.latitude = 40.7128  # Default: New York City
        self.longitude = -74.0060
        self.altitude_m = 0.0
        self.heading_deg = 0.0
        self.speed_ms = 0.0
        self.ground_speed_ms = 0.0
        self.vertical_speed_ms = 0.0
        
        # Orientation
        self.roll_deg = 0.0
        self.pitch_deg = 0.0
        self.yaw_deg = 0.0
        
        # Systems
        self.battery_percent = 100.0
        self.gps_fix_type = 3  # 3D fix
        self.satellites_visible = 12
        
        # Flight state
        self.is_flying = False
        self.is_armed = False
        self.mission_active = False
        
        # Environmental factors
        self.wind_speed_ms = random.uniform(0, 5)
        self.wind_direction_deg = random.uniform(0, 360)


class Waypoint:
    """Represents a navigation waypoint."""
    
    def __init__(self, lat: float, lng: float, alt: float, action: str = "fly_to", duration: float = 0.0):
        self.latitude = lat
        self.longitude = lng
        self.altitude_m = alt
        self.action = action
        self.duration_s = duration
        self.completed = False


class DroneSimulator:
    """Realistic drone flight simulator with physics-based movement."""
    
    def __init__(self):
        self.state = DroneState()
        self.waypoints: List[Waypoint] = []
        self.current_waypoint_index = 0
        self.mission_id: Optional[int] = None
        self.mission_status = "idle"  # idle, running, paused, completed, aborted
        
        # Flight parameters
        self.max_speed_ms = 15.0  # Maximum horizontal speed
        self.max_vertical_speed_ms = 5.0  # Maximum vertical speed
        self.acceleration_ms2 = 2.0  # Acceleration
        self.battery_drain_rate = 0.1  # % per minute base rate
        
        # Simulation parameters
        self.update_rate_hz = 10  # Telemetry update rate
        self.position_tolerance_m = 2.0  # Waypoint arrival tolerance
        
        # WebSocket connection
        self.websocket = None
        self.backend_url = "ws://localhost:8000/ws/simulator"
        
        # Simulation loop control
        self.running = False
        self.last_update_time = time.time()
        
        # Add realistic variations
        self.gps_noise_std = 0.00001  # GPS noise standard deviation
        self.altitude_noise_std = 0.5  # Altitude noise in meters
        
    async def connect_to_backend(self):
        """Connect to the backend WebSocket."""
        # If no backend_url is set (falsy), skip attempting to connect.
        if not self.backend_url:
            logger.info("No backend URL configured; running in standalone mode")
            return False

        try:
            self.websocket = await websockets.connect(self.backend_url)
            logger.info(f"Connected to backend at {self.backend_url}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to backend: {e}")
            return False
    
    async def disconnect_from_backend(self):
        """Disconnect from backend WebSocket."""
        if self.websocket:
            await self.websocket.close()
            self.websocket = None
            logger.info("Disconnected from backend")
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two GPS coordinates using Haversine formula."""
        R = 6371000  # Earth radius in meters
        
        # Convert to radians
        lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
        lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)
        
        # Differences
        dlat = lat2_r - lat1_r
        dlon = lon2_r - lon1_r
        
        # Haversine formula
        a = math.sin(dlat/2)**2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def calculate_bearing(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate bearing from point 1 to point 2."""
        lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
        lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)
        
        dlon = lon2_r - lon1_r
        
        y = math.sin(dlon) * math.cos(lat2_r)
        x = math.cos(lat1_r) * math.sin(lat2_r) - math.sin(lat1_r) * math.cos(lat2_r) * math.cos(dlon)
        
        bearing = math.atan2(y, x)
        return (math.degrees(bearing) + 360) % 360
    
    def move_towards_waypoint(self, waypoint: Waypoint, dt: float) -> bool:
        """Move drone towards the target waypoint. Returns True if waypoint is reached."""
        # Calculate distance and bearing to target
        distance_to_target = self.calculate_distance(
            self.state.latitude, self.state.longitude,
            waypoint.latitude, waypoint.longitude
        )
        
        # Check if waypoint is reached
        if distance_to_target <= self.position_tolerance_m:
            return True
        
        # Calculate desired bearing and altitude change
        target_bearing = self.calculate_bearing(
            self.state.latitude, self.state.longitude,
            waypoint.latitude, waypoint.longitude
        )
        
        altitude_difference = waypoint.altitude_m - self.state.altitude_m
        
        # Update heading (with some realistic delay)
        bearing_diff = (target_bearing - self.state.heading_deg + 180) % 360 - 180
        max_heading_change = 45 * dt  # Max 45 degrees per second
        heading_change = max(-max_heading_change, min(max_heading_change, bearing_diff))
        self.state.heading_deg = (self.state.heading_deg + heading_change) % 360
        
        # Calculate movement speeds
        horizontal_speed = min(self.max_speed_ms, distance_to_target / 2)  # Slow down when approaching
        vertical_speed = max(-self.max_vertical_speed_ms, 
                           min(self.max_vertical_speed_ms, altitude_difference / 2))
        
        # Add wind effects
        wind_effect_x = self.state.wind_speed_ms * math.cos(math.radians(self.state.wind_direction_deg))
        wind_effect_y = self.state.wind_speed_ms * math.sin(math.radians(self.state.wind_direction_deg))
        
        # Calculate new position
        bearing_rad = math.radians(self.state.heading_deg)
        
        # Horizontal movement
        distance_moved = horizontal_speed * dt
        dlat = (distance_moved * math.cos(bearing_rad)) / 111000  # Approximate meters to degrees
        dlon = (distance_moved * math.sin(bearing_rad)) / (111000 * math.cos(math.radians(self.state.latitude)))
        
        # Apply wind effects (scaled)
        dlat += (wind_effect_x * dt) / 111000 * 0.1  # Wind has 10% effect
        dlon += (wind_effect_y * dt) / (111000 * math.cos(math.radians(self.state.latitude))) * 0.1
        
        # Update position
        self.state.latitude += dlat
        self.state.longitude += dlon
        self.state.altitude_m += vertical_speed * dt
        
        # Update speeds
        self.state.speed_ms = horizontal_speed
        self.state.ground_speed_ms = horizontal_speed + random.uniform(-0.5, 0.5)  # Add some noise
        self.state.vertical_speed_ms = vertical_speed
        
        # Update orientation based on movement
        if horizontal_speed > 1:
            self.state.roll_deg = max(-15, min(15, bearing_diff * 0.3))  # Bank into turns
            self.state.pitch_deg = max(-10, min(10, -horizontal_speed * 0.5))  # Pitch forward when moving
        else:
            self.state.roll_deg *= 0.9  # Gradually level out
            self.state.pitch_deg *= 0.9
        
        self.state.yaw_deg = self.state.heading_deg
        
        return False
    
    def update_battery(self, dt: float):
        """Update battery level based on usage."""
        # Base drain rate
        drain_rate = self.battery_drain_rate
        
        # Increase drain based on speed and altitude changes
        if self.state.speed_ms > 10:
            drain_rate *= 1.5
        
        if abs(self.state.vertical_speed_ms) > 2:
            drain_rate *= 1.3
        
        # Wind resistance increases battery consumption
        wind_resistance_factor = 1 + (self.state.wind_speed_ms / 20)
        drain_rate *= wind_resistance_factor
        
        # Apply battery drain
        battery_drop = drain_rate * (dt / 60)  # Convert to per-second rate
        self.state.battery_percent = max(0, self.state.battery_percent - battery_drop)
        
        # Emergency landing if battery is critically low
        if self.state.battery_percent < 5 and self.mission_status == "running":
            self.mission_status = "aborted"
            logger.warning("Emergency landing due to low battery!")
    
    def add_realistic_noise(self):
        """Add realistic GPS and sensor noise."""
        # GPS noise
        self.state.latitude += random.gauss(0, self.gps_noise_std)
        self.state.longitude += random.gauss(0, self.gps_noise_std)
        self.state.altitude_m += random.gauss(0, self.altitude_noise_std)
        
        # Attitude noise
        self.state.roll_deg += random.gauss(0, 0.5)
        self.state.pitch_deg += random.gauss(0, 0.5)
        self.state.heading_deg += random.gauss(0, 0.2)
        
        # Speed noise
        self.state.speed_ms += random.gauss(0, 0.1)
        self.state.ground_speed_ms += random.gauss(0, 0.1)
        
        # Satellite variations
        if random.random() < 0.01:  # 1% chance per update
            self.state.satellites_visible = max(6, min(20, self.state.satellites_visible + random.randint(-2, 2)))
        
        # GPS fix variations (rare)
        if random.random() < 0.001:  # 0.1% chance
            self.state.gps_fix_type = random.choice([2, 3, 3, 3, 3])  # Mostly 3D fix
    
    def get_telemetry_data(self) -> Dict:
        """Generate current telemetry data."""
        return {
            "mission_id": self.mission_id,
            "timestamp": datetime.utcnow().isoformat(),
            "latitude": round(self.state.latitude, 8),
            "longitude": round(self.state.longitude, 8),
            "altitude_m": round(self.state.altitude_m, 2),
            "speed_ms": round(self.state.speed_ms, 2),
            "battery_percent": round(self.state.battery_percent, 1),
            "heading_deg": round(self.state.heading_deg, 1),
            "roll_deg": round(self.state.roll_deg, 1),
            "pitch_deg": round(self.state.pitch_deg, 1),
            "yaw_deg": round(self.state.yaw_deg, 1),
            "gps_fix_type": self.state.gps_fix_type,
            "satellites_visible": self.state.satellites_visible,
            "ground_speed_ms": round(self.state.ground_speed_ms, 2),
            "vertical_speed_ms": round(self.state.vertical_speed_ms, 2)
        }
    
    async def send_telemetry(self):
        """Send telemetry data to backend."""
        # Only send if websocket object exists and is open
        try:
            if not self.websocket:
                return

            # websockets client has 'closed' attribute; check if available
            closed = getattr(self.websocket, 'closed', None)
            if closed is True:
                # clear websocket so caller won't keep trying
                await self.disconnect_from_backend()
                return

            telemetry = self.get_telemetry_data()
            message = {
                "type": "telemetry",
                "data": telemetry
            }
            await self.websocket.send(json.dumps(message))

        except Exception as e:
            # Handle common websockets closed errors gracefully
            try:
                # If websocket has close method, attempt to close
                if self.websocket is not None:
                    await self.disconnect_from_backend()
            except Exception:
                pass

            # Log concise error once
            logger.error(f"Error sending telemetry: {e}")
    
    async def send_mission_status(self, status: str, message: str = ""):
        """Send mission status update to backend."""
        if not self.websocket:
            return
        
        try:
            status_message = {
                "type": "mission_status",
                "data": {
                    "mission_id": self.mission_id,
                    "status": status,
                    "message": message,
                    "timestamp": datetime.utcnow().isoformat(),
                    "current_waypoint": self.current_waypoint_index,
                    "total_waypoints": len(self.waypoints)
                }
            }
            await self.websocket.send(json.dumps(status_message))
            logger.info(f"Mission status: {status} - {message}")
        except Exception as e:
            logger.error(f"Error sending mission status: {e}")
    
    def start_mission(self, mission_data: Dict):
        """Start a new mission."""
        if self.mission_status == "running":
            logger.warning("Mission already running")
            return
        
        self.mission_id = mission_data.get("mission_id")
        waypoints_data = mission_data.get("waypoints", [])
        
        # Convert waypoint data to Waypoint objects
        self.waypoints = []
        for wp_data in waypoints_data:
            waypoint = Waypoint(
                lat=wp_data.get("lat", wp_data.get("latitude", 0)),
                lng=wp_data.get("lng", wp_data.get("longitude", 0)),
                alt=wp_data.get("alt", wp_data.get("altitude_m", 50))
            )
            self.waypoints.append(waypoint)
        
        if not self.waypoints:
            logger.error("No waypoints provided")
            return
        
        # Set initial position near first waypoint (simulate takeoff)
        first_wp = self.waypoints[0]
        self.state.latitude = first_wp.latitude + random.uniform(-0.001, 0.001)
        self.state.longitude = first_wp.longitude + random.uniform(-0.001, 0.001)
        self.state.altitude_m = 0
        
        self.current_waypoint_index = 0
        self.mission_status = "running"
        self.state.is_flying = True
        self.state.mission_active = True
        
        logger.info(f"Started mission {self.mission_id} with {len(self.waypoints)} waypoints")
    
    def pause_mission(self):
        """Pause the current mission."""
        if self.mission_status == "running":
            self.mission_status = "paused"
            logger.info("Mission paused")
    
    def resume_mission(self):
        """Resume the paused mission."""
        if self.mission_status == "paused":
            self.mission_status = "running"
            logger.info("Mission resumed")
    
    def abort_mission(self):
        """Abort the current mission."""
        if self.mission_status in ["running", "paused"]:
            self.mission_status = "aborted"
            self.state.mission_active = False
            logger.info("Mission aborted")
    
    async def update_simulation(self):
        """Update the simulation state."""
        current_time = time.time()
        dt = current_time - self.last_update_time
        self.last_update_time = current_time
        
        if self.mission_status != "running":
            return
        
        # Check if we have waypoints
        if not self.waypoints or self.current_waypoint_index >= len(self.waypoints):
            # Mission completed
            self.mission_status = "completed"
            self.state.mission_active = False
            await self.send_mission_status("completed", "All waypoints reached")
            return
        
        # Get current target waypoint
        current_waypoint = self.waypoints[self.current_waypoint_index]
        
        # Move towards waypoint
        waypoint_reached = self.move_towards_waypoint(current_waypoint, dt)
        
        if waypoint_reached:
            # Mark waypoint as completed and move to next
            current_waypoint.completed = True
            self.current_waypoint_index += 1
            
            # Send waypoint reached notification
            await self.send_mission_status(
                "waypoint_reached",
                f"Reached waypoint {self.current_waypoint_index}/{len(self.waypoints)}"
            )
            
            # Check if mission is complete
            if self.current_waypoint_index >= len(self.waypoints):
                self.mission_status = "completed"
                self.state.mission_active = False
                await self.send_mission_status("completed", "Mission completed successfully")
        
        # Update systems
        self.update_battery(dt)
        self.add_realistic_noise()
    
    async def handle_command(self, message: Dict):
        """Handle incoming commands from backend."""
        try:
            command_data = message.get("data", {})
            action = command_data.get("action")
            
            if action == "start":
                self.start_mission(command_data)
                await self.send_mission_status("started", "Mission started")
                
            elif action == "pause":
                self.pause_mission()
                await self.send_mission_status("paused", "Mission paused")
                
            elif action == "resume":
                self.resume_mission()
                await self.send_mission_status("resumed", "Mission resumed")
                
            elif action == "abort":
                self.abort_mission()
                await self.send_mission_status("aborted", "Mission aborted by user")
                
            else:
                logger.warning(f"Unknown command: {action}")
                
        except Exception as e:
            logger.error(f"Error handling command: {e}")
    
    async def listen_for_commands(self):
        """Listen for commands from the backend."""
        if not self.websocket:
            return
        
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    if data.get("type") == "command":
                        await self.handle_command(data)
                except json.JSONDecodeError:
                    logger.error("Invalid JSON received")
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket connection closed")
        except Exception as e:
            logger.error(f"Error listening for commands: {e}")
    
    async def run_simulation_loop(self):
        """Main simulation loop."""
        self.running = True
        self.last_update_time = time.time()
        
        update_interval = 1.0 / self.update_rate_hz
        
        while self.running:
            try:
                await self.update_simulation()
                
                # Send telemetry if mission is active
                if self.mission_status in ["running", "paused"] and self.mission_id:
                    await self.send_telemetry()
                
                # Wait for next update
                await asyncio.sleep(update_interval)
                
                # If no websocket and we are standalone, back off slightly to avoid spamming logs
                if not self.websocket and not self.backend_url:
                    await asyncio.sleep(0.5)
                
            except Exception as e:
                logger.error(f"Error in simulation loop: {e}")
                await asyncio.sleep(1)  # Prevent rapid error loops
    
    async def run(self):
        """Main entry point for the simulator."""
        logger.info("Starting drone simulator...")
        
        # Connect to backend
        if not await self.connect_to_backend():
            logger.error("Failed to connect to backend, running in standalone mode")
        
        # Start tasks
        tasks = [
            asyncio.create_task(self.run_simulation_loop()),
        ]
        
        if self.websocket:
            tasks.append(asyncio.create_task(self.listen_for_commands()))
        
        try:
            # Run all tasks concurrently
            await asyncio.gather(*tasks)
        except KeyboardInterrupt:
            logger.info("Simulator stopped by user")
        except Exception as e:
            logger.error(f"Simulator error: {e}")
        finally:
            self.running = False
            await self.disconnect_from_backend()


async def main():
    """Main function."""
    simulator = DroneSimulator()
    await simulator.run()


if __name__ == "__main__":
    asyncio.run(main())