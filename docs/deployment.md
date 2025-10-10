# Deployment Guide

## Development Setup

### Prerequisites
- Python 3.9+
- Node.js 16+
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd agriculture-drone-gcs
```

### 2. Backend Setup

#### Create Python Virtual Environment
```bash
# Windows
cd backend
python -m venv venv
venv\Scripts\activate

# Linux/Mac
cd backend
python3 -m venv venv
source venv/bin/activate
```

#### Install Python Dependencies
```bash
pip install -r requirements.txt
```

#### Configure Environment
```bash
# Create .env file (optional)
echo "SECRET_KEY=your-development-secret-key" > .env
echo "DATABASE_URL=sqlite:///./agriculture_gcs.db" >> .env
```

#### Initialize Database
```bash
# The database will be created automatically on first run
python -c "from database import create_tables; create_tables()"
```

#### Start Backend Server
```bash
# Development server with auto-reload
python -m uvicorn main:app --reload --port 8000

# Or directly
python main.py
```

The API will be available at:
- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Interactive API**: http://localhost:8000/redoc

### 3. Simulator Setup

#### Create Simulator Environment
```bash
# Windows
cd simulator
python -m venv venv
venv\Scripts\activate

# Linux/Mac
cd simulator
python3 -m venv venv
source venv/bin/activate
```

#### Install Simulator Dependencies
```bash
pip install -r requirements.txt
```

#### Start Simulator
```bash
python simulator.py
```

### 4. Frontend Setup

#### Install Node Dependencies
```bash
cd frontend
npm install
```

#### Configure Frontend Environment
```bash
# Create .env file for frontend
echo "REACT_APP_API_BASE_URL=http://localhost:8000" > .env
```

#### Start Frontend Development Server
```bash
npm start
```

The frontend will be available at http://localhost:3000

### 5. Verify Setup

1. **Backend Health Check**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **API Documentation**: Visit http://localhost:8000/docs

3. **Frontend**: Visit http://localhost:3000

4. **Create Test User**:
   ```bash
   curl -X POST "http://localhost:8000/auth/register" \
        -H "Content-Type: application/json" \
        -d '{"username": "testuser", "email": "test@example.com", "password": "testpass123"}'
   ```

## Production Deployment

### Docker Deployment

#### 1. Create Docker Files

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
USER app

# Expose port
EXPOSE 8000

# Start application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Frontend nginx.conf**:
```nginx
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket proxy
    location /ws {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

#### 2. Docker Compose

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: agriculture_gcs
      POSTGRES_USER: gcs_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://gcs_user:secure_password@database:5432/agriculture_gcs
      SECRET_KEY: your-production-secret-key-change-this
      REDIS_URL: redis://redis:6379
    depends_on:
      - database
      - redis
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "80:80"

  simulator:
    build: ./simulator
    environment:
      BACKEND_URL: ws://backend:8000/ws/simulator
    depends_on:
      - backend

volumes:
  postgres_data:
```

#### 3. Deploy with Docker Compose
```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Production Setup

#### 1. Server Requirements
- **OS**: Ubuntu 20.04 LTS or CentOS 8+
- **RAM**: 4GB minimum, 8GB recommended
- **CPU**: 2 cores minimum, 4 cores recommended
- **Storage**: 20GB minimum, SSD recommended
- **Network**: Public IP with ports 80, 443 open

#### 2. Install System Dependencies
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip nodejs npm nginx postgresql postgresql-contrib redis-server

# CentOS/RHEL
sudo yum update
sudo yum install -y python311 python311-pip nodejs npm nginx postgresql postgresql-server redis
```

#### 3. Setup PostgreSQL
```bash
# Initialize database
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE agriculture_gcs;
CREATE USER gcs_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE agriculture_gcs TO gcs_user;
\q
```

#### 4. Setup Application User
```bash
sudo useradd --create-home --shell /bin/bash gcs
sudo -u gcs -i
```

#### 5. Deploy Backend
```bash
# As gcs user
cd /home/gcs
git clone <repository-url> agriculture-drone-gcs
cd agriculture-drone-gcs/backend

# Setup virtual environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create production configuration
cat > .env << EOF
DATABASE_URL=postgresql://gcs_user:secure_password@localhost/agriculture_gcs
SECRET_KEY=$(openssl rand -hex 32)
ALLOWED_ORIGINS=["https://yourdomain.com"]
EOF

# Test application
python main.py
```

#### 6. Setup Systemd Service

**/etc/systemd/system/agriculture-gcs-backend.service**:
```ini
[Unit]
Description=Agriculture GCS Backend
After=network.target postgresql.service

[Service]
Type=exec
User=gcs
Group=gcs
WorkingDirectory=/home/gcs/agriculture-drone-gcs/backend
Environment=PATH=/home/gcs/agriculture-drone-gcs/backend/venv/bin
ExecStart=/home/gcs/agriculture-drone-gcs/backend/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable agriculture-gcs-backend
sudo systemctl start agriculture-gcs-backend
```

#### 7. Build and Deploy Frontend
```bash
cd /home/gcs/agriculture-drone-gcs/frontend
npm install
npm run build

# Copy build to nginx
sudo cp -r build/* /var/www/html/
sudo chown -R nginx:nginx /var/www/html
```

#### 8. Configure Nginx

**/etc/nginx/sites-available/agriculture-gcs**:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Static files
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket proxy
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/agriculture-gcs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 9. SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 10. Setup Monitoring

**Log Rotation** (`/etc/logrotate.d/agriculture-gcs`):
```
/home/gcs/agriculture-drone-gcs/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 gcs gcs
    postrotate
        systemctl reload agriculture-gcs-backend
    endscript
}
```

## Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=sqlite:///./agriculture_gcs.db  # Development
# DATABASE_URL=postgresql://user:pass@host:5432/dbname  # Production

# Security
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days

# CORS
ALLOWED_ORIGINS=["http://localhost:3000","https://yourdomain.com"]

# WebSocket
WEBSOCKET_HEARTBEAT_INTERVAL=30

# Simulator
SIMULATOR_URL=ws://localhost:8001

# AI/ML
ANOMALY_DETECTION_THRESHOLD=0.1
BATTERY_PREDICTION_WINDOW=300
```

### Frontend (.env)
```bash
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8000  # Development
# REACT_APP_API_BASE_URL=https://yourdomain.com/api  # Production

# WebSocket
REACT_APP_WS_BASE_URL=ws://localhost:8000/ws  # Development
# REACT_APP_WS_BASE_URL=wss://yourdomain.com/ws  # Production
```

## Troubleshooting

### Common Issues

1. **Backend won't start**:
   ```bash
   # Check logs
   journalctl -u agriculture-gcs-backend -f
   
   # Verify database connection
   python -c "from database import engine; print(engine.execute('SELECT 1').scalar())"
   ```

2. **Frontend build fails**:
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **WebSocket connection fails**:
   ```bash
   # Check firewall
   sudo ufw allow 8000
   
   # Test WebSocket
   wscat -c ws://localhost:8000/ws/telemetry/1
   ```

4. **Database migration errors**:
   ```bash
   # Reset database (development only)
   rm agriculture_gcs.db
   python -c "from database import create_tables; create_tables()"
   ```

### Performance Monitoring
```bash
# Check system resources
htop
iostat -x 1
free -h

# Check application logs
tail -f /var/log/nginx/access.log
journalctl -u agriculture-gcs-backend -f

# Database performance
sudo -u postgres psql agriculture_gcs -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;"
```