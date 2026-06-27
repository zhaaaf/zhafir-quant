#!/bin/bash
# TDS Bab 7: Automated Database Backup Script
# Schedule: crontab -e → 0 2 * * * /home/ubuntu/zhafir-quant/backup.sh
# Saves compressed dumps to ~/backups/, deletes files older than 30 days

BACKUP_DIR="/home/ubuntu/backups/quant"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="quant_timescaledb"
DB_NAME="quant_personal_db"
DB_USER="quant_admin"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump database
docker exec -t "$CONTAINER_NAME" \
    pg_dump -U "$DB_USER" -F c -b -v \
    -f "/tmp/backup_${TIMESTAMP}.dump" "$DB_NAME"

# Copy to host
docker cp "${CONTAINER_NAME}:/tmp/backup_${TIMESTAMP}.dump" \
    "${BACKUP_DIR}/backup_${TIMESTAMP}.dump"

# Cleanup temp file in container
docker exec -t "$CONTAINER_NAME" \
    rm "/tmp/backup_${TIMESTAMP}.dump"

# Compress the backup
gzip "${BACKUP_DIR}/backup_${TIMESTAMP}.dump"

# Calculate storage efficiency (TDS Bab 5: R_compression formula)
ORIG_SIZE=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));")
COMP_SIZE=$(du -sh "${BACKUP_DIR}/backup_${TIMESTAMP}.dump.gz" | cut -f1)
echo "[$(date)] DB size: $ORIG_SIZE | Backup size: $COMP_SIZE"

# Remove backups older than 30 days
find "$BACKUP_DIR" -type f -name "*.dump.gz" -mtime +30 -delete

echo "[$(date)] Backup completed: backup_${TIMESTAMP}.dump.gz"
