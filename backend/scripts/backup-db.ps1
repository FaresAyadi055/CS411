param(
  [string]$BackupDir = "$PSScriptRoot\..\..\database\backups"
)

$dbPath = "$PSScriptRoot\..\..\database\app.db"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = "$BackupDir\app-$timestamp.db"

New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

& sqlite3.exe $dbPath ".backup '$backupFile'"

# Keep only the last 14 backups
Get-ChildItem "$BackupDir\app-*.db" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 14 | Remove-Object -Force -ErrorAction SilentlyContinue

Write-Output "Backup saved: $backupFile"
