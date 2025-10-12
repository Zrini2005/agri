import { WSMessage } from '../types';

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private listeners: { [key: string]: ((data: any) => void)[] } = {};

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
          this.socket = null;
          this.attemptReconnect(url);
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(url: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(url).catch(() => {
          console.error(`Reconnection attempt ${this.reconnectAttempts} failed`);
        });
      }, this.reconnectInterval);
    } else {
      console.error('Maximum reconnection attempts reached');
    }
  }

  private handleMessage(message: WSMessage): void {
    const { type, data } = message;
    
    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket message handler:', error);
        }
      });
    }
    
    // Also trigger 'message' event for all messages
    if (this.listeners['message']) {
      this.listeners['message'].forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error in WebSocket message handler:', error);
        }
      });
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  send(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners = {};
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// Telemetry WebSocket for specific mission
export class TelemetryWebSocket {
  private ws: WebSocketService;
  private missionId: number;
  private url: string;

  constructor(missionId: number) {
    this.missionId = missionId;
    this.ws = new WebSocketService();
    this.url = `ws://localhost:8000/ws/telemetry/${missionId}`;
  }

  async connect(): Promise<void> {
    try {
      await this.ws.connect(this.url);
      console.log(`Connected to telemetry stream for mission ${this.missionId}`);
    } catch (error) {
      console.error(`Failed to connect to telemetry stream: ${error}`);
      throw error;
    }
  }

  onTelemetry(callback: (data: any) => void): void {
    this.ws.on('telemetry', callback);
  }

  onMissionUpdate(callback: (data: any) => void): void {
    this.ws.on('mission_update', callback);
  }

  onMessage(callback: (message: WSMessage) => void): void {
    this.ws.on('message', callback);
  }

  sendTelemetry(telemetryData: any): void {
    this.ws.send({
      type: 'telemetry',
      data: telemetryData
    });
  }

  disconnect(): void {
    this.ws.disconnect();
  }

  isConnected(): boolean {
    return this.ws.isConnected();
  }
}

export default WebSocketService;