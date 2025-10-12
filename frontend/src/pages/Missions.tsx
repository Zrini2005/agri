import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Grid,
  Paper,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Visibility as ViewIcon,
  Launch as ExecuteIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, FeatureGroup, Polyline, Marker, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { fieldsAPI, missionsAPI } from '../services/api';
import { Field, Mission, MissionCreate, MissionType } from '../types';
import { useNavigate } from 'react-router-dom';

// Fix Leaflet default markers by providing proper icon URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Create safe custom icons
const createWaypointIcon = (number: number) => {
  return L.divIcon({
    className: 'custom-waypoint-marker',
    html: `<div style="
      background-color: #1976d2;
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
    ">${number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const defaultMarkerIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MissionFormData {
  name: string;
  field_id: number;
  type: MissionType;
  waypoints: [number, number][];
  altitude_m: number;
  speed_ms: number;
}

interface PointMarker {
  id: number;
  position: [number, number];
}

const MapDrawer: React.FC<{
  field: Field;
  waypoints: PointMarker[];
  onWaypointAdd: (position: [number, number]) => void;
  onWaypointRemove: (id: number) => void;
}> = ({ field, waypoints, onWaypointAdd, onWaypointRemove }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !field.polygon_coordinates) return;

    // Create a GeoJSON layer for the field
    const polygon = L.geoJSON(field.polygon_coordinates as any, {
      style: { color: '#2e7d2e', weight: 2, fillOpacity: 0.2 }
    });

    // Fit map to polygon bounds
    map.fitBounds(polygon.getBounds());

    const isPointInPolygon = (point: [number, number], polygon: any): boolean => {
      if (!polygon || !polygon.coordinates) return false;
      
      // Function to calculate if a point is inside a polygon using ray casting algorithm
      const isInside = (point: [number, number], vs: number[][]): boolean => {
        const x = point[0], y = point[1];
        
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
          const xi = vs[i][1], yi = vs[i][0];
          const xj = vs[j][1], yj = vs[j][0];
          
          const intersect = ((yi > y) !== (yj > y))
              && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        
        return inside;
      };

      // Extract polygon coordinates
      const polygonCoords = polygon.coordinates[0];
      
      // Use ray casting algorithm for precise point-in-polygon test
      return isInside(point, polygonCoords);
    };

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const point: [number, number] = [e.latlng.lat, e.latlng.lng];
      
      if (isPointInPolygon(point, field.polygon_coordinates)) {
        onWaypointAdd(point);
        
        // Show visual confirmation
        const marker = L.circleMarker(e.latlng, {
          radius: 5,
          color: '#4CAF50',
          fillColor: '#4CAF50',
          fillOpacity: 1
        }).addTo(map);
        
        setTimeout(() => {
          marker.remove();
        }, 500);
      } else {
        // Show error indicator
        const marker = L.circleMarker(e.latlng, {
          radius: 5,
          color: '#f44336',
          fillColor: '#f44336',
          fillOpacity: 1
        }).addTo(map);
        
        setTimeout(() => {
          marker.remove();
        }, 1000);
        
        // Show error message
        const popup = L.popup({
          className: 'error-popup',
          closeButton: false,
          offset: [0, -10]
        })
          .setLatLng(e.latlng)
          .setContent('Point must be inside field boundary')
          .openOn(map);
        
        setTimeout(() => {
          map.closePopup(popup);
        }, 2000);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, field, onWaypointAdd]);

  return (
    <>
      {field.polygon_coordinates && (
        <GeoJSON 
          data={field.polygon_coordinates as any}
          style={{ color: '#2e7d2e', weight: 2, fillOpacity: 0.2 }}
        />
      )}
      
      {waypoints.length > 0 && (
        <>
          <Polyline
            positions={waypoints.map(wp => wp.position)}
            pathOptions={{ color: '#1976d2', weight: 2, dashArray: '5, 10' }}
          />
          {waypoints.map((waypoint, index) => (
            <Marker
              key={waypoint.id}
              position={waypoint.position}
              icon={createWaypointIcon(index + 1)}
              eventHandlers={{
                click: () => onWaypointRemove(waypoint.id)
              }}
            />
          ))}
        </>
      )}
    </>
  );
};

const MissionDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  field: Field;
  onSubmit: (data: MissionFormData) => void;
}> = ({ open, onClose, field, onSubmit }) => {
  const [formData, setFormData] = useState<MissionFormData>({
    name: '',
    field_id: field?.id || 0,
    type: 'scouting' as MissionType,
    waypoints: [],
    altitude_m: 30,
    speed_ms: 5,
  });

  const [waypoints, setWaypoints] = useState<PointMarker[]>([]);
  const nextWaypointId = useRef(1);

  const handleAddWaypoint = useCallback((position: [number, number]) => {
    setWaypoints(prev => [...prev, { id: nextWaypointId.current, position }]);
    nextWaypointId.current += 1;
    setFormData(prev => ({
      ...prev,
      waypoints: [...prev.waypoints, position]
    }));
  }, []);

  const handleRemoveWaypoint = useCallback((id: number) => {
    setWaypoints(prev => {
      const newWaypoints = prev.filter(wp => wp.id !== id);
      setFormData(prev => ({
        ...prev,
        waypoints: newWaypoints.map(wp => wp.position)
      }));
      return newWaypoints;
    });
  }, []);

  const handleSubmit = () => {
    if (waypoints.length < 2) {
      alert('Please add at least 2 waypoints');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Create New Mission</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mission Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Mission Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Mission Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as MissionType })}
                >
                  <MenuItem value="scouting">Scouting</MenuItem>
                  <MenuItem value="spraying">Spraying</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Altitude (meters)"
                value={formData.altitude_m}
                onChange={(e) => setFormData({ ...formData, altitude_m: Number(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Speed (m/s)"
                value={formData.speed_ms}
                onChange={(e) => setFormData({ ...formData, speed_ms: Number(e.target.value) })}
                required
              />
            </Grid>
          </Grid>
        </Box>

        <Typography variant="h6" gutterBottom>
          Select Mission Waypoints
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click on the map to add waypoints. Click on existing waypoints to remove them.
        </Typography>

        <Box sx={{ height: 400, border: '1px solid #ddd', borderRadius: 1 }}>
          <MapContainer
            center={[0, 0]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapDrawer
              field={field}
              waypoints={waypoints}
              onWaypointAdd={handleAddWaypoint}
              onWaypointRemove={handleRemoveWaypoint}
            />
          </MapContainer>
        </Box>

        {waypoints.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Chip
              label={`${waypoints.length} waypoints selected`}
              color="primary"
              variant="outlined"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.name || waypoints.length < 2}
        >
          Create Mission
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const MissionDetails: React.FC<{
  mission: Mission;
  onClose: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onDelete?: () => void;
}> = ({ mission, onClose, onStart, onStop, onDelete }) => {
  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Mission Details</Typography>
          <Chip
            label={mission.status.toUpperCase()}
            color={
              mission.status === 'completed' ? 'success' :
              mission.status === 'running' ? 'primary' :
              mission.status === 'paused' ? 'warning' :
              mission.status === 'planned' ? 'default' : 'error'
            }
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5">{mission.name}</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              {mission.mission_type.charAt(0).toUpperCase() + mission.mission_type.slice(1)} Mission
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="overline" display="block" gutterBottom>
                Flight Parameters
              </Typography>
              <Typography variant="h6">{mission.altitude_m}m</Typography>
              <Typography color="text.secondary">Altitude</Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="overline" display="block" gutterBottom>
                Speed
              </Typography>
              <Typography variant="h6">{mission.speed_ms} m/s</Typography>
              <Typography color="text.secondary">Target Speed</Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="overline" display="block" gutterBottom>
                Waypoints
              </Typography>
              <Typography variant="h6">{mission.waypoints.length}</Typography>
              <Typography color="text.secondary">Total Points</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Timeline</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Created</Typography>
                  <Typography>{new Date(mission.created_at).toLocaleString()}</Typography>
                </Grid>
                {mission.started_at && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Started</Typography>
                    <Typography>{new Date(mission.started_at).toLocaleString()}</Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ height: 400, width: '100%' }}>
              <MapContainer
                center={[0, 0]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {mission.waypoints.length > 0 && (
                  <>
                    <Polyline
                      positions={mission.waypoints.map(wp => [wp.latitude, wp.longitude])}
                      pathOptions={{ color: '#1976d2', weight: 2 }}
                    />
                    {mission.waypoints.map((waypoint, index) => (
                      <Marker
                        key={index}
                        position={[waypoint.latitude, waypoint.longitude]}
                        icon={createWaypointIcon(index + 1)}
                      />
                    ))}
                  </>
                )}
              </MapContainer>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        {mission.status === 'planned' && onStart && (
          <Button startIcon={<StartIcon />} onClick={onStart} color="primary">
            Start Mission
          </Button>
        )}
        {mission.status === 'running' && onStop && (
          <Button startIcon={<StopIcon />} onClick={onStop} color="warning">
            Stop Mission
          </Button>
        )}
        {onDelete && (
          <Button startIcon={<DeleteIcon />} onClick={onDelete} color="error">
            Delete Mission
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const MissionsPage: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [missionsData, fieldsData] = await Promise.all([
        missionsAPI.getMissions(),
        fieldsAPI.getFields()
      ]);
      
      // Fetch full details for each mission
      const fullMissions = await Promise.all(
        missionsData.map(async (summary) => {
          try {
            const fullMission = await missionsAPI.getMission(summary.id);
            return fullMission;
          } catch (error) {
            console.error(`Failed to load details for mission ${summary.id}:`, error);
            // Fallback to summary data with defaults if full details can't be loaded
            return {
              ...summary,
              altitude_m: 30,
              speed_ms: 5,
              field_id: 0,
              owner_id: 0,
              waypoints: []
            };
          }
        })
      );
      
      setMissions(fullMissions);
      setFields(fieldsData);
      
      if (fieldsData.length === 1) {
        setSelectedField(fieldsData[0]);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      alert(error?.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMission = async (data: MissionFormData) => {
    try {
      if (!selectedField) {
        throw new Error('Please select a field first');
      }

      if (!data.waypoints.length) {
        throw new Error('Please add waypoints for the mission');
      }

      if (data.waypoints.length < 2) {
        throw new Error('Please add at least 2 waypoints for the mission');
      }

      const missionCreateData: MissionCreate = {
        name: data.name,
        mission_type: data.type,
        field_id: selectedField.id,
        altitude_m: data.altitude_m,
        speed_ms: data.speed_ms,
        waypoints: data.waypoints.map(([lat, lng], index) => ({
          sequence: index + 1,
          latitude: lat,
          longitude: lng,
          altitude_m: data.altitude_m,
          duration_s: 0,
          action: index === 0 ? 'takeoff' : index === data.waypoints.length - 1 ? 'land' : 'move'
        }))
      };
      
      await missionsAPI.createMission(missionCreateData);
      await loadData();
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating mission:', error);
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          alert(`Failed to create mission:\n${errorMessages}`);
        } else {
          alert(`Failed to create mission: ${errorData}`);
        }
      } else if (error.message) {
        alert(error.message);
      } else {
        alert('Failed to create mission. Please try again.');
      }
    }
  };

  const handleStartMission = async (missionId: number) => {
    try {
      await missionsAPI.startMission(missionId);
      await loadData();
    } catch (error) {
      console.error('Error starting mission:', error);
      alert('Failed to start mission');
    }
  };

  const handlePauseMission = async (missionId: number) => {
    try {
      await missionsAPI.pauseMission(missionId);
      await loadData();
    } catch (error) {
      console.error('Error pausing mission:', error);
      alert('Failed to pause mission');
    }
  };

  const handleAbortMission = async (missionId: number) => {
    try {
      await missionsAPI.abortMission(missionId);
      await loadData();
    } catch (error) {
      console.error('Error aborting mission:', error);
      alert('Failed to abort mission');
    }
  };

  const handleDeleteMission = async (missionId: number) => {
    if (!window.confirm('Are you sure you want to delete this mission?')) {
      return;
    }

    try {
      await missionsAPI.deleteMission(missionId);
      setMissions(prev => prev.filter(m => m.id !== missionId));
      setSelectedMission(null);
    } catch (error) {
      console.error('Error deleting mission:', error);
      alert('Failed to delete mission');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: 'transparent', minHeight: '100vh' }}>
      <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header Section */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            mb: 4,
            gap: 2,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            p: 3,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ mb: 1 }}>Missions</Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage your autonomous drone missions
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'stretch'
          }}>
            <FormControl sx={{ minWidth: 250 }}>
              <InputLabel>Select Field</InputLabel>
              <Select
                value={selectedField?.id || ''}
                label="Select Field"
                onChange={(e) => {
                  const field = fields.find(f => f.id === e.target.value);
                  setSelectedField(field || null);
                }}
              >
                {fields.map((field) => (
                  <MenuItem key={field.id} value={field.id}>
                    {field.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                if (fields.length === 0) {
                  alert('Please create a field first');
                  return;
                }
                if (!selectedField) {
                  alert('Please select a field first');
                  return;
                }
                setDialogOpen(true);
              }}
              sx={{
                height: '100%',
                backgroundColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                }
              }}
            >
              Create Mission
            </Button>
          </Box>
        </Box>

        {/* Missions Grid */}
        <Grid container spacing={3}>
          {missions.map((mission) => (
            <Grid item xs={12} sm={6} md={4} key={mission.id}>
              <Paper 
                sx={{ 
                  p: 3,
                  borderRadius: 2,
                  boxShadow: 1,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  }
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  mb: 2 
                }}>
                  <Box>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>{mission.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {mission.mission_type.charAt(0).toUpperCase() + mission.mission_type.slice(1)} Mission
                    </Typography>
                  </Box>
                  <Chip
                    label={mission.status.toUpperCase()}
                    color={
                      mission.status === 'completed' ? 'success' :
                      mission.status === 'running' ? 'primary' :
                      mission.status === 'paused' ? 'warning' :
                      mission.status === 'planned' ? 'default' : 'error'
                    }
                    sx={{ 
                      fontWeight: 'bold',
                      borderRadius: '8px',
                    }}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Altitude</Typography>
                      <Typography>{mission.altitude_m}m</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Speed</Typography>
                      <Typography>{mission.speed_ms} m/s</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Created</Typography>
                      <Typography>{new Date(mission.created_at).toLocaleDateString()}</Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  justifyContent: 'flex-end',
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Button
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => setSelectedMission(mission)}
                    sx={{ minWidth: '120px' }}
                  >
                    View Details
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Create Mission Dialog */}
        {dialogOpen && selectedField && (
          <MissionDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            field={selectedField}
            onSubmit={handleCreateMission}
          />
        )}

        {/* Mission Details Dialog */}
        {selectedMission && (
          <MissionDetails
            mission={selectedMission}
            onClose={() => setSelectedMission(null)}
            onStart={() => handleStartMission(selectedMission.id)}
            onStop={() => handlePauseMission(selectedMission.id)}
            onDelete={() => handleDeleteMission(selectedMission.id)}
          />
        )}
      </Box>
    </Box>
  );
};

export default MissionsPage;