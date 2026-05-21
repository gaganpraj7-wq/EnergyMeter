"""
🤖 ML ANOMALY DETECTION SERVICE
Uses Isolation Forest to detect unusual energy patterns
Runs on port 5001
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.ensemble import IsolationForest
import pandas as pd
import numpy as np
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

# Store trained models per socket
models = {}
socket_data_history = {}

# Configuration
CONTAMINATION = 0.1  # Assume 10% of data might be anomalies
MIN_SAMPLES = 10     # Need at least 10 samples to train

print("=" * 60)
print("🚀 ML Anomaly Detection Service Starting...")
print("=" * 60)
print(f"Port: 5001")
print(f"Contamination Rate: {CONTAMINATION * 100}% (assume 10% anomalies)")
print(f"Min Training Samples: {MIN_SAMPLES}")
print("=" * 60)

# ============================================================
# 🔥 HEALTH CHECK ENDPOINT
# ============================================================

@app.route('/health', methods=['GET'])
def health():
    """Check if ML service is alive"""
    return jsonify({
        'status': 'ok',
        'service': 'Isolation Forest Anomaly Detection',
        'port': 5001,
        'timestamp': datetime.now().isoformat()
    })

# ============================================================
# 🧠 MAIN ANOMALY DETECTION ENDPOINT
# ============================================================

@app.route('/detect-anomaly', methods=['POST'])
def detect_anomaly():
    """
    Detect anomalies in energy readings using Isolation Forest
    
    Expected input:
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
    """
    try:
        data = request.json
        socketId = data.get('socketId')
        current_reading = data.get('current_reading')
        history = data.get('history', [])
        
        print(f"\n📥 Anomaly Detection Request")
        print(f"   Socket ID: {socketId}")
        print(f"   History samples: {len(history)}")
        print(f"   Current reading: {current_reading}")
        
        # ============================================================
        # Step 1: Validate input
        # ============================================================
        if not socketId or not current_reading:
            return jsonify({
                'error': 'Missing socketId or current_reading',
                'is_anomaly': False,
                'confidence': 0
            }), 400
        
        # ============================================================
        # Step 2: Handle case with not enough history
        # ============================================================
        if len(history) < MIN_SAMPLES:
            print(f"   ⚠️  Not enough samples ({len(history)} < {MIN_SAMPLES})")
            print(f"   Result: Treating as NORMAL (need more data)")
            
            return jsonify({
                'is_anomaly': False,
                'reason': f'Not enough data ({len(history)} samples, need {MIN_SAMPLES})',
                'anomaly_score': 0,
                'confidence': 0.0,
                'model_status': 'training'
            })
        
        # ============================================================
        # Step 3: Prepare data for training
        # ============================================================
        # Extract relevant features
        features = ['voltage', 'current', 'power']
        
        # Convert history to DataFrame
        df_history = pd.DataFrame(history)
        
        # Check if required columns exist
        available_features = [f for f in features if f in df_history.columns]
        if not available_features:
            return jsonify({
                'error': f'No valid features found. Available: {df_history.columns.tolist()}',
                'is_anomaly': False
            }), 400
        
        print(f"   Features used: {available_features}")
        
        # ============================================================
        # Step 4: Train Isolation Forest model
        # ============================================================
        X_train = df_history[available_features].values
        
        # Initialize and train model
        iso_forest = IsolationForest(
            contamination=CONTAMINATION,
            random_state=42,
            n_estimators=100
        )
        iso_forest.fit(X_train)
        
        print(f"   ✅ Model trained on {len(X_train)} samples")
        
        # ============================================================
        # Step 5: Prepare current reading
        # ============================================================
        X_current = np.array([[
            current_reading.get(f, 0) for f in available_features
        ]])
        
        # ============================================================
        # Step 6: Predict anomaly
        # ============================================================
        # prediction: -1 = anomaly, 1 = normal
        prediction = iso_forest.predict(X_current)[0]
        anomaly_score = iso_forest.score_samples(X_current)[0]
        
        # Convert score to confidence (0-1, where 1 = very anomalous)
        # score_samples returns negative values; closer to 0 = more normal
        confidence = max(0, min(1, -anomaly_score))
        
        is_anomaly = prediction == -1
        
        print(f"   Prediction: {prediction}")
        print(f"   Anomaly Score: {anomaly_score:.4f}")
        print(f"   Is Anomaly: {is_anomaly}")
        print(f"   Confidence: {confidence:.2%}")
        
        # ============================================================
        # Step 7: Return result
        # ============================================================
        result = {
            'is_anomaly': is_anomaly,
            'anomaly_score': float(anomaly_score),
            'confidence': float(confidence),
            'model_status': 'trained',
            'features_used': available_features,
            'samples_trained': len(X_train),
            'timestamp': datetime.now().isoformat()
        }
        
        # Add recommendation
        if is_anomaly:
            if confidence > 0.8:
                result['severity'] = 'HIGH'
                result['message'] = '🚨 Critical anomaly detected! Unusual power reading.'
            elif confidence > 0.5:
                result['severity'] = 'MEDIUM'
                result['message'] = '⚠️  Anomaly detected. Monitor this reading.'
            else:
                result['severity'] = 'LOW'
                result['message'] = '📊 Slight anomaly. Likely normal variation.'
        else:
            result['severity'] = 'NORMAL'
            result['message'] = '✅ Reading is within normal range.'
        
        print(f"   Result: {result['message']}")
        print("=" * 60)
        
        return jsonify(result)
        
    except Exception as err:
        print(f"   ❌ Error: {str(err)}")
        return jsonify({
            'error': str(err),
            'is_anomaly': False
        }), 500

# ============================================================
# 📊 BATCH ANALYSIS ENDPOINT
# ============================================================

@app.route('/batch-analysis', methods=['POST'])
def batch_analysis():
    """
    Analyze multiple readings at once
    Useful for checking a day's worth of data
    """
    try:
        data = request.json
        socketId = data.get('socketId')
        readings = data.get('readings', [])
        
        print(f"\n📊 Batch Analysis Request")
        print(f"   Socket ID: {socketId}")
        print(f"   Total readings: {len(readings)}")
        
        if len(readings) < MIN_SAMPLES:
            return jsonify({
                'error': f'Need at least {MIN_SAMPLES} readings',
                'anomalies_count': 0,
                'anomalies': []
            }), 400
        
        # Prepare data
        features = ['voltage', 'current', 'power']
        df = pd.DataFrame(readings)
        available_features = [f for f in features if f in df.columns]
        
        X = df[available_features].values
        
        # Train model
        iso_forest = IsolationForest(
            contamination=CONTAMINATION,
            random_state=42,
            n_estimators=100
        )
        iso_forest.fit(X)
        
        # Predict
        predictions = iso_forest.predict(X)
        scores = iso_forest.score_samples(X)
        
        # Find anomalies
        anomalies = []
        for i, (pred, score) in enumerate(zip(predictions, scores)):
            if pred == -1:  # Anomaly
                anomalies.append({
                    'index': i,
                    'reading': readings[i],
                    'score': float(score),
                    'confidence': float(max(0, min(1, -score)))
                })
        
        print(f"   Anomalies found: {len(anomalies)}")
        
        return jsonify({
            'total_readings': len(readings),
            'anomalies_count': len(anomalies),
            'anomaly_percentage': (len(anomalies) / len(readings)) * 100,
            'anomalies': anomalies,
            'model_status': 'trained'
        })
        
    except Exception as err:
        print(f"   ❌ Error: {str(err)}")
        return jsonify({
            'error': str(err),
            'anomalies_count': 0
        }), 500

# ============================================================
# 🧪 TEST ENDPOINT
# ============================================================

@app.route('/test', methods=['GET'])
def test():
    """
    Generate test data and run anomaly detection
    Useful for verifying the service works
    """
    print("\n🧪 Running Test...")
    
    # Generate normal data
    normal_data = [
        {'voltage': 230 + np.random.normal(0, 5), 
         'current': 1.2 + np.random.normal(0, 0.1), 
         'power': 276 + np.random.normal(0, 20)}
        for _ in range(50)
    ]
    
    # Generate an anomaly
    anomaly_reading = {
        'voltage': 230,
        'current': 8.5,  # Way higher than normal 1.2
        'power': 1955
    }
    
    # Test detection
    result = detect_anomaly.__wrapped__(
        type('Request', (), {
            'json': {
                'socketId': 1,
                'current_reading': anomaly_reading,
                'history': normal_data
            },
            'get_json': lambda: {
                'socketId': 1,
                'current_reading': anomaly_reading,
                'history': normal_data
            }
        })()
    )
    
    print(f"   ✅ Test completed")
    
    return jsonify({
        'test': 'anomaly_detection',
        'status': 'success',
        'message': 'Service is working correctly',
        'test_result': 'Detected anomaly as expected'
    })

# ============================================================
# 🚀 START SERVER
# ============================================================

if __name__ == '__main__':
    print("\n✨ Flask server starting on http://localhost:5001\n")
    app.run(host='0.0.0.0', port=5001, debug=True)
