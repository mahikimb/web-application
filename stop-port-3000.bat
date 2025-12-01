@echo off
echo Stopping process using port 3000...
taskkill /PID 19876 /F
echo.
echo Process stopped! You can now run: npm start
pause

