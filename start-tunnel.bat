@echo off
title Cloudflare Tunnel - Air Quality IOC
cd /d "%~dp0backend"
echo ========================================================
echo   KHOI DONG CLOUDFLARE TUNNEL (TU DONG DONG BO LINK)
echo ========================================================
node scripts/startTunnel.js
pause

