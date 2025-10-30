import React, { useState, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Alert,
  CircularProgress,
  LinearProgress,
  IconButton,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  Analytics as AnalyticsIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Grass as GrassIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { inferenceAPI, InferenceResult } from '../services/api';

const Inference: React.FC = () => {
  // Vegetation detection state
  const [vegFile, setVegFile] = useState<File | null>(null);
  const [vegPreview, setVegPreview] = useState<string>('');
  const [vegLoading, setVegLoading] = useState(false);
  const [vegetationResult, setVegetationResult] = useState<InferenceResult | null>(null);
  const [vegError, setVegError] = useState<string>('');
  const vegInputRef = useRef<HTMLInputElement>(null);

  // Weed detection state
  const [weedFile, setWeedFile] = useState<File | null>(null);
  const [weedPreview, setWeedPreview] = useState<string>('');
  const [weedLoading, setWeedLoading] = useState(false);
  const [weedResult, setWeedResult] = useState<InferenceResult | null>(null);
  const [weedError, setWeedError] = useState<string>('');
  const weedInputRef = useRef<HTMLInputElement>(null);

  // Vegetation file handlers
  const handleVegFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setVegError('Please select an image file');
        return;
      }
      setVegFile(file);
      setVegPreview(URL.createObjectURL(file));
      setVegError('');
      setVegetationResult(null);
    }
  };

  const handleVegDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setVegError('Please drop an image file');
        return;
      }
      setVegFile(file);
      setVegPreview(URL.createObjectURL(file));
      setVegError('');
      setVegetationResult(null);
    }
  };

  // Weed file handlers
  const handleWeedFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setWeedError('Please select an image file');
        return;
      }
      setWeedFile(file);
      setWeedPreview(URL.createObjectURL(file));
      setWeedError('');
      setWeedResult(null);
    }
  };

  const handleWeedDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setWeedError('Please drop an image file');
        return;
      }
      setWeedFile(file);
      setWeedPreview(URL.createObjectURL(file));
      setWeedError('');
      setWeedResult(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleVegAnalyze = async () => {
    if (!vegFile) {
      setVegError('Please select an image first');
      return;
    }

    setVegLoading(true);
    setVegError('');

    try {
      const result = await inferenceAPI.analyzeImage(vegFile, 'vegetation');
      setVegetationResult(result);
    } catch (err: any) {
      setVegError(err.response?.data?.detail || 'Failed to analyze image');
      console.error('Vegetation analysis error:', err);
    } finally {
      setVegLoading(false);
    }
  };

  const handleWeedAnalyze = async () => {
    if (!weedFile) {
      setWeedError('Please select an image first');
      return;
    }

    setWeedLoading(true);
    setWeedError('');

    try {
      const result = await inferenceAPI.analyzeImage(weedFile, 'weed');
      setWeedResult(result);
    } catch (err: any) {
      setWeedError(err.response?.data?.detail || 'Failed to analyze image');
      console.error('Weed analysis error:', err);
    } finally {
      setWeedLoading(false);
    }
  };

  const handleVegReset = () => {
    setVegFile(null);
    setVegPreview('');
    setVegetationResult(null);
    setVegError('');
    if (vegInputRef.current) {
      vegInputRef.current.value = '';
    }
  };

  const handleWeedReset = () => {
    setWeedFile(null);
    setWeedPreview('');
    setWeedResult(null);
    setWeedError('');
    if (weedInputRef.current) {
      weedInputRef.current.value = '';
    }
  };

  const handleDownload = (imageData: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <AnalyticsIcon sx={{ mr: 2, fontSize: 40 }} />
          AI-Powered Image Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload images for separate vegetation segmentation and weed detection analysis
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* ========== VEGETATION SEGMENTATION SECTION ========== */}
        <Grid item xs={12} lg={6}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(0,0,0,0) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.2)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <GrassIcon sx={{ mr: 1.5, fontSize: 32, color: '#22c55e' }} />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Vegetation Segmentation
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Analyzes vegetation coverage using ExG (Excess Green Index) algorithm
            </Typography>

            {vegError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setVegError('')}>
                {vegError}
              </Alert>
            )}

            {/* Vegetation Upload Box */}
            <Box
              onDrop={handleVegDrop}
              onDragOver={handleDragOver}
              sx={{
                border: '2px dashed',
                borderColor: vegFile ? '#22c55e' : 'grey.300',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                bgcolor: vegFile ? 'rgba(34, 197, 94, 0.05)' : 'background.default',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: '#22c55e',
                  bgcolor: 'rgba(34, 197, 94, 0.05)',
                },
              }}
              onClick={() => vegInputRef.current?.click()}
            >
              <input
                ref={vegInputRef}
                type="file"
                accept="image/*"
                onChange={handleVegFileSelect}
                style={{ display: 'none' }}
              />

              {vegPreview ? (
                <Box>
                  <img
                    src={vegPreview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      objectFit: 'contain',
                      borderRadius: 8,
                    }}
                  />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    {vegFile?.name}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <ImageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                  <Typography variant="body1" gutterBottom>
                    Drop image here or click
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    JPG, PNG, JPEG
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={vegLoading ? <CircularProgress size={20} /> : <AnalyticsIcon />}
                onClick={handleVegAnalyze}
                disabled={!vegFile || vegLoading}
                fullWidth
                sx={{ bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' } }}
              >
                {vegLoading ? 'Analyzing...' : 'Analyze Vegetation'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={handleVegReset}
                disabled={!vegFile}
                sx={{ borderColor: '#22c55e', color: '#22c55e' }}
              >
                Clear
              </Button>
            </Box>

            {vegLoading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress sx={{ '& .MuiLinearProgress-bar': { bgcolor: '#22c55e' } }} />
              </Box>
            )}

            {/* Vegetation Results */}
            {vegetationResult && (
              <Box sx={{ mt: 4 }}>
                <Divider sx={{ mb: 3 }} />
                <Card variant="outlined" sx={{ mb: 2, bgcolor: 'rgba(34, 197, 94, 0.05)' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Vegetation Coverage
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#22c55e', fontWeight: 700 }}>
                      {vegetationResult.vegetation_percentage.toFixed(2)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={vegetationResult.vegetation_percentage}
                      sx={{
                        mt: 2,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': { bgcolor: '#22c55e' },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Using ExG (Excess Green Index) Algorithm
                    </Typography>
                  </CardContent>
                </Card>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">Green Overlay</Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(vegetationResult.overlay_image, 'vegetation_overlay.png')}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                      <CardMedia
                        component="img"
                        image={vegetationResult.overlay_image}
                        alt="Vegetation Overlay"
                        sx={{ maxHeight: 300, objectFit: 'contain', bgcolor: 'grey.100' }}
                      />
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* ========== WEED DETECTION SECTION ========== */}
        <Grid item xs={12} lg={6}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(0,0,0,0) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <BugReportIcon sx={{ mr: 1.5, fontSize: 32, color: '#ef4444' }} />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Weed Detection
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Detects weeds using YOLO AI model trained on crop/weed classification
            </Typography>

            {weedError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setWeedError('')}>
                {weedError}
              </Alert>
            )}

            {/* Weed Upload Box */}
            <Box
              onDrop={handleWeedDrop}
              onDragOver={handleDragOver}
              sx={{
                border: '2px dashed',
                borderColor: weedFile ? '#ef4444' : 'grey.300',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                bgcolor: weedFile ? 'rgba(239, 68, 68, 0.05)' : 'background.default',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: '#ef4444',
                  bgcolor: 'rgba(239, 68, 68, 0.05)',
                },
              }}
              onClick={() => weedInputRef.current?.click()}
            >
              <input
                ref={weedInputRef}
                type="file"
                accept="image/*"
                onChange={handleWeedFileSelect}
                style={{ display: 'none' }}
              />

              {weedPreview ? (
                <Box>
                  <img
                    src={weedPreview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      objectFit: 'contain',
                      borderRadius: 8,
                    }}
                  />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    {weedFile?.name}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <ImageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                  <Typography variant="body1" gutterBottom>
                    Drop image here or click
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    JPG, PNG, JPEG
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={weedLoading ? <CircularProgress size={20} /> : <BugReportIcon />}
                onClick={handleWeedAnalyze}
                disabled={!weedFile || weedLoading}
                fullWidth
                sx={{ bgcolor: '#ef4444', '&:hover': { bgcolor: '#dc2626' } }}
              >
                {weedLoading ? 'Detecting...' : 'Detect Weeds'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={handleWeedReset}
                disabled={!weedFile}
                sx={{ borderColor: '#ef4444', color: '#ef4444' }}
              >
                Clear
              </Button>
            </Box>

            {weedLoading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress sx={{ '& .MuiLinearProgress-bar': { bgcolor: '#ef4444' } }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  Running YOLO detection...
                </Typography>
              </Box>
            )}

            {/* Weed Results */}
            {weedResult && (
              <Box sx={{ mt: 4 }}>
                <Divider sx={{ mb: 3 }} />
                
                {/* Show YOLO Detection Image with Boxes */}
                {weedResult.plotted_image && (
                  <Card sx={{ mb: 2, border: '2px solid #ef4444' }}>
                    <CardContent sx={{ pb: 1, bgcolor: 'rgba(239, 68, 68, 0.05)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ color: '#ef4444', fontWeight: 700 }}>
                          🎯 YOLO Weed Detection Result
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(weedResult.plotted_image!, 'yolo_detection.jpg')}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                    <CardMedia
                      component="img"
                      image={weedResult.plotted_image}
                      alt="YOLO Weed Detection with Bounding Boxes"
                      sx={{ 
                        maxHeight: 400, 
                        objectFit: 'contain', 
                        bgcolor: '#000',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(weedResult.plotted_image, '_blank')}
                    />
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Click image to view full size. Boxes show detected crops (blue) and weeds (red)
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {/* Coverage Stats */}
                <Card variant="outlined" sx={{ mb: 2, bgcolor: 'rgba(239, 68, 68, 0.05)' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Weed Coverage
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 700 }}>
                      {weedResult.vegetation_percentage.toFixed(2)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={weedResult.vegetation_percentage}
                      sx={{
                        mt: 2,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': { bgcolor: '#ef4444' },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Detected by YOLO best.pt Model
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Inference;
