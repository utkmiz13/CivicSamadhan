#!/bin/bash
cd "$(dirname "$0")"

echo "Starting CivicSamadhan Server on http://localhost:4000..."
(sleep 1 && open "http://localhost:4000" 2>/dev/null || xdg-open "http://localhost:4000" 2>/dev/null) &
node backend/server.js
