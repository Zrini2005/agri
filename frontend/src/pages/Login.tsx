import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
  Grid,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Agriculture as AgricultureIcon,
  Login as LoginIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginCredentials } from '../types';
import AnimatedBackground from '../components/AnimatedBackground';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(credentials);
      navigate('/dashboard');
    } catch (err: any) {
      const formatError = (e: any) => {
        if (!e) return '';
        if (typeof e === 'string') return e;
        const detail = e.response?.data?.detail ?? e.message ?? e;
        if (typeof detail === 'string') return detail;
        try {
          return JSON.stringify(detail);
        } catch {
          return String(detail);
        }
      };

      setError(formatError(err) || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      <AnimatedBackground />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'transparent',
          position: 'relative',
        }}
      >
        <Container component="main" maxWidth="lg">
          <Grid container spacing={4} alignItems="center" justifyContent="center">
            {/* Left side - Branding */}
            <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box sx={{ pr: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <Box sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 3,
                    boxShadow: '0 0 40px rgba(34, 197, 94, 0.4)',
                    animation: 'pulse 3s infinite'
                  }}>
                    <AgricultureIcon sx={{ color: 'white', fontSize: 40 }} />
                  </Box>
                  <Box>
                    <Typography variant="h2" sx={{ 
                      fontWeight: 800, 
                      background: 'linear-gradient(135deg, #ffffff 0%, #22c55e 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      mb: 1
                    }}>
                      AgriDrone
                    </Typography>
                    <Typography variant="h5" sx={{ 
                      color: '#22c55e',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '2px'
                    }}>
                      Ground Control System
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="h4" sx={{ 
                  color: '#ffffff', 
                  mb: 3,
                  fontWeight: 600,
                  lineHeight: 1.2
                }}>
                  Next-Generation Agriculture
                  <br />
                  <span style={{ color: '#22c55e' }}>Drone Operations</span>
                </Typography>
                
                <Typography variant="body1" sx={{ 
                  color: '#a3a3a3', 
                  mb: 4,
                  fontSize: '1.1rem',
                  lineHeight: 1.6
                }}>
                  Precision agriculture at your fingertips. Monitor crops, plan missions, 
                  and analyze data with our advanced drone ground control system.
                </Typography>

                <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
                  {[
                    'Real-time Monitoring',
                    'AI-Powered Analytics',
                    'Mission Planning',
                    'Data Insights'
                  ].map((feature, index) => (
                    <Box key={feature} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#22c55e',
                        mr: 1,
                        boxShadow: '0 0 10px rgba(34, 197, 94, 0.6)',
                        animation: `pulse ${2 + index * 0.5}s infinite`
                      }} />
                      <Typography variant="body2" sx={{ color: '#d4d4d4', fontWeight: 500 }}>
                        {feature}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>

            {/* Right side - Login Form */}
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                animation: 'slideInUp 0.8s ease-out'
              }}>
                <Paper
                  elevation={0}
                  sx={{
                    padding: { xs: 3, sm: 4, md: 5 },
                    width: '100%',
                    maxWidth: 420,
                    background: 'rgba(31, 31, 31, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)',
                    }
                  }}
                >
                  {/* Mobile branding */}
                  <Box sx={{ 
                    display: { xs: 'flex', md: 'none' }, 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mb: 4 
                  }}>
                    <Box sx={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
                    }}>
                      <AgricultureIcon sx={{ color: 'white', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #ffffff 0%, #22c55e 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent'
                    }}>
                      AgriDrone GCS
                    </Typography>
                  </Box>

                  <Typography variant="h4" sx={{ 
                    mb: 1,
                    fontWeight: 700,
                    color: '#ffffff',
                    textAlign: { xs: 'center', md: 'left' }
                  }}>
                    Welcome Back
                  </Typography>
                  
                  <Typography variant="body1" sx={{ 
                    mb: 4,
                    color: '#a3a3a3',
                    textAlign: { xs: 'center', md: 'left' }
                  }}>
                    Sign in to continue to your dashboard
                  </Typography>

                  {error && (
                    <Alert 
                      severity="error" 
                      sx={{ 
                        mb: 3,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        '& .MuiAlert-icon': { color: '#ef4444' }
                      }}
                    >
                      {error}
                    </Alert>
                  )}

                  <Box component="form" onSubmit={handleSubmit}>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="username"
                      label="Username"
                      name="username"
                      autoComplete="username"
                      autoFocus
                      value={credentials.username}
                      onChange={handleChange}
                      sx={{ mb: 2 }}
                    />
                    
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      autoComplete="current-password"
                      value={credentials.password}
                      onChange={handleChange}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              sx={{ color: '#a3a3a3' }}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ mb: 3 }}
                    />
                    
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={loading}
                      endIcon={loading ? null : <ArrowForwardIcon />}
                      sx={{
                        py: 1.5,
                        mb: 3,
                        fontSize: '1rem',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: '-100%',
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                          transition: 'left 0.5s ease',
                        },
                        '&:hover::before': {
                          left: '100%',
                        },
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(34, 197, 94, 0.4)',
                        }
                      }}
                    >
                      {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box className="spinner" sx={{ width: 16, height: 16 }} />
                          Signing In...
                        </Box>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                    
                    <Box textAlign="center">
                      <Typography variant="body2" sx={{ color: '#a3a3a3', mb: 1 }}>
                        Don't have an account?
                      </Typography>
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => navigate('/register')}
                        sx={{
                          color: '#22c55e',
                          fontWeight: 600,
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                            color: '#16a34a',
                          }
                        }}
                      >
                        Create Account
                      </Link>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default Login;