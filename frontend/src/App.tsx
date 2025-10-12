import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Fields from './pages/Fields';
import Missions from './pages/Missions';
import MissionExecution from './pages/MissionExecution';
import Inference from './pages/Inference';
import Reports from './pages/Reports';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#16a34a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1f1f1f',
    },
    text: {
      primary: '#ffffff',
      secondary: '#a3a3a3',
      disabled: '#737373',
    },
    divider: '#262626',
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#16a34a',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      color: '#ffffff',
    },
    h2: {
      fontWeight: 700,
      color: '#ffffff',
    },
    h3: {
      fontWeight: 600,
      color: '#ffffff',
    },
    h4: {
      fontWeight: 600,
      color: '#ffffff',
    },
    h5: {
      fontWeight: 600,
      color: '#ffffff',
    },
    h6: {
      fontWeight: 600,
      color: '#ffffff',
    },
    body1: {
      color: '#d4d4d4',
    },
    body2: {
      color: '#a3a3a3',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1f1f1f',
          backgroundImage: 'none',
          border: '1px solid #262626',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#111111',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#111111',
          borderRight: '1px solid #262626',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
        contained: {
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          boxShadow: '0 4px 14px 0 rgba(34, 197, 94, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            boxShadow: '0 6px 20px 0 rgba(34, 197, 94, 0.4)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1f1f1f',
          backgroundImage: 'none',
          border: '1px solid #262626',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.8)',
            borderColor: '#22c55e',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#1a1a1a',
            '& fieldset': {
              borderColor: '#404040',
            },
            '&:hover fieldset': {
              borderColor: '#22c55e',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#22c55e',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#a3a3a3',
            '&.Mui-focused': {
              color: '#22c55e',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a1a1a',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#404040',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#22c55e',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#22c55e',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: '#2a2a2a',
          color: '#ffffff',
          border: '1px solid #404040',
        },
        colorPrimary: {
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          color: '#22c55e',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        },
        colorSuccess: {
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        },
        colorWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        },
        colorError: {
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderLeft: '3px solid #22c55e',
            '&:hover': {
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1f1f1f',
          backgroundImage: 'none',
          border: '1px solid #262626',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          backgroundColor: '#1f1f1f',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #262626',
          color: '#d4d4d4',
        },
        head: {
          backgroundColor: '#2a2a2a',
          color: '#ffffff',
          fontWeight: 600,
        },
      },
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} 
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="fields" element={<Fields />} />
        <Route path="missions" element={<Missions />} />
        <Route path="mission-execution" element={<MissionExecution />} />
        <Route path="missions/:missionId/execute" element={<MissionExecution />} />
        <Route path="inference" element={<Inference />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;