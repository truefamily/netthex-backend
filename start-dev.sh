#!/bin/bash

# Script pour démarrer le développement complet (Client + Serveur)
# Usage: chmod +x start-dev.sh && ./start-dev.sh

echo "🚀 Démarrage de Netthex (Client + Serveur)..."
echo ""
echo "📱 Client: http://localhost:5173"
echo "🚀 Serveur: http://localhost:3001"
echo ""

npm run dev:all
