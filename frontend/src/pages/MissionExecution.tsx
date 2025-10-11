import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  LinearProgress,
  Chip,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  Battery6Bar as BatteryIcon,
  GpsFixed as GpsIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, Polyline, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { missionsAPI, fieldsAPI } from '../services/api';
import { TelemetryWebSocket } from '../services/websocket';
import { Mission, MissionSummary, TelemetryData, Field, MissionStatus } from '../types';
import 'leaflet/dist/leaflet.css';

// Component to automatically pan to drone position
const MapController: React.FC<{ center: [number, number] | null; isRunning: boolean }> = ({ center, isRunning }) => {
  const map = useMap();
  
  React.useEffect(() => {
    if (center && isRunning) {
      map.setView(center, map.getZoom(), { animate: true, duration: 0.5 });
    }
  }, [center, isRunning, map]);
  
  return null;
};

// Fix Leaflet default markers with proper URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Create safe drone icon using divIcon
const droneIcon = L.divIcon({
  className: 'custom-drone-marker',
  html: `<div style="
    background: linear-gradient(45deg, #2e7d2e, #4caf50);
    color: white;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 12px;
    border: 3px solid #ff6b35;
    box-shadow: 0 3px 6px rgba(0,0,0,0.4);
    animation: pulse 2s infinite;
  ">🚁</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Create safe waypoint icon
const createWaypointIcon = (number: number, isActive: boolean = false) => {
  return L.divIcon({
    className: 'custom-waypoint-marker',
    html: `<div style="
      background-color: ${isActive ? '#ff6b35' : '#1976d2'};
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ${isActive ? 'animation: pulse 1.5s infinite;' : ''}
    ">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface SimulationState {
  isRunning: boolean;
  currentWaypointIndex: number;
  progress: number;
  telemetry: TelemetryData | null;
  logs: string[];
  currentPosition: { lat: number; lng: number } | null;
  targetPosition: { lat: number; lng: number } | null;
  interpolationProgress: number;
  totalDistance: number;
  distanceTraveled: number;
}

const MissionExecution: React.FC = () => {
  const { missionId } = useParams<{ missionId: string }>();
  const navigate = useNavigate();
  
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(
    missionId ? parseInt(missionId) : null
  );
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Simulation state
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    currentWaypointIndex: 0,
    progress: 0,
    telemetry: null,
    logs: [],
    currentPosition: null,
    targetPosition: null,
    interpolationProgress: 0,
    totalDistance: 0,
    distanceTraveled: 0,
  });
  
  const [showLogs, setShowLogs] = useState(false);
  const wsRef = useRef<TelemetryWebSocket | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper functions for smooth movement
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const interpolatePosition = (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    progress: number
  ): { lat: number; lng: number } => {
    const lat = start.lat + (end.lat - start.lat) * progress;
    const lng = start.lng + (end.lng - start.lng) * progress;
    return { lat, lng };
  };

  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  const calculateTotalMissionDistance = (waypoints: any[]): number => {
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      total += calculateDistance(
        waypoints[i-1].latitude,
        waypoints[i-1].longitude,
        waypoints[i].latitude,
        waypoints[i].longitude
      );
    }
    return total;
  };

  // Load missions on component mount
  useEffect(() => {
    loadMissions();
  }, []);

  // Load selected mission details when selectedMissionId changes
  useEffect(() => {
    if (selectedMissionId) {
      loadMissionDetails(selectedMissionId);
    }
  }, [selectedMissionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  const loadMissions = async () => {
    try {
      setLoading(true);
      const missionData = await missionsAPI.getMissions();
      setMissions(missionData);
    } catch (err: any) {
      setError('Failed to load missions');
    } finally {
      setLoading(false);
    }
  };

  const loadMissionDetails = async (missionId: number) => {
    try {
      setLoading(true);
      const mission = await missionsAPI.getMission(missionId);
      setSelectedMission(mission);
      
      // Load field data
      const fieldData = await fieldsAPI.getField(mission.field_id);
      setField(fieldData);
      
      setError('');
    } catch (err: any) {
      setError('Failed to load mission details');
      setSelectedMission(null);
      setField(null);
    } finally {
      setLoading(false);
    }
  };

  const startSimulation = async () => {
    if (!selectedMission) return;

    try {
      // Start mission via API
      await missionsAPI.startMission(selectedMission.id);
      
      // Connect to WebSocket for real telemetry (if available)
      try {
        wsRef.current = new TelemetryWebSocket(selectedMission.id);
        await wsRef.current.connect();
        
        wsRef.current.onTelemetry((data) => {
          setSimulationState(prev => ({
            ...prev,
            telemetry: data,
            logs: [...prev.logs.slice(-50), `Telemetry: ${new Date().toLocaleTimeString()}`],
          }));
        });

        wsRef.current.onMissionUpdate((data) => {
          addLog(`Mission update: ${data.message || data.status}`);
        });
      } catch (wsError) {
        console.warn('WebSocket connection failed, using simulation fallback');
      }

      // Start local simulation
      setSimulationState(prev => ({
        ...prev,
        isRunning: true,
        currentWaypointIndex: 0,
        progress: 0,
        logs: [...prev.logs, `Mission started: ${new Date().toLocaleTimeString()}`],
      }));

      // Start simulation loop
      startSimulationLoop();
      setSuccess('Mission started successfully');
    } catch (err: any) {
      setError('Failed to start mission: ' + (err.response?.data?.detail || err.message));
    }
  };

  const pauseSimulation = async () => {
    if (!selectedMission) return;

    try {
      await missionsAPI.pauseMission(selectedMission.id);
      
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      
      setSimulationState(prev => ({
        ...prev,
        isRunning: false,
        logs: [...prev.logs, `Mission paused: ${new Date().toLocaleTimeString()}`],
      }));
      
      setSuccess('Mission paused');
    } catch (err: any) {
      setError('Failed to pause mission');
    }
  };

  const resumeSimulation = async () => {
    if (!selectedMission) return;

    try {
      await missionsAPI.resumeMission(selectedMission.id);
      
      setSimulationState(prev => ({
        ...prev,
        isRunning: true,
        logs: [...prev.logs, `Mission resumed: ${new Date().toLocaleTimeString()}`],
      }));
      
      startSimulationLoop();
      setSuccess('Mission resumed');
    } catch (err: any) {
      setError('Failed to resume mission');
    }
  };

  const abortSimulation = async () => {
    if (!selectedMission) return;

    try {
      await missionsAPI.abortMission(selectedMission.id);
      
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      
      setSimulationState({
        isRunning: false,
        currentWaypointIndex: 0,
        progress: 0,
        telemetry: null,
        logs: [`Mission aborted: ${new Date().toLocaleTimeString()}`],
        currentPosition: null,
        targetPosition: null,
        interpolationProgress: 0,
        totalDistance: 0,
        distanceTraveled: 0,
      });
      
      setSuccess('Mission aborted');
    } catch (err: any) {
      setError('Failed to abort mission');
    }
  };

  const startSimulationLoop = () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }

    if (!selectedMission || selectedMission.waypoints.length === 0) return;

    const waypoints = selectedMission.waypoints;
    const totalDistance = calculateTotalMissionDistance(waypoints);
    
    // Initialize simulation state
    setSimulationState(prev => ({
      ...prev,
      currentPosition: { lat: waypoints[0].latitude, lng: waypoints[0].longitude },
      targetPosition: waypoints.length > 1 ? { lat: waypoints[1].latitude, lng: waypoints[1].longitude } : null,
      totalDistance,
      distanceTraveled: 0,
      interpolationProgress: 0,
      currentWaypointIndex: 0,
    }));

    const missionStartTime = Date.now();
    const initialBatteryLevel = 100;

    simulationIntervalRef.current = setInterval(() => {
      setSimulationState(prev => {
        if (!prev.isRunning || !selectedMission) return prev;

        const waypoints = selectedMission.waypoints;
        if (waypoints.length === 0) return prev;

        let newState = { ...prev };
        const speed = selectedMission.speed_ms || 5; // m/s
        const deltaTime = 0.1; // 100ms updates
        const distanceStep = speed * deltaTime;

        // If we have a target position, move towards it
        if (newState.currentPosition && newState.targetPosition) {
          const distanceToTarget = calculateDistance(
            newState.currentPosition.lat,
            newState.currentPosition.lng,
            newState.targetPosition.lat,
            newState.targetPosition.lng
          );

          if (distanceToTarget < distanceStep) {
            // Reached current target, move to next waypoint
            newState.currentPosition = newState.targetPosition;
            newState.distanceTraveled += distanceToTarget;
            newState.currentWaypointIndex += 1;
            newState.interpolationProgress = 0;

            // Set next target or complete mission
            if (newState.currentWaypointIndex < waypoints.length - 1) {
              newState.targetPosition = {
                lat: waypoints[newState.currentWaypointIndex + 1].latitude,
                lng: waypoints[newState.currentWaypointIndex + 1].longitude
              };
              
              newState.logs = [...prev.logs.slice(-50), 
                `Reached waypoint ${newState.currentWaypointIndex + 1}: ${new Date().toLocaleTimeString()}`
              ];
            } else {
              // Mission completed
              newState.targetPosition = null;
              newState.isRunning = false;
              newState.progress = 100;
              newState.logs = [...prev.logs.slice(-50), 
                `Mission completed: ${new Date().toLocaleTimeString()}`
              ];
              
              if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
                simulationIntervalRef.current = null;
              }
            }
          } else {
            // Smooth interpolation towards target
            const progressStep = distanceStep / distanceToTarget;
            newState.interpolationProgress = Math.min(1, newState.interpolationProgress + progressStep);
            
            const currentWaypoint = waypoints[newState.currentWaypointIndex];
            const targetWaypoint = waypoints[newState.currentWaypointIndex + 1];
            
            newState.currentPosition = interpolatePosition(
              { lat: currentWaypoint.latitude, lng: currentWaypoint.longitude },
              { lat: targetWaypoint.latitude, lng: targetWaypoint.longitude },
              newState.interpolationProgress
            );
            
            newState.distanceTraveled += distanceStep;
          }

          // Update overall progress
          newState.progress = Math.min((newState.distanceTraveled / newState.totalDistance) * 100, 100);

          // Generate realistic telemetry
          const missionDuration = (Date.now() - missionStartTime) / 1000; // seconds
          const batteryDrainRate = 0.5; // %/minute
          const currentBattery = Math.max(10, initialBatteryLevel - (missionDuration / 60) * batteryDrainRate);
          
          const currentWaypoint = waypoints[newState.currentWaypointIndex];
          const heading = newState.targetPosition ? calculateBearing(
            newState.currentPosition.lat,
            newState.currentPosition.lng,
            newState.targetPosition.lat,
            newState.targetPosition.lng
          ) : 0;

          newState.telemetry = {
            mission_id: selectedMission.id,
            timestamp: new Date().toISOString(),
            latitude: newState.currentPosition.lat,
            longitude: newState.currentPosition.lng,
            altitude_m: currentWaypoint.altitude_m + (Math.random() - 0.5) * 0.5,
            speed_ms: speed + (Math.random() - 0.5) * 0.5,
            battery_percent: Math.round(currentBattery),
            heading_deg: heading + (Math.random() - 0.5) * 5,
            roll_deg: (Math.random() - 0.5) * 3,
            pitch_deg: (Math.random() - 0.5) * 3,
            yaw_deg: heading + (Math.random() - 0.5) * 2,
            gps_fix_type: 3,
            satellites_visible: 8 + Math.floor(Math.random() * 4),
          };
        }

        return newState;
      });
    }, 100); // Update every 100ms for smooth movement
  };

  const addLog = (message: string) => {
    setSimulationState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-50), `${new Date().toLocaleTimeString()}: ${message}`],
    }));
  };

  const getStatusColor = (status: MissionStatus) => {
    switch (status) {
      case 'planned': return 'primary';
      case 'running': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'success';
      case 'aborted': return 'error';
      default: return 'default';
    }
  };

  const MapView = () => {
    if (!selectedMission || !field) return null;

    const waypoints = selectedMission.waypoints;
    const waypointCoords: [number, number][] = waypoints.map(wp => [wp.latitude, wp.longitude]);
    
    // Use smooth current position if available, otherwise first waypoint
    const centerPosition: [number, number] = simulationState.currentPosition 
      ? [simulationState.currentPosition.lat, simulationState.currentPosition.lng]
      : waypoints.length > 0 
        ? [waypoints[0].latitude, waypoints[0].longitude] 
        : [40.7128, -74.0060];
    
    return (
      <MapContainer
        center={centerPosition}
        zoom={18}
        style={{ height: '400px', width: '100%' }}
        key={`map-${selectedMission.id}`} // Force re-render on mission change
      >
        <MapController 
          center={simulationState.currentPosition ? [simulationState.currentPosition.lat, simulationState.currentPosition.lng] : null}
          isRunning={simulationState.isRunning}
        />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {/* Field boundary */}
        {field.polygon_coordinates && (
          <GeoJSON
            data={field.polygon_coordinates as any}
            style={{ color: '#2e7d2e', weight: 2, fillOpacity: 0.2 }}
          />
        )}
        
        {/* Flight path */}
        {waypointCoords.length > 1 && (
          <Polyline
            positions={waypointCoords}
            color="#ff6b35"
            weight={3}
            opacity={0.7}
          />
        )}
        
        {/* Waypoint markers */}
        {waypoints.map((waypoint, index) => (
          <Marker
            key={`waypoint-${waypoint.id}`}
            position={[waypoint.latitude, waypoint.longitude]}
            icon={createWaypointIcon(index + 1, index === simulationState.currentWaypointIndex)}
          />
        ))}
        
        {/* Current drone position (smooth interpolated position) */}
        {simulationState.currentPosition && (
          <Marker
            key="drone-marker"
            position={[simulationState.currentPosition.lat, simulationState.currentPosition.lng]}
            icon={droneIcon}
          />
        )}
        
        {/* Traveled path (line from start to current position) */}
        {simulationState.currentPosition && waypoints.length > 0 && (
          <Polyline
            positions={[
              [waypoints[0].latitude, waypoints[0].longitude],
              [simulationState.currentPosition.lat, simulationState.currentPosition.lng]
            ]}
            color="#4caf50"
            weight={4}
            opacity={0.8}
          />
        )}
      </MapContainer>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Mission Execution
      </Typography>

      {/* Mission Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Mission
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Choose a mission to execute</InputLabel>
          <Select
            value={selectedMissionId || ''}
            onChange={(e) => setSelectedMissionId(Number(e.target.value))}
            label="Choose a mission to execute"
          >
            {missions.map((mission) => (
              <MenuItem key={mission.id} value={mission.id}>
                {mission.name} - {mission.field_name} ({mission.status})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {selectedMission && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Mission Type:</strong> {selectedMission.mission_type}
                </Typography>
                <Typography variant="body2">
                  <strong>Altitude:</strong> {selectedMission.altitude_m}m
                </Typography>
                <Typography variant="body2">
                  <strong>Speed:</strong> {selectedMission.speed_ms} m/s
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Waypoints:</strong> {selectedMission.waypoints.length}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong>{' '}
                  <Chip 
                    label={selectedMission.status} 
                    color={getStatusColor(selectedMission.status)}
                    size="small"
                  />
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {selectedMission && (
        <>
          {/* Control Panel */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Mission Control
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={startSimulation}
                disabled={simulationState.isRunning || selectedMission.status === 'completed'}
                color="success"
              >
                Start
              </Button>
              <Button
                variant="contained"
                startIcon={<PauseIcon />}
                onClick={pauseSimulation}
                disabled={!simulationState.isRunning}
                color="warning"
              >
                Pause
              </Button>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={resumeSimulation}
                disabled={simulationState.isRunning || simulationState.progress === 0}
                color="info"
              >
                Resume
              </Button>
              <Button
                variant="contained"
                startIcon={<StopIcon />}
                onClick={abortSimulation}
                disabled={!simulationState.isRunning && simulationState.progress === 0}
                color="error"
              >
                Abort
              </Button>
              <Button
                variant="outlined"
                startIcon={<InfoIcon />}
                onClick={() => setShowLogs(true)}
              >
                Logs
              </Button>
            </Box>
            
            {/* Progress */}
            <Typography variant="body2" gutterBottom>
              Progress: {simulationState.progress.toFixed(1)}% 
              {simulationState.currentWaypointIndex > 0 && (
                <> (Waypoint {simulationState.currentWaypointIndex + 1}/{selectedMission.waypoints.length})</>
              )}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Distance: {simulationState.distanceTraveled.toFixed(0)}m / {simulationState.totalDistance.toFixed(0)}m
              {simulationState.totalDistance > 0 && (
                <> ({((simulationState.distanceTraveled / simulationState.totalDistance) * 100).toFixed(1)}%)</>
              )}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={simulationState.progress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Paper>

          <Grid container spacing={3}>
            {/* Map View */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Flight Path
                </Typography>
                <MapView />
              </Paper>
            </Grid>

            {/* Telemetry */}
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Telemetry
                </Typography>
                {simulationState.telemetry ? (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <GpsIcon sx={{ mr: 1, fontSize: 20 }} />
                            <Typography variant="body2">Position</Typography>
                          </Box>
                          <Typography variant="body2" fontFamily="monospace">
                            {simulationState.telemetry.latitude.toFixed(6)}°N
                          </Typography>
                          <Typography variant="body2" fontFamily="monospace">
                            {simulationState.telemetry.longitude.toFixed(6)}°W
                          </Typography>
                          <Typography variant="body2" fontFamily="monospace">
                            Alt: {simulationState.telemetry.altitude_m.toFixed(1)}m
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <SpeedIcon sx={{ mr: 1, fontSize: 20 }} />
                            <Typography variant="body2">Speed</Typography>
                          </Box>
                          <Typography variant="body2" fontFamily="monospace">
                            {simulationState.telemetry.speed_ms.toFixed(1)} m/s
                          </Typography>
                          <Typography variant="body2" fontFamily="monospace">
                            HDG: {simulationState.telemetry.heading_deg.toFixed(0)}°
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <BatteryIcon sx={{ mr: 1, fontSize: 20 }} />
                            <Typography variant="body2">Battery</Typography>
                          </Box>
                          <Typography variant="body2" fontFamily="monospace">
                            {simulationState.telemetry.battery_percent.toFixed(1)}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={simulationState.telemetry.battery_percent}
                            color={simulationState.telemetry.battery_percent > 50 ? 'success' : 
                                   simulationState.telemetry.battery_percent > 20 ? 'warning' : 'error'}
                            sx={{ mt: 1 }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Typography variant="body2" gutterBottom>Attitude</Typography>
                          <Typography variant="body2" fontFamily="monospace">
                            R: {simulationState.telemetry.roll_deg.toFixed(1)}°
                          </Typography>
                          <Typography variant="body2" fontFamily="monospace">
                            P: {simulationState.telemetry.pitch_deg.toFixed(1)}°
                          </Typography>
                          <Typography variant="body2" fontFamily="monospace">
                            Y: {simulationState.telemetry.yaw_deg.toFixed(1)}°
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Typography variant="body2" gutterBottom>GPS</Typography>
                          <Typography variant="body2" fontFamily="monospace">
                            Satellites: {simulationState.telemetry.satellites_visible}
                          </Typography>
                          <Typography variant="body2" fontFamily="monospace">
                            Fix Type: {simulationState.telemetry.gps_fix_type}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No telemetry data available. Start a mission to see live data.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Logs Dialog */}
      <Dialog open={showLogs} onClose={() => setShowLogs(false)} maxWidth="md" fullWidth>
        <DialogTitle>Mission Logs</DialogTitle>
        <DialogContent>
          <List dense>
            {simulationState.logs.map((log, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemText 
                    primary={log}
                    primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  />
                </ListItem>
                {index < simulationState.logs.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
          {simulationState.logs.length === 0 && (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
              No logs available
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogs(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MissionExecution;