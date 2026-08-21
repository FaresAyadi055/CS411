#!/usr/bin/env bash
set -euo pipefail

# Backup SQLite database
# Usage: ./scripts/backup-db.sh [backup-dir]
# Default backup dir: ../database/backups/

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${1:-"$SCRIPT_DIR/../database/backups"}"
DB_PATH="$SCRIPT_DIR/../database/app.db"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/app-$TIMESTAMP.db"

sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Keep only the last 14 backups
ls -tp "$BACKUP_DIR"/app-*.db 2>/dev/null | tail -n +15 | xargs -I {} rm -- {} 2>/dev/null || true

echo "Backup saved: $BACKUP_FILE"
