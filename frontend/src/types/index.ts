export interface InferenceImage {
  id: number;
  user_id: number;
  mission_id?: number;
  timestamp: string;
  vegetation_percentage: number;
  original_path: string;
  mask_path: string;
  overlay_path: string;
}
export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Field {
  id: number;
  name: string;
  description?: string;
  polygon_coordinates: GeoJSON.Polygon;
  area_hectares?: number;
  crop_type?: string;
  owner_id: number;
  created_at: string;
  updated_at?: string;
}

export interface Waypoint {
  id: number;
  mission_id: number;
  sequence: number;
  latitude: number;
  longitude: number;
  altitude_m: number;
  action?: string;
  duration_s: number;
}

export type MissionType = 'scouting' | 'spraying' | 'custom';
export type MissionStatus = 'planned' | 'running' | 'paused' | 'completed' | 'aborted';

export interface Mission {
  id: number;
  name: string;
  mission_type: MissionType;
  status: MissionStatus;
  altitude_m: number;
  speed_ms: number;
  field_id: number;
  owner_id: number;
  created_at: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  waypoints: Waypoint[];
  current_waypoint_index?: number;
  distance_traveled?: number;
  progress?: number;
  simulation_state?: any;
}

export interface MissionSummary {
  id: number;
  name: string;
  mission_type: MissionType;
  status: MissionStatus;
  field_name: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  duration_minutes?: number;
}

export interface TelemetryData {
  mission_id: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
  speed_ms: number;
  battery_percent: number;
  heading_deg: number;
  roll_deg: number;
  pitch_deg: number;
  yaw_deg: number;
  gps_fix_type: number;
  satellites_visible: number;
  ground_speed_ms?: number;
  vertical_speed_ms?: number;
}

export interface AIInsight {
  id: number;
  mission_id: number;
  timestamp: string;
  insight_type: string;
  confidence_score: number;
  data: any;
  is_alert: boolean;
  message?: string;
}

export interface MissionLogEntry {
  id: number;
  mission_id: number;
  timestamp: string;
  log_level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  data?: any;
}

export interface WSMessage {
  type: string;
  mission_id?: number;
  data: any;
  timestamp?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface FieldCreate {
  name: string;
  description?: string;
  polygon_coordinates: GeoJSON.Polygon;
  area_hectares?: number;
  crop_type?: string;
}

export interface WaypointCreate {
  sequence: number;
  latitude: number;
  longitude: number;
  altitude_m: number;
  action?: string;
  duration_s: number;
}

export interface MissionCreate {
  name: string;
  mission_type: MissionType;
  altitude_m: number;
  speed_ms: number;
  field_id: number;
  waypoints: WaypointCreate[];
}