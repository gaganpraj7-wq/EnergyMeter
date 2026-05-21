import React, { useEffect, useState } from 'react';
import { API } from '../services/api';
import '../styles/OptimizationPanel.css';

/**
 * AI-Based Energy Optimization Panel
 * Displays optimization suggestions based on power usage analysis
 */
const OptimizationPanel = ({ socketId, refreshKey }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uiCleared, setUiCleared] = useState(false);
  const uiClearedRef = React.useRef(false);
  const intervalRef = React.useRef(null);

  const fetchOptimizations = async () => {
    if (uiClearedRef.current) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await API.get(`/api/analytics/optimization/${socketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestions(response.data.suggestions || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching optimization suggestions:', err);
      setError('Unable to fetch optimization suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const startAutoRefresh = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!uiClearedRef.current) {
        fetchOptimizations();
      }
    }, 5 * 60 * 1000);
  };

  const clearOptimizationUI = () => {
    uiClearedRef.current = true;
    setUiCleared(true);
    setSuggestions([]);
    setError(null);
    setLoading(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const refreshOptimizations = async () => {
    uiClearedRef.current = false;
    setUiCleared(false);
    setError(null);
    setLoading(true);
    await fetchOptimizations();
    startAutoRefresh();
  };

  useEffect(() => {
    const clearHandler = () => {
      clearOptimizationUI();
    };

    window.addEventListener('app:clear-ui', clearHandler);
    refreshOptimizations();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('app:clear-ui', clearHandler);
    };
  }, [socketId, refreshKey]);

  if (loading) {
    return (
      <div className="optimization-panel loading">
        <div className="loader"></div>
        <p>Analyzing your usage patterns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="optimization-panel error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
      </div>
    );
  }

  if (uiCleared) {
    return (
      <div className="optimization-panel cleared">
        <div className="panel-header">
          <h2>🤖 AI Energy Optimization</h2>
          <p>UI cleared. No database recommendation is currently displayed.</p>
          <div className="button-group">
            <button className="refresh-btn" onClick={refreshOptimizations}>🔄 Reload Recommendations</button>
          </div>
        </div>

        <div className="cleared-state">
          <div className="cleared-value">Title: --</div>
          <div className="cleared-value">Issue: --</div>
          <div className="cleared-value">Current: --</div>
          <div className="cleared-value">Action: --</div>
          <div className="cleared-value">Impact: --</div>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="optimization-panel no-suggestions">
        <span className="success-icon">✅</span>
        <h3>Your usage is optimized!</h3>
        <p>No immediate optimization opportunities detected.</p>
      </div>
    );
  }

  return (
    <div className="optimization-panel">
      <div className="panel-header">
        <h2>🤖 AI Energy Optimization</h2>
        <p>Smart recommendations to reduce power consumption</p>
      </div>

      <div className="suggestions-container">
        {suggestions.map((suggestion, index) => (
          <div key={index} className={`suggestion-card priority-${suggestion.priority}`}>
            <div className="suggestion-header">
              <span className={`priority-badge ${suggestion.priority}`}>
                {suggestion.priority === 'HIGH' ? '🔴' : suggestion.priority === 'MEDIUM' ? '🟡' : '🟢'} {suggestion.priority}
              </span>
              <span className="category-tag">{suggestion.category}</span>
            </div>

            <div className="suggestion-content">
              <h3 className="suggestion-title">{suggestion.title}</h3>
              
              {suggestion.conflict && (
                <div className="conflict-info">
                  <strong>Issue:</strong> {suggestion.conflict}
                </div>
              )}

              <div className="current-power">
                <strong>Current:</strong> {suggestion.currentPower}
              </div>

              <div className="action-box">
                <strong>💡 Action:</strong>
                <p>{suggestion.action}</p>
              </div>

              <div className="savings-info">
                <span className="savings-icon">💰</span>
                <span className="savings-text">{suggestion.savings}</span>
              </div>

              <div className="impact-row">
                <span className="impact">Impact: <strong>{suggestion.impact}</strong></span>
                <span className="timeframe">Timeframe: <strong>{suggestion.timeframe}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel-footer">
        <button onClick={fetchOptimizations} className="refresh-btn">
          🔄 Refresh Analysis
        </button>
        <button onClick={clearOptimizationUI} className="clear-btn">
          🧹 Clear UI
        </button>
      </div>
    </div>
  );
};

export default OptimizationPanel;
