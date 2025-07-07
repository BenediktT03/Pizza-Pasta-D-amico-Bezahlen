#!/bin/bash

# /tools/scripts/restore-data.sh
# EATECH V3.0 - Firebase Data Restore Script
# Comprehensive restore solution for Firestore, Storage, and Auth

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
RESTORE_LOG="${PROJECT_ROOT}/logs/restore_${TIMESTAMP}.log"

# Default values
ENVIRONMENT="staging"
RESTORE_TYPE="full"
BACKUP_ID=""
DRY_RUN=false
FORCE=false
VERIFY_BEFORE_RESTORE=true
CREATE_SAFETY_BACKUP=true
QUIET=false

echo -e "${PURPLE}🍴 EATECH V3.0 - Data Restore Script${NC}"
echo -e "${CYAN}================================================${NC}"

# Logging functions
log() {
    local message="$1"
    local level="${2:-INFO}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    if [ "$QUIET" != "true" ]; then
        echo -e "$message"
    fi

    echo "[$timestamp] [$level] $message" >> "$RESTORE_LOG"
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

    info "Environment: $ENVIRONMENT"
    info "Firebase Project: $FIREBASE_PROJECT"
}

# Check prerequisites
check_prerequisites() {
    info "Checking restore prerequisites..."

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

    # Production safety check
    if [ "$ENVIRONMENT" = "production" ] && [ "$FORCE" != "true" ]; then
        warning "You are about to restore to PRODUCTION environment!"
        read -p "Type 'YES' to confirm: " confirm
        if [ "$confirm" != "YES" ]; then
            error_exit "Restore cancelled by user"
        fi
    fi

    success "Prerequisites check passed"
}

# List available backups
list_backups() {
    info "Available backups for $ENVIRONMENT:"

    local backup_env_dir="${BACKUP_ROOT}/${ENVIRONMENT}"

    if [ ! -d "$backup_env_dir" ]; then
        warning "No backup directory found for $ENVIRONMENT"
        return 1
    fi

    # List directories and compressed files
    local backups=()

    # Find backup directories
    while IFS= read -r -d '' backup_dir; do
        if [ -f "$backup_dir/backup-info.json" ]; then
            backups+=("$(basename "$backup_dir")")
        fi
    done < <(find "$backup_env_dir" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null)

    # Find compressed backups
    while IFS= read -r backup_file; do
        if [[ "$backup_file" == *.tar.gz ]]; then
            local backup_name=$(basename "$backup_file" .tar.gz)
            backups+=("$backup_name")
        fi
    done < <(find "$backup_env_dir" -name "*.tar.gz" 2>/dev/null)

    # Sort backups by date (newest first)
    IFS=$'\n' backups=($(sort -r <<<"${backups[*]}"))
    unset IFS

    if [ ${#backups[@]} -eq 0 ]; then
        warning "No backups found for $ENVIRONMENT"
        return 1
    fi

    printf "%-20s %-10s %-15s %-30s\n" "BACKUP ID" "TYPE" "SIZE" "CREATED"
    printf "%-20s %-10s %-15s %-30s\n" "--------" "----" "----" "-------"

    for backup_id in "${backups[@]}"; do
        local backup_path="$backup_env_dir/$backup_id"
        local compressed_path="$backup_env_dir/${backup_id}.tar.gz"
        local metadata_file=""
        local size="N/A"
        local created="N/A"
        local type="N/A"

        if [ -d "$backup_path" ] && [ -f "$backup_path/backup-info.json" ]; then
            metadata_file="$backup_path/backup-info.json"
            size=$(du -sh "$backup_path" 2>/dev/null | cut -f1 || echo "N/A")
        elif [ -f "$compressed_path" ]; then
            metadata_file="$compressed_path.metadata.json"
            size=$(du -sh "$compressed_path" 2>/dev/null | cut -f1 || echo "N/A")
            if [ ! -f "$metadata_file" ]; then
                # Try to extract metadata from archive
                metadata_file="/tmp/backup-info-$$.json"
                tar -xzf "$compressed_path" -O "*/backup-info.json" > "$metadata_file" 2>/dev/null || touch "$metadata_file"
            fi
        fi

        if [ -f "$metadata_file" ] && [ -s "$metadata_file" ]; then
            type=$(jq -r '.type // "N/A"' "$metadata_file" 2>/dev/null || echo "N/A")
            created=$(jq -r '.timestamp // "N/A"' "$metadata_file" 2>/dev/null || echo "N/A")

            # Format date for better readability
            if [ "$created" != "N/A" ]; then
                created=$(date -d "$created" '+%Y-%m-%d %H:%M' 2>/dev/null || echo "$created")
            fi
        fi

        printf "%-20s %-10s %-15s %-30s\n" "$backup_id" "$type" "$size" "$created"

        # Cleanup temp metadata file
        if [[ "$metadata_file" == /tmp/* ]]; then
            rm -f "$metadata_file"
        fi
    done

    echo ""
}

# Find and prepare backup
prepare_backup() {
    if [ -z "$BACKUP_ID" ]; then
        list_backups
        read -p "Enter backup ID to restore: " BACKUP_ID
    fi

    if [ -z "$BACKUP_ID" ]; then
        error_exit "No backup ID specified"
    fi

    local backup_env_dir="${BACKUP_ROOT}/${ENVIRONMENT}"
    local backup_dir="$backup_env_dir/$BACKUP_ID"
    local compressed_backup="$backup_env_dir/${BACKUP_ID}.tar.gz"
    local encrypted_backup="$backup_env_dir/${BACKUP_ID}.tar.gz.enc"

    # Check if backup exists and determine format
    if [ -d "$backup_dir" ]; then
        BACKUP_PATH="$backup_dir"
        BACKUP_FORMAT="directory"
        info "Found backup directory: $BACKUP_PATH"

    elif [ -f "$compressed_backup" ]; then
        BACKUP_PATH="$compressed_backup"
        BACKUP_FORMAT="compressed"
        info "Found compressed backup: $BACKUP_PATH"

    elif [ -f "$encrypted_backup" ]; then
        BACKUP_PATH="$encrypted_backup"
        BACKUP_FORMAT="encrypted"
        info "Found encrypted backup: $BACKUP_PATH"

    else
        error_exit "Backup not found: $BACKUP_ID"
    fi

    # Extract if needed
    if [ "$BACKUP_FORMAT" = "encrypted" ]; then
        extract_encrypted_backup
    elif [ "$BACKUP_FORMAT" = "compressed" ]; then
        extract_compressed_backup
    fi
}

# Extract encrypted backup
extract_encrypted_backup() {
    info "Extracting encrypted backup..."

    if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
        error_exit "BACKUP_ENCRYPTION_KEY environment variable is required for encrypted backups"
    fi

    local temp_dir="/tmp/eatech-restore-$$"
    local decrypted_file="$temp_dir/backup.tar.gz"

    mkdir -p "$temp_dir"

    # Decrypt backup
    openssl enc -aes-256-cbc -d -in "$BACKUP_PATH" -out "$decrypted_file" -pass env:BACKUP_ENCRYPTION_KEY || error_exit "Failed to decrypt backup"

    # Extract compressed backup
    tar -xzf "$decrypted_file" -C "$temp_dir" || error_exit "Failed to extract decrypted backup"

    # Find extracted directory
    local extracted_dir=$(find "$temp_dir" -mindepth 1 -maxdepth 1 -type d | head -n1)

    if [ -z "$extracted_dir" ]; then
        error_exit "No directory found in extracted backup"
    fi

    BACKUP_PATH="$extracted_dir"
    BACKUP_FORMAT="directory"

    success "Encrypted backup extracted to: $BACKUP_PATH"
}

# Extract compressed backup
extract_compressed_backup() {
    info "Extracting compressed backup..."

    local temp_dir="/tmp/eatech-restore-$$"
    mkdir -p "$temp_dir"

    # Extract compressed backup
    tar -xzf "$BACKUP_PATH" -C "$temp_dir" || error_exit "Failed to extract compressed backup"

    # Find extracted directory
    local extracted_dir=$(find "$temp_dir" -mindepth 1 -maxdepth 1 -type d | head -n1)

    if [ -z "$extracted_dir" ]; then
        error_exit "No directory found in extracted backup"
    fi

    BACKUP_PATH="$extracted_dir"
    BACKUP_FORMAT="directory"

    success "Compressed backup extracted to: $BACKUP_PATH"
}

# Verify backup integrity
verify_backup() {
    if [ "$VERIFY_BEFORE_RESTORE" = true ]; then
        info "Verifying backup integrity..."

        # Check backup structure
        local required_dirs=()

        case $RESTORE_TYPE in
            "full")
                required_dirs=("firestore" "storage" "auth" "functions" "config")
                ;;
            "firestore")
                required_dirs=("firestore")
                ;;
            "storage")
                required_dirs=("storage")
                ;;
            "auth")
                required_dirs=("auth")
                ;;
            "functions")
                required_dirs=("functions")
                ;;
            "config")
                required_dirs=("config")
                ;;
        esac

        for dir in "${required_dirs[@]}"; do
            if [ ! -d "$BACKUP_PATH/$dir" ]; then
                error_exit "Missing backup component: $dir"
            fi
        done

        # Verify backup metadata
        if [ -f "$BACKUP_PATH/backup-info.json" ]; then
            local backup_status=$(jq -r '.status // "unknown"' "$BACKUP_PATH/backup-info.json")
            if [ "$backup_status" != "completed" ]; then
                warning "Backup status is: $backup_status"
                if [ "$FORCE" != "true" ]; then
                    read -p "Continue anyway? (y/N): " confirm
                    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
                        error_exit "Restore cancelled due to backup status"
                    fi
                fi
            fi
        fi

        success "Backup verification passed"
    fi
}

# Create safety backup before restore
create_safety_backup() {
    if [ "$CREATE_SAFETY_BACKUP" = true ] && [ "$DRY_RUN" != "true" ]; then
        info "Creating safety backup before restore..."

        local safety_backup_script="${PROJECT_ROOT}/tools/scripts/backup-data.sh"

        if [ -f "$safety_backup_script" ]; then
            bash "$safety_backup_script" \
                --env "$ENVIRONMENT" \
                --type "$RESTORE_TYPE" \
                --compress \
                --quiet || warning "Safety backup failed, but continuing with restore"
        else
            warning "Safety backup script not found, skipping safety backup"
        fi
    fi
}

# Restore Firestore data
restore_firestore() {
    info "Restoring Firestore data..."

    local firestore_dir="$BACKUP_PATH/firestore"

    if [ ! -d "$firestore_dir" ]; then
        warning "Firestore backup not found, skipping..."
        return 0
    fi

    # Set Firebase project
    firebase use "$FIREBASE_PROJECT" || error_exit "Failed to set Firebase project"

    if [ "$DRY_RUN" = true ]; then
        info "DRY RUN: Would restore Firestore collections from $firestore_dir"
        find "$firestore_dir" -name "*.json" -type f | while read -r file; do
            info "Would restore: $(basename "$file" .json)"
        done
        return 0
    fi

    # Restore main collections
    local collections=("tenants" "users" "masterUsers" "systemConfig" "platformAnalytics")

    for collection in "${collections[@]}"; do
        local collection_file="$firestore_dir/${collection}.json"

        if [ -f "$collection_file" ]; then
            info "Restoring collection: $collection"

            # Use Firebase Admin SDK for import
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

            async function importCollection() {
                try {
                    const data = JSON.parse(fs.readFileSync('$collection_file', 'utf8'));
                    const batch = db.batch();
                    let count = 0;

                    for (const [docId, docData] of Object.entries(data)) {
                        const docRef = db.collection('$collection').doc(docId);
                        batch.set(docRef, docData);
                        count++;

                        // Commit in batches of 500 (Firestore limit)
                        if (count % 500 === 0) {
                            await batch.commit();
                            batch = db.batch();
                        }
                    }

                    // Commit remaining documents
                    if (count % 500 !== 0) {
                        await batch.commit();
                    }

                    console.log('Restored $collection: ' + count + ' documents');
                } catch (error) {
                    console.error('Error restoring $collection:', error);
                    process.exit(1);
                }
            }

            importCollection();
            " || error_exit "Failed to restore collection: $collection"
        else
            warning "Collection file not found: $collection"
        fi
    done

    # Restore tenant-specific collections
    local tenants_dir="$firestore_dir/tenants"

    if [ -d "$tenants_dir" ]; then
        info "Restoring tenant-specific collections..."

        for tenant_dir in "$tenants_dir"/*; do
            if [ -d "$tenant_dir" ]; then
                local tenant_id=$(basename "$tenant_dir")
                info "Restoring data for tenant: $tenant_id"

                local tenant_collections=("products" "orders" "customers" "events" "analytics")

                for collection in "${tenant_collections[@]}"; do
                    local collection_file="$tenant_dir/${collection}.json"

                    if [ -f "$collection_file" ]; then
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

                        async function importTenantCollection() {
                            try {
                                const data = JSON.parse(fs.readFileSync('$collection_file', 'utf8'));
                                const batch = db.batch();
                                let count = 0;

                                for (const [docId, docData] of Object.entries(data)) {
                                    const docRef = db.collection('tenants/$tenant_id/$collection').doc(docId);
                                    batch.set(docRef, docData);
                                    count++;

                                    if (count % 500 === 0) {
                                        await batch.commit();
                                        batch = db.batch();
                                    }
                                }

                                if (count % 500 !== 0) {
                                    await batch.commit();
                                }

                                console.log('Restored $tenant_id/$collection: ' + count + ' documents');
                            } catch (error) {
                                console.error('Error restoring $tenant_id/$collection:', error);
                            }
                        }

                        importTenantCollection();
                        " || warning "Failed to restore $tenant_id/$collection"
                    fi
                done
            fi
        done
    fi

    # Restore security rules
    if [ -f "$firestore_dir/firestore.rules" ]; then
        info "Restoring Firestore security rules..."
        cp "$firestore_dir/firestore.rules" "$PROJECT_ROOT/"
        firebase deploy --only firestore:rules --project="$FIREBASE_PROJECT" || warning "Failed to deploy Firestore rules"
    fi

    success "Firestore restore completed"
}

# Restore Firebase Storage
restore_storage() {
    info "Restoring Firebase Storage..."

    local storage_dir="$BACKUP_PATH/storage"

    if [ ! -d "$storage_dir" ]; then
        warning "Storage backup not found, skipping..."
        return 0
    fi

    if [ "$DRY_RUN" = true ]; then
        info "DRY RUN: Would restore Storage files from $storage_dir"
        if [ -d "$storage_dir/bucket" ]; then
            find "$storage_dir/bucket" -type f | wc -l | xargs echo "Would restore files:"
        fi
        return 0
    fi

    # Restore files to storage bucket
    if [ -d "$storage_dir/bucket" ]; then
        info "Restoring files to storage bucket: gs://$STORAGE_BUCKET"

        gsutil -m rsync -r -d "$storage_dir/bucket/" "gs://$STORAGE_BUCKET/" || warning "Storage restore completed with some errors"
    fi

    # Restore security rules
    if [ -f "$storage_dir/storage.rules" ]; then
        info "Restoring Storage security rules..."
        cp "$storage_dir/storage.rules" "$PROJECT_ROOT/"
        firebase deploy --only storage --project="$FIREBASE_PROJECT" || warning "Failed to deploy Storage rules"
    fi

    success "Storage restore completed"
}

# Restore Firebase Authentication
restore_auth() {
    info "Restoring Firebase Authentication..."

    local auth_dir="$BACKUP_PATH/auth"

    if [ ! -d "$auth_dir" ]; then
        warning "Auth backup not found, skipping..."
        return 0
    fi

    if [ "$DRY_RUN" = true ]; then
        info "DRY RUN: Would restore Auth users from $auth_dir"
        if [ -f "$auth_dir/users.json" ]; then
            jq '. | length' "$auth_dir/users.json" | xargs echo "Would restore users:"
        fi
        return 0
    fi

    # Restore user accounts
    if [ -f "$auth_dir/users.json" ]; then
        info "Restoring user accounts..."

        node -e "
        const admin = require('firebase-admin');
        const fs = require('fs');

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: '$FIREBASE_PROJECT'
            });
        }

        async function importUsers() {
            try {
                const users = JSON.parse(fs.readFileSync('$auth_dir/users.json', 'utf8'));
                const auth = admin.auth();

                // Import users in batches
                const batchSize = 1000;
                let imported = 0;

                for (let i = 0; i < users.length; i += batchSize) {
                    const batch = users.slice(i, i + batchSize);

                    try {
                        const result = await auth.importUsers(batch);
                        imported += result.successCount;

                        if (result.failureCount > 0) {
                            console.log('Some users failed to import:', result.failureCount);
                        }
                    } catch (error) {
                        console.error('Batch import error:', error);
                    }
                }

                console.log('Imported ' + imported + ' user accounts');
            } catch (error) {
                console.error('Error importing users:', error);
                process.exit(1);
            }
        }

        importUsers();
        " || warning "Failed to restore user accounts"
    fi

    success "Authentication restore completed"
}

# Restore Firebase Functions
restore_functions() {
    info "Restoring Firebase Functions..."

    local functions_dir="$BACKUP_PATH/functions"

    if [ ! -d "$functions_dir" ]; then
        warning "Functions backup not found, skipping..."
        return 0
    fi

    if [ "$DRY_RUN" = true ]; then
        info "DRY RUN: Would restore Functions from $functions_dir"
        return 0
    fi

    # Restore function source code
    if [ -d "$functions_dir/source" ]; then
        info "Restoring function source code..."

        # Backup current functions
        if [ -d "$PROJECT_ROOT/functions" ]; then
            mv "$PROJECT_ROOT/functions" "$PROJECT_ROOT/functions.backup.$(date +%s)"
        fi

        # Copy restored functions
        cp -r "$functions_dir/source" "$PROJECT_ROOT/functions"

        # Install dependencies and deploy
        cd "$PROJECT_ROOT/functions"
        npm install || warning "Failed to install function dependencies"

        # Deploy functions
        firebase deploy --only functions --project="$FIREBASE_PROJECT" || warning "Failed to deploy functions"

        cd "$PROJECT_ROOT"
    fi

    success "Functions restore completed"
}

# Restore project configuration
restore_config() {
    info "Restoring project configuration..."

    local config_dir="$BACKUP_PATH/config"

    if [ ! -d "$config_dir" ]; then
        warning "Config backup not found, skipping..."
        return 0
    fi

    if [ "$DRY_RUN" = true ]; then
        info "DRY RUN: Would restore configuration files from $config_dir"
        find "$config_dir" -type f | while read -r file; do
            info "Would restore: $(basename "$file")"
        done
        return 0
    fi

    # Restore config files
    local config_files=(
        "firebase.json"
        "firestore.rules"
        "firestore.indexes.json"
        "storage.rules"
    )

    for file in "${config_files[@]}"; do
        if [ -f "$config_dir/$file" ]; then
            info "Restoring: $file"
            cp "$config_dir/$file" "$PROJECT_ROOT/"
        fi
    done

    success "Configuration restore completed"
}

# Cleanup temporary files
cleanup_temp_files() {
    # Remove temporary extraction directories
    find /tmp -name "eatech-restore-*" -type d -exec rm -rf {} + 2>/dev/null || true
    find /tmp -name "backup-info-*.json" -type f -delete 2>/dev/null || true
}

# Send notification about restore status
send_notification() {
    local status="$1"
    local duration="$2"

    local message
    case $status in
        "success")
            message="✅ EATECH Restore completed successfully for $ENVIRONMENT environment (Backup: $BACKUP_ID) in ${duration}s"
            ;;
        "failed")
            message="❌ EATECH Restore failed for $ENVIRONMENT environment (Backup: $BACKUP_ID)"
            ;;
        *)
            message="ℹ️ EATECH Restore status: $status for $ENVIRONMENT environment"
            ;;
    esac

    # Send to Slack if webhook is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\": \"$message\"}" \
            "$SLACK_WEBHOOK_URL" &>/dev/null || true
    fi
}

# Show help
show_help() {
    cat << EOF
EATECH Data Restore Script

Usage: $0 [OPTIONS]

Options:
  -e, --env ENVIRONMENT       Target environment (development|staging|production)
  -t, --type TYPE            Restore type (full|firestore|storage|auth|functions|config)
  -b, --backup-id ID         Backup ID to restore
  --list                     List available backups
  --dry-run                  Show what would be restored without actually restoring
  --force                    Skip safety prompts
  --no-verify                Skip backup verification
  --no-safety-backup         Skip creating safety backup before restore
  --quiet                    Suppress console output
  -h, --help                 Show this help message

Environment Variables:
  BACKUP_ENCRYPTION_KEY      Encryption key for encrypted backups
  SLACK_WEBHOOK_URL          Slack webhook for notifications

Examples:
  $0 --list --env production
  $0 --env staging --backup-id 20250107_143022 --dry-run
  $0 --env development --type firestore --backup-id 20250107_143022
  $0 --env production --backup-id 20250107_143022 --force

EOF
}

# Main restore function
restore() {
    local start_time=$(date +%s)

    info "Starting EATECH data restore..."
    info "Backup ID: $BACKUP_ID"
    info "Restore type: $RESTORE_TYPE"

    if [ "$DRY_RUN" = true ]; then
        warning "DRY RUN MODE - No actual changes will be made"
    fi

    # Execute restore steps based on type
    case $RESTORE_TYPE in
        "full")
            restore_firestore
            restore_storage
            restore_auth
            restore_functions
            restore_config
            ;;
        "firestore")
            restore_firestore
            ;;
        "storage")
            restore_storage
            ;;
        "auth")
            restore_auth
            ;;
        "functions")
            restore_functions
            ;;
        "config")
            restore_config
            ;;
        *)
            error_exit "Invalid restore type: $RESTORE_TYPE"
            ;;
    esac

    cleanup_temp_files

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [ "$DRY_RUN" = true ]; then
        success "🔍 Dry run completed successfully!"
        info "No actual changes were made"
    else
        success "🎉 Restore completed successfully!"
    fi

    info "Duration: ${duration} seconds"
    info "Log file: $RESTORE_LOG"

    if [ "$DRY_RUN" != "true" ]; then
        send_notification "success" "$duration"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--type)
            RESTORE_TYPE="$2"
            shift 2
            ;;
        -b|--backup-id)
            BACKUP_ID="$2"
            shift 2
            ;;
        --list)
            setup_environment
            list_backups
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --no-verify)
            VERIFY_BEFORE_RESTORE=false
            shift
            ;;
        --no-safety-backup)
            CREATE_SAFETY_BACKUP=false
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

# Validate restore type
if [[ ! "$RESTORE_TYPE" =~ ^(full|firestore|storage|auth|functions|config)$ ]]; then
    error_exit "Invalid restore type. Must be: full, firestore, storage, auth, functions, or config"
fi

# Create logs directory
mkdir -p "${PROJECT_ROOT}/logs"

# Main execution
setup_environment
check_prerequisites
prepare_backup
verify_backup
create_safety_backup

# Trap errors and cleanup
trap 'error_exit "Restore interrupted"' INT TERM

# Execute restore
restore
