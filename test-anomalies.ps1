# Test Anomaly Detection
# 1. Sends baseline readings to build learning model
# 2. Then sends anomalous spikes

Write-Host "Building anomaly detection baseline (20 normal readings)..." -ForegroundColor Cyan

# Send 20 normal readings to establish baseline
for ($i = 1; $i -le 20; $i++) {
  Invoke-RestMethod -Uri "http://localhost:5000/api/sensor" -Method POST -ContentType "application/json" -Body '{"socketId":1,"voltage":230,"current":0.5,"power":115,"energy":0.1}' | Out-Null
  Write-Host "  Reading $i/20 sent" -ForegroundColor Green
  Start-Sleep -Milliseconds 200
}

Write-Host "`nBaseline established!`n" -ForegroundColor Green

Write-Host "Sending anomalous spikes..." -ForegroundColor Yellow

# Send 5 anomalous readings
Invoke-RestMethod -Uri "http://localhost:5000/api/sensor" -Method POST -ContentType "application/json" -Body '{"socketId":1,"voltage":240,"current":8.5,"power":1955,"energy":2.0}' | Out-Null
Write-Host "  Anomaly 1 sent" -ForegroundColor Red
Start-Sleep -Milliseconds 300

Invoke-RestMethod -Uri "http://localhost:5000/api/sensor" -Method POST -ContentType "application/json" -Body '{"socketId":1,"voltage":235,"current":9.0,"power":2070,"energy":2.1}' | Out-Null
Write-Host "  Anomaly 2 sent" -ForegroundColor Red
Start-Sleep -Milliseconds 300

Invoke-RestMethod -Uri "http://localhost:5000/api/sensor" -Method POST -ContentType "application/json" -Body '{"socketId":1,"voltage":245,"current":7.5,"power":1725,"energy":1.8}' | Out-Null
Write-Host "  Anomaly 3 sent" -ForegroundColor Red
Start-Sleep -Milliseconds 300

Invoke-RestMethod -Uri "http://localhost:5000/api/sensor" -Method POST -ContentType "application/json" -Body '{"socketId":1,"voltage":230,"current":10.0,"power":2300,"energy":2.5}' | Out-Null
Write-Host "  Anomaly 4 sent" -ForegroundColor Red
Start-Sleep -Milliseconds 300

Invoke-RestMethod -Uri "http://localhost:5000/api/sensor" -Method POST -ContentType "application/json" -Body '{"socketId":1,"voltage":238,"current":8.0,"power":1840,"energy":1.9}' | Out-Null
Write-Host "  Anomaly 5 sent" -ForegroundColor Red

Write-Host "`nTest complete! Check your webpage now." -ForegroundColor Green
Write-Host "Open: http://localhost:3000/socket/1" -ForegroundColor Cyan
