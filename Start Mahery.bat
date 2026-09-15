@echo off
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies, this only happens once...
  call npm install
)

rem If the game is already running (for example from another launcher), just open it.
curl -s -o nul http://localhost:5173/ 2>nul
if not errorlevel 1 goto ready

start "Mahery Server" cmd /k npx vite --port 5173

rem Poll until the dev server answers, then open the browser at the title screen
rem (save slots live there).
set TRIES=0
:waitloop
set /a TRIES+=1
curl -s -o nul http://localhost:5173/ 2>nul
if not errorlevel 1 goto ready
if %TRIES% GEQ 40 goto ready
ping -n 1 -w 250 127.0.0.1 >nul
goto waitloop

:ready
start "" http://localhost:5173/
