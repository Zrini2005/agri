import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Tooltip,
  Menu,
} from '@mui/material';
import {
  Assessment as ReportsIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CalendarToday as CalendarIcon,
  Timer as TimerIcon,
  Map as MapIcon,
  FlightTakeoff as FlightIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pause as PauseIcon,
  Schedule as ScheduleIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { missionsAPI, telemetryAPI } from '../services/api';
import { MissionSummary, MissionStatus } from '../types';

const Reports: React.FC = () => {
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<MissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Export menu
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportingMission, setExportingMission] = useState<number | null>(null);

  useEffect(() => {
    loadMissions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [missions, searchQuery, statusFilter, typeFilter]);

  const loadMissions = async () => {
    try {
      setLoading(true);
      const data = await missionsAPI.getMissions();
      setMissions(data);
      setError('');
    } catch (err: any) {
      setError('Failed to load missions');
      console.error('Error loading missions:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...missions];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(mission =>
        mission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.field_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(mission => mission.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(mission => mission.mission_type === typeFilter);
    }

    setFilteredMissions(filtered);
    setPage(0); // Reset to first page when filters change
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusIcon = (status: MissionStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon fontSize="small" />;
      case 'aborted':
        return <CancelIcon fontSize="small" />;
      case 'paused':
        return <PauseIcon fontSize="small" />;
      case 'running':
        return <FlightIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const getStatusColor = (status: MissionStatus): "default" | "primary" | "success" | "warning" | "error" => {
    switch (status) {
      case 'planned': return 'primary';
      case 'running': return 'warning';
      case 'paused': return 'default';
      case 'completed': return 'success';
      case 'aborted': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (start?: string, end?: string) => {
    if (!start) return 'N/A';
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const durationMs = endTime - startTime;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleExportClick = (event: React.MouseEvent<HTMLElement>, missionId: number) => {
    setExportMenuAnchor(event.currentTarget);
    setExportingMission(missionId);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
    setExportingMission(null);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!exportingMission) return;

    try {
      const blob = await telemetryAPI.exportMissionData(exportingMission, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mission_${exportingMission}_data.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      handleExportClose();
    } catch (err) {
      console.error('Export failed:', err);
      setError(`Failed to export mission data as ${format.toUpperCase()}`);
    }
  };

  const handleExportAll = async (format: 'csv' | 'json') => {
    try {
      for (const mission of filteredMissions) {
        const blob = await telemetryAPI.exportMissionData(mission.id, format);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mission_${mission.id}_${mission.name.replace(/\s+/g, '_')}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error('Bulk export failed:', err);
      setError('Failed to export all missions');
    }
  };

  // Statistics
  const stats = {
    total: missions.length,
    completed: missions.filter(m => m.status === 'completed').length,
    running: missions.filter(m => m.status === 'running').length,
    aborted: missions.filter(m => m.status === 'aborted').length,
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <ReportsIcon sx={{ mr: 2, fontSize: 40 }} />
          Mission Reports & Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View past missions, analyze data, and export reports
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Missions
              </Typography>
              <Typography variant="h3">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h3" color="success.main">{stats.completed}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Running
              </Typography>
              <Typography variant="h3" color="warning.main">{stats.running}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Aborted
              </Typography>
              <Typography variant="h3" color="error.main">{stats.aborted}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search missions or fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="running">Running</MenuItem>
                <MenuItem value="paused">Paused</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="aborted">Aborted</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Mission Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Mission Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="scouting">Scouting</MenuItem>
                <MenuItem value="spraying">Spraying</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => handleExportAll('csv')}
              disabled={filteredMissions.length === 0}
            >
              Export All CSV
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Missions Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Mission Name</TableCell>
                <TableCell>Field</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredMissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No missions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMissions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((mission) => (
                    <TableRow key={mission.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <FlightIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="body2" fontWeight="medium">
                            {mission.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <MapIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                          {mission.field_name || 'N/A'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={mission.mission_type}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(mission.status)}
                          label={mission.status}
                          size="small"
                          color={getStatusColor(mission.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {formatDate(mission.started_at)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TimerIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {formatDuration(mission.started_at, mission.completed_at)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Export Mission Data">
                          <IconButton
                            size="small"
                            onClick={(e) => handleExportClick(e, mission.id)}
                            color="primary"
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredMissions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportClose}
      >
        <MenuItem onClick={() => handleExport('csv')}>
          <FileDownloadIcon sx={{ mr: 1 }} />
          Export as CSV
        </MenuItem>
        <MenuItem onClick={() => handleExport('json')}>
          <FileDownloadIcon sx={{ mr: 1 }} />
          Export as JSON
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default Reports;