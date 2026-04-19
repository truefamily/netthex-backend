@echo off
REM Script pour démarrer le développement complet (Client + Serveur) sur Windows
REM Usage: start-dev.bat

echo.
echo ====================================================================
echo                    Netthex - Development Mode
echo ====================================================================
echo.
echo.
echo 📱 Client (React Vite): http://localhost:5173
echo 🚀 Serveur Socket.io:   http://localhost:3001
echo.
echo Appuyez sur CTRL+C dans ce terminal pour arrêter les deux services
echo ====================================================================
echo.
echo.

npm run dev:all
