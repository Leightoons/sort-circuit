@echo off
echo Starting Sort Circuit application...

REM Start server in a new command window
start cmd /k "node server/index.js"

REM Wait a moment for the server to start
timeout /t 3 /nobreak > nul

REM Start client in a new command window
cd client
start cmd /k "npx react-scripts start"

echo Both server and client have been started. Check the new command windows for output. 