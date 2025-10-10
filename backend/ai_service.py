import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any, Optional
import asyncio
import logging
from datetime import datetime, timedelta
import pickle
import os

logger = logging.getLogger(__name__)


class AIService:
    """AI service for telemetry anomaly detection and battery prediction."""
    
    def __init__(self):
        self.anomaly_detector = None
        self.scaler = StandardScaler()
        self.battery_predictor = None
        self.is_trained = False
        
        # Training parameters
        self.contamination = 0.1  # Expected proportion of anomalies
        self.feature_window = 10  # Number of previous points to consider
        
        # Initialize models
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize AI models."""
        try:
            # Initialize Isolation Forest for anomaly detection
            self.anomaly_detector = IsolationForest(
                contamination=self.contamination,
                random_state=42,
                n_estimators=100
            )
            
            logger.info("AI models initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing AI models: {e}")
    
    def _extract_telemetry_features(self, telemetry_data: dict) -> List[float]:
        """Extract features from telemetry data for ML models."""
        features = [
            telemetry_data.get("latitude", 0.0),
            telemetry_data.get("longitude", 0.0),
            telemetry_data.get("altitude_m", 0.0),
            telemetry_data.get("speed_ms", 0.0),
            telemetry_data.get("battery_percent", 100.0),
            telemetry_data.get("heading_deg", 0.0),
            telemetry_data.get("roll_deg", 0.0),
            telemetry_data.get("pitch_deg", 0.0),
            telemetry_data.get("yaw_deg", 0.0),
            telemetry_data.get("gps_fix_type", 3),
            telemetry_data.get("satellites_visible", 12),
            telemetry_data.get("ground_speed_ms", telemetry_data.get("speed_ms", 0.0)),
            telemetry_data.get("vertical_speed_ms", 0.0)
        ]
        return features
    
    def _train_anomaly_detector(self, telemetry_history: List[dict]):
        """Train anomaly detection model with historical data."""
        if len(telemetry_history) < 50:
            logger.warning("Not enough data to train anomaly detector")
            return False
        
        try:
            # Extract features
            features = []
            for telemetry in telemetry_history:
                feature_vector = self._extract_telemetry_features(telemetry)
                features.append(feature_vector)
            
            # Convert to numpy array and normalize
            X = np.array(features)
            X_scaled = self.scaler.fit_transform(X)
            
            # Train model
            self.anomaly_detector.fit(X_scaled)
            self.is_trained = True
            
            logger.info(f"Anomaly detector trained with {len(telemetry_history)} samples")
            return True
            
        except Exception as e:
            logger.error(f"Error training anomaly detector: {e}")
            return False
    
    async def detect_anomaly(self, telemetry_data: dict) -> Dict[str, Any]:
        """Detect anomalies in telemetry data."""
        try:
            # Extract features
            features = self._extract_telemetry_features(telemetry_data)
            X = np.array([features])
            
            # If not trained, create a simple rule-based detector
            if not self.is_trained:
                return self._rule_based_anomaly_detection(telemetry_data)
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Predict anomaly
            prediction = self.anomaly_detector.predict(X_scaled)[0]
            anomaly_score = self.anomaly_detector.score_samples(X_scaled)[0]
            
            is_anomaly = prediction == -1
            confidence = abs(anomaly_score)
            
            result = {
                "is_anomaly": is_anomaly,
                "confidence": float(confidence),
                "anomaly_score": float(anomaly_score),
                "features": features,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            if is_anomaly:
                result["message"] = self._generate_anomaly_message(telemetry_data, confidence)
            
            return result
            
        except Exception as e:
            logger.error(f"Error detecting anomaly: {e}")
            return {
                "is_anomaly": False,
                "confidence": 0.0,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _rule_based_anomaly_detection(self, telemetry_data: dict) -> Dict[str, Any]:
        """Simple rule-based anomaly detection when ML model is not trained."""
        anomalies = []
        confidence = 0.0
        
        # Check battery level
        battery = telemetry_data.get("battery_percent", 100)
        if battery < 15:
            anomalies.append("Critical battery level")
            confidence = max(confidence, 0.9)
        elif battery < 25:
            anomalies.append("Low battery level")
            confidence = max(confidence, 0.7)
        
        # Check altitude
        altitude = telemetry_data.get("altitude_m", 0)
        if altitude > 150:
            anomalies.append("Altitude too high")
            confidence = max(confidence, 0.8)
        elif altitude < 5:
            anomalies.append("Altitude too low")
            confidence = max(confidence, 0.6)
        
        # Check speed
        speed = telemetry_data.get("speed_ms", 0)
        if speed > 25:
            anomalies.append("Speed too high")
            confidence = max(confidence, 0.7)
        
        # Check GPS fix
        gps_fix = telemetry_data.get("gps_fix_type", 3)
        if gps_fix < 3:
            anomalies.append("Poor GPS signal")
            confidence = max(confidence, 0.8)
        
        # Check satellite count
        satellites = telemetry_data.get("satellites_visible", 12)
        if satellites < 6:
            anomalies.append("Insufficient GPS satellites")
            confidence = max(confidence, 0.6)
        
        is_anomaly = len(anomalies) > 0
        message = "; ".join(anomalies) if anomalies else ""
        
        return {
            "is_anomaly": is_anomaly,
            "confidence": confidence,
            "anomalies": anomalies,
            "message": message,
            "method": "rule_based",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _generate_anomaly_message(self, telemetry_data: dict, confidence: float) -> str:
        """Generate human-readable anomaly message."""
        messages = []
        
        battery = telemetry_data.get("battery_percent", 100)
        altitude = telemetry_data.get("altitude_m", 0)
        speed = telemetry_data.get("speed_ms", 0)
        
        if battery < 20:
            messages.append(f"Low battery: {battery:.1f}%")
        
        if altitude > 120 or altitude < 10:
            messages.append(f"Unusual altitude: {altitude:.1f}m")
        
        if speed > 20:
            messages.append(f"High speed: {speed:.1f} m/s")
        
        if not messages:
            messages.append("Anomalous flight behavior detected")
        
        return f"Alert: {', '.join(messages)} (confidence: {confidence:.2f})"
    
    async def predict_battery_drain(self, telemetry_history: List[Any]) -> Dict[str, Any]:
        """Predict battery drain rate and remaining flight time."""
        try:
            if len(telemetry_history) < 5:
                return {
                    "error": "Insufficient data for battery prediction",
                    "confidence": 0.0
                }
            
            # Extract battery levels and timestamps
            battery_data = []
            timestamps = []
            
            for telemetry in telemetry_history:
                if hasattr(telemetry, 'battery_percent'):
                    battery_data.append(telemetry.battery_percent)
                    timestamps.append(telemetry.timestamp)
                else:
                    battery_data.append(telemetry.get("battery_percent", 100))
                    timestamps.append(
                        datetime.fromisoformat(telemetry.get("timestamp", datetime.utcnow().isoformat()))
                    )
            
            # Calculate drain rate
            if len(battery_data) < 2:
                return {"error": "Insufficient battery data", "confidence": 0.0}
            
            # Simple linear regression for drain rate
            battery_array = np.array(battery_data)
            time_diffs = [(timestamps[i] - timestamps[0]).total_seconds() / 60 for i in range(len(timestamps))]  # minutes
            
            if len(time_diffs) < 2 or max(time_diffs) == 0:
                return {"error": "Invalid time data", "confidence": 0.0}
            
            # Calculate drain rate (% per minute)
            total_time_minutes = max(time_diffs)
            total_battery_drop = battery_data[0] - battery_data[-1]
            drain_rate = total_battery_drop / total_time_minutes if total_time_minutes > 0 else 0
            
            # Predict remaining time
            current_battery = battery_data[-1]
            remaining_minutes = (current_battery - 10) / drain_rate if drain_rate > 0 else float('inf')  # Reserve 10%
            
            # Calculate confidence based on data consistency
            battery_variance = np.var(np.diff(battery_data))
            confidence = min(0.9, max(0.1, 1.0 - battery_variance / 100))
            
            # Recommendations
            recommendations = []
            if remaining_minutes < 10:
                recommendations.append("Return to base immediately")
            elif remaining_minutes < 20:
                recommendations.append("Consider returning to base soon")
            elif drain_rate > 2.0:
                recommendations.append("High battery consumption detected")
            
            return {
                "drain_rate": drain_rate,
                "remaining_minutes": min(remaining_minutes, 120),  # Cap at 2 hours
                "current_battery": current_battery,
                "confidence": confidence,
                "recommendations": recommendations,
                "data_points": len(battery_data),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error predicting battery drain: {e}")
            return {
                "error": str(e),
                "confidence": 0.0,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def analyze_flight_efficiency(self, telemetry_history: List[dict], waypoints: List[dict]) -> Dict[str, Any]:
        """Analyze flight path efficiency and provide recommendations."""
        try:
            if len(telemetry_history) < 10 or len(waypoints) < 2:
                return {"error": "Insufficient data for efficiency analysis"}
            
            # Calculate actual vs planned path efficiency
            total_planned_distance = 0
            total_actual_distance = 0
            
            # Calculate planned distance
            for i in range(1, len(waypoints)):
                wp1, wp2 = waypoints[i-1], waypoints[i]
                dist = self._calculate_distance(
                    wp1.get("latitude", wp1.get("lat", 0)),
                    wp1.get("longitude", wp1.get("lng", 0)),
                    wp2.get("latitude", wp2.get("lat", 0)),
                    wp2.get("longitude", wp2.get("lng", 0))
                )
                total_planned_distance += dist
            
            # Calculate actual distance
            for i in range(1, len(telemetry_history)):
                t1, t2 = telemetry_history[i-1], telemetry_history[i]
                dist = self._calculate_distance(
                    t1.get("latitude", 0), t1.get("longitude", 0),
                    t2.get("latitude", 0), t2.get("longitude", 0)
                )
                total_actual_distance += dist
            
            efficiency = (total_planned_distance / total_actual_distance * 100) if total_actual_distance > 0 else 0
            
            # Calculate speed efficiency
            speeds = [t.get("speed_ms", 0) for t in telemetry_history]
            avg_speed = np.mean(speeds)
            speed_variance = np.var(speeds)
            
            return {
                "path_efficiency": min(100, efficiency),
                "planned_distance_m": total_planned_distance,
                "actual_distance_m": total_actual_distance,
                "average_speed_ms": avg_speed,
                "speed_consistency": max(0, 100 - speed_variance),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing flight efficiency: {e}")
            return {"error": str(e)}
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two GPS coordinates (Haversine formula)."""
        from math import radians, sin, cos, sqrt, atan2
        
        # Earth radius in meters
        R = 6371000
        
        # Convert to radians
        lat1_r, lon1_r = radians(lat1), radians(lon1)
        lat2_r, lon2_r = radians(lat2), radians(lon2)
        
        # Differences
        dlat = lat2_r - lat1_r
        dlon = lon2_r - lon1_r
        
        # Haversine formula
        a = sin(dlat/2)**2 + cos(lat1_r) * cos(lat2_r) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def save_models(self, filepath: str):
        """Save trained models to disk."""
        try:
            models = {
                "anomaly_detector": self.anomaly_detector,
                "scaler": self.scaler,
                "is_trained": self.is_trained
            }
            with open(filepath, 'wb') as f:
                pickle.dump(models, f)
            logger.info(f"Models saved to {filepath}")
        except Exception as e:
            logger.error(f"Error saving models: {e}")
    
    def load_models(self, filepath: str):
        """Load trained models from disk."""
        try:
            if os.path.exists(filepath):
                with open(filepath, 'rb') as f:
                    models = pickle.load(f)
                
                self.anomaly_detector = models.get("anomaly_detector")
                self.scaler = models.get("scaler", StandardScaler())
                self.is_trained = models.get("is_trained", False)
                
                logger.info(f"Models loaded from {filepath}")
                return True
        except Exception as e:
            logger.error(f"Error loading models: {e}")
        
        return False