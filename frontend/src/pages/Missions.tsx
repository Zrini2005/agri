import React from 'react';

const Missions: React.FC = () => {
  const missions = [
    { id: 1, name: 'Field A Scouting', status: 'completed', field: 'Field A', type: 'scouting' },
    { id: 2, name: 'Field B Spraying', status: 'paused', field: 'Field B', type: 'spraying' },
    { id: 3, name: 'Field C Survey', status: 'planned', field: 'Field C', type: 'custom' },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h1>Mission Management</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button style={{
          padding: '10px 20px',
          backgroundColor: '#2e7d2e',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Create New Mission
        </button>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8f9fa' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Mission Name</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Field</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {missions.map((mission) => (
              <tr key={mission.id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{mission.name}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{mission.field}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{mission.type}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: 
                      mission.status === 'completed' ? '#d4edda' :
                      mission.status === 'running' ? '#d1ecf1' :
                      mission.status === 'paused' ? '#fff3cd' : '#f8d7da',
                    color:
                      mission.status === 'completed' ? '#155724' :
                      mission.status === 'running' ? '#0c5460' :
                      mission.status === 'paused' ? '#856404' : '#721c24'
                  }}>
                    {mission.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                  <button style={{
                    padding: '4px 8px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '8px',
                    fontSize: '12px'
                  }}>
                    View
                  </button>
                  {mission.status === 'planned' && (
                    <button style={{
                      padding: '4px 8px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}>
                      Start
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Missions;