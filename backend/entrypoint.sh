#!/bin/bash
set -e

# server.pid が残っている場合は削除
rm -f tmp/pids/server.pid

exec "$@"
