#!/bin/bash
# EATECH Platform Deployment Script
# This script handles deployment to different environments

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

Deploy EATECH applications to specified environment

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
    all         Deploy all applications

OPTIONS:
    -h, --help      Show this help message
    -d, --dry-run   Perform a dry run without actual deployment
    -f, --force     Skip confirmation prompts
    -t, --tag       Specify deployment tag (default: git commit hash)
    -b, --build     Force rebuild before deployment
    --no-cache      Build without cache

EXAMPLES:
    $0 dev web              Deploy web app to development
    $0 prod all --dry-run   Dry run for all apps to production
    $0 staging admin -b     Rebuild and deploy admin to staging

EOF
    exit 1
}

# Parse arguments
ENVIRONMENT=""
APP=""
DRY_RUN=false
FORCE=false
TAG=""
BUILD=false
NO_CACHE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -b|--build)
            BUILD=true
            shift
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
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
if [[ -z "$ENVIRONMENT" ]] || [[ -z "$APP" ]]; then
    error "Environment and app must be specified"
    usage
fi

# Set deployment tag
if [[ -z "$TAG" ]]; then
    TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
fi

# Load environment variables
ENV_FILE="${PROJECT_ROOT}/.env.${ENVIRONMENT}"
if [[ -f "$ENV_FILE" ]]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    error "Environment file not found: $ENV_FILE"
    exit 1
fi

# Confirmation prompt
if [[ "$FORCE" != true ]] && [[ "$DRY_RUN" != true ]]; then
    warning "You are about to deploy $APP to $ENVIRONMENT environment"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Deployment cancelled"
        exit 0
    fi
fi

# Pre-deployment checks
pre_deploy_checks() {
    log "Running pre-deployment checks..."
    
    # Check Node.js version
    REQUIRED_NODE_VERSION=$(cat "${PROJECT_ROOT}/.nvmrc")
    CURRENT_NODE_VERSION=$(node -v | sed 's/v//')
    
    if [[ "$CURRENT_NODE_VERSION" != "$REQUIRED_NODE_VERSION"* ]]; then
        error "Node.js version mismatch. Required: $REQUIRED_NODE_VERSION, Current: $CURRENT_NODE_VERSION"
        exit 1
    fi
    
    # Check if all dependencies are installed
    if [[ ! -d "${PROJECT_ROOT}/node_modules" ]]; then
        warning "Dependencies not installed. Installing..."
        cd "$PROJECT_ROOT" && npm ci
    fi
    
    # Run tests
    log "Running tests..."
    cd "$PROJECT_ROOT" && npm run test:ci || {
        error "Tests failed. Aborting deployment."
        exit 1
    }
    
    # Check build
    if [[ "$BUILD" == true ]] || [[ ! -d "${PROJECT_ROOT}/apps/${APP}/dist" ]]; then
        log "Building application..."
        cd "$PROJECT_ROOT" && npm run build:${APP} || {
            error "Build failed. Aborting deployment."
            exit 1
        }
    fi
    
    success "Pre-deployment checks passed"
}

# Deploy to Firebase Hosting
deploy_firebase_hosting() {
    local app=$1
    local target="${app}-${ENVIRONMENT}"
    
    log "Deploying $app to Firebase Hosting ($target)..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would deploy: firebase deploy --only hosting:$target"
        return
    fi
    
    cd "$PROJECT_ROOT"
    firebase deploy \
        --only hosting:$target \
        --project "$FIREBASE_PROJECT_ID" \
        --message "Deploy $app to $ENVIRONMENT - $TAG" || {
        error "Firebase deployment failed"
        exit 1
    }
    
    success "Successfully deployed $app to Firebase Hosting"
}

# Deploy Cloud Functions
deploy_functions() {
    log "Deploying Cloud Functions..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would deploy Cloud Functions"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    # Build functions
    npm run build:functions || {
        error "Functions build failed"
        exit 1
    }
    
    # Deploy to Firebase
    firebase deploy \
        --only functions \
        --project "$FIREBASE_PROJECT_ID" \
        --message "Deploy functions to $ENVIRONMENT - $TAG" || {
        error "Functions deployment failed"
        exit 1
    }
    
    success "Successfully deployed Cloud Functions"
}

# Deploy Cloudflare Workers
deploy_workers() {
    log "Deploying Cloudflare Workers..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would deploy Cloudflare Workers"
        return
    fi
    
    cd "${PROJECT_ROOT}/services/workers"
    
    # Build workers
    npm run build || {
        error "Workers build failed"
        exit 1
    }
    
    # Deploy with Wrangler
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        wrangler publish --env production || {
            error "Workers deployment failed"
            exit 1
        }
    else
        wrangler publish --env "$ENVIRONMENT" || {
            error "Workers deployment failed"
            exit 1
        }
    fi
    
    success "Successfully deployed Cloudflare Workers"
}

# Deploy Docker images
deploy_docker() {
    local app=$1
    local image_name="eatech-${app}"
    local registry="${DOCKER_REGISTRY:-ghcr.io/eatech}"
    local full_image="${registry}/${image_name}:${TAG}"
    
    log "Building and pushing Docker image for $app..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would build and push: $full_image"
        return
    fi
    
    # Build Docker image
    docker build \
        $NO_CACHE \
        -f "${PROJECT_ROOT}/infrastructure/docker/Dockerfile.${app}" \
        -t "$full_image" \
        --build-arg NODE_ENV="$ENVIRONMENT" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$TAG" \
        "$PROJECT_ROOT" || {
        error "Docker build failed"
        exit 1
    }
    
    # Push to registry
    docker push "$full_image" || {
        error "Docker push failed"
        exit 1
    }
    
    success "Successfully pushed Docker image: $full_image"
}

# Deploy to Kubernetes
deploy_kubernetes() {
    local app=$1
    
    log "Deploying $app to Kubernetes..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would deploy to Kubernetes"
        return
    fi
    
    # Update deployment with new image
    kubectl set image \
        deployment/${app}-deployment \
        ${app}="${DOCKER_REGISTRY}/eatech-${app}:${TAG}" \
        -n eatech-${ENVIRONMENT} || {
        error "Kubernetes deployment failed"
        exit 1
    }
    
    # Wait for rollout
    kubectl rollout status \
        deployment/${app}-deployment \
        -n eatech-${ENVIRONMENT} \
        --timeout=300s || {
        error "Kubernetes rollout failed"
        exit 1
    }
    
    success "Successfully deployed $app to Kubernetes"
}

# Post-deployment tasks
post_deploy() {
    log "Running post-deployment tasks..."
    
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
    
    # Send deployment notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        log "Sending deployment notification..."
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"🚀 Deployment Complete\",
                \"attachments\": [{
                    \"color\": \"good\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Application\", \"value\": \"$APP\", \"short\": true},
                        {\"title\": \"Version\", \"value\": \"$TAG\", \"short\": true},
                        {\"title\": \"Deployed By\", \"value\": \"$(git config user.name)\", \"short\": true}
                    ]
                }]
            }" || {
            warning "Failed to send Slack notification"
        }
    fi
    
    # Create deployment record
    echo "{
        \"timestamp\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\",
        \"environment\": \"$ENVIRONMENT\",
        \"application\": \"$APP\",
        \"version\": \"$TAG\",
        \"user\": \"$(git config user.name)\",
        \"status\": \"success\"
    }" >> "${PROJECT_ROOT}/deployments.log"
    
    success "Post-deployment tasks completed"
}

# Main deployment logic
main() {
    log "Starting deployment process..."
    log "Environment: $ENVIRONMENT"
    log "Application: $APP"
    log "Tag: $TAG"
    
    if [[ "$DRY_RUN" == true ]]; then
        warning "Running in DRY RUN mode - no actual changes will be made"
    fi
    
    # Run pre-deployment checks
    pre_deploy_checks
    
    # Deploy based on app selection
    case $APP in
        web|admin|master|kitchen|landing)
            if [[ "$ENVIRONMENT" == "prod" ]]; then
                deploy_docker "$APP"
                deploy_kubernetes "$APP"
            else
                deploy_firebase_hosting "$APP"
            fi
            ;;
        functions)
            deploy_functions
            deploy_workers
            ;;
        all)
            for app in web admin master kitchen landing; do
                log "Deploying $app..."
                if [[ "$ENVIRONMENT" == "prod" ]]; then
                    deploy_docker "$app"
                    deploy_kubernetes "$app"
                else
                    deploy_firebase_hosting "$app"
                fi
            done
            deploy_functions
            deploy_workers
            ;;
        *)
            error "Unknown app: $APP"
            exit 1
            ;;
    esac
    
    # Run post-deployment tasks
    if [[ "$DRY_RUN" != true ]]; then
        post_deploy
    fi
    
    success "Deployment completed successfully!"
    log "Deployment summary:"
    log "  - Environment: $ENVIRONMENT"
    log "  - Application: $APP"
    log "  - Version: $TAG"
    log "  - Timestamp: $TIMESTAMP"
}

# Run main function
main
