@echo off
echo ==============================================================================
echo WorkElate AI — CLI-Powered Autonomous Agent Chat Application
echo ==============================================================================
echo Starting Backend API Server on http://localhost:8000 ...
start "WorkElate Backend (FastAPI)" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Frontend Dev Server on http://localhost:5173 ...
start "WorkElate Frontend (Vite React)" cmd /k "cd frontend && npm run dev"

echo.
echo ==============================================================================
echo WorkElate is launching!
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo ==============================================================================
