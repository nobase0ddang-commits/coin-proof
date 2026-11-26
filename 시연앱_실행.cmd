@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo CoinProof 시연 앱을 켭니다. 이 창을 닫으면 앱도 꺼집니다.
start "" http://localhost:5177
node server.js
pause
