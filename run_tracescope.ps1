# TraceScope AI Launch Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TRACESCOPE AI - WINDOWS ENDPOINT INVESTIGATION ENGINE" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; `$env:PYTHONPATH = '.'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting React Flow Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend'; npm run dev"

Write-Host ""
Write-Host "TraceScope AI services launched in separate windows!" -ForegroundColor Yellow
Write-Host "- Backend API Docs : http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "- SOC Graph UI     : http://localhost:5173" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
