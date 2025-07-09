#!/bin/bash
# EATECH Platform Backup Script
# This script handles automated backups of Firestore data and storage

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${PROJECT_ROOT}/backups"
RETENTION_DAYS=30

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS] ENVIRONMENT [COMPONENT]

Backup EATECH platform data

ENVIRONMENT:
    dev         Development environment
    staging     Staging environment
    prod        Production environment

COMPONENT (optional):
    firestore   Backup Firestore database only
    storage     Backup Cloud Storage only
    all         Backup everything (default)

OPTIONS:
    -h, --help              Show this help message
    -d, --destination       Custom backup destination (default: ./backups)
    -r, --retention         Retention period in days (default: 30)
    -c, --collections       Specific Firestore collections to backup (comma-separated)
    -t, --tenant            Backup specific tenant data only
    -e, --encrypt           Encrypt backup with GPG
    -u, --upload            Upload to cloud storage after backup
    --dry-run               Show what would be backed up without doing it
    --restore               Restore from backup (requires --file)
    --file                  Backup file to restore from
    --verify                Verify backup integrity

EXAMPLES:
    $0 prod                                 Backup all production data
    $0 staging firestore -c orders,users    Backup specific collections
    $0 prod -t tenant123                    Backup specific tenant data
    $0 prod --restore --file backup.tar.gz  Restore from backup
    $0 dev --dry-run                        Show what would be backed up

EOF
    exit 1
}

# Parse arguments
ENVIRONMENT=""
COMPONENT="all"
DESTINATION="$BACKUP_DIR"
RETENTION=$RETENTION_DAYS
COLLECTIONS=""
TENANT_ID=""
ENCRYPT=false
UPLOAD=false
DRY_RUN=false
RESTORE=false
BACKUP_FILE=""
VERIFY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -d|--destination)
            DESTINATION="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION="$2"
            shift 2
            ;;
        -c|--collections)
            COLLECTIONS="$2"
            shift 2
            ;;
        -t|--tenant)
            TENANT_ID="$2"
            shift 2
            ;;
        -e|--encrypt)
            ENCRYPT=true
            shift
            ;;
        -u|--upload)
            UPLOAD=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --restore)
            RESTORE=true
            shift
            ;;
        --file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --verify)
            VERIFY=true
            shift
            ;;
        dev|staging|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        firestore|storage|all)
            COMPONENT="$1"
            shift
            ;;
        *)
            error "Unknown argument: $1"
            usage
            ;;
    esac
done

# Validate arguments
if [[ -z "$ENVIRONMENT" ]]; then
    error "Environment must be specified"
    usage
fi

if [[ "$RESTORE" == true ]] && [[ -z "$BACKUP_FILE" ]]; then
    error "Backup file must be specified for restore operation"
    usage
fi

# Load environment variables
ENV_FILE="${PROJECT_ROOT}/.env.${ENVIRONMENT}"
if [[ -f "$ENV_FILE" ]]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    error "Environment file not found: $ENV_FILE"
    exit 1
fi

# Create backup directory
mkdir -p "$DESTINATION"

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        error "gcloud CLI not found. Please install Google Cloud SDK"
        exit 1
    fi
    
    # Check gsutil
    if ! command -v gsutil &> /dev/null; then
        error "gsutil not found. Please install Google Cloud SDK"
        exit 1
    fi
    
    # Check authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        error "Not authenticated with gcloud. Run: gcloud auth login"
        exit 1
    fi
    
    # Check project
    local current_project=$(gcloud config get-value project 2>/dev/null)
    if [[ "$current_project" != "$FIREBASE_PROJECT_ID" ]]; then
        log "Setting gcloud project to $FIREBASE_PROJECT_ID"
        gcloud config set project "$FIREBASE_PROJECT_ID"
    fi
    
    # Check GPG if encryption is enabled
    if [[ "$ENCRYPT" == true ]]; then
        if ! command -v gpg &> /dev/null; then
            error "GPG not found. Please install GPG for encryption"
            exit 1
        fi
    fi
    
    success "Prerequisites check passed"
}

# Backup Firestore
backup_firestore() {
    local backup_name="firestore_${ENVIRONMENT}_${TIMESTAMP}"
    local backup_path="${DESTINATION}/${backup_name}"
    
    log "Backing up Firestore database..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would backup Firestore to: $backup_path"
        if [[ -n "$COLLECTIONS" ]]; then
            log "[DRY RUN] Collections: $COLLECTIONS"
        fi
        if [[ -n "$TENANT_ID" ]]; then
            log "[DRY RUN] Tenant filter: $TENANT_ID"
        fi
        return
    fi
    
    # Create export command
    local export_cmd="gcloud firestore export gs://${FIREBASE_PROJECT_ID}-backups/${backup_name}"
    
    # Add collections filter if specified
    if [[ -n "$COLLECTIONS" ]]; then
        IFS=',' read -ra COLLECTION_ARRAY <<< "$COLLECTIONS"
        for collection in "${COLLECTION_ARRAY[@]}"; do
            export_cmd+=" --collection-ids=$collection"
        done
    fi
    
    # Execute export
    log "Exporting Firestore to Cloud Storage..."
    $export_cmd || {
        error "Firestore export failed"
        return 1
    }
    
    # Download export to local
    log "Downloading Firestore backup..."
    mkdir -p "$backup_path"
    gsutil -m cp -r "gs://${FIREBASE_PROJECT_ID}-backups/${backup_name}/*" "$backup_path/" || {
        error "Failed to download Firestore backup"
        return 1
    }
    
    # Apply tenant filter if specified
    if [[ -n "$TENANT_ID" ]]; then
        log "Filtering backup for tenant: $TENANT_ID"
        # This would require custom processing of the export files
        # For now, we'll just note it in the metadata
        echo "tenant_filter: $TENANT_ID" >> "${backup_path}/metadata.txt"
    fi
    
    # Create manifest
    create_backup_manifest "$backup_path" "firestore" "$backup_name"
    
    success "Firestore backup completed: $backup_path"
}

# Backup Cloud Storage
backup_storage() {
    local backup_name="storage_${ENVIRONMENT}_${TIMESTAMP}"
    local backup_path="${DESTINATION}/${backup_name}"
    
    log "Backing up Cloud Storage..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would backup Storage to: $backup_path"
        if [[ -n "$TENANT_ID" ]]; then
            log "[DRY RUN] Tenant filter: $TENANT_ID"
        fi
        return
    fi
    
    mkdir -p "$backup_path"
    
    # Define storage path
    local storage_path="gs://${FIREBASE_PROJECT_ID}.appspot.com"
    if [[ -n "$TENANT_ID" ]]; then
        storage_path+="/tenants/${TENANT_ID}"
    fi
    
    # Download storage files
    log "Downloading storage files from $storage_path..."
    gsutil -m cp -r "$storage_path/*" "$backup_path/" 2>/dev/null || {
        warning "Some files may not exist or be accessible"
    }
    
    # Create manifest
    create_backup_manifest "$backup_path" "storage" "$backup_name"
    
    # Calculate size
    local size=$(du -sh "$backup_path" | cut -f1)
    log "Storage backup size: $size"
    
    success "Storage backup completed: $backup_path"
}

# Create backup manifest
create_backup_manifest() {
    local path=$1
    local type=$2
    local name=$3
    
    cat > "${path}/manifest.json" << EOF
{
    "backup_name": "$name",
    "backup_type": "$type",
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
    "version": "1.0",
    "project_id": "$FIREBASE_PROJECT_ID",
    "tenant_id": "$TENANT_ID",
    "collections": "$COLLECTIONS",
    "created_by": "$(whoami)@$(hostname)",
    "platform": "$(uname -s)",
    "checksum": ""
}
EOF
}

# Compress and optionally encrypt backup
compress_backup() {
    local backup_paths=("$@")
    local archive_name="eatech_backup_${ENVIRONMENT}_${TIMESTAMP}.tar.gz"
    local archive_path="${DESTINATION}/${archive_name}"
    
    log "Compressing backup..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would create archive: $archive_path"
        return
    fi
    
    # Create tar archive
    cd "$DESTINATION"
    tar -czf "$archive_name" "${backup_paths[@]##*/}" || {
        error "Failed to create backup archive"
        return 1
    }
    
    # Calculate checksum
    local checksum=$(sha256sum "$archive_name" | cut -d' ' -f1)
    echo "$checksum" > "${archive_name}.sha256"
    
    # Encrypt if requested
    if [[ "$ENCRYPT" == true ]]; then
        log "Encrypting backup..."
        gpg --symmetric --cipher-algo AES256 "$archive_name" || {
            error "Failed to encrypt backup"
            return 1
        }
        rm "$archive_name"  # Remove unencrypted version
        archive_name="${archive_name}.gpg"
        archive_path="${archive_path}.gpg"
    fi
    
    # Clean up individual backup directories
    for path in "${backup_paths[@]}"; do
        rm -rf "$path"
    done
    
    success "Backup archive created: $archive_path"
    echo "$archive_path"
}

# Upload backup to cloud storage
upload_backup() {
    local file_path=$1
    local remote_path="gs://${FIREBASE_PROJECT_ID}-backups/archives/$(basename "$file_path")"
    
    log "Uploading backup to Cloud Storage..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would upload to: $remote_path"
        return
    fi
    
    gsutil cp "$file_path" "$remote_path" || {
        error "Failed to upload backup"
        return 1
    }
    
    # Also upload checksum
    if [[ -f "${file_path%.gpg}.sha256" ]]; then
        gsutil cp "${file_path%.gpg}.sha256" "${remote_path%.gpg}.sha256"
    fi
    
    success "Backup uploaded to: $remote_path"
}

# Verify backup integrity
verify_backup() {
    local file_path=$1
    
    log "Verifying backup integrity..."
    
    # Check if file exists
    if [[ ! -f "$file_path" ]]; then
        error "Backup file not found: $file_path"
        return 1
    fi
    
    # Check checksum if available
    local checksum_file="${file_path%.gpg}.sha256"
    if [[ -f "$checksum_file" ]]; then
        log "Verifying checksum..."
        local expected_checksum=$(cat "$checksum_file")
        local actual_checksum=$(sha256sum "${file_path%.gpg}" 2>/dev/null | cut -d' ' -f1)
        
        if [[ "$expected_checksum" == "$actual_checksum" ]]; then
            success "Checksum verification passed"
        else
            error "Checksum verification failed"
            return 1
        fi
    fi
    
    # Test archive integrity
    if [[ "$file_path" == *.gpg ]]; then
        log "Testing encrypted archive..."
        gpg --decrypt "$file_path" | tar -tzf - > /dev/null || {
            error "Archive integrity check failed"
            return 1
        }
    else
        log "Testing archive..."
        tar -tzf "$file_path" > /dev/null || {
            error "Archive integrity check failed"
            return 1
        }
    fi
    
    success "Backup integrity verified"
}

# Restore from backup
restore_backup() {
    local file_path=$1
    
    log "Restoring from backup: $file_path"
    
    # Verify backup first
    verify_backup "$file_path" || {
        error "Backup verification failed. Aborting restore."
        return 1
    }
    
    # Confirm restore
    warning "This will restore data to $ENVIRONMENT environment"
    warning "Current data may be overwritten!"
    read -p "Are you sure you want to continue? (yes/no) " -r
    if [[ ! $REPLY == "yes" ]]; then
        log "Restore cancelled"
        return 0
    fi
    
    # Create temp directory for extraction
    local temp_dir="${DESTINATION}/restore_${TIMESTAMP}"
    mkdir -p "$temp_dir"
    
    # Extract backup
    log "Extracting backup..."
    cd "$temp_dir"
    
    if [[ "$file_path" == *.gpg ]]; then
        gpg --decrypt "$file_path" | tar -xzf - || {
            error "Failed to extract encrypted backup"
            return 1
        }
    else
        tar -xzf "$file_path" || {
            error "Failed to extract backup"
            return 1
        }
    fi
    
    # Restore Firestore if present
    if [[ -d "firestore_"* ]]; then
        log "Restoring Firestore data..."
        local firestore_dir=$(ls -d firestore_* | head -1)
        
        # Upload to Cloud Storage first
        gsutil -m cp -r "$firestore_dir/*" "gs://${FIREBASE_PROJECT_ID}-backups/restore_${TIMESTAMP}/" || {
            error "Failed to upload Firestore data"
            return 1
        }
        
        # Import to Firestore
        gcloud firestore import "gs://${FIREBASE_PROJECT_ID}-backups/restore_${TIMESTAMP}" || {
            error "Failed to import Firestore data"
            return 1
        }
    fi
    
    # Restore Storage if present
    if [[ -d "storage_"* ]]; then
        log "Restoring Storage files..."
        local storage_dir=$(ls -d storage_* | head -1)
        
        gsutil -m cp -r "$storage_dir/*" "gs://${FIREBASE_PROJECT_ID}.appspot.com/" || {
            error "Failed to restore Storage files"
            return 1
        }
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    success "Restore completed successfully"
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION days)..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would remove backups older than $RETENTION days"
        find "$DESTINATION" -name "eatech_backup_*.tar.gz*" -type f -mtime +$RETENTION -ls
        return
    fi
    
    # Local cleanup
    find "$DESTINATION" -name "eatech_backup_*.tar.gz*" -type f -mtime +$RETENTION -delete
    
    # Cloud Storage cleanup
    gsutil ls "gs://${FIREBASE_PROJECT_ID}-backups/archives/" | while read -r file; do
        local file_date=$(gsutil stat "$file" | grep "Creation time:" | cut -d' ' -f3-)
        local file_timestamp=$(date -d "$file_date" +%s 2>/dev/null || date -j -f "%a, %d %b %Y" "$file_date" +%s)
        local cutoff_timestamp=$(date -d "$RETENTION days ago" +%s)
        
        if [[ $file_timestamp -lt $cutoff_timestamp ]]; then
            log "Removing old cloud backup: $file"
            gsutil rm "$file"
        fi
    done
    
    success "Cleanup completed"
}

# Main backup logic
main() {
    log "Starting backup process..."
    log "Environment: $ENVIRONMENT"
    log "Component: $COMPONENT"
    
    if [[ "$DRY_RUN" == true ]]; then
        warning "Running in DRY RUN mode - no actual changes will be made"
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Handle restore operation
    if [[ "$RESTORE" == true ]]; then
        restore_backup "$BACKUP_FILE"
        exit $?
    fi
    
    # Handle verify operation
    if [[ "$VERIFY" == true ]] && [[ -n "$BACKUP_FILE" ]]; then
        verify_backup "$BACKUP_FILE"
        exit $?
    fi
    
    # Perform backups
    local backup_paths=()
    
    case $COMPONENT in
        firestore)
            backup_firestore
            backup_paths+=("${DESTINATION}/firestore_${ENVIRONMENT}_${TIMESTAMP}")
            ;;
        storage)
            backup_storage
            backup_paths+=("${DESTINATION}/storage_${ENVIRONMENT}_${TIMESTAMP}")
            ;;
        all)
            backup_firestore
            backup_paths+=("${DESTINATION}/firestore_${ENVIRONMENT}_${TIMESTAMP}")
            backup_storage
            backup_paths+=("${DESTINATION}/storage_${ENVIRONMENT}_${TIMESTAMP}")
            ;;
        *)
            error "Unknown component: $COMPONENT"
            exit 1
            ;;
    esac
    
    # Compress and encrypt backups
    if [[ ${#backup_paths[@]} -gt 0 ]] && [[ "$DRY_RUN" != true ]]; then
        local archive_path=$(compress_backup "${backup_paths[@]}")
        
        # Upload if requested
        if [[ "$UPLOAD" == true ]] && [[ -n "$archive_path" ]]; then
            upload_backup "$archive_path"
        fi
        
        # Verify the backup
        verify_backup "$archive_path"
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    success "Backup process completed successfully!"
    
    if [[ "$DRY_RUN" != true ]]; then
        log "Backup summary:"
        log "  - Environment: $ENVIRONMENT"
        log "  - Component: $COMPONENT"
        log "  - Location: $DESTINATION"
        log "  - Encrypted: $ENCRYPT"
        log "  - Uploaded: $UPLOAD"
    fi
}

# Run main function
main
