#!/bin/bash
# EATECH Platform Rollback Script
# This script handles rollback to previous versions

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
DEPLOYMENT_LOG="${PROJECT_ROOT}/deployments.log"

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
Usage: $0 [OPTIONS] ENVIRONMENT APP

Rollback EATECH applications to previous version

ENVIRONMENT:
    dev         Development environment
    staging     Staging environment
    prod        Production environment

APP:
    web         Customer-facing web application
    admin       Restaurant admin dashboard
    master      Platform master dashboard
    kitchen     Kitchen display system
    landing     Landing page
    functions   Cloud Functions
    all         Rollback all applications

OPTIONS:
    -h, --help          Show this help message
    -l, --list          List recent deployments
    -v, --version       Specify version to rollback to
    -f, --force         Skip confirmation prompts
    -n, --steps         Number of versions to rollback (default: 1)
    --dry-run           Perform a dry run without actual rollback

EXAMPLES:
    $0 prod web                     Rollback web app in production to previous version
    $0 staging admin -n 2           Rollback admin app by 2 versions
    $0 prod all -v abc123           Rollback all apps to specific version
    $0 -l prod web                  List recent deployments for web app

EOF
    exit 1
}

# Parse arguments
ENVIRONMENT=""
APP=""
VERSION=""
FORCE=false
STEPS=1
LIST_MODE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -l|--list)
            LIST_MODE=true
            shift
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -n|--steps)
            STEPS="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        dev|staging|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        web|admin|master|kitchen|landing|functions|all)
            APP="$1"
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

# Load environment variables
ENV_FILE="${PROJECT_ROOT}/.env.${ENVIRONMENT}"
if [[ -f "$ENV_FILE" ]]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    error "Environment file not found: $ENV_FILE"
    exit 1
fi

# Get deployment history
get_deployment_history() {
    local env=$1
    local app=$2
    local limit=${3:-10}
    
    if [[ ! -f "$DEPLOYMENT_LOG" ]]; then
        error "No deployment history found"
        return 1
    fi
    
    # Filter and parse deployment log
    if [[ "$app" == "all" ]]; then
        jq -r --arg env "$env" \
            'select(.environment == $env and .status == "success") | 
            [.timestamp, .application, .version, .user] | @tsv' \
            "$DEPLOYMENT_LOG" | tail -n "$limit"
    else
        jq -r --arg env "$env" --arg app "$app" \
            'select(.environment == $env and .application == $app and .status == "success") | 
            [.timestamp, .version, .user] | @tsv' \
            "$DEPLOYMENT_LOG" | tail -n "$limit"
    fi
}

# List deployments
list_deployments() {
    log "Recent deployments for $APP in $ENVIRONMENT:"
    echo
    
    if [[ "$APP" == "all" ]]; then
        printf "%-25s %-15s %-12s %-20s\n" "TIMESTAMP" "APPLICATION" "VERSION" "USER"
        printf "%-25s %-15s %-12s %-20s\n" "-------------------------" "---------------" "------------" "--------------------"
    else
        printf "%-25s %-12s %-20s\n" "TIMESTAMP" "VERSION" "USER"
        printf "%-25s %-12s %-20s\n" "-------------------------" "------------" "--------------------"
    fi
    
    get_deployment_history "$ENVIRONMENT" "$APP" 20 | while IFS=$'\t' read -r timestamp app_or_version version_or_user user_or_empty; do
        if [[ "$APP" == "all" ]]; then
            printf "%-25s %-15s %-12s %-20s\n" "$timestamp" "$app_or_version" "$version_or_user" "$user_or_empty"
        else
            printf "%-25s %-12s %-20s\n" "$timestamp" "$app_or_version" "$version_or_user"
        fi
    done
}

# Get previous version
get_previous_version() {
    local env=$1
    local app=$2
    local steps=$3
    
    local versions=($(get_deployment_history "$env" "$app" $((steps + 1)) | awk '{print $2}'))
    
    if [[ ${#versions[@]} -le $steps ]]; then
        error "Not enough deployment history to rollback $steps versions"
        return 1
    fi
    
    echo "${versions[$steps]}"
}

# Rollback Firebase Hosting
rollback_firebase_hosting() {
    local app=$1
    local version=$2
    local target="${app}-${ENVIRONMENT}"
    
    log "Rolling back $app on Firebase Hosting to version $version..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would rollback Firebase Hosting: $target to $version"
        return
    fi
    
    # Firebase doesn't have direct rollback, so we need to redeploy the old version
    cd "$PROJECT_ROOT"
    
    # Checkout the old version
    git checkout "$version" || {
        error "Failed to checkout version $version"
        return 1
    }
    
    # Build the old version
    npm ci
    npm run build:${app} || {
        error "Failed to build version $version"
        git checkout -
        return 1
    }
    
    # Deploy the old version
    firebase deploy \
        --only hosting:$target \
        --project "$FIREBASE_PROJECT_ID" \
        --message "Rollback $app in $ENVIRONMENT to $version" || {
        error "Firebase rollback deployment failed"
        git checkout -
        return 1
    }
    
    # Return to previous branch
    git checkout -
    
    success "Successfully rolled back $app on Firebase Hosting"
}

# Rollback Cloud Functions
rollback_functions() {
    local version=$1
    
    log "Rolling back Cloud Functions to version $version..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would rollback Cloud Functions to $version"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    # Similar to Firebase Hosting, checkout and redeploy
    git checkout "$version" || {
        error "Failed to checkout version $version"
        return 1
    }
    
    # Build and deploy
    npm ci
    npm run build:functions || {
        error "Failed to build functions for version $version"
        git checkout -
        return 1
    }
    
    firebase deploy \
        --only functions \
        --project "$FIREBASE_PROJECT_ID" \
        --message "Rollback functions in $ENVIRONMENT to $version" || {
        error "Functions rollback deployment failed"
        git checkout -
        return 1
    }
    
    git checkout -
    
    success "Successfully rolled back Cloud Functions"
}

# Rollback Kubernetes deployment
rollback_kubernetes() {
    local app=$1
    local version=$2
    
    log "Rolling back $app on Kubernetes..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would rollback Kubernetes deployment: ${app}-deployment"
        return
    fi
    
    # Check if specific version is provided
    if [[ -n "$version" ]]; then
        # Update deployment with specific image version
        kubectl set image \
            deployment/${app}-deployment \
            ${app}="${DOCKER_REGISTRY}/eatech-${app}:${version}" \
            -n eatech-${ENVIRONMENT} || {
            error "Failed to set image for rollback"
            return 1
        }
    else
        # Use kubectl's built-in rollback
        kubectl rollout undo \
            deployment/${app}-deployment \
            -n eatech-${ENVIRONMENT} || {
            error "Kubernetes rollback failed"
            return 1
        }
    fi
    
    # Wait for rollout to complete
    kubectl rollout status \
        deployment/${app}-deployment \
        -n eatech-${ENVIRONMENT} \
        --timeout=300s || {
        error "Kubernetes rollback status check failed"
        return 1
    }
    
    success "Successfully rolled back $app on Kubernetes"
}

# Rollback Cloudflare Workers
rollback_workers() {
    local version=$1
    
    log "Rolling back Cloudflare Workers to version $version..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would rollback Cloudflare Workers to $version"
        return
    fi
    
    cd "${PROJECT_ROOT}/services/workers"
    
    # Checkout old version
    git checkout "$version" || {
        error "Failed to checkout version $version"
        return 1
    }
    
    # Build and deploy
    npm ci
    npm run build || {
        error "Failed to build workers for version $version"
        git checkout -
        return 1
    }
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        wrangler publish --env production || {
            error "Workers rollback deployment failed"
            git checkout -
            return 1
        }
    else
        wrangler publish --env "$ENVIRONMENT" || {
            error "Workers rollback deployment failed"
            git checkout -
            return 1
        }
    fi
    
    git checkout -
    
    success "Successfully rolled back Cloudflare Workers"
}

# Post-rollback tasks
post_rollback() {
    local version=$1
    
    log "Running post-rollback tasks..."
    
    # Clear CDN cache
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        log "Purging Cloudflare cache..."
        curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json" \
            --data '{"purge_everything":true}' || {
            warning "Failed to purge Cloudflare cache"
        }
    fi
    
    # Send rollback notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        log "Sending rollback notification..."
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"⚠️ Rollback Executed\",
                \"attachments\": [{
                    \"color\": \"warning\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Application\", \"value\": \"$APP\", \"short\": true},
                        {\"title\": \"Rolled back to\", \"value\": \"$version\", \"short\": true},
                        {\"title\": \"Initiated by\", \"value\": \"$(git config user.name)\", \"short\": true}
                    ]
                }]
            }" || {
            warning "Failed to send Slack notification"
        }
    fi
    
    # Create rollback record
    echo "{
        \"timestamp\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\",
        \"environment\": \"$ENVIRONMENT\",
        \"application\": \"$APP\",
        \"version\": \"$version\",
        \"user\": \"$(git config user.name)\",
        \"status\": \"rollback\",
        \"type\": \"rollback\"
    }" >> "${PROJECT_ROOT}/deployments.log"
    
    success "Post-rollback tasks completed"
}

# Main rollback logic
main() {
    # List mode
    if [[ "$LIST_MODE" == true ]]; then
        if [[ -z "$APP" ]]; then
            APP="all"
        fi
        list_deployments
        exit 0
    fi
    
    # Validate app argument for rollback
    if [[ -z "$APP" ]]; then
        error "Application must be specified for rollback"
        usage
    fi
    
    log "Starting rollback process..."
    log "Environment: $ENVIRONMENT"
    log "Application: $APP"
    
    if [[ "$DRY_RUN" == true ]]; then
        warning "Running in DRY RUN mode - no actual changes will be made"
    fi
    
    # Determine version to rollback to
    if [[ -z "$VERSION" ]]; then
        # Get previous version based on steps
        if [[ "$APP" == "all" ]]; then
            error "Cannot auto-determine version for 'all' apps. Please specify version with -v"
            exit 1
        fi
        
        VERSION=$(get_previous_version "$ENVIRONMENT" "$APP" "$STEPS")
        if [[ -z "$VERSION" ]]; then
            error "Failed to determine previous version"
            exit 1
        fi
        
        log "Rolling back to version: $VERSION (${STEPS} version(s) back)"
    else
        log "Rolling back to specified version: $VERSION"
    fi
    
    # Confirmation prompt
    if [[ "$FORCE" != true ]] && [[ "$DRY_RUN" != true ]]; then
        warning "You are about to rollback $APP in $ENVIRONMENT to version $VERSION"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Rollback cancelled"
            exit 0
        fi
    fi
    
    # Perform rollback based on app selection
    case $APP in
        web|admin|master|kitchen|landing)
            if [[ "$ENVIRONMENT" == "prod" ]]; then
                rollback_kubernetes "$APP" "$VERSION"
            else
                rollback_firebase_hosting "$APP" "$VERSION"
            fi
            ;;
        functions)
            rollback_functions "$VERSION"
            rollback_workers "$VERSION"
            ;;
        all)
            for app in web admin master kitchen landing; do
                log "Rolling back $app..."
                if [[ "$ENVIRONMENT" == "prod" ]]; then
                    rollback_kubernetes "$app" "$VERSION"
                else
                    rollback_firebase_hosting "$app" "$VERSION"
                fi
            done
            rollback_functions "$VERSION"
            rollback_workers "$VERSION"
            ;;
        *)
            error "Unknown app: $APP"
            exit 1
            ;;
    esac
    
    # Run post-rollback tasks
    if [[ "$DRY_RUN" != true ]]; then
        post_rollback "$VERSION"
    fi
    
    success "Rollback completed successfully!"
    log "Rollback summary:"
    log "  - Environment: $ENVIRONMENT"
    log "  - Application: $APP"
    log "  - Rolled back to: $VERSION"
}

# Run main function
main
