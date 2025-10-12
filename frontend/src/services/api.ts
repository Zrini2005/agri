import axios, { AxiosResponse } from 'axios';
import { 
  User, 
  Field, 
  Mission, 
  MissionSummary, 
  TelemetryData, 
  AIInsight, 
  MissionLogEntry,
  LoginCredentials,
  RegisterData,
  Token,
  FieldCreate,
  MissionCreate
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<Token> => {
    const response: AxiosResponse<Token> = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterData): Promise<User> => {
    const response: AxiosResponse<User> = await api.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response: AxiosResponse<User> = await api.get('/auth/me');
    return response.data;
  },
};

// Fields
export const fieldsAPI = {
  getFields: async (): Promise<Field[]> => {
    const response: AxiosResponse<Field[]> = await api.get('/fields');
    return response.data;
  },

  createField: async (fieldData: FieldCreate): Promise<Field> => {
    const response: AxiosResponse<Field> = await api.post('/fields', fieldData);
    return response.data;
  },

  getField: async (fieldId: number): Promise<Field> => {
    const response: AxiosResponse<Field> = await api.get(`/fields/${fieldId}`);
    return response.data;
  },

  updateField: async (fieldId: number, fieldData: Partial<FieldCreate>): Promise<Field> => {
    const response: AxiosResponse<Field> = await api.put(`/fields/${fieldId}`, fieldData);
    return response.data;
  },

  deleteField: async (fieldId: number): Promise<void> => {
    await api.delete(`/fields/${fieldId}`);
  },
};

// Missions
export const missionsAPI = {
  getMissions: async (): Promise<MissionSummary[]> => {
    const response: AxiosResponse<MissionSummary[]> = await api.get('/missions');
    return response.data;
  },

  createMission: async (missionData: MissionCreate): Promise<Mission> => {
    const response: AxiosResponse<Mission> = await api.post('/missions', missionData);
    return response.data;
  },

  getMission: async (missionId: number): Promise<Mission> => {
    const response: AxiosResponse<Mission> = await api.get(`/missions/${missionId}`);
    return response.data;
  },

  updateMission: async (missionId: number, missionData: Partial<MissionCreate>): Promise<Mission> => {
    const response: AxiosResponse<Mission> = await api.put(`/missions/${missionId}`, missionData);
    return response.data;
  },

  deleteMission: async (missionId: number): Promise<void> => {
    await api.delete(`/missions/${missionId}`);
  },

  startMission: async (missionId: number): Promise<{ message: string }> => {
    const response = await api.post(`/missions/${missionId}/start`);
    return response.data;
  },

  pauseMission: async (missionId: number): Promise<{ message: string }> => {
    const response = await api.post(`/missions/${missionId}/pause`);
    return response.data;
  },

  resumeMission: async (missionId: number): Promise<{ message: string }> => {
    const response = await api.post(`/missions/${missionId}/resume`);
    return response.data;
  },

  abortMission: async (missionId: number): Promise<{ message: string }> => {
    const response = await api.post(`/missions/${missionId}/abort`);
    return response.data;
  },
};

// Telemetry and Logs
export const telemetryAPI = {
  getTelemetry: async (missionId: number, skip = 0, limit = 1000): Promise<TelemetryData[]> => {
    const response: AxiosResponse<TelemetryData[]> = await api.get(
      `/telemetry/${missionId}?skip=${skip}&limit=${limit}`
    );
    return response.data;
  },

  getLogs: async (
    missionId?: number,
    logLevel?: string,
    skip = 0,
    limit = 100
  ): Promise<MissionLogEntry[]> => {
    const params = new URLSearchParams();
    if (missionId) params.append('mission_id', missionId.toString());
    if (logLevel) params.append('log_level', logLevel);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    const response: AxiosResponse<MissionLogEntry[]> = await api.get(`/logs?${params}`);
    return response.data;
  },

  exportMissionData: async (missionId: number, format: 'csv' | 'json'): Promise<Blob> => {
    const response = await api.get(`/logs/${missionId}/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// AI Analytics
export const aiAPI = {
  getAnomalies: async (missionId: number): Promise<AIInsight[]> => {
    const response: AxiosResponse<AIInsight[]> = await api.get(`/ai/anomalies/${missionId}`);
    return response.data;
  },

  predictBattery: async (missionId: number): Promise<any> => {
    const response = await api.post(`/ai/predict-battery?mission_id=${missionId}`);
    return response.data;
  },
};

// Inference
export interface InferenceResult {
  success: boolean;
  vegetation_percentage: number;
  original_image: string;
  mask_image: string;
  overlay_image: string;
  original_path: string;
  mask_path: string;
  overlay_path: string;
  timestamp: string;
}

export const inferenceAPI = {
  analyzeImage: async (file: File): Promise<InferenceResult> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response: AxiosResponse<InferenceResult> = await api.post('/inference/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;