#!/bin/bash
# Start API server in background
node server.js &
API_PID=$!

# Start Vite dev server
npm run dev

# Kill API server when Vite exits
kill $API_PID 2>/dev/null
