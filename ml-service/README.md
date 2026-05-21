# 🤖 ML Anomaly Detection Service

Machine Learning-based anomaly detection for energy readings using Isolation Forest.

## Features

- **Isolation Forest Algorithm** - Detects unusual energy patterns
- **Real-time Detection** - Process readings as they arrive
- **Batch Analysis** - Analyze multiple readings at once
- **Confidence Scores** - Know how confident the detection is
- **Severity Levels** - Categorize anomalies as HIGH, MEDIUM, LOW, or NORMAL

## Setup

### 1. Install Python (if not already installed)
- Download from https://www.python.org/downloads/
- Make sure to check "Add Python to PATH"
- Verify installation:
  ```bash
  python --version
  ```

### 2. Create Virtual Environment (recommended)
```bash
cd ml-service
python -m venv venv
```

### 3. Activate Virtual Environment

**On Windows:**
```bash
venv\Scripts\activate
```

**On macOS/Linux:**
```bash
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Run the service
```bash
python app.py
```

You should see:
```
🚀 ML Anomaly Detection Service Starting...
Port: 5001
✨ Flask server starting on http://localhost:5001
```

## API Endpoints

### Health Check
```
GET http://localhost:5001/health
```

### Detect Anomaly
```
POST http://localhost:5001/detect-anomaly
```

**Request:**
```json
{
  "socketId": 1,
  "current_reading": {
    "voltage": 230,
    "current": 1.5,
    "power": 345,
    "energy": 0.5
  },
  "history": [
    {"voltage": 230, "current": 1.2, "power": 276},
    {"voltage": 230, "current": 1.3, "power": 299},
    ...
  ]
}
```

**Response:**
```json
{
  "is_anomaly": false,
  "anomaly_score": -0.15,
  "confidence": 0.15,
  "severity": "NORMAL",
  "message": "✅ Reading is within normal range.",
  "model_status": "trained"
}
```

### Batch Analysis
```
POST http://localhost:5001/batch-analysis
```

Analyze multiple readings at once.

### Test Endpoint
```
GET http://localhost:5001/test
```

Runs a quick test to verify the service works.

## How Isolation Forest Works

1. **Learns from history** - Trains on past normal readings
2. **Identifies patterns** - Understands what "normal" looks like
3. **Detects outliers** - Flags readings that deviate from the pattern
4. **Provides confidence** - Tells you how sure it is about the anomaly

## Configuration

Edit `app.py` to change:
- `CONTAMINATION` - Percentage of anomalies expected (default: 10%)
- `MIN_SAMPLES` - Minimum training samples needed (default: 10)

## Troubleshooting

### Port already in use
```bash
# Find process using port 5001
netstat -ano | findstr :5001

# Kill it
taskkill /PID <PID> /F
```

### Module not found
```bash
# Make sure venv is activated
# Then reinstall dependencies
pip install -r requirements.txt
```

### Connection refused from Node.js
- Make sure Python service is running on port 5001
- Check firewall settings
- Verify both services are on localhost

## Integration with Node.js Backend

The Node.js backend should call this service for anomaly detection:

```javascript
const axios = require('axios');

async function checkAnomaly(socketId, currentReading, history) {
  const response = await axios.post('http://localhost:5001/detect-anomaly', {
    socketId,
    current_reading: currentReading,
    history
  });
  
  return response.data;
}
```

## Performance

- **Detection time**: ~50-100ms per reading
- **Training time**: ~50ms for 100 samples
- **Memory usage**: ~20MB baseline

## Future Enhancements

- LSTM neural network for time-series forecasting
- Multi-socket correlation detection
- Seasonal pattern learning
- Custom contamination rate per socket
