#!/bin/bash
# Start marketing bots in background (dry-run by default)

set -e

LOG_DIR="./logs/production"
mkdir -p "$LOG_DIR"

export DRY_RUN=${DRY_RUN:-1}
export BOT_EMAIL_INTERVAL_MINUTES=${BOT_EMAIL_INTERVAL_MINUTES:-360}
export BOT_SOCIAL_INTERVAL_MINUTES=${BOT_SOCIAL_INTERVAL_MINUTES:-720}

nohup node marketing-bots.js > "$LOG_DIR/marketing-bots.out.log" 2>&1 &

echo "✅ Marketing bots started (dry-run=${DRY_RUN})"
echo "Logs: $LOG_DIR/marketing-bots.out.log"
