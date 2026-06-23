# Start both backend and frontend for local development
Write-Host "Starting Zhafir's Quant Investing..." -ForegroundColor Cyan

# Start FastAPI backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; py -m uvicorn main:app --reload --port 8000" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start Next.js frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev" -WindowStyle Normal

Write-Host "Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
