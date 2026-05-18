#!/bin/bash
# killswitch.sh — kills voice-orb and Cursor processes ONLY
# Does NOT touch Claude Code or its MCP servers

# Kill by port (safe — only voice-orb ports)
lsof -ti :3000 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null
lsof -ti :8000 | xargs kill -9 2>/dev/null
lsof -ti :8080 | xargs kill -9 2>/dev/null

# Kill Cursor specifically (not all apps)
pkill -9 -f "Cursor.app" 2>/dev/null
pkill -9 -f "/Cursor/" 2>/dev/null

# Kill voice-orb server and test runner specifically
pkill -9 -f "voice-orb-prototype/server.js" 2>/dev/null
pkill -9 -f "playwright" 2>/dev/null
pkill -9 -f "uvicorn" 2>/dev/null

echo "✓ all clear — $(date)"
