import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Agriculture Drone Ground Control Station</h1>
      <h2>Dashboard</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <div style={{ 
          border: '1px solid #ddd', 
          padding: '20px', 
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3>System Status</h3>
          <p><strong>Backend:</strong> <span style={{ color: 'green' }}>Connected</span></p>
          <p><strong>Simulator:</strong> <span style={{ color: 'green' }}>Ready</span></p>
          <p><strong>AI Service:</strong> <span style={{ color: 'green' }}>Active</span></p>
        </div>

        <div style={{ 
          border: '1px solid #ddd', 
          padding: '20px', 
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3>Quick Stats</h3>
          <p><strong>Total Fields:</strong> 3</p>
          <p><strong>Active Missions:</strong> 1</p>
          <p><strong>Completed Today:</strong> 2</p>
        </div>

        <div style={{ 
          border: '1px solid #ddd', 
          padding: '20px', 
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3>Recent Activity</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>✓ Mission "Field A Scouting" completed</li>
            <li>⏸ Mission "Field B Spraying" paused</li>
            <li>📊 Anomaly detected in telemetry</li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h3>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button style={{
            padding: '10px 20px',
            backgroundColor: '#2e7d2e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Create New Field
          </button>
          <button style={{
            padding: '10px 20px',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Plan Mission
          </button>
          <button style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;