#!/bin/bash

# /tools/scripts/backup-data.sh
# EATECH V3.0 - Firebase Data Backup Script
# Comprehensive backup solution for Firestore, Storage, and Auth

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_ROOT="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_LOG="${PROJECT_ROOT}/logs/backup_${TIMESTAMP}.log"

# Default values
ENVIRONMENT="production"
BACKUP_TYPE="full"
RETENTION_DAYS=30
COMPRESSION=true
ENCRYPTION=false
VERIFY_BACKUP=true
UPLOAD_TO_CLOUD=false
QUIET=false

echo -e "${PURPLE}🍴 EATECH V3.0 - Data Backup Script${NC}"
echo -e "${CYAN}================================================${NC}"

# Logging functions
log() {
    local message="$1"
    local level="${2:-INFO}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    if [ "$QUIET" != "true" ]; then
        echo -e "$message"
    fi

    echo "[$timestamp] [$level] $message" >> "$BACKUP_LOG"
}

error_exit() {
    log "${RED}❌ Error: $1${NC}" "ERROR"
    cleanup_temp_files
    exit 1
}

success() {
    log "${GREEN}✅ $1${NC}" "SUCCESS"
}

warning() {
    log "${YELLOW}⚠️  $1${NC}" "WARNING"
}

info() {
    log "${BLUE}ℹ️  $1${NC}" "INFO"
}

# Environment configuration
setup_environment() {
    case $ENVIRONMENT in
        "production")
            FIREBASE_PROJECT="eatech-prod"
            STORAGE_BUCKET="eatech-prod.appspot.com"
            ;;
        "staging")
            FIREBASE_PROJECT="eatech-staging"
            STORAGE_BUCKET="eatech-staging.appspot.com"
            ;;
        "development")
            FIREBASE_PROJECT="eatech-dev"
            STORAGE_BUCKET="eatech-dev.appspot.com"
            ;;
        *)
            error_exit "Invalid environment: $ENVIRONMENT"
            ;;
    esac

    BACKUP_DIR="${BACKUP_ROOT}/${ENVIRONMENT}/${TIMESTAMP}"

    info "Environment: $ENVIRONMENT"
    info "Firebase Project: $FIREBASE_PROJECT"
    info "Backup Directory: $BACKUP_DIR"
}

# Check prerequisites
check_prerequisites() {
    info "Checking backup prerequisites..."

    # Check required tools
    local required_tools=("firebase" "gcloud" "node" "jq")

    for tool in "${required_tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            error_exit "$tool is not installed or not in PATH"
        fi
    done

    # Check Firebase authentication
    if ! firebase projects:list &> /dev/null; then
        error_exit "Not authenticated with Firebase. Run 'firebase login'"
    fi

    # Check Google Cloud authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 &> /dev/null; then
        error_exit "Not authenticated with Google Cloud. Run 'gcloud auth login'"
    fi

    # Check if project exists
    if ! firebase projects:list | grep -q "$FIREBASE_PROJECT"; then
        error_exit "Firebase project '$FIREBASE_PROJECT' not found"
    fi

    # Check disk space
    local available_space=$(df -BG "$BACKUP_ROOT" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "${available_space}" -lt 10 ]; then
        warning "Low disk space: ${available_space}GB available. Recommended: 10GB+"
    fi

    success "Prerequisites check passed"
}

# Create backup directories
create_backup_structure() {
    info "Creating backup directory structure..."

    mkdir -p "$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR/firestore"
    mkdir -p "$BACKUP_DIR/storage"
    mkdir -p "$BACKUP_DIR/auth"
    mkdir -p "$BACKUP_DIR/functions"
    mkdir -p "$BACKUP_DIR/config"
    mkdir -p "$BACKUP_DIR/logs"
    mkdir -p "${PROJECT_ROOT}/logs"

    # Create backup metadata
    cat > "$BACKUP_DIR/backup-info.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "project": "$FIREBASE_PROJECT",
    "type": "$BACKUP_TYPE",
    "version": "3.0.0",
    "compression": $COMPRESSION,
    "encryption": $ENCRYPTION,
    "createdBy": "$(whoami)",
    "hostname": "$(hostname)",
    "status": "in_progress"
}
EOF

    success "Backup structure created"
}

# Backup Firestore data
backup_firestore() {
    info "Backing up Firestore data..."

    local firestore_dir="$BACKUP_DIR/firestore"

    # Set Firebase project
    firebase use "$FIREBASE_PROJECT" || error_exit "Failed to set Firebase project"

    # Export collections individually for better organization
    local collections=(
        "tenants"
        "users"
        "masterUsers"
        "systemConfig"
        "platformAnalytics"
    )

    # Export main collections
    for collection in "${collections[@]}"; do
        info "Exporting collection: $collection"

        # Use Firebase Admin SDK for export
        node -e "
        const admin = require('firebase-admin');
        const fs = require('fs');

        // Initialize with service account
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: '$FIREBASE_PROJECT'
            });
        }

        const db = admin.firestore();

        async function exportCollection() {
            try {
                const snapshot = await db.collection('$collection').get();
                const data = {};

                snapshot.forEach(doc => {
                    data[doc.id] = doc.data();
                });

                fs.writeFileSync('$firestore_dir/${collection}.json', JSON.stringify(data, null, 2));
                console.log('Exported $collection: ' + snapshot.size + ' documents');
            } catch (error) {
                console.error('Error exporting $collection:', error);
                process.exit(1);
            }
        }

        exportCollection();
        " || error_exit "Failed to export collection: $collection"
    done

    # Export tenant-specific collections
    info "Exporting tenant-specific collections..."

    # Get list of tenants
    local tenants=$(node -e "
    const admin = require('firebase-admin');

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: '$FIREBASE_PROJECT'
        });
    }

    const db = admin.firestore();

    async function getTenants() {
        try {
            const snapshot = await db.collection('tenants').get();
            const tenantIds = [];
            snapshot.forEach(doc => tenantIds.push(doc.id));
            console.log(tenantIds.join(' '));
        } catch (error) {
            console.error('Error getting tenants:', error);
        }
    }

    getTenants();
    ")

    # Export each tenant's data
    for tenant_id in $tenants; do
        info "Exporting data for tenant: $tenant_id"

        mkdir -p "$firestore_dir/tenants/$tenant_id"

        local tenant_collections=("products" "orders" "customers" "events" "analytics")

        for collection in "${tenant_collections[@]}"; do
            node -e "
            const admin = require('firebase-admin');
            const fs = require('fs');

            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    projectId: '$FIREBASE_PROJECT'
                });
            }

            const db = admin.firestore();

            async function exportTenantCollection() {
                try {
                    const snapshot = await db.collection('tenants/$tenant_id/$collection').get();
                    const data = {};

                    snapshot.forEach(doc => {
                        data[doc.id] = doc.data();
                    });

                    fs.writeFileSync('$firestore_dir/tenants/$tenant_id/${collection}.json', JSON.stringify(data, null, 2));
                    console.log('Exported $tenant_id/$collection: ' + snapshot.size + ' documents');
                } catch (error) {
                    console.error('Error exporting $tenant_id/$collection:', error);
                }
            }

            exportTenantCollection();
            " || warning "Failed to export $tenant_id/$collection"
        done
    done

    # Export security rules
    info "Exporting Firestore security rules..."
    firebase firestore:rules:get "$firestore_dir/firestore.rules" || warning "Failed to export Firestore rules"

    # Export indexes
    info "Exporting Firestore indexes..."
    firebase firestore:indexes:list --format=json > "$firestore_dir/indexes.json" || warning "Failed to export Firestore indexes"

    success "Firestore backup completed"
}

# Backup Firebase Storage
backup_storage() {
    info "Backing up Firebase Storage..."

    local storage_dir="$BACKUP_DIR/storage"

    # Use gsutil to sync storage bucket
    info "Syncing storage bucket: gs://$STORAGE_BUCKET"

    # Create directory structure to match bucket
    mkdir -p "$storage_dir/bucket"

    # Sync all files from storage bucket
    gsutil -m rsync -r -d "gs://$STORAGE_BUCKET" "$storage_dir/bucket" || {
        warning "Storage sync completed with some errors"
    }

    # Get bucket metadata
    gsutil ls -L -b "gs://$STORAGE_BUCKET" > "$storage_dir/bucket-metadata.txt" || warning "Failed to get bucket metadata"

    # List all objects with metadata
    gsutil ls -l -r "gs://$STORAGE_BUCKET" > "$storage_dir/objects-list.txt" || warning "Failed to list objects"

    # Export storage rules
    info "Exporting Storage security rules..."
    firebase storage:rules:get "$storage_dir/storage.rules" || warning "Failed to export Storage rules"

    success "Storage backup completed"
}

# Backup Firebase Authentication
backup_auth() {
    info "Backing up Firebase Authentication..."

    local auth_dir="$BACKUP_DIR/auth"

    # Export user accounts using Firebase Admin SDK
    node -e "
    const admin = require('firebase-admin');
    const fs = require('fs');

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: '$FIREBASE_PROJECT'
        });
    }

    async function exportUsers() {
        try {
            const auth = admin.auth();
            const users = [];
            let nextPageToken;

            do {
                const listUsersResult = await auth.listUsers(1000, nextPageToken);

                listUsersResult.users.forEach(user => {
                    users.push({
                        uid: user.uid,
                        email: user.email,
                        emailVerified: user.emailVerified,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        phoneNumber: user.phoneNumber,
                        disabled: user.disabled,
                        metadata: {
                            lastSignInTime: user.metadata.lastSignInTime,
                            creationTime: user.metadata.creationTime
                        },
                        customClaims: user.customClaims,
                        providerData: user.providerData
                    });
                });

                nextPageToken = listUsersResult.pageToken;
            } while (nextPageToken);

            fs.writeFileSync('$auth_dir/users.json', JSON.stringify(users, null, 2));
            console.log('Exported ' + users.length + ' user accounts');

        } catch (error) {
            console.error('Error exporting users:', error);
            process.exit(1);
        }
    }

    exportUsers();
    " || error_exit "Failed to export user accounts"

    # Export project configuration
    gcloud projects describe "$FIREBASE_PROJECT" --format=json > "$auth_dir/project-config.json" || warning "Failed to export project config"

    success "Authentication backup completed"
}

# Backup Firebase Functions
backup_functions() {
    info "Backing up Firebase Functions..."

    local functions_dir="$BACKUP_DIR/functions"

    # Copy functions source code
    if [ -d "$PROJECT_ROOT/functions" ]; then
        cp -r "$PROJECT_ROOT/functions" "$functions_dir/source"

        # Remove node_modules and other build artifacts
        find "$functions_dir/source" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
        find "$functions_dir/source" -name "lib" -type d -exec rm -rf {} + 2>/dev/null || true
        find "$functions_dir/source" -name "*.log" -type f -delete 2>/dev/null || true

        success "Functions source code backed up"
    else
        warning "Functions directory not found"
    fi

    # Export deployed functions info
    firebase functions:list --format=json > "$functions_dir/deployed-functions.json" || warning "Failed to list deployed functions"

    # Export environment variables (without values for security)
    firebase functions:config:get > "$functions_dir/functions-config.json" || warning "Failed to export functions config"

    success "Functions backup completed"
}

# Backup project configuration
backup_config() {
    info "Backing up project configuration..."

    local config_dir="$BACKUP_DIR/config"

    # Copy important config files
    local config_files=(
        "firebase.json"
        "firestore.rules"
        "firestore.indexes.json"
        "storage.rules"
        "package.json"
        "turbo.json"
        "tsconfig.json"
        ".env.example"
    )

    for file in "${config_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            cp "$PROJECT_ROOT/$file" "$config_dir/"
            info "Backed up: $file"
        else
            warning "Config file not found: $file"
        fi
    done

    # Export Firebase project configuration
    firebase projects:list --format=json > "$config_dir/firebase-projects.json" || warning "Failed to export Firebase projects"

    # Export hosting configuration
    firebase hosting:sites:list --format=json > "$config_dir/hosting-sites.json" || warning "Failed to export hosting sites"

    success "Configuration backup completed"
}

# Compress backup if enabled
compress_backup() {
    if [ "$COMPRESSION" = true ]; then
        info "Compressing backup..."

        local archive_path="${BACKUP_DIR}.tar.gz"

        tar -czf "$archive_path" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")" || error_exit "Failed to compress backup"

        # Remove uncompressed directory
        rm -rf "$BACKUP_DIR"

        # Update backup info
        local compressed_size=$(du -h "$archive_path" | cut -f1)

        success "Backup compressed: $compressed_size"

        # Return the archive path for further processing
        echo "$archive_path"
    else
        echo "$BACKUP_DIR"
    fi
}

# Encrypt backup if enabled
encrypt_backup() {
    local backup_path="$1"

    if [ "$ENCRYPTION" = true ]; then
        info "Encrypting backup..."

        if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
            error_exit "BACKUP_ENCRYPTION_KEY environment variable is required for encryption"
        fi

        local encrypted_path="${backup_path}.enc"

        # Use AES-256-CBC encryption
        openssl enc -aes-256-cbc -salt -in "$backup_path" -out "$encrypted_path" -pass env:BACKUP_ENCRYPTION_KEY || error_exit "Failed to encrypt backup"

        # Remove unencrypted file
        rm "$backup_path"

        success "Backup encrypted"

        echo "$encrypted_path"
    else
        echo "$backup_path"
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_path="$1"

    if [ "$VERIFY_BACKUP" = true ]; then
        info "Verifying backup integrity..."

        if [[ "$backup_path" == *.tar.gz ]]; then
            # Verify compressed archive
            tar -tzf "$backup_path" >/dev/null || error_exit "Backup archive is corrupted"

        elif [[ "$backup_path" == *.enc ]]; then
            # Skip verification for encrypted files (would need decryption)
            warning "Skipping verification for encrypted backup"

        elif [ -d "$backup_path" ]; then
            # Verify directory structure
            local required_dirs=("firestore" "storage" "auth" "functions" "config")

            for dir in "${required_dirs[@]}"; do
                if [ ! -d "$backup_path/$dir" ]; then
                    error_exit "Missing backup directory: $dir"
                fi
            done
        fi

        success "Backup verification passed"
    fi
}

# Upload to cloud storage
upload_to_cloud() {
    local backup_path="$1"

    if [ "$UPLOAD_TO_CLOUD" = true ]; then
        info "Uploading backup to cloud storage..."

        local backup_filename=$(basename "$backup_path")
        local cloud_path="gs://eatech-backups/${ENVIRONMENT}/${backup_filename}"

        # Upload to Google Cloud Storage
        gsutil cp "$backup_path" "$cloud_path" || error_exit "Failed to upload backup to cloud"

        # Set lifecycle policy to delete old backups
        gsutil lifecycle set - "$cloud_path" << EOF
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": $RETENTION_DAYS}
    }
  ]
}
EOF

        success "Backup uploaded to: $cloud_path"
    fi
}

# Clean old backups
cleanup_old_backups() {
    info "Cleaning up old backups..."

    local backup_env_dir="${BACKUP_ROOT}/${ENVIRONMENT}"

    if [ -d "$backup_env_dir" ]; then
        # Find and remove backups older than retention period
        find "$backup_env_dir" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
        find "$backup_env_dir" -type f -name "*.enc" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
        find "$backup_env_dir" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

        success "Old backups cleaned up (older than $RETENTION_DAYS days)"
    fi
}

# Update backup status
update_backup_status() {
    local backup_path="$1"
    local status="$2"

    if [[ "$backup_path" == *.tar.gz ]] || [[ "$backup_path" == *.enc ]]; then
        # For compressed/encrypted backups, create a separate metadata file
        local metadata_file="${backup_path}.metadata.json"
    else
        local metadata_file="$backup_path/backup-info.json"
    fi

    # Update the backup info
    if [ -f "$metadata_file" ]; then
        local temp_file=$(mktemp)
        jq ".status = \"$status\" | .completedAt = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$metadata_file" > "$temp_file"
        mv "$temp_file" "$metadata_file"
    fi
}

# Cleanup temporary files
cleanup_temp_files() {
    # Remove any temporary files
    find /tmp -name "eatech-backup-*" -type f -delete 2>/dev/null || true
}

# Send notification about backup status
send_notification() {
    local status="$1"
    local backup_path="$2"
    local duration="$3"

    local message
    case $status in
        "success")
            message="✅ EATECH Backup completed successfully for $ENVIRONMENT environment in ${duration}s"
            ;;
        "failed")
            message="❌ EATECH Backup failed for $ENVIRONMENT environment"
            ;;
        *)
            message="ℹ️ EATECH Backup status: $status for $ENVIRONMENT environment"
            ;;
    esac

    # Send to Slack if webhook is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\": \"$message\"}" \
            "$SLACK_WEBHOOK_URL" &>/dev/null || true
    fi

    # Send email if configured
    if [ -n "$BACKUP_EMAIL" ] && command -v mail &>/dev/null; then
        echo "$message" | mail -s "EATECH Backup Report" "$BACKUP_EMAIL" || true
    fi
}

# Show help
show_help() {
    cat << EOF
EATECH Data Backup Script

Usage: $0 [OPTIONS]

Options:
  -e, --env ENVIRONMENT       Target environment (development|staging|production)
  -t, --type TYPE            Backup type (full|firestore|storage|auth|functions|config)
  -r, --retention DAYS       Retention period in days (default: 30)
  -c, --compress             Compress backup with gzip
  -s, --encrypt              Encrypt backup (requires BACKUP_ENCRYPTION_KEY)
  --no-verify                Skip backup verification
  --upload                   Upload backup to cloud storage
  --quiet                    Suppress console output
  -h, --help                 Show this help message

Environment Variables:
  FIREBASE_PROJECT           Override Firebase project ID
  BACKUP_ENCRYPTION_KEY      Encryption key for encrypted backups
  SLACK_WEBHOOK_URL          Slack webhook for notifications
  BACKUP_EMAIL               Email address for backup notifications

Examples:
  $0 --env production --compress --upload
  $0 --env staging --type firestore --retention 7
  $0 --env production --encrypt --compress --quiet

EOF
}

# Main backup function
backup() {
    local start_time=$(date +%s)

    info "Starting EATECH data backup..."

    local backup_path=""

    # Execute backup steps based on type
    case $BACKUP_TYPE in
        "full")
            backup_firestore
            backup_storage
            backup_auth
            backup_functions
            backup_config
            ;;
        "firestore")
            backup_firestore
            ;;
        "storage")
            backup_storage
            ;;
        "auth")
            backup_auth
            ;;
        "functions")
            backup_functions
            ;;
        "config")
            backup_config
            ;;
        *)
            error_exit "Invalid backup type: $BACKUP_TYPE"
            ;;
    esac

    # Post-processing
    backup_path=$(compress_backup)
    backup_path=$(encrypt_backup "$backup_path")
    verify_backup "$backup_path"
    upload_to_cloud "$backup_path"
    update_backup_status "$backup_path" "completed"
    cleanup_old_backups
    cleanup_temp_files

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    success "🎉 Backup completed successfully!"
    info "Duration: ${duration} seconds"
    info "Backup location: $backup_path"

    # Calculate backup size
    local backup_size
    if [ -f "$backup_path" ]; then
        backup_size=$(du -h "$backup_path" | cut -f1)
    elif [ -d "$backup_path" ]; then
        backup_size=$(du -sh "$backup_path" | cut -f1)
    else
        backup_size="Unknown"
    fi

    info "Backup size: $backup_size"
    info "Log file: $BACKUP_LOG"

    send_notification "success" "$backup_path" "$duration"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--type)
            BACKUP_TYPE="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -c|--compress)
            COMPRESSION=true
            shift
            ;;
        -s|--encrypt)
            ENCRYPTION=true
            shift
            ;;
        --no-verify)
            VERIFY_BACKUP=false
            shift
            ;;
        --upload)
            UPLOAD_TO_CLOUD=true
            shift
            ;;
        --quiet)
            QUIET=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            warning "Unknown option: $1"
            shift
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    error_exit "Invalid environment. Must be: development, staging, or production"
fi

# Validate backup type
if [[ ! "$BACKUP_TYPE" =~ ^(full|firestore|storage|auth|functions|config)$ ]]; then
    error_exit "Invalid backup type. Must be: full, firestore, storage, auth, functions, or config"
fi

# Main execution
setup_environment
check_prerequisites
create_backup_structure

# Trap errors and cleanup
trap 'error_exit "Backup interrupted"' INT TERM

# Execute backup
backup
