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
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  Analytics as AnalyticsIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { inferenceAPI, InferenceResult } from '../services/api';

const Inference: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
      setResult(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please drop an image file');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
      setResult(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await inferenceAPI.analyzeImage(selectedFile);
      setResult(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to analyze image');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const getVegetationColor = (percentage: number) => {
    if (percentage >= 70) return '#4caf50';
    if (percentage >= 40) return '#ff9800';
    return '#f44336';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <AnalyticsIcon sx={{ mr: 2, fontSize: 40 }} />
          Vegetation Segmentation Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload aerial or drone images to analyze vegetation coverage using AI-powered segmentation
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              1. Upload Image
            </Typography>

            <Box
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              sx={{
                border: '2px dashed',
                borderColor: selectedFile ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                bgcolor: selectedFile ? 'action.hover' : 'background.default',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {previewUrl ? (
                <Box>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '300px',
                      objectFit: 'contain',
                      borderRadius: 8,
                    }}
                  />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    {selectedFile?.name}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <ImageIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Drop image here or click to browse
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supports: JPG, PNG, JPEG
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <AnalyticsIcon />}
                onClick={handleAnalyze}
                disabled={!selectedFile || loading}
                fullWidth
                size="large"
              >
                {loading ? 'Analyzing...' : 'Analyze Image'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={handleClear}
                disabled={!selectedFile}
              >
                Clear
              </Button>
            </Box>

            {loading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  Running AI segmentation model...
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Results Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              2. Analysis Results
            </Typography>

            {result ? (
              <Box>
                {/* Vegetation Percentage Card */}
                <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.default' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Vegetation Coverage
                      </Typography>
                      <Chip
                        label={`${result.vegetation_percentage}%`}
                        sx={{
                          bgcolor: getVegetationColor(result.vegetation_percentage),
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1.2rem',
                          px: 2,
                        }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={result.vegetation_percentage}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getVegetationColor(result.vegetation_percentage),
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Analyzed on {new Date(result.timestamp).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>

                {/* Tabs for different views */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Visualization Results
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {/* Original Image */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">Original Image</Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(result.original_image, 'original.jpg')}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                      <CardMedia
                        component="img"
                        image={result.original_image}
                        alt="Original"
                        sx={{ height: 200, objectFit: 'contain', bgcolor: 'grey.100' }}
                      />
                    </Card>
                  </Grid>

                  {/* Vegetation Mask */}
                  <Grid item xs={12} sm={6}>
                    <Card>
                      <CardContent sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">Vegetation Mask</Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(result.mask_image, 'mask.png')}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                      <CardMedia
                        component="img"
                        image={result.mask_image}
                        alt="Mask"
                        sx={{ height: 150, objectFit: 'contain', bgcolor: 'grey.100' }}
                      />
                    </Card>
                  </Grid>

                  {/* Overlay */}
                  <Grid item xs={12} sm={6}>
                    <Card>
                      <CardContent sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2">Overlay</Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleDownload(result.overlay_image, 'overlay.png')}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                      <CardMedia
                        component="img"
                        image={result.overlay_image}
                        alt="Overlay"
                        sx={{ height: 150, objectFit: 'contain', bgcolor: 'grey.100' }}
                      />
                    </Card>
                  </Grid>
                </Grid>

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleClear}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Analyze Another Image
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  height: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <AnalyticsIcon sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" gutterBottom>
                  No Results Yet
                </Typography>
                <Typography variant="body2">
                  Upload an image and click "Analyze" to see vegetation analysis
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Info Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          About Vegetation Segmentation
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              🤖 AI-Powered Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Uses deep learning models trained on agricultural imagery to accurately identify and segment vegetation areas.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              📊 Precise Metrics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Get exact vegetation coverage percentages to monitor crop health, assess field conditions, and track growth patterns.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              🎨 Visual Outputs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View segmentation masks and overlays to clearly visualize where vegetation is detected in your aerial images.
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Inference;
