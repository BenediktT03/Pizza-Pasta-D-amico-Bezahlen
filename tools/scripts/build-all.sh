#!/bin/bash

# /tools/scripts/build-all.sh
# EATECH V3.0 - Comprehensive Build Script
# Cross-platform build automation for all apps and packages

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Detect platform
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    PLATFORM="windows"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
else
    PLATFORM="linux"
fi

echo -e "${PURPLE}🍴 EATECH V3.0 - Build All Script${NC}"
echo -e "${BLUE}Platform: ${PLATFORM}${NC}"
echo -e "${CYAN}================================================${NC}"

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_OUTPUT="${PROJECT_ROOT}/dist"
LOG_FILE="${PROJECT_ROOT}/build.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Environment detection
if [ -f "${PROJECT_ROOT}/.env.production" ]; then
    ENV="production"
elif [ -f "${PROJECT_ROOT}/.env.staging" ]; then
    ENV="staging"
else
    ENV="development"
fi

echo -e "${YELLOW}Environment: ${ENV}${NC}"
echo -e "${YELLOW}Build started at: $(date)${NC}"

# Create build directory
mkdir -p "${BUILD_OUTPUT}"
mkdir -p "${PROJECT_ROOT}/logs"

# Logging function
log() {
    echo -e "$1" | tee -a "${LOG_FILE}"
}

# Error handling
error_exit() {
    log "${RED}❌ Error: $1${NC}"
    exit 1
}

# Success logging
success() {
    log "${GREEN}✅ $1${NC}"
}

# Warning logging
warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Info logging
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed"
    fi

    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE="18.0.0"

    if [[ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE" ]]; then
        error_exit "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_NODE+"
    fi

    success "Node.js $NODE_VERSION ✓"

    # Check npm
    if ! command -v npm &> /dev/null; then
        error_exit "npm is not installed"
    fi

    success "npm $(npm --version) ✓"

    # Check for Turbo
    if ! command -v turbo &> /dev/null; then
        warning "Turbo not found globally. Installing..."
        npm install -g turbo || error_exit "Failed to install Turbo"
    fi

    success "Turbo $(turbo --version) ✓"

    # Check for required files
    required_files=(
        "package.json"
        "turbo.json"
        "tsconfig.json"
        "firebase.json"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "${PROJECT_ROOT}/${file}" ]; then
            error_exit "Required file not found: ${file}"
        fi
    done

    success "Required files ✓"
}

# Clean previous builds
clean_builds() {
    info "Cleaning previous builds..."

    # Remove dist directory
    if [ -d "${BUILD_OUTPUT}" ]; then
        rm -rf "${BUILD_OUTPUT}"
        success "Removed dist directory"
    fi

    # Clean node_modules/.cache
    find "${PROJECT_ROOT}" -name ".next" -type d -exec rm -rf {} + 2>/dev/null || true
    find "${PROJECT_ROOT}" -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find "${PROJECT_ROOT}" -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true

    success "Cleaned build artifacts"
}

# Install dependencies
install_dependencies() {
    info "Installing dependencies..."

    cd "${PROJECT_ROOT}"

    # Use npm ci for faster, reliable, reproducible builds
    if [ -f "package-lock.json" ]; then
        npm ci --production=false || error_exit "Failed to install dependencies"
    else
        npm install || error_exit "Failed to install dependencies"
    fi

    success "Dependencies installed"
}

# Run type checking
type_check() {
    info "Running TypeScript type checking..."

    cd "${PROJECT_ROOT}"

    # Type check all packages and apps
    npx turbo run type-check --parallel || {
        warning "Type checking failed, but continuing build..."
        return 0
    }

    success "Type checking completed"
}

# Run linting
lint_code() {
    info "Running ESLint..."

    cd "${PROJECT_ROOT}"

    # Lint all packages and apps
    npx turbo run lint --parallel || {
        warning "Linting found issues, but continuing build..."
        return 0
    }

    success "Linting completed"
}

# Generate types
generate_types() {
    info "Generating TypeScript types..."

    cd "${PROJECT_ROOT}"

    # Run type generation script
    if [ -f "tools/scripts/generate-types.js" ]; then
        node tools/scripts/generate-types.js || warning "Type generation had issues"
    fi

    success "Type generation completed"
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        warning "Skipping tests (SKIP_TESTS=true)"
        return 0
    fi

    info "Running tests..."

    cd "${PROJECT_ROOT}"

    # Run unit tests
    npx turbo run test --parallel || {
        if [ "$ENV" = "production" ]; then
            error_exit "Tests failed in production build"
        else
            warning "Tests failed, but continuing development build..."
        fi
    }

    success "Tests completed"
}

# Build packages first (dependencies)
build_packages() {
    info "Building shared packages..."

    cd "${PROJECT_ROOT}"

    # Build packages in dependency order
    local packages=(
        "packages/types"
        "packages/utils"
        "packages/core"
        "packages/ui"
        "packages/analytics"
        "packages/ai"
        "packages/blockchain"
        "packages/edge"
    )

    for package in "${packages[@]}"; do
        if [ -d "${PROJECT_ROOT}/${package}" ]; then
            info "Building ${package}..."
            npx turbo run build --filter="${package}" || error_exit "Failed to build ${package}"
            success "Built ${package}"
        else
            warning "Package ${package} not found, skipping..."
        fi
    done

    success "All packages built"
}

# Build applications
build_apps() {
    info "Building applications..."

    cd "${PROJECT_ROOT}"

    # Build apps in parallel where possible
    local apps=(
        "apps/web"
        "apps/admin"
        "apps/master"
        "apps/landing"
    )

    for app in "${apps[@]}"; do
        if [ -d "${PROJECT_ROOT}/${app}" ]; then
            info "Building ${app}..."

            # Set environment-specific variables
            export NEXT_PUBLIC_ENV="${ENV}"
            export NEXT_PUBLIC_BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
            export NEXT_PUBLIC_BUILD_HASH="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"

            npx turbo run build --filter="${app}" || error_exit "Failed to build ${app}"
            success "Built ${app}"
        else
            warning "App ${app} not found, skipping..."
        fi
    done

    success "All applications built"
}

# Build Firebase Functions
build_functions() {
    info "Building Firebase Functions..."

    if [ -d "${PROJECT_ROOT}/functions" ]; then
        cd "${PROJECT_ROOT}/functions"

        # Install function dependencies
        npm ci --production=false || error_exit "Failed to install function dependencies"

        # Build functions
        npm run build || error_exit "Failed to build Firebase Functions"

        success "Firebase Functions built"
    else
        warning "Firebase Functions directory not found, skipping..."
    fi
}

# Create build artifacts
create_artifacts() {
    info "Creating build artifacts..."

    # Create build info
    cat > "${BUILD_OUTPUT}/build-info.json" << EOF
{
  "buildTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${ENV}",
  "platform": "${PLATFORM}",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "buildNumber": "${TIMESTAMP}",
  "builtBy": "$(whoami)",
  "apps": {
    "web": "$([ -d '${PROJECT_ROOT}/apps/web/.next' ] && echo 'built' || echo 'skipped')",
    "admin": "$([ -d '${PROJECT_ROOT}/apps/admin/.next' ] && echo 'built' || echo 'skipped')",
    "master": "$([ -d '${PROJECT_ROOT}/apps/master/.next' ] && echo 'built' || echo 'skipped')",
    "landing": "$([ -d '${PROJECT_ROOT}/apps/landing/.next' ] && echo 'built' || echo 'skipped')"
  }
}
EOF

    # Copy build outputs
    if [ -d "${PROJECT_ROOT}/apps/web/.next" ]; then
        cp -r "${PROJECT_ROOT}/apps/web/.next" "${BUILD_OUTPUT}/web" || warning "Failed to copy web build"
    fi

    if [ -d "${PROJECT_ROOT}/apps/admin/.next" ]; then
        cp -r "${PROJECT_ROOT}/apps/admin/.next" "${BUILD_OUTPUT}/admin" || warning "Failed to copy admin build"
    fi

    if [ -d "${PROJECT_ROOT}/apps/master/.next" ]; then
        cp -r "${PROJECT_ROOT}/apps/master/.next" "${BUILD_OUTPUT}/master" || warning "Failed to copy master build"
    fi

    if [ -d "${PROJECT_ROOT}/apps/landing/.next" ]; then
        cp -r "${PROJECT_ROOT}/apps/landing/.next" "${BUILD_OUTPUT}/landing" || warning "Failed to copy landing build"
    fi

    if [ -d "${PROJECT_ROOT}/functions/lib" ]; then
        cp -r "${PROJECT_ROOT}/functions/lib" "${BUILD_OUTPUT}/functions" || warning "Failed to copy functions build"
    fi

    success "Build artifacts created"
}

# Generate bundle analysis
analyze_bundles() {
    if [ "$ANALYZE_BUNDLE" = "true" ]; then
        info "Analyzing bundles..."

        cd "${PROJECT_ROOT}"

        # Analyze each Next.js app
        for app in apps/web apps/admin apps/master apps/landing; do
            if [ -d "${app}" ]; then
                cd "${PROJECT_ROOT}/${app}"

                # Create bundle analysis
                ANALYZE=true npm run build > /dev/null 2>&1 || warning "Bundle analysis failed for ${app}"

                cd "${PROJECT_ROOT}"
            fi
        done

        success "Bundle analysis completed"
    fi
}

# Performance optimization
optimize_builds() {
    info "Optimizing builds..."

    # Compress static assets
    if command -v gzip &> /dev/null; then
        find "${BUILD_OUTPUT}" -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -k {} \;
        success "Assets compressed with gzip"
    fi

    # Create service worker precache manifest
    if [ -d "${PROJECT_ROOT}/apps/web/public" ]; then
        cd "${PROJECT_ROOT}/apps/web"

        # Generate SW precache if workbox is available
        if command -v workbox &> /dev/null; then
            workbox generateSW workbox-config.js || warning "Service Worker generation failed"
        fi
    fi

    success "Build optimization completed"
}

# Validate builds
validate_builds() {
    info "Validating builds..."

    local errors=0

    # Check if required build outputs exist
    if [ ! -d "${PROJECT_ROOT}/apps/web/.next" ]; then
        warning "Web app build not found"
        ((errors++))
    fi

    if [ ! -d "${PROJECT_ROOT}/apps/admin/.next" ]; then
        warning "Admin app build not found"
        ((errors++))
    fi

    if [ ! -d "${PROJECT_ROOT}/apps/master/.next" ]; then
        warning "Master app build not found"
        ((errors++))
    fi

    # Check bundle sizes
    for app in web admin master landing; do
        if [ -d "${BUILD_OUTPUT}/${app}" ]; then
            size=$(du -sh "${BUILD_OUTPUT}/${app}" | cut -f1)
            info "Bundle size for ${app}: ${size}"
        fi
    done

    if [ $errors -eq 0 ]; then
        success "Build validation passed"
    else
        warning "Build validation completed with ${errors} warnings"
    fi
}

# Cleanup
cleanup() {
    info "Cleaning up temporary files..."

    # Remove temporary files
    find "${PROJECT_ROOT}" -name "*.tsbuildinfo" -delete 2>/dev/null || true
    find "${PROJECT_ROOT}" -name ".DS_Store" -delete 2>/dev/null || true

    success "Cleanup completed"
}

# Main execution flow
main() {
    local start_time=$(date +%s)

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                export SKIP_TESTS=true
                shift
                ;;
            --skip-lint)
                export SKIP_LINT=true
                shift
                ;;
            --analyze-bundle)
                export ANALYZE_BUNDLE=true
                shift
                ;;
            --clean)
                clean_builds
                exit 0
                ;;
            --help|-h)
                echo "EATECH Build Script"
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --skip-tests     Skip running tests"
                echo "  --skip-lint      Skip linting"
                echo "  --analyze-bundle Analyze bundle sizes"
                echo "  --clean          Clean previous builds and exit"
                echo "  --help, -h       Show this help message"
                exit 0
                ;;
            *)
                warning "Unknown option: $1"
                shift
                ;;
        esac
    done

    # Execute build steps
    check_prerequisites
    clean_builds
    install_dependencies

    if [ "$SKIP_LINT" != "true" ]; then
        lint_code
    fi

    type_check
    generate_types
    run_tests
    build_packages
    build_apps
    build_functions
    create_artifacts
    analyze_bundles
    optimize_builds
    validate_builds
    cleanup

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo -e "${CYAN}================================================${NC}"
    success "🎉 Build completed successfully!"
    info "Total build time: ${duration} seconds"
    info "Build artifacts: ${BUILD_OUTPUT}"
    info "Build log: ${LOG_FILE}"
    echo -e "${CYAN}================================================${NC}"
}

# Run main function
main "$@"
