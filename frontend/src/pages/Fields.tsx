import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Grid,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { fieldsAPI } from '../services/api';
import { Field, FieldCreate } from '../types';

// Fix Leaflet default markers (webpack / CRA require)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface FieldFormData {
  name: string;
  description: string;
  crop_type: string;
  polygon_coordinates: GeoJSON.Polygon | null;
  area_hectares?: number;
}

/* ---------------------------
   DrawControl (top-level)
   --------------------------- */
const DrawControl: React.FC<{
  onCreated: (e: any) => void;
  onEdited: (e: any) => void;
  onDeleted: (e: any) => void;
  featureGroup: React.RefObject<L.FeatureGroup>;
  editEnabled?: boolean;
  removeEnabled?: boolean;
}> = ({ onCreated, onEdited, onDeleted, featureGroup, editEnabled = false, removeEnabled = false }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !featureGroup.current) return;

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: '#2e7d2e',
            weight: 2,
            fillOpacity: 0.3,
          },
        },
      },
      edit: {
        featureGroup: featureGroup.current,
        edit: editEnabled ? {} : false,
        remove: removeEnabled,
      },
    });

    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, onCreated);
    map.on(L.Draw.Event.EDITED, onEdited);
    map.on(L.Draw.Event.DELETED, onDeleted);

    return () => {
      try {
        map.removeControl(drawControl);
      } catch (e) {
        // ignore if already removed
      }
      map.off(L.Draw.Event.CREATED, onCreated);
      map.off(L.Draw.Event.EDITED, onEdited);
      map.off(L.Draw.Event.DELETED, onDeleted);
    };
  }, [map, featureGroup, onCreated, onEdited, onDeleted, editEnabled, removeEnabled]);

  return null;
};

/* ---------------------------
   MapRenderer - ensures GeoJSON polygon is present in FeatureGroup
   --------------------------- */
const MapRenderer: React.FC<{
  featureGroupRef: React.RefObject<L.FeatureGroup>;
  geo?: GeoJSON.Polygon | null;
}> = ({ featureGroupRef, geo }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !featureGroupRef.current) return;

    // Remove existing layers to stay in sync with the geo prop
    featureGroupRef.current.clearLayers();

    if (!geo) {
      return;
    }

    // Create a GeoJSON layer and add sub-layers to the featureGroup
    const layer = L.geoJSON(geo as any, {
      style: { color: '#2e7d2e', weight: 2, fillOpacity: 0.3 },
    });

    layer.eachLayer((l: any) => {
      featureGroupRef.current?.addLayer(l);
    });

    // Fit bounds if valid geometry
    try {
      const bounds = layer.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    } catch (e) {
      // ignore
    }

    // We intentionally do not clear layers on cleanup so editing UI remains stable while mounted.
    return () => {
      // noop
    };
  }, [map, featureGroupRef, geo]);

  return null;
};

/* ---------------------------
   MapDialog (MOVED to top-level and memoized)
   --------------------------- */
const MapDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  formData: FieldFormData;
  onFieldChange: (field: keyof FieldFormData, value: any) => void;
  onFormSubmit: () => void;
  editingField: Field | null;
  cropTypes: string[];
  featureGroupRef: React.RefObject<L.FeatureGroup>;
  onMapCreated: (e: any) => void;
  onMapEdited: (e: any) => void;
  onMapDeleted: (e: any) => void;
  calculateArea: (polygon: GeoJSON.Polygon) => number;
  formatArea: (hectares?: number) => string;
  center: [number, number];
}> = React.memo(({
  open,
  onClose,
  title,
  formData,
  onFieldChange,
  onFormSubmit,
  editingField,
  cropTypes,
  featureGroupRef,
  onMapCreated,
  onMapEdited,
  onMapDeleted,
  calculateArea,
  formatArea,
  center,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Field Name"
              value={formData.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Crop Type</InputLabel>
              <Select
                value={formData.crop_type}
                label="Crop Type"
                onChange={(e) => onFieldChange('crop_type', e.target.value)}
              >
                <MenuItem value="">
                  <em>Select crop type</em>
                </MenuItem>
                {cropTypes.map((crop) => (
                  <MenuItem key={crop} value={crop}>
                    {crop}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => onFieldChange('description', e.target.value)}
            />
          </Grid>
        </Grid>
      </Box>

      <Typography variant="h6" gutterBottom>
        Draw Field Boundary
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Use the polygon tool to draw the field boundary on the map. Click the polygon icon in the toolbar, then click on the map to create points. Double-click to finish the polygon.
      </Typography>

      <Box sx={{ height: 400, border: '1px solid #ddd', borderRadius: 1 }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          key={open ? 'open' : 'closed'} // Optional: remount when open changes to ensure MapContainer initialises cleanly
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <FeatureGroup ref={featureGroupRef}>
            <DrawControl
              onCreated={onMapCreated}
              onEdited={onMapEdited}
              onDeleted={onMapDeleted}
              featureGroup={featureGroupRef}
              editEnabled={!!editingField}
              removeEnabled={!!editingField}
            />
          </FeatureGroup>

          {/* Ensure existing polygon (from formData) is rendered into the featureGroup */}
          <MapRenderer featureGroupRef={featureGroupRef} geo={formData.polygon_coordinates} />
        </MapContainer>
      </Box>

      {formData.polygon_coordinates && (
        <Box sx={{ mt: 2 }}>
          <Chip
            label={`Area: ${formatArea(calculateArea(formData.polygon_coordinates))}`}
            color="primary"
            variant="outlined"
          />
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button
        onClick={onFormSubmit}
        variant="contained"
        disabled={!formData.name.trim() || !formData.polygon_coordinates}
      >
        {editingField ? 'Update Field' : 'Create Field'}
      </Button>
    </DialogActions>
  </Dialog>
));

/* ---------------------------
   Main Fields component
   --------------------------- */
const Fields: React.FC = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [formData, setFormData] = useState<FieldFormData>({
    name: '',
    description: '',
    crop_type: '',
    polygon_coordinates: null,
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  const cropTypes = useMemo(() => [
    'Corn',
    'Wheat',
    'Soybeans',
    'Rice',
    'Cotton',
    'Barley',
    'Oats',
    'Sunflower',
    'Canola',
    'Other',
  ], []);

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      setLoading(true);
      const fieldsData = await fieldsAPI.getFields();
      setFields(fieldsData);
    } catch (err: any) {
      setError('Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  const defaultCenter = useMemo<[number, number]>(() => [40.7128, -74.0060], []);

  const calculateArea = useCallback((polygon: GeoJSON.Polygon): number => {
    if (!polygon.coordinates || !polygon.coordinates[0]) return 0;
    const coords = polygon.coordinates[0];
    let area = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const [x1, y1] = coords[i];
      const [x2, y2] = coords[i + 1];
      area += x1 * y2 - x2 * y1;
    }
    area = Math.abs(area) / 2;
    return area * 111000 * 111000 / 10000;
  }, []);

  const formatArea = useCallback((hectares?: number) => {
    if (!hectares) return 'N/A';
    return `${hectares.toFixed(2)} ha`;
  }, []);

  const handleCreateField = () => {
    setFormData({
      name: '',
      description: '',
      crop_type: '',
      polygon_coordinates: null,
    });
    setEditingField(null);
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setCreateDialogOpen(true);
  };

  const handleEditField = (field: Field) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      description: field.description || '',
      crop_type: field.crop_type || '',
      polygon_coordinates: field.polygon_coordinates,
      area_hectares: field.area_hectares,
    });
    // Keep any existing layers in featureGroup cleared then MapRenderer will add the geojson
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setEditDialogOpen(true);
  };

  const handleDeleteField = async (fieldId: number) => {
    if (!window.confirm('Are you sure you want to delete this field?')) return;
    try {
      await fieldsAPI.deleteField(fieldId);
      setSuccess('Field deleted successfully');
      loadFields();
    } catch (err: any) {
      setError('Failed to delete field');
    }
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Field name is required');
      return;
    }
    if (!formData.polygon_coordinates) {
      setError('Please draw a polygon on the map to define the field area');
      return;
    }
    try {
      const fieldData: FieldCreate = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        crop_type: formData.crop_type || undefined,
        polygon_coordinates: formData.polygon_coordinates,
        area_hectares: calculateArea(formData.polygon_coordinates),
      };

      if (editingField) {
        await fieldsAPI.updateField(editingField.id, fieldData);
        setSuccess('Field updated successfully');
        setEditDialogOpen(false);
      } else {
        await fieldsAPI.createField(fieldData);
        setSuccess('Field created successfully');
        setCreateDialogOpen(false);
      }

      loadFields();
      resetForm();
    } catch (err: any) {
      setError('Failed to save field');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      crop_type: '',
      polygon_coordinates: null,
    });
    setEditingField(null);
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
  };

  // stable handlers
  const handleFieldChange = useCallback((field: keyof FieldFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMapCreated = useCallback((e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      // remove any other layers so we keep only one polygon
      if (featureGroupRef.current) {
        featureGroupRef.current.eachLayer((existingLayer: any) => {
          if (existingLayer !== layer) {
            featureGroupRef.current?.removeLayer(existingLayer);
          }
        });
        // Ensure the new layer is added to the featureGroup (so edit controls can find it)
        try {
          featureGroupRef.current.addLayer(layer);
        } catch (err) {
          // ignore
        }
      }

      // Convert Leaflet polygon to GeoJSON and store
      const geoJSON = layer.toGeoJSON();
      setFormData(prev => ({
        ...prev,
        polygon_coordinates: geoJSON.geometry,
      }));
    }
  }, []);

  const handleMapEdited = useCallback((e: any) => {
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      const geoJSON = layer.toGeoJSON();
      setFormData(prev => ({
        ...prev,
        polygon_coordinates: geoJSON.geometry,
      }));
    });
  }, []);

  const handleMapDeleted = useCallback((e: any) => {
    setFormData(prev => ({
      ...prev,
      polygon_coordinates: null,
    }));
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Field Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateField}
          sx={{ bgcolor: '#2e7d2e' }}
        >
          Create Field
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading fields...</Typography>
      ) : (
        <Grid container spacing={3}>
          {fields.map((field) => (
            <Grid item xs={12} sm={6} md={4} key={field.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2">
                      {field.name}
                    </Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleEditField(field)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteField(field.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {field.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {field.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {field.crop_type && (
                      <Chip size="small" label={field.crop_type} color="secondary" />
                    )}
                    <Chip size="small" label={formatArea(field.area_hectares)} color="primary" variant="outlined" />
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(field.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {fields.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <MapIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No fields created yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first field by clicking the "Create Field" button and drawing a polygon on the map.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateField}
            sx={{ bgcolor: '#2e7d2e' }}
          >
            Create Your First Field
          </Button>
        </Box>
      )}

      <MapDialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetForm();
        }}
        title="Create New Field"
        formData={formData}
        onFieldChange={handleFieldChange}
        onFormSubmit={handleFormSubmit}
        editingField={editingField}
        cropTypes={cropTypes}
        featureGroupRef={featureGroupRef}
        onMapCreated={handleMapCreated}
        onMapEdited={handleMapEdited}
        onMapDeleted={handleMapDeleted}
        calculateArea={calculateArea}
        formatArea={formatArea}
        center={defaultCenter}
      />

      <MapDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          resetForm();
        }}
        title="Edit Field"
        formData={formData}
        onFieldChange={handleFieldChange}
        onFormSubmit={handleFormSubmit}
        editingField={editingField}
        cropTypes={cropTypes}
        featureGroupRef={featureGroupRef}
        onMapCreated={handleMapCreated}
        onMapEdited={handleMapEdited}
        onMapDeleted={handleMapDeleted}
        calculateArea={calculateArea}
        formatArea={formatArea}
        center={defaultCenter}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Fields;
