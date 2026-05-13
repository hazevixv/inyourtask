@echo off
echo ========================================
echo RESTARTING RAY TASK MANAGEMENT SERVER
echo ========================================
echo.

echo [1/3] Stopping any running Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Clearing npm cache...
npm cache clean --force

echo.
echo [3/3] Starting development server...
echo.
echo ========================================
echo SERVER IS STARTING...
echo ========================================
echo.
echo Open browser: http://localhost:3005/chat
echo Press Ctrl+C to stop server
echo.

npm run dev
