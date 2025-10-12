import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  useMediaQuery,
  useTheme,
  Avatar,
  Divider,
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Map as MapIcon,
  FlightTakeoff as FlightIcon,
  PlayArrow as ExecuteIcon,
  Analytics as AnalyticsIcon,
  Assessment as ReportsIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Agriculture as AgricultureIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 280;

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', description: 'Overview & Analytics' },
    { text: 'Fields', icon: <MapIcon />, path: '/fields', description: 'Manage Field Areas' },
    { text: 'Missions', icon: <FlightIcon />, path: '/missions', description: 'Plan & Execute' },
    { text: 'Mission Execution', icon: <ExecuteIcon />, path: '/mission-execution', description: 'Live Operations' },
    { text: 'AI Inference', icon: <AnalyticsIcon />, path: '/inference', description: 'Smart Analytics' },
    { text: 'Reports', icon: <ReportsIcon />, path: '/reports', description: 'Data & Insights' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const getPageTitle = () => {
    const currentPage = menuItems.find(item => item.path === location.pathname);
    return currentPage?.text || 'Agriculture Drone GCS';
  };

  const drawer = (
    <Box sx={{ 
      height: '100%', 
      background: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)',
      borderRight: '1px solid #262626',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Logo Section */}
      <Box sx={{ 
        p: 3, 
        borderBottom: '1px solid #262626',
        background: 'linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
          }}>
            <AgricultureIcon sx={{ color: 'white', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ 
              fontWeight: 700, 
              color: '#ffffff',
              fontSize: '1.1rem'
            }}>
              AgriDrone
            </Typography>
            <Typography variant="caption" sx={{ 
              color: '#22c55e',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Ground Control
            </Typography>
          </Box>
        </Box>
        
        {/* User Info */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          p: 2,
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(34, 197, 94, 0.2)'
        }}>
          <Avatar sx={{ 
            width: 32, 
            height: 32, 
            mr: 2,
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ 
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.username || 'User'}
            </Typography>
            <Chip 
              label="Online" 
              size="small"
              sx={{
                height: 16,
                fontSize: '0.65rem',
                fontWeight: 600,
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                '& .MuiChip-label': { px: 1 }
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Typography variant="overline" sx={{ 
          color: '#737373',
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '1px',
          px: 2,
          mb: 1,
          display: 'block'
        }}>
          Navigation
        </Typography>
        <List sx={{ p: 0 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleMenuClick(item.path)}
                  sx={{
                    borderRadius: '8px',
                    mx: 1,
                    minHeight: 48,
                    background: isActive ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%)' : 'transparent',
                    border: isActive ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid transparent',
                    '&:hover': {
                      background: isActive 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(22, 163, 74, 0.2) 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                      transform: 'translateX(4px)',
                    },
                    transition: 'all 0.2s ease',
                    '&.Mui-selected': {
                      backgroundColor: 'transparent',
                    }
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: isActive ? '#22c55e' : '#a3a3a3',
                    minWidth: 40,
                    transition: 'color 0.2s ease'
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    secondary={item.description}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#ffffff' : '#d4d4d4'
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.75rem',
                      color: isActive ? '#22c55e' : '#737373'
                    }}
                  />
                  {isActive && (
                    <Box sx={{
                      width: 4,
                      height: 20,
                      background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                      borderRadius: '2px',
                      boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
                    }} />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Logout Section */}
      <Box sx={{ p: 2, borderTop: '1px solid #262626' }}>
        <Button
          fullWidth
          onClick={handleLogout}
          startIcon={<LogoutIcon />}
          sx={{
            justifyContent: 'flex-start',
            color: '#ef4444',
            borderRadius: '8px',
            py: 1.5,
            '&:hover': {
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #111111 0%, #1f1f1f 100%)',
          borderBottom: '1px solid #262626',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" noWrap component="div" sx={{ 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #ffffff 0%, #22c55e 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              fontSize: '1.25rem'
            }}>
              {getPageTitle()}
            </Typography>
            
            <Chip 
              label="Live"
              size="small"
              sx={{
                ml: 2,
                height: 24,
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                fontSize: '0.75rem',
                fontWeight: 600,
                animation: 'pulse 2s infinite'
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ 
              color: '#a3a3a3',
              display: { xs: 'none', sm: 'block' }
            }}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                background: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)',
                border: 'none'
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                background: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)',
                border: 'none'
              },
            }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)',
          position: 'relative'
        }}
      >
        <Toolbar />
        <Box sx={{ 
          p: { xs: 2, sm: 3 },
          height: 'calc(100vh - 64px)',
          overflow: 'auto'
        }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;