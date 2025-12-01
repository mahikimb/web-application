@echo off
echo ========================================
echo   Softica Labs - Ngrok Launcher
echo ========================================
echo.
echo Starting React development server on port 3001...
echo.

REM Start React app in a new window on port 3001
start "React App" cmd /k "set PORT=3001 && npm start"

echo Waiting for React app to start (15 seconds)...
timeout /t 15 /nobreak >nul

echo.
echo Starting ngrok tunnel...
echo.

REM Start ngrok in a new window pointing to port 3001
start "Ngrok Tunnel" cmd /k "ngrok http 3001"

echo.
echo ========================================
echo   Both services are starting!
echo ========================================
echo.
echo React App: http://localhost:3001
echo Ngrok Web Interface: http://127.0.0.1:4040
echo.
echo Check the ngrok window for your public URL
echo Press any key to exit this window...
pause >nul

