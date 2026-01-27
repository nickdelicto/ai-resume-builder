#!/bin/bash
# Start SSH tunnel to production database
# Maps local port 5433 to production's localhost:5432

PROD_IP="5.161.199.241"
PROD_USER="delicto"
LOCAL_PORT="5433"
REMOTE_PORT="5432"

# Check if tunnel already exists
if pgrep -f "ssh.*${LOCAL_PORT}:localhost:${REMOTE_PORT}" > /dev/null; then
    echo "Tunnel already running"
    exit 0
fi

# Start tunnel in background
ssh -f -N -L ${LOCAL_PORT}:localhost:${REMOTE_PORT} ${PROD_USER}@${PROD_IP}
echo "Tunnel started: localhost:${LOCAL_PORT} -> ${PROD_IP}:${REMOTE_PORT}"
