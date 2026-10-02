#!/usr/bin/env bash
set -euo pipefail

# Backup SQLite database
# Usage: ./scripts/backup-db.sh [backup-dir]
# Default backup dir: ../../database/backups/
# Uses the system sqlite3 CLI — the bundled database/sqlite3.exe is Windows-only.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${1:-"$SCRIPT_DIR/../../database/backups"}"
DB_PATH="$SCRIPT_DIR/../../database/app.db"
SQLITE3_BIN="${SQLITE3_BIN:-sqlite3}"

if ! command -v "$SQLITE3_BIN" >/dev/null 2>&1; then
  echo "error: '$SQLITE3_BIN' not found in PATH" >&2
  echo "Install the sqlite3 CLI (e.g. apt install sqlite3) or set SQLITE3_BIN." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/app-$TIMESTAMP.db"

"$SQLITE3_BIN" "$DB_PATH" ".backup '$BACKUP_FILE'"

# Keep only the last 14 backups
ls -tp "$BACKUP_DIR"/app-*.db 2>/dev/null | tail -n +15 | xargs -I {} rm -- {} 2>/dev/null || true

echo "Backup saved: $BACKUP_FILE"
