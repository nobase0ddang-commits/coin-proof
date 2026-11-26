@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js가 없어 index.html을 바로 엽니다.
  start "" "%~dp0index.html"
  pause
  exit /b
)
echo CoinProof 시연 앱을 켭니다. 이 창을 닫으면 앱도 꺼집니다.
node server.js
pause
