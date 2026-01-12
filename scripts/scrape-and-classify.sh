#!/bin/bash

###############################################################################
# Scrape and Classify Wrapper Script
# 
# This script runs a job scraper followed by the LLM classifier (only if 
# scraper succeeds). Includes error handling and email notifications.
#
# Usage: 
#   ./scrape-and-classify.sh [employer-slug]
#
# Examples:
#   ./scrape-and-classify.sh cleveland-clinic
#   ./scrape-and-classify.sh uhs
#   ./scrape-and-classify.sh adventist-healthcare
#   ./scrape-and-classify.sh hartford-healthcare
#   ./scrape-and-classify.sh yale-new-haven-health
#
# Features:
# - Runs scraper first, then classifier (only if scraper succeeds)
# - Logs everything to separate log files
# - Sends email alerts on failure
# - Cleans up old logs (30+ days)
###############################################################################

# Configuration
EMPLOYER_SLUG=$1
MAX_PAGES=$2  # Optional: limit pages for testing
ADMIN_EMAIL="delictodelight@gmail.com"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_READABLE=$(date +"%Y-%m-%d %H:%M:%S")

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log files
SCRAPER_LOG="$LOG_DIR/${EMPLOYER_SLUG}_scraper_${TIMESTAMP}.log"
CLASSIFIER_LOG="$LOG_DIR/${EMPLOYER_SLUG}_classifier_${TIMESTAMP}.log"
SUMMARY_LOG="$LOG_DIR/scrape-classify-summary.log"

# Colors for terminal output (if running interactively)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

###############################################################################
# Function: Send email notification
###############################################################################
send_email() {
  local subject="$1"
  local body="$2"
  
  # Use Node.js email sender with existing SMTP configuration (Brevo)
  if node "$PROJECT_ROOT/scripts/send-email.js" "$subject" "$body" 2>/dev/null; then
    echo "📧 Email sent successfully via SMTP"
  else
    echo "⚠️  WARNING: Failed to send email notification"
    echo "   Check SMTP credentials in .env file"
    echo "   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS"
    echo "   - EMAIL_FROM, ADMIN_EMAIL"
  fi
}

###############################################################################
# Function: Log message to both console and summary log
###############################################################################
log_message() {
  local message="$1"
  echo "$message"
  echo "[$DATE_READABLE] $message" >> "$SUMMARY_LOG"
}

###############################################################################
# Validate input
###############################################################################
if [ -z "$EMPLOYER_SLUG" ]; then
  echo "❌ ERROR: Employer slug required"
  echo ""
  echo "Usage: $0 [employer-slug] [max-pages]"
  echo ""
  echo "Examples:"
  echo "  $0 cleveland-clinic           # Scrape all pages"
  echo "  $0 cleveland-clinic 1         # Scrape only 1 page (testing)"
  echo "  $0 uhs 3                      # Scrape only 3 pages"
  echo ""
  echo "Available employers:"
  echo "  - cleveland-clinic"
  echo "  - uhs"
  echo "  - adventist-healthcare"
  echo "  - northwell-health"
  echo "  - hartford-healthcare"
  echo "  - upstate-medical-university"
  echo "  - strong-memorial-hospital"
  echo "  - mass-general-brigham"
  echo "  - guthrie"
  echo "  - yale-new-haven-health"
  exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

###############################################################################
# STEP 1: Run the scraper
###############################################################################
log_message "=========================================="
log_message "🚀 Starting scrape-and-classify for: $EMPLOYER_SLUG"
log_message "=========================================="
log_message ""
if [ -n "$MAX_PAGES" ]; then
  log_message "🔧 TEST MODE: Limiting to $MAX_PAGES page(s)"
fi
log_message "📂 Logs:"
log_message "   Scraper: $SCRAPER_LOG"
log_message "   Classifier: $CLASSIFIER_LOG"
log_message ""

log_message "STEP 1/2: Running scraper for $EMPLOYER_SLUG..."

# Determine which scraper to run based on employer slug
# Build scraper command with optional --max-pages parameter
case $EMPLOYER_SLUG in
  cleveland-clinic)
    # Cleveland Clinic uses custom scraper
    if [ -n "$MAX_PAGES" ]; then
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/cleveland-clinic-rn-scraper-production.js" --max-pages "$MAX_PAGES" > "$SCRAPER_LOG" 2>&1
    else
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/cleveland-clinic-rn-scraper-production.js" > "$SCRAPER_LOG" 2>&1
    fi
    SCRAPER_EXIT_CODE=$?
    ;;
  
  uhs)
    # UHS uses Workday scraper
    if [ -n "$MAX_PAGES" ]; then
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/workday-scraper-runner.js" uhs --max-pages="$MAX_PAGES" > "$SCRAPER_LOG" 2>&1
    else
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/workday-scraper-runner.js" uhs > "$SCRAPER_LOG" 2>&1
    fi
    SCRAPER_EXIT_CODE=$?
    ;;
  
  adventist-healthcare)
    # Adventist Healthcare uses Workday scraper
    if [ -n "$MAX_PAGES" ]; then
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/workday-scraper-runner.js" adventist --max-pages="$MAX_PAGES" > "$SCRAPER_LOG" 2>&1
    else
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/workday-scraper-runner.js" adventist > "$SCRAPER_LOG" 2>&1
    fi
    SCRAPER_EXIT_CODE=$?
    ;;
  
  northwell-health)
    # Northwell Health uses API scraper (Google Cloud Talent Solution)
    if [ -n "$MAX_PAGES" ]; then
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/northwell-health-rn-scraper.js" --max-pages="$MAX_PAGES" > "$SCRAPER_LOG" 2>&1
    else
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/northwell-health-rn-scraper.js" > "$SCRAPER_LOG" 2>&1
    fi
    SCRAPER_EXIT_CODE=$?
    ;;
  
  hartford-healthcare)
    # Hartford HealthCare uses custom Phenom People scraper (no max-pages support)
    /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/hartford-healthcare-rn-scraper.js" > "$SCRAPER_LOG" 2>&1
    SCRAPER_EXIT_CODE=$?
    ;;

  upstate-medical-university)
    # Upstate Medical University uses custom PageUp scraper
    if [ -n "$MAX_PAGES" ]; then
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/upstate-medical-rn-scraper.js" --max-pages "$MAX_PAGES" > "$SCRAPER_LOG" 2>&1
    else
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/upstate-medical-rn-scraper.js" > "$SCRAPER_LOG" 2>&1
    fi
    SCRAPER_EXIT_CODE=$?
    ;;

  strong-memorial-hospital)
    # Strong Memorial Hospital uses Workday scraper
    if [ -n "$MAX_PAGES" ]; then
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/workday-scraper-runner.js" strong-memorial-hospital --max-pages="$MAX_PAGES" > "$SCRAPER_LOG" 2>&1
    else
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/workday-scraper-runner.js" strong-memorial-hospital > "$SCRAPER_LOG" 2>&1
    fi
    SCRAPER_EXIT_CODE=$?
    ;;

  mass-general-brigham)
    # Mass General Brigham uses Workday CXS API scraper
    if [ -n "$MAX_PAGES" ]; then
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/mass-general-brigham-rn-scraper.js" --max-pages="$MAX_PAGES" > "$SCRAPER_LOG" 2>&1
    else
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/mass-general-brigham-rn-scraper.js" > "$SCRAPER_LOG" 2>&1
    fi
    SCRAPER_EXIT_CODE=$?
    ;;

  guthrie)
    # Guthrie Health uses Oracle Recruiting Cloud API scraper
    if [ -n "$MAX_PAGES" ]; then
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/guthrie-rn-scraper.js" --max-pages="$MAX_PAGES" > "$SCRAPER_LOG" 2>&1
    else
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/guthrie-rn-scraper.js" > "$SCRAPER_LOG" 2>&1
    fi
    SCRAPER_EXIT_CODE=$?
    ;;

  yale-new-haven-health)
    # Yale New Haven Health System uses Jibe API scraper
    if [ -n "$MAX_PAGES" ]; then
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/yale-new-haven-health-rn-scraper.js" --max-jobs="$MAX_PAGES" > "$SCRAPER_LOG" 2>&1
    else
      /usr/bin/nice -n 10 node "$PROJECT_ROOT/scripts/yale-new-haven-health-rn-scraper.js" > "$SCRAPER_LOG" 2>&1
    fi
    SCRAPER_EXIT_CODE=$?
    ;;

  *)
    log_message "❌ ERROR: Unknown employer slug: $EMPLOYER_SLUG"
    log_message ""
    log_message "Available employers:"
    log_message "  - cleveland-clinic"
    log_message "  - uhs"
    log_message "  - adventist-healthcare"
    log_message "  - northwell-health"
    log_message "  - hartford-healthcare"
    log_message "  - upstate-medical-university"
    log_message "  - strong-memorial-hospital"
    log_message "  - mass-general-brigham"
    log_message "  - guthrie"
    log_message "  - yale-new-haven-health"

    # Send failure email
    send_email "❌ Scraper Failed: Unknown Employer" \
"Scraper execution failed for unknown employer: $EMPLOYER_SLUG

Available employers: cleveland-clinic, uhs, adventist-healthcare, northwell-health, hartford-healthcare, upstate-medical-university, strong-memorial-hospital, mass-general-brigham, guthrie, yale-new-haven-health

Time: $DATE_READABLE
Hostname: $(hostname)"
    
    exit 1
    ;;
esac

# Check scraper exit code
if [ $SCRAPER_EXIT_CODE -eq 0 ]; then
  log_message "✅ Scraper completed successfully (exit code: 0)"
else
  log_message "❌ Scraper FAILED (exit code: $SCRAPER_EXIT_CODE)"
  log_message ""
  log_message "📋 Last 20 lines of scraper log:"
  tail -20 "$SCRAPER_LOG" | while IFS= read -r line; do
    log_message "   $line"
  done
  
  # Send failure email
  EMAIL_SUBJECT="❌ Scraper Failed: $EMPLOYER_SLUG"
  EMAIL_BODY="The scraper for $EMPLOYER_SLUG has FAILED.

Exit Code: $SCRAPER_EXIT_CODE
Time: $DATE_READABLE
Hostname: $(hostname)

Scraper Log: $SCRAPER_LOG

Last 20 lines of log:
$(tail -20 "$SCRAPER_LOG")

---
Classification was SKIPPED because the scraper failed.
No API charges incurred."

  send_email "$EMAIL_SUBJECT" "$EMAIL_BODY"
  
  log_message ""
  log_message "🚫 SKIPPING classifier because scraper failed"
  log_message "   (This prevents wasting OpenAI API calls)"
  log_message ""
  log_message "=========================================="
  log_message "❌ FAILED: Scraper error"
  log_message "=========================================="
  
  exit $SCRAPER_EXIT_CODE
fi

###############################################################################
# STEP 2: Run the LLM classifier (only if scraper succeeded)
###############################################################################
log_message ""
log_message "STEP 2/2: Running LLM classifier for $EMPLOYER_SLUG..."

# Run classifier with employer filter
node "$PROJECT_ROOT/scripts/classify-jobs-with-llm.js" --employer="$EMPLOYER_SLUG" > "$CLASSIFIER_LOG" 2>&1
CLASSIFIER_EXIT_CODE=$?

# Check classifier exit code
if [ $CLASSIFIER_EXIT_CODE -eq 0 ]; then
  log_message "✅ Classifier completed successfully (exit code: 0)"
  
  # Extract classification stats from log (if available)
  SUCCESSFUL_COUNT=$(grep -oP '✅ Successful: \K\d+' "$CLASSIFIER_LOG" | head -1)
  FAILED_COUNT=$(grep -oP '❌ Failed: \K\d+' "$CLASSIFIER_LOG" | head -1)
  TOTAL_COST=$(grep -oP '💰 Total Cost: \$\K[\d.]+' "$CLASSIFIER_LOG" | head -1)
  
  log_message ""
  log_message "📊 Classification Results:"
  log_message "   ✅ Successful: ${SUCCESSFUL_COUNT:-N/A}"
  log_message "   ❌ Failed: ${FAILED_COUNT:-N/A}"
  log_message "   💰 Cost: \$${TOTAL_COST:-N/A}"
  
  log_message ""
  log_message "=========================================="
  log_message "✅ SUCCESS: Both scraper and classifier completed"
  log_message "=========================================="
  
  # STEP 3/3: Submit URLs to IndexNow (batched to avoid rate limiting)
  log_message ""
  log_message "=========================================="
  log_message "STEP 3/3: Submitting URLs to IndexNow..."
  log_message "=========================================="
  
  INDEXNOW_LOG="${LOG_DIR}/${EMPLOYER_SLUG}_indexnow_${TIMESTAMP}.log"
  log_message "   📂 IndexNow log: $INDEXNOW_LOG"
  log_message ""
  
  /usr/bin/nice -n 15 node "$PROJECT_ROOT/scripts/batch-indexnow.js" --employer="$EMPLOYER_SLUG" > "$INDEXNOW_LOG" 2>&1
  INDEXNOW_EXIT_CODE=$?
  
  if [ $INDEXNOW_EXIT_CODE -eq 0 ]; then
    log_message "✅ IndexNow submission completed"
    
    # Show summary from log
    if grep -q "Total submitted:" "$INDEXNOW_LOG"; then
      SUBMITTED_COUNT=$(grep "Total submitted:" "$INDEXNOW_LOG" | awk '{print $3}')
      log_message "   📤 Submitted: $SUBMITTED_COUNT URLs"
    fi
  else
    log_message "⚠️  IndexNow submission had issues (exit code: $INDEXNOW_EXIT_CODE)"
    log_message "   This is non-critical - jobs are still saved and active"
    log_message "   Check log: $INDEXNOW_LOG"
  fi
  
  log_message ""
  log_message "=========================================="
  log_message "✅ WORKFLOW COMPLETE"
  log_message "=========================================="
  
else
  log_message "❌ Classifier FAILED (exit code: $CLASSIFIER_EXIT_CODE)"
  log_message ""
  log_message "📋 Last 20 lines of classifier log:"
  tail -20 "$CLASSIFIER_LOG" | while IFS= read -r line; do
    log_message "   $line"
  done
  
  # Send failure email
  EMAIL_SUBJECT="❌ Classifier Failed: $EMPLOYER_SLUG"
  EMAIL_BODY="The LLM classifier for $EMPLOYER_SLUG has FAILED.

Exit Code: $CLASSIFIER_EXIT_CODE
Time: $DATE_READABLE
Hostname: $(hostname)

Classifier Log: $CLASSIFIER_LOG

Last 20 lines of log:
$(tail -20 "$CLASSIFIER_LOG")

---
NOTE: The scraper completed successfully, but jobs were NOT activated 
because the classifier failed. Jobs remain in pending state (isActive: false).

Possible causes:
- OpenAI API key invalid or quota exceeded
- Network connectivity issues
- Database connection issues"

  send_email "$EMAIL_SUBJECT" "$EMAIL_BODY"
  
  log_message ""
  log_message "=========================================="
  log_message "⚠️  PARTIAL FAILURE: Scraper succeeded, classifier failed"
  log_message "=========================================="
  
  exit $CLASSIFIER_EXIT_CODE
fi

###############################################################################
# Cleanup: Remove old logs (30+ days)
###############################################################################
log_message ""
log_message "🧹 Cleaning up old logs (30+ days)..."
find "$LOG_DIR" -name "*.log" -mtime +30 -delete 2>/dev/null
DELETED_COUNT=$?
if [ $DELETED_COUNT -eq 0 ]; then
  log_message "✅ Old logs cleaned up"
else
  log_message "ℹ️  No old logs to clean up"
fi

log_message ""
log_message "🎉 All done!"

exit 0

