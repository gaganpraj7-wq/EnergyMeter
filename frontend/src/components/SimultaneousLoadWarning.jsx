import React, { useEffect, useState } from 'react';
import { API } from '../services/api';
import '../styles/SimultaneousLoadWarning.css';

/**
 * Real-time Simultaneous Load Detection
 * Shows alert when multiple high-power devices run together
 */
const SimultaneousLoadWarning = ({ socketIds = [] }) => {
  const [warning, setWarning] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    checkSimultaneousLoad();
    // Check every 10 seconds
    const interval = setInterval(checkSimultaneousLoad, 10000);
    return () => clearInterval(interval);
  }, [socketIds]);

  const checkSimultaneousLoad = async () => {
    if (!socketIds || socketIds.length < 2) return;

    try {
      setLoading(true);
      const response = await API.post('/analytics/simultaneous-load', {
        socketIds: socketIds
      });

      if (response.data?.warning) {
        setWarning(response.data.warning);
      } else {
        setWarning(null);
      }
      setLastChecked(new Date());
    } catch (err) {
      console.error('Error checking simultaneous load:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!warning) {
    return null; // Don't show component if no warning
  }

  const severityClass = warning.alert === 'HIGH_SIMULTANEOUS_LOAD' ? 'critical' : 'warning';

  return (
    <div className={`simultaneous-load-warning ${severityClass}`}>
      <div className="warning-header">
        <span className="warning-icon">⚠️</span>
        <h3>High Simultaneous Load Detected</h3>
        <button className="dismiss-btn" onClick={() => setWarning(null)}>✕</button>
      </div>

      <div className="warning-content">
        <div className="load-info">
          <strong>Total Power:</strong>
          <span className="power-value">{warning.totalPower}W</span>
        </div>

        <div className="devices-info">
          <strong>Devices Running:</strong>
          <p className="devices-list">{warning.devices}</p>
        </div>

        <div className="recommendation-box">
          <strong>💡 Recommendation:</strong>
          <p>{warning.message}</p>
        </div>

        <div className="warning-footer">
          <small>Last checked: {lastChecked?.toLocaleTimeString()}</small>
          <button onClick={checkSimultaneousLoad} disabled={loading} className="refresh-btn">
            {loading ? '⟳ Checking...' : '🔄 Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimultaneousLoadWarning;
