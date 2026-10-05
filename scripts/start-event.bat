@echo off
cd /d "%~dp0.."
if not exist node_modules (
  echo Please run npm install before the event.
  pause
  exit /b 1
)
if not exist dist\index.html (
  call npm run build
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Open http://127.0.0.1:4173 in Chrome or Edge.
echo Keep this window open during the event.
call npm run preview -- --host 127.0.0.1 --port 4173
pause
