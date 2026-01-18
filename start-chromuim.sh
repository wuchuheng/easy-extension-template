#!/bin/bash

# --- CONFIGURATION ---
TARGET_URL="https://www.google.com"
EXT_DIR="$(pwd)/dist"
USER_DATA_DIR="$(pwd)/.chromiumCache"
PREFS_FILE="$USER_DATA_DIR/Default/Preferences"

# 1. Ensure directory exists
mkdir -p "$USER_DATA_DIR/Default"

# 2. Pre-set Developer Mode (keeps the script simple)
if [ ! -f "$PREFS_FILE" ]; then
    echo '{"extensions": {"ui": {"developer_mode": true}}}' > "$PREFS_FILE"
fi

# 3. Launch (URL placed first for reliability)
echo "🚀 Launching Chromium to $TARGET_URL..."
chromium \
  "$TARGET_URL" \
  --remote-debugging-port=9222 \
  --user-data-dir="$USER_DATA_DIR" \
  --disable-extensions-except="$EXT_DIR" \
  --load-extension="$EXT_DIR" \
  --no-first-run 
  # --auto-open-devtools-for-tabs
