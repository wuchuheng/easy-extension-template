#!/bin/bash

# --- CONFIGURATION ---
TARGET_URL="https://www.google.com"
EXT_DIR="$(pwd)/dist"
USER_DATA_DIR="$(pwd)/.chromiumCache"
PREFS_FILE="$USER_DATA_DIR/Default/Preferences"
CDP_PORT=9222

# Function to check required dependencies for refresh
function check_deps() {
    local missing_deps=0
    for cmd in node; do
        if ! command -v $cmd &> /dev/null; then
            echo "❌ Error: '$cmd' is required for refresh but not installed."
            missing_deps=1
        fi
    done
    
    if [ $missing_deps -eq 1 ]; then
        echo "Please install the missing dependencies."
        exit 1
    fi
}

function start_chromium() {
    # 1. Ensure directory exists
    mkdir -p "$USER_DATA_DIR/Default"

    # 2. Pre-set Developer Mode (keeps the script simple)
    if [ ! -f "$PREFS_FILE" ]; then
        echo '{"extensions": {"ui": {"developer_mode": true}}}' > "$PREFS_FILE"
    fi

    # 3. Launch (URL placed first for reliability)
    echo "🚀 Launching Chromium to $TARGET_URL on port $CDP_PORT..."
    chromium \
      "$TARGET_URL" \
      --remote-debugging-port=$CDP_PORT \
      --user-data-dir="$USER_DATA_DIR" \
      --disable-extensions-except="$EXT_DIR" \
      --load-extension="$EXT_DIR" \
      --unsafely-disable-devtools-self-xss-warnings \
      --no-first-run \
      --auto-open-devtools-for-tabs
}

function refresh_extension() {
    check_deps
    
    echo "🔍 Checking for running Chromium on port $CDP_PORT..."
    if ! curl -s "http://localhost:$CDP_PORT/json" > /dev/null; then
        echo "❌ Chromium does not appear to be running on port $CDP_PORT."
        echo "   Please run './start-chromuim.sh start' first."
        exit 1
    fi

    npm run build:debug
    # Execute the TypeScript reload script
    npx tsx scripts/reload.ts
}

# Main Logic
COMMAND="${1:-start}" # Default to 'start' if no argument provided

case "$COMMAND" in
    start)
        start_chromium
        ;;
    refresh)
        refresh_extension
        ;;
    *)
        echo "Usage: $0 {start|refresh}"
        echo "  start   - Launch Chromium with the extension (Default)"
        echo "  refresh - Reload the extension and refresh all pages"
        exit 1
        ;;
esac
