#!/bin/bash

# Scraper runner script with logging
# Usage: ./run-scraper.sh cleveland-clinic|northwell-health

SCRAPER=$1
LOG_DIR="$(dirname "$0")/../logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$LOG_DIR"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

case $SCRAPER in
  cleveland-clinic)
    node scripts/cleveland-clinic-rn-scraper-production.js > "$LOG_DIR/cleveland-clinic_$TIMESTAMP.log" 2>&1
    EXIT_CODE=$?
    ;;
  northwell-health)
    node scripts/northwell-health-rn-scraper-production.js > "$LOG_DIR/northwell-health_$TIMESTAMP.log" 2>&1
    EXIT_CODE=$?
    ;;
  *)
    echo "Unknown scraper: $SCRAPER"
    echo "Usage: ./run-scraper.sh cleveland-clinic|northwell-health"
    exit 1
    ;;
esac

# Log completion status
if [ $EXIT_CODE -eq 0 ]; then
  echo "$(date): Scraper $SCRAPER completed successfully" >> "$LOG_DIR/scraper-summary.log"
else
  echo "$(date): Scraper $SCRAPER failed with exit code $EXIT_CODE" >> "$LOG_DIR/scraper-summary.log"
fi

# Keep only last 30 days of logs
find "$LOG_DIR" -name "*.log" -mtime +30 -delete

exit $EXIT_CODE

