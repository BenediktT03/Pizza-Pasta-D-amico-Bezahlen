#!/bin/bash

# /tools/scripts/deploy.sh
# EATECH V3.0 - Automated Deployment Script
# Multi-environment deployment with rollback support

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_LOG="${PROJECT_ROOT}/deploy.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Default values
ENVIRONMENT="staging"
FORCE_DEPLOY=false
SKIP_BACKUP=false
SKIP_TESTS=false
DRY_RUN=false
ROLLBACK_ID=""

echo -e "${PURPLE}🍴 EATECH V3.0 - Deployment Script${NC}"
echo -e "${CYAN}================================================${NC}"

# Logging functions
log() {
    echo -e "$1" | tee -a "${DEPLOY_LOG}"
}

error_exit() {
    log "${RED}❌ Error: $1${NC}"
    send_notification "error" "Deployment failed: $1"
    exit 1
}

success() {
    log "${GREEN}✅ $1${NC}"
}

warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Environment configuration
setup_environment() {
    case $ENVIRONMENT in
        "production")
            VERCEL_PROJECT="eatech-web-prod"
            FIREBASE_PROJECT="eatech-prod"
            DOMAIN="app.eatech.ch"
            ADMIN_DOMAIN="admin.eatech.ch"
            MASTER_DOMAIN="master.eatech.ch"
            ;;
        "staging")
            VERCEL_PROJECT="eatech-web-staging"
            FIREBASE_PROJECT="eatech-staging"
            DOMAIN="staging.eatech.ch"
            ADMIN_DOMAIN="admin-staging.eatech.ch"
            MASTER_DOMAIN="master-staging.eatech.ch"
            ;;
        "development")
            VERCEL_PROJECT="eatech-web-dev"
            FIREBASE_PROJECT="eatech-dev"
            DOMAIN="dev.eatech.ch"
            ADMIN_DOMAIN="admin-dev.eatech.ch"
            MASTER_DOMAIN="master-dev.eatech.ch"
            ;;
        *)
            error_exit "Invalid environment: $ENVIRONMENT"
            ;;
    esac

    info "Environment: ${ENVIRONMENT}"
    info "Firebase Project: ${FIREBASE_PROJECT}"
    info "Domain: ${DOMAIN}"
}

# Check prerequisites
check_prerequisites() {
    info "Checking deployment prerequisites..."

    # Check required tools
    local required_tools=("node" "npm" "git" "vercel" "firebase")

    for tool in "${required_tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            error_exit "$tool is not installed or not in PATH"
        fi
    done

    # Check authentication
    if ! vercel whoami &> /dev/null; then
        error_exit "Not authenticated with Vercel. Run 'vercel login'"
    fi

    if ! firebase projects:list &> /dev/null; then
        error_exit "Not authenticated with Firebase. Run 'firebase login'"
    fi

    # Check Git status
    if ! git diff --quiet HEAD; then
        if [ "$FORCE_DEPLOY" = false ]; then
            error_exit "Working directory is dirty. Commit or stash changes, or use --force"
        else
            warning "Deploying with uncommitted changes"
        fi
    fi

    # Check if on correct branch for production
    if [ "$ENVIRONMENT" = "production" ]; then
        current_branch=$(git rev-parse --abbrev-ref HEAD)
        if [ "$current_branch" != "main" ] && [ "$FORCE_DEPLOY" = false ]; then
            error_exit "Production deployments must be from 'main' branch. Current: $current_branch"
        fi
    fi

    success "Prerequisites check passed"
}

# Send notifications
send_notification() {
    local type=$1
    local message=$2

    # Slack notification (if webhook is configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        local icon=":white_check_mark:"

        case $type in
            "error")
                color="danger"
                icon=":x:"
                ;;
            "warning")
                color="warning"
                icon=":warning:"
                ;;
            "info")
                color="good"
                icon=":information_source:"
                ;;
        esac

        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"text\": \"$icon EATECH Deployment - $ENVIRONMENT\n$message\",
                    \"fields\": [{
                        \"title\": \"Environment\",
                        \"value\": \"$ENVIRONMENT\",
                        \"short\": true
                    }, {
                        \"title\": \"Timestamp\",
                        \"value\": \"$(date)\",
                        \"short\": true
                    }]
                }]
            }" \
            "$SLACK_WEBHOOK_URL" &> /dev/null || warning "Failed to send Slack notification"
    fi

    # Discord notification (if webhook is configured)
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        local color=65280  # Green

        case $type in
            "error")
                color=16711680  # Red
                ;;
            "warning")
                color=16776960  # Yellow
                ;;
        esac

        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"embeds\": [{
                    \"title\": \"EATECH Deployment - $ENVIRONMENT\",
                    \"description\": \"$message\",
                    \"color\": $color,
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                    \"fields\": [{
                        \"name\": \"Environment\",
                        \"value\": \"$ENVIRONMENT\",
                        \"inline\": true
                    }]
                }]
            }" \
            "$DISCORD_WEBHOOK_URL" &> /dev/null || warning "Failed to send Discord notification"
    fi
}

# Create deployment backup
create_backup() {
    if [ "$SKIP_BACKUP" = true ]; then
        warning "Skipping backup creation"
        return 0
    fi

    info "Creating deployment backup..."

    # Create backup directory
    local backup_dir="${PROJECT_ROOT}/backups/${ENVIRONMENT}/${TIMESTAMP}"
    mkdir -p "$backup_dir"

    # Backup current deployment info
    if [ "$ENVIRONMENT" = "production" ]; then
        # Get current Vercel deployment
        vercel ls --scope=eatech > "$backup_dir/vercel-deployments.txt" 2>/dev/null || warning "Failed to backup Vercel info"

        # Backup Firebase project info
        firebase projects:list > "$backup_dir/firebase-projects.txt" 2>/dev/null || warning "Failed to backup Firebase info"

        # Backup database (if applicable)
        if command -v mongodump &> /dev/null && [ -n "$MONGODB_URI" ]; then
            mongodump --uri="$MONGODB_URI" --out="$backup_dir/database" || warning "Database backup failed"
        fi
    fi

    # Create backup metadata
    cat > "$backup_dir/backup-info.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "gitCommit": "$(git rev-parse HEAD)",
    "gitBranch": "$(git rev-parse --abbrev-ref HEAD)",
    "backupId": "$TIMESTAMP",
    "createdBy": "$(whoami)"
}
EOF

    echo "$TIMESTAMP" > "${PROJECT_ROOT}/.last-backup-${ENVIRONMENT}"

    success "Backup created: $backup_dir"
}

# Run pre-deployment tests
run_pre_deploy_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        warning "Skipping pre-deployment tests"
        return 0
    fi

    info "Running pre-deployment tests..."

    cd "$PROJECT_ROOT"

    # Run unit tests
    npm run test:ci || error_exit "Unit tests failed"

    # Run integration tests
    if [ -f "package.json" ] && npm run | grep -q "test:integration"; then
        npm run test:integration || error_exit "Integration tests failed"
    fi

    # Run E2E tests for staging/production
    if [ "$ENVIRONMENT" != "development" ]; then
        if [ -f "package.json" ] && npm run | grep -q "test:e2e"; then
            npm run test:e2e || error_exit "E2E tests failed"
        fi
    fi

    # Security audit
    npm audit --audit-level moderate || warning "Security audit found issues"

    success "Pre-deployment tests passed"
}

# Build applications
build_for_deployment() {
    info "Building applications for deployment..."

    # Use the build-all script
    if [ -f "${PROJECT_ROOT}/tools/scripts/build-all.sh" ]; then
        bash "${PROJECT_ROOT}/tools/scripts/build-all.sh" --skip-tests || error_exit "Build failed"
    else
        error_exit "Build script not found"
    fi

    success "Build completed"
}

# Deploy to Vercel
deploy_vercel() {
    info "Deploying to Vercel..."

    local vercel_args="--prod"

    if [ "$DRY_RUN" = true ]; then
        vercel_args="--confirm=false"
        info "DRY RUN: Would deploy to Vercel with: vercel $vercel_args"
        return 0
    fi

    # Deploy each app
    local apps=("web" "admin" "master" "landing")

    for app in "${apps[@]}"; do
        if [ -d "${PROJECT_ROOT}/apps/${app}" ]; then
            info "Deploying ${app} to Vercel..."

            cd "${PROJECT_ROOT}/apps/${app}"

            # Set environment variables for deployment
            export VERCEL_ORG_ID="$VERCEL_ORG_ID"
            export VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID_$(echo $app | tr '[:lower:]' '[:upper:]')}"

            # Deploy
            vercel $vercel_args --token="$VERCEL_TOKEN" || error_exit "Failed to deploy $app to Vercel"

            success "Deployed $app to Vercel"
        else
            warning "App $app not found, skipping Vercel deployment"
        fi
    done

    cd "$PROJECT_ROOT"
}

# Deploy Firebase Functions
deploy_firebase() {
    info "Deploying to Firebase..."

    if [ "$DRY_RUN" = true ]; then
        info "DRY RUN: Would deploy to Firebase project $FIREBASE_PROJECT"
        return 0
    fi

    # Set Firebase project
    firebase use "$FIREBASE_PROJECT" || error_exit "Failed to set Firebase project"

    # Deploy functions
    if [ -d "${PROJECT_ROOT}/functions" ]; then
        firebase deploy --only functions --project="$FIREBASE_PROJECT" || error_exit "Failed to deploy Firebase Functions"
        success "Deployed Firebase Functions"
    fi

    # Deploy Firestore rules
    if [ -f "${PROJECT_ROOT}/firestore.rules" ]; then
        firebase deploy --only firestore:rules --project="$FIREBASE_PROJECT" || error_exit "Failed to deploy Firestore rules"
        success "Deployed Firestore rules"
    fi

    # Deploy Firebase Hosting (if configured)
    if [ -f "${PROJECT_ROOT}/firebase.json" ] && grep -q "hosting" "${PROJECT_ROOT}/firebase.json"; then
        firebase deploy --only hosting --project="$FIREBASE_PROJECT" || error_exit "Failed to deploy Firebase Hosting"
        success "Deployed Firebase Hosting"
    fi
}

# Update CDN and caches
update_cdn() {
    info "Updating CDN and clearing caches..."

    if [ "$DRY_RUN" = true ]; then
        info "DRY RUN: Would update CDN and clear caches"
        return 0
    fi

    # Cloudflare cache purge
    if [ -n "$CLOUDFLARE_API_TOKEN" ] && [ -n "$CLOUDFLARE_ZONE_ID" ]; then
        curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data '{"purge_everything":true}' || warning "Failed to purge Cloudflare cache"

        success "Purged Cloudflare cache"
    fi

    # Invalidate other CDNs if configured
    if [ -n "$AWS_CLOUDFRONT_DISTRIBUTION_ID" ]; then
        aws cloudfront create-invalidation \
            --distribution-id "$AWS_CLOUDFRONT_DISTRIBUTION_ID" \
            --paths "/*" || warning "Failed to invalidate CloudFront"
    fi
}

# Run post-deployment checks
run_post_deploy_checks() {
    info "Running post-deployment checks..."

    # Health check endpoints
    local endpoints=(
        "https://${DOMAIN}/api/health"
        "https://${ADMIN_DOMAIN}/api/health"
        "https://${MASTER_DOMAIN}/api/health"
    )

    for endpoint in "${endpoints[@]}"; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" || echo "000")

        if [ "$response" = "200" ]; then
            success "Health check passed: $endpoint"
        else
            error_exit "Health check failed: $endpoint (HTTP $response)"
        fi
    done

    # Performance check
    if command -v lighthouse &> /dev/null; then
        lighthouse "https://${DOMAIN}" --only-categories=performance --chrome-flags="--headless" --output=json --output-path="/tmp/lighthouse-${TIMESTAMP}.json" || warning "Lighthouse check failed"
    fi

    success "Post-deployment checks passed"
}

# Rollback deployment
rollback_deployment() {
    if [ -z "$ROLLBACK_ID" ]; then
        error_exit "Rollback ID not specified"
    fi

    info "Rolling back to deployment: $ROLLBACK_ID"

    local backup_dir="${PROJECT_ROOT}/backups/${ENVIRONMENT}/${ROLLBACK_ID}"

    if [ ! -d "$backup_dir" ]; then
        error_exit "Backup not found: $backup_dir"
    fi

    # Read backup info
    if [ -f "$backup_dir/backup-info.json" ]; then
        local git_commit=$(jq -r '.gitCommit' "$backup_dir/backup-info.json")

        if [ "$git_commit" != "null" ]; then
            info "Checking out commit: $git_commit"
            git checkout "$git_commit" || error_exit "Failed to checkout commit"
        fi
    fi

    # Redeploy
    build_for_deployment
    deploy_vercel
    deploy_firebase
    update_cdn
    run_post_deploy_checks

    success "Rollback completed"
    send_notification "info" "Rollback to $ROLLBACK_ID completed successfully"
}

# Update deployment status
update_deployment_status() {
    local status=$1
    local deployment_id="${TIMESTAMP}"

    # Create deployment record
    cat > "${PROJECT_ROOT}/deployments/${ENVIRONMENT}-${deployment_id}.json" << EOF
{
    "id": "$deployment_id",
    "environment": "$ENVIRONMENT",
    "status": "$status",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "gitCommit": "$(git rev-parse HEAD)",
    "gitBranch": "$(git rev-parse --abbrev-ref HEAD)",
    "deployedBy": "$(whoami)",
    "version": "$(cat package.json | jq -r '.version')",
    "buildTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    # Update current deployment pointer
    echo "$deployment_id" > "${PROJECT_ROOT}/.current-deployment-${ENVIRONMENT}"
}

# Main deployment function
deploy() {
    local start_time=$(date +%s)

    info "Starting deployment to $ENVIRONMENT..."
    send_notification "info" "Deployment started"

    update_deployment_status "in_progress"

    check_prerequisites
    create_backup
    run_pre_deploy_tests
    build_for_deployment
    deploy_vercel
    deploy_firebase
    update_cdn
    run_post_deploy_checks

    update_deployment_status "completed"

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    success "🎉 Deployment completed successfully!"
    info "Deployment time: ${duration} seconds"
    info "Environment: $ENVIRONMENT"
    info "Deployment ID: $TIMESTAMP"

    send_notification "info" "Deployment completed successfully in ${duration}s"
}

# Show help
show_help() {
    cat << EOF
EATECH Deployment Script

Usage: $0 [OPTIONS] COMMAND

Commands:
  deploy          Deploy to specified environment (default)
  rollback        Rollback to previous deployment
  status          Show deployment status
  list            List recent deployments

Options:
  -e, --env ENVIRONMENT    Target environment (development|staging|production)
  -f, --force             Force deployment even with uncommitted changes
  --skip-backup           Skip creating backup
  --skip-tests            Skip running tests
  --dry-run               Show what would be deployed without actually deploying
  --rollback-id ID        Rollback to specific deployment ID
  -h, --help              Show this help message

Environment Variables:
  VERCEL_TOKEN            Vercel authentication token
  VERCEL_ORG_ID          Vercel organization ID
  FIREBASE_TOKEN         Firebase authentication token
  SLACK_WEBHOOK_URL      Slack notification webhook
  DISCORD_WEBHOOK_URL    Discord notification webhook
  CLOUDFLARE_API_TOKEN   Cloudflare API token
  CLOUDFLARE_ZONE_ID     Cloudflare zone ID

Examples:
  $0 deploy --env production
  $0 rollback --env staging --rollback-id 20250107_143022
  $0 deploy --env staging --dry-run
  $0 deploy --env development --skip-tests --force

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_DEPLOY=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --rollback-id)
            ROLLBACK_ID="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        deploy)
            COMMAND="deploy"
            shift
            ;;
        rollback)
            COMMAND="rollback"
            shift
            ;;
        status)
            COMMAND="status"
            shift
            ;;
        list)
            COMMAND="list"
            shift
            ;;
        *)
            warning "Unknown option: $1"
            shift
            ;;
    esac
done

# Default command
COMMAND=${COMMAND:-deploy}

# Create required directories
mkdir -p "${PROJECT_ROOT}/backups"
mkdir -p "${PROJECT_ROOT}/deployments"
mkdir -p "${PROJECT_ROOT}/logs"

# Setup environment
setup_environment

# Execute command
case $COMMAND in
    "deploy")
        if [ -n "$ROLLBACK_ID" ]; then
            rollback_deployment
        else
            deploy
        fi
        ;;
    "rollback")
        if [ -z "$ROLLBACK_ID" ]; then
            echo "Available backups for $ENVIRONMENT:"
            ls -la "${PROJECT_ROOT}/backups/${ENVIRONMENT}/" 2>/dev/null || echo "No backups found"
            echo ""
            echo "Use --rollback-id to specify which backup to restore"
        else
            rollback_deployment
        fi
        ;;
    "status")
        if [ -f "${PROJECT_ROOT}/.current-deployment-${ENVIRONMENT}" ]; then
            current_id=$(cat "${PROJECT_ROOT}/.current-deployment-${ENVIRONMENT}")
            info "Current deployment for $ENVIRONMENT: $current_id"

            if [ -f "${PROJECT_ROOT}/deployments/${ENVIRONMENT}-${current_id}.json" ]; then
                cat "${PROJECT_ROOT}/deployments/${ENVIRONMENT}-${current_id}.json" | jq .
            fi
        else
            info "No deployment found for $ENVIRONMENT"
        fi
        ;;
    "list")
        info "Recent deployments for $ENVIRONMENT:"
        ls -la "${PROJECT_ROOT}/deployments/${ENVIRONMENT}-"*.json 2>/dev/null | tail -10 || echo "No deployments found"
        ;;
    *)
        error_exit "Unknown command: $COMMAND"
        ;;
esac
