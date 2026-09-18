#!/usr/bin/env bash
set -e
npm run dev --prefix server &
SERVER_PID=$!
npm run dev --prefix client &
CLIENT_PID=$!
trap 'kill $SERVER_PID $CLIENT_PID 2>/dev/null || true' INT TERM EXIT
wait -n $SERVER_PID $CLIENT_PID
