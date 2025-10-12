# 📊 Reports & Analytics Feature

## Overview
The Reports section provides a comprehensive view of all past missions with detailed summaries, filtering capabilities, and data export options.

## Features

### 📈 **Mission Statistics Dashboard**
- **Total Missions**: Count of all missions in the system
- **Completed Missions**: Successfully finished missions
- **Running Missions**: Currently active missions
- **Aborted Missions**: Cancelled or failed missions

### 📋 **Mission Report Table**
Displays detailed information for each mission:

| Column | Description |
|--------|-------------|
| **Mission Name** | Name of the mission with flight icon |
| **Field** | Associated agricultural field |
| **Type** | Mission type (Survey, Spray, Monitoring) |
| **Status** | Current status with color-coded chip |
| **Start Date** | When the mission started |
| **Duration** | Total mission duration (HH:MM:SS) |
| **Actions** | Export buttons for individual missions |

### 🔍 **Advanced Filtering**

#### Search
- Search by mission name
- Search by field name
- Real-time filtering as you type

#### Status Filter
- All Status
- Planned
- Running
- Paused
- Completed
- Aborted

#### Mission Type Filter
- All Types
- Survey
- Spray
- Monitoring

### 📥 **Export Options**

#### Individual Mission Export
- Click the download icon next to any mission
- Choose format:
  - **CSV**: Comma-separated values (Excel compatible)
  - **JSON**: Structured data format

#### Bulk Export
- **Export All CSV** button exports all filtered missions
- Automatically downloads multiple files
- Respects current filters (only exports visible missions)

### 📊 **Data Included in Exports**

**Telemetry Data:**
- Timestamp
- GPS coordinates (Latitude, Longitude)
- Altitude (meters)
- Speed (m/s)
- Battery percentage
- Sensor readings

**Mission Logs:**
- Log level (INFO, WARNING, ERROR)
- Timestamp
- Log messages
- System events

## User Interface

### 🎨 **Design Elements**

**Status Badges:**
- 🟢 **Completed**: Green chip with checkmark
- 🟡 **Running**: Yellow chip with flight icon
- 🔵 **Planned**: Blue chip with schedule icon
- ⏸️ **Paused**: Gray chip with pause icon
- 🔴 **Aborted**: Red chip with cancel icon

**Icons:**
- 🚁 Flight icon for mission names
- 🗺️ Map icon for field names
- 📅 Calendar icon for dates
- ⏱️ Timer icon for duration
- 💾 Download icon for exports

### 📱 **Responsive Design**
- Fully responsive layout
- Works on desktop, tablet, and mobile
- Sticky table header for easy scrolling
- Pagination for large datasets

## Usage Guide

### Viewing Mission Reports

1. **Navigate to Reports**
   - Click "Reports" in the sidebar
   - View statistics dashboard at the top

2. **Browse Missions**
   - Scroll through the mission table
   - Use pagination controls at the bottom
   - Adjust rows per page (5, 10, 25, 50)

3. **Search for Specific Missions**
   - Type in the search box
   - Results filter automatically
   - Search works on mission and field names

4. **Filter by Criteria**
   - Select status from dropdown
   - Select mission type from dropdown
   - Combine multiple filters
   - Clear filters by selecting "All"

### Exporting Data

#### Single Mission Export

1. **Locate the mission** in the table
2. **Click the download icon** (💾) in the Actions column
3. **Select format**:
   - Click "Export as CSV" for spreadsheet format
   - Click "Export as JSON" for structured data
4. **File downloads automatically**
   - Filename: `mission_{id}_data.{format}`
   - Saved to your Downloads folder

#### Bulk Export

1. **Apply filters** to select missions (optional)
2. **Click "Export All CSV"** button
3. **Wait for downloads** (500ms delay between files)
4. **All filtered missions** are exported

### Understanding Duration

Duration shows total mission time:
- **Format**: `HH:MM:SS` or `MM:SS` or `SS`
- **Examples**:
  - `2h 15m 30s` - 2 hours, 15 minutes, 30 seconds
  - `45m 20s` - 45 minutes, 20 seconds
  - `30s` - 30 seconds

For running missions, duration shows elapsed time up to now.

## Technical Details

### API Endpoints Used

```typescript
// Get all missions
GET /missions
Response: MissionSummary[]

// Export mission data
GET /logs/{mission_id}/export?format={csv|json}
Response: Blob (file download)
```

### Data Structures

**MissionSummary:**
```typescript
{
  id: number;
  name: string;
  field_name: string;
  mission_type: 'survey' | 'spray' | 'monitoring';
  status: 'planned' | 'running' | 'paused' | 'completed' | 'aborted';
  start_time: string;  // ISO 8601
  end_time?: string;   // ISO 8601
}
```

**CSV Export Format:**
```csv
Type,Timestamp,Latitude,Longitude,Altitude,Speed,Battery,Message
telemetry,2025-10-12T10:30:00,40.7128,-74.0060,100.5,5.2,85,
log,2025-10-12T10:30:05,,,,,,,[INFO] Mission started
```

**JSON Export Format:**
```json
{
  "mission_id": 1,
  "telemetry": [...],
  "logs": [...]
}
```

### Filtering Logic

```typescript
// Search: Case-insensitive partial match
mission.name.includes(query) || mission.field_name.includes(query)

// Status: Exact match
mission.status === selectedStatus

// Type: Exact match
mission.mission_type === selectedType

// Combined: AND logic (all filters must pass)
```

### Performance Optimizations

- **Client-side filtering**: Fast, no server requests
- **Pagination**: Only renders visible rows
- **Lazy loading**: Data loaded once on mount
- **Efficient re-renders**: React memoization

## Common Use Cases

### 1. **Monthly Report Generation**
```
1. Filter by date range (using search)
2. Filter by status = "completed"
3. Click "Export All CSV"
4. Import into Excel for analysis
```

### 2. **Troubleshooting Failed Missions**
```
1. Filter by status = "aborted"
2. Review mission details
3. Export individual mission as JSON
4. Analyze logs for error patterns
```

### 3. **Performance Analysis**
```
1. Filter by mission type
2. Export all missions
3. Compare durations
4. Identify optimization opportunities
```

### 4. **Field-Specific Reports**
```
1. Search for field name
2. View all missions for that field
3. Export data for seasonal analysis
```

## Error Handling

**No Missions Found:**
- Shows message: "No missions found"
- Check if filters are too restrictive
- Try clearing filters

**Export Failed:**
- Error alert displays at top
- Check authentication (re-login if needed)
- Verify mission exists
- Check network connection

**Loading Issues:**
- Shows loading spinner
- If stuck, refresh the page
- Check backend server status

## Tips & Best Practices

### 📌 **Efficient Filtering**
- Use search for quick lookup
- Combine filters for precise results
- Clear filters to see all data

### 💾 **Export Best Practices**
- Export regularly for backup
- Use CSV for Excel analysis
- Use JSON for custom processing
- Name files descriptively

### 📊 **Data Analysis**
- Export to Excel/Google Sheets
- Create pivot tables from CSV exports
- Track trends over time
- Compare mission performance

### 🔐 **Data Management**
- Regularly export mission data
- Store backups securely
- Delete old missions after export
- Review logs for insights

## Accessibility

- ✅ Keyboard navigation support
- ✅ Screen reader compatible
- ✅ High contrast color schemes
- ✅ ARIA labels on all interactive elements
- ✅ Tooltips for icon-only buttons

## Future Enhancements

Potential improvements:
- [ ] Date range picker for filtering
- [ ] Advanced analytics dashboard
- [ ] Graphical mission timeline
- [ ] Comparison view for multiple missions
- [ ] Scheduled report generation
- [ ] Email report delivery
- [ ] PDF export option
- [ ] Custom report templates
- [ ] Data visualization charts
- [ ] Export to cloud storage

## Troubleshooting

### Issue: No missions showing
**Solution**: 
- Check if you have created any missions
- Clear all filters
- Refresh the page

### Issue: Export button disabled
**Solution**:
- Make sure at least one mission exists
- Check if filters exclude all missions
- Verify you're logged in

### Issue: Duration shows "N/A"
**Solution**:
- Mission hasn't started yet (status: planned)
- Start time not recorded
- Database synchronization issue

### Issue: Search not working
**Solution**:
- Type at least 2 characters
- Check spelling
- Try searching by field name instead

## Summary

The Reports feature provides:
- ✅ Complete mission history view
- ✅ Advanced filtering and search
- ✅ Multiple export formats (CSV/JSON)
- ✅ Real-time statistics dashboard
- ✅ Responsive, user-friendly interface
- ✅ Comprehensive data export
- ✅ Professional presentation

Perfect for:
- 📊 Monthly reporting
- 🔍 Mission analysis
- 💾 Data backup
- 📈 Performance tracking
- 🎯 Compliance requirements

---

**Last Updated:** October 12, 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready
