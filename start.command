#!/bin/bash
cd "$(dirname "$0")"

echo "=========================================================="
echo "   🏛️  LAUNCHING CIVICSAMADHAN (e-SAMADHAAN) PORTAL"
echo "=========================================================="
echo "⚡ Starting CivicSamadhan Service on Port 4000..."
echo "🌐 Opening National Grievance Redressal Portal in browser..."

(sleep 1.2 && open "http://localhost:4000") &
node backend/server.js
