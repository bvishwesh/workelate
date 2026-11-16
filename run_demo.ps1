# WorkElate AI Launcher Script
Write-Host "==============================================================================" -ForegroundColor Magenta
Write-Host "WorkElate AI — CLI-Powered Autonomous Agent Chat Application" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Magenta

# Check Python and Node
Write-Host "Checking runtime environments..." -ForegroundColor Gray
python --version
node --version
npm --version

Write-Host "`nStarting Backend API on http://localhost:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "Starting Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nAll services started! Access the UI at: http://localhost:5173" -ForegroundColor Cyan
