import asyncio
import json
from typing import Dict, List, Set
from fastapi import WebSocket
from datetime import datetime


class WebSocketManager:
    """Manages WebSocket connections for telemetry and simulator communication."""
    
    def __init__(self):
        # Mission ID -> Set of WebSocket connections
        self.telemetry_connections: Dict[int, Set[WebSocket]] = {}
        
        # Simulator WebSocket connections
        self.simulator_connections: Set[WebSocket] = set()
        
        # Active missions
        self.active_missions: Dict[int, dict] = {}
    
    async def connect_telemetry(self, websocket: WebSocket, mission_id: int):
        """Connect a client to mission telemetry stream."""
        await websocket.accept()
        
        if mission_id not in self.telemetry_connections:
            self.telemetry_connections[mission_id] = set()
        
        self.telemetry_connections[mission_id].add(websocket)
        print(f"Client connected to mission {mission_id} telemetry")
    
    def disconnect_telemetry(self, websocket: WebSocket, mission_id: int):
        """Disconnect client from telemetry stream."""
        if mission_id in self.telemetry_connections:
            self.telemetry_connections[mission_id].discard(websocket)
            
            # Clean up empty connection sets
            if not self.telemetry_connections[mission_id]:
                del self.telemetry_connections[mission_id]
        
        print(f"Client disconnected from mission {mission_id} telemetry")
    
    async def connect_simulator(self, websocket: WebSocket):
        """Connect simulator WebSocket."""
        await websocket.accept()
        self.simulator_connections.add(websocket)
        print("Simulator connected")
    
    def disconnect_simulator(self, websocket: WebSocket):
        """Disconnect simulator WebSocket."""
        self.simulator_connections.discard(websocket)
        print("Simulator disconnected")
    
    async def broadcast_telemetry(self, mission_id: int, telemetry_data: dict):
        """Broadcast telemetry data to all connected clients for a mission."""
        if mission_id not in self.telemetry_connections:
            return
        
        message = {
            "type": "telemetry",
            "mission_id": mission_id,
            "data": telemetry_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to all connected clients for this mission
        disconnected_clients = []
        for websocket in self.telemetry_connections[mission_id]:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error sending telemetry: {e}")
                disconnected_clients.append(websocket)
        
        # Clean up disconnected clients
        for websocket in disconnected_clients:
            self.disconnect_telemetry(websocket, mission_id)
    
    async def send_command(self, command: dict):
        """Send command to all connected simulators."""
        if not self.simulator_connections:
            print("No simulators connected")
            return
        
        message = {
            "type": "command",
            "data": command,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        disconnected_simulators = []
        for websocket in self.simulator_connections:
            try:
                await websocket.send_text(json.dumps(message))
                print(f"Sent command to simulator: {command['action']}")
            except Exception as e:
                print(f"Error sending command: {e}")
                disconnected_simulators.append(websocket)
        
        # Clean up disconnected simulators
        for websocket in disconnected_simulators:
            self.disconnect_simulator(websocket)
    
    async def send_mission_update(self, mission_id: int, update_data: dict):
        """Send mission status update to connected clients."""
        if mission_id not in self.telemetry_connections:
            return
        
        message = {
            "type": "mission_update",
            "mission_id": mission_id,
            "data": update_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        disconnected_clients = []
        for websocket in self.telemetry_connections[mission_id]:
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error sending mission update: {e}")
                disconnected_clients.append(websocket)
        
        # Clean up disconnected clients
        for websocket in disconnected_clients:
            self.disconnect_telemetry(websocket, mission_id)
    
    def get_connection_stats(self) -> dict:
        """Get WebSocket connection statistics."""
        return {
            "telemetry_connections": {
                mission_id: len(connections) 
                for mission_id, connections in self.telemetry_connections.items()
            },
            "simulator_connections": len(self.simulator_connections),
            "total_telemetry_clients": sum(
                len(connections) for connections in self.telemetry_connections.values()
            )
        }