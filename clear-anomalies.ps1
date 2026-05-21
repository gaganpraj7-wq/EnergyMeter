# Clear all anomalies from Firebase

Write-Host "Clearing all anomalies..." -ForegroundColor Yellow

$response = Invoke-RestMethod `
  -Uri "http://localhost:5000/api/sensor/anomaly/clear/all" `
  -Method DELETE

Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Green
Write-Host "Done!" -ForegroundColor Green
