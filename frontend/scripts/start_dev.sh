#!/bin/bash

# Configuration
JARVIS_PORT=8000
OLLAMA_PORT=11434
# Ensure Cargo is in PATH
export PATH=$PATH:/Users/samarth/.cargo/bin

echo "🚀 Starting OpenJarvis Desktop Setup..."

# 1. Check Inference Engine (Ollama)
if ! lsof -i :$OLLAMA_PORT > /dev/null; then
  echo "⚠️  Ollama is not running on port $OLLAMA_PORT."
  echo "   Attempting to start Ollama..."
  # Try to open the Ollama app on macOS
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open -a Ollama
    echo "   Wait for Ollama to initialize..."
    sleep 5
  else
    echo "❌ Please start Ollama manually."
  fi
else
  echo "✅ Inference Engine (Ollama) detected."
fi

# 2. Check Jarvis API Server
if ! lsof -i :$JARVIS_PORT > /dev/null; then
  echo "⚠️  Jarvis API Server is not running on port $JARVIS_PORT."
  echo "   Starting backend server (uv run jarvis serve)..."
  
  # Start the server in the background
  cd ..
  uv run jarvis serve > /tmp/jarvis_server.log 2>&1 &
  SERVER_PID=$!
  cd frontend

  echo "   Wait for API Server to be ready..."
  # Wait for port 8000 to be responsive
  for i in {1..30}; do
    if lsof -i :$JARVIS_PORT > /dev/null; then
      echo "✅ API Server is ready (PID: $SERVER_PID)."
      break
    fi
    if [ $i -eq 30 ]; then
      echo "❌ API Server failed to start in time. Check /tmp/jarvis_server.log"
      exit 1
    fi
    sleep 1
  done
else
  echo "✅ Jarvis API Server already running."
fi

# 3. Execute the intended command
echo "🎨 Launching Frontend: $@"
exec -- "$@"
