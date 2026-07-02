@echo off
echo ============================================================
echo  Moi Manager API  --  Node.js / LoopBack 4
echo ============================================================

if not exist .env (
  copy .env.example .env
  echo.
  echo [INFO] Created .env from .env.example
  echo [INFO] Edit .env with your PostgreSQL credentials, then re-run.
  echo.
  pause
  exit /b 0
)

if not exist node_modules (
  echo [INFO] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo [INFO] Building TypeScript...
call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

echo.
echo [INFO] Starting on http://localhost:8001
echo [INFO] API Explorer: http://localhost:8001/api-explorer
echo.
node .
