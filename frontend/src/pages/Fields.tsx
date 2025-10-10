import React from 'react';

const Fields: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Field Management</h1>
      <p>Interactive map for creating and managing agricultural fields would be implemented here with Leaflet.</p>
      <div style={{ border: '1px solid #ddd', padding: '20px', marginTop: '20px', borderRadius: '8px' }}>
        <h3>Sample Field Data</h3>
        <ul>
          <li>Field A - Corn Field (12.5 hectares)</li>
          <li>Field B - Wheat Field (8.3 hectares)</li>
          <li>Field C - Soybean Field (15.7 hectares)</li>
        </ul>
      </div>
    </div>
  );
};

export default Fields;