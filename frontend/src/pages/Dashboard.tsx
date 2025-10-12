import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Avatar,
  Divider,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Agriculture as AgricultureIcon,
  FlightTakeoff as FlightIcon,
  Assessment as ReportsIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Battery90 as BatteryIcon,
  Wifi as WifiIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  PlayArrow as PlayArrowIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const systemStatus = [
    { label: 'Backend Connection', status: 'Connected', color: '#22c55e', icon: <WifiIcon /> },
    { label: 'Drone Simulator', status: 'Ready', color: '#22c55e', icon: <FlightIcon /> },
    { label: 'AI Service', status: 'Active', color: '#22c55e', icon: <CheckCircleIcon /> },
  ];

  const quickStats = [
    { label: 'Total Fields', value: '3', icon: <AgricultureIcon />, color: '#22c55e' },
    { label: 'Active Missions', value: '1', icon: <FlightIcon />, color: '#f59e0b' },
    { label: 'Completed Today', value: '2', icon: <CheckCircleIcon />, color: '#10b981' },
    { label: 'Total Flight Time', value: '4.2h', icon: <TimelineIcon />, color: '#8b5cf6' },
  ];

  const recentActivity = [
    { type: 'success', message: 'Mission "Field A Scouting" completed successfully', time: '2 min ago' },
    { type: 'warning', message: 'Mission "Field B Spraying" paused for battery check', time: '15 min ago' },
    { type: 'info', message: 'New telemetry data processed for Field C', time: '32 min ago' },
    { type: 'success', message: 'AI anomaly detection completed', time: '1 hour ago' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircleIcon sx={{ color: '#22c55e' }} />;
      case 'warning': return <WarningIcon sx={{ color: '#f59e0b' }} />;
      default: return <FlightIcon sx={{ color: '#3b82f6' }} />;
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'transparent',
      p: 0
    }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ 
          fontWeight: 800,
          mb: 1,
          background: 'linear-gradient(135deg, #ffffff 0%, #22c55e 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}>
          Agriculture Drone GCS
        </Typography>
        <Typography variant="h5" sx={{ 
          color: '#a3a3a3',
          fontWeight: 400,
          mb: 3
        }}>
          Dashboard Overview
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Chip 
            label={`Live - ${currentTime.toLocaleTimeString()}`}
            sx={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              fontWeight: 600,
              animation: 'pulse 2s infinite'
            }}
          />
          <Chip 
            label="All Systems Operational"
            sx={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontWeight: 600
            }}
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* System Status Cards */}
        <Grid item xs={12} lg={8}>
          <Grid container spacing={3}>
            {/* Quick Stats */}
            {quickStats.map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={stat.label}>
                <Card sx={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '12px',
                  height: '100%',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.8)',
                    borderColor: stat.color,
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${stat.color} 0%, transparent 100%)`,
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{
                        background: `rgba(${stat.color.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ')}, 0.2)`,
                        color: stat.color,
                        width: 48,
                        height: 48,
                        mr: 2
                      }}>
                        {stat.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="h4" sx={{ 
                          fontWeight: 700,
                          color: '#ffffff',
                          lineHeight: 1
                        }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: '#a3a3a3',
                          fontWeight: 500
                        }}>
                          {stat.label}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {/* System Status */}
            <Grid item xs={12}>
              <Card sx={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                borderRadius: '12px',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)',
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ 
                    mb: 3,
                    color: '#ffffff',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <WifiIcon sx={{ mr: 1, color: '#22c55e' }} />
                    System Status
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {systemStatus.map((system, index) => (
                      <Grid item xs={12} md={4} key={system.label}>
                        <Box sx={{
                          p: 2,
                          border: `1px solid ${system.color}30`,
                          borderRadius: '8px',
                          background: `${system.color}10`,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            background: `${system.color}20`,
                            transform: 'translateY(-2px)',
                          }
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            {system.icon}
                            <Typography variant="body1" sx={{ 
                              ml: 1,
                              color: '#ffffff',
                              fontWeight: 600
                            }}>
                              {system.label}
                            </Typography>
                          </Box>
                          <Chip 
                            label={system.status}
                            size="small"
                            sx={{
                              background: `${system.color}30`,
                              color: system.color,
                              border: `1px solid ${system.color}50`,
                              fontWeight: 600
                            }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} lg={4}>
          <Card sx={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: '12px',
            height: 'fit-content',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ 
                mb: 3,
                color: '#ffffff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center'
              }}>
                <TimelineIcon sx={{ mr: 1, color: '#22c55e' }} />
                Recent Activity
              </Typography>
              
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {recentActivity.map((activity, index) => (
                  <Box key={index} sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    p: 2,
                    mb: 1,
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'var(--bg-hover)',
                      transform: 'translateX(4px)',
                    }
                  }}>
                    {getActivityIcon(activity.type)}
                    <Box sx={{ ml: 2, flex: 1 }}>
                      <Typography variant="body2" sx={{ 
                        color: '#d4d4d4',
                        fontWeight: 500,
                        mb: 0.5
                      }}>
                        {activity.message}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#737373' }}>
                        {activity.time}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card sx={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: '12px',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ 
                mb: 3,
                color: '#ffffff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center'
              }}>
                <PlayArrowIcon sx={{ mr: 1, color: '#22c55e' }} />
                Quick Actions
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/fields')}
                    sx={{
                      py: 1.5,
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(34, 197, 94, 0.4)',
                      }
                    }}
                  >
                    Create Field
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<FlightIcon />}
                    onClick={() => navigate('/missions')}
                    sx={{
                      py: 1.5,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)',
                      }
                    }}
                  >
                    Plan Mission
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<ReportsIcon />}
                    onClick={() => navigate('/reports')}
                    sx={{
                      py: 1.5,
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4)',
                      }
                    }}
                  >
                    View Reports
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<VisibilityIcon />}
                    onClick={() => navigate('/mission-execution')}
                    sx={{
                      py: 1.5,
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(245, 158, 11, 0.4)',
                      }
                    }}
                  >
                    Live Monitor
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;