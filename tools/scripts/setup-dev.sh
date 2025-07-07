#!/bin/bash

# /tools/scripts/setup-dev.sh
# EATECH V3.0 - Development Environment Setup
# Interactive setup for new developers

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Detect platform
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    PLATFORM="windows"
    SHELL_RC="$HOME/.bashrc"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
    SHELL_RC="$HOME/.zshrc"
else
    PLATFORM="linux"
    SHELL_RC="$HOME/.bashrc"
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SETUP_LOG="${PROJECT_ROOT}/setup.log"

echo -e "${PURPLE}🍴 EATECH V3.0 - Development Environment Setup${NC}"
echo -e "${BLUE}Platform: ${PLATFORM}${NC}"
echo -e "${CYAN}================================================${NC}"

# Logging
log() {
    echo -e "$1" | tee -a "${SETUP_LOG}"
}

error_exit() {
    log "${RED}❌ Error: $1${NC}"
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

# Interactive prompts
ask_yes_no() {
    local question="$1"
    local default="${2:-yes}"

    if [ "$default" = "yes" ]; then
        prompt="[Y/n]"
    else
        prompt="[y/N]"
    fi

    while true; do
        read -p "$(echo -e "${CYAN}$question $prompt:${NC} ")" answer

        case ${answer:-$default} in
            [Yy]|[Yy][Ee][Ss]|yes)
                return 0
                ;;
            [Nn]|[Nn][Oo]|no)
                return 1
                ;;
            *)
                echo "Please answer yes or no."
                ;;
        esac
    done
}

ask_input() {
    local question="$1"
    local default="$2"
    local secret="${3:-false}"

    if [ "$secret" = "true" ]; then
        read -s -p "$(echo -e "${CYAN}$question:${NC} ")" answer
        echo ""
    else
        if [ -n "$default" ]; then
            read -p "$(echo -e "${CYAN}$question [$default]:${NC} ")" answer
        else
            read -p "$(echo -e "${CYAN}$question:${NC} ")" answer
        fi
    fi

    echo "${answer:-$default}"
}

# Check system requirements
check_system_requirements() {
    info "Checking system requirements..."

    # Check operating system
    case $PLATFORM in
        "windows")
            info "Detected Windows (Git Bash/WSL recommended)"
            ;;
        "macos")
            info "Detected macOS"
            # Check if Xcode Command Line Tools are installed
            if ! xcode-select -p &> /dev/null; then
                warning "Xcode Command Line Tools not found"
                if ask_yes_no "Install Xcode Command Line Tools?"; then
                    xcode-select --install
                    info "Please complete the Xcode installation and run this script again"
                    exit 0
                fi
            fi
            ;;
        "linux")
            info "Detected Linux"
            ;;
    esac

    # Check disk space
    local available_space
    if [[ "$PLATFORM" == "macos" ]]; then
        available_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//')
    else
        available_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//')
    fi

    if [ "${available_space%.*}" -lt 5 ]; then
        warning "Low disk space detected. At least 5GB recommended for development"
    fi

    success "System requirements check completed"
}

# Install package manager
install_package_manager() {
    case $PLATFORM in
        "macos")
            if ! command -v brew &> /dev/null; then
                if ask_yes_no "Homebrew not found. Install it?"; then
                    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

                    # Add Homebrew to PATH
                    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$SHELL_RC"
                    eval "$(/opt/homebrew/bin/brew shellenv)"

                    success "Homebrew installed"
                else
                    warning "Skipping Homebrew installation"
                fi
            else
                success "Homebrew already installed"
            fi
            ;;
        "linux")
            # Update package manager
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
            elif command -v yum &> /dev/null; then
                sudo yum update
            elif command -v pacman &> /dev/null; then
                sudo pacman -Sy
            fi
            ;;
    esac
}

# Install Node.js
install_nodejs() {
    info "Setting up Node.js..."

    # Check if Node.js is installed
    if command -v node &> /dev/null; then
        local node_version=$(node --version | cut -d'v' -f2)
        local required_version="18.0.0"

        if [[ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" == "$required_version" ]]; then
            success "Node.js $node_version is already installed and meets requirements"
            return 0
        else
            warning "Node.js $node_version is too old. Minimum required: $required_version"
        fi
    fi

    # Install Node.js using Node Version Manager
    if ! command -v nvm &> /dev/null; then
        if ask_yes_no "Install Node Version Manager (nvm)?"; then
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

            # Source nvm
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

            success "NVM installed"
        fi
    fi

    # Install latest LTS Node.js
    if command -v nvm &> /dev/null; then
        nvm install --lts
        nvm use --lts
        nvm alias default node
        success "Node.js LTS installed via NVM"
    else
        # Fallback to system package manager
        case $PLATFORM in
            "macos")
                if command -v brew &> /dev/null; then
                    brew install node
                fi
                ;;
            "linux")
                if command -v apt-get &> /dev/null; then
                    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                elif command -v yum &> /dev/null; then
                    curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
                    sudo yum install -y nodejs
                fi
                ;;
        esac
        success "Node.js installed via system package manager"
    fi

    # Verify installation
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        success "Node.js $(node --version) and npm $(npm --version) installed"
    else
        error_exit "Failed to install Node.js"
    fi
}

# Install Git
install_git() {
    if command -v git &> /dev/null; then
        success "Git $(git --version | cut -d' ' -f3) already installed"
        return 0
    fi

    info "Installing Git..."

    case $PLATFORM in
        "macos")
            if command -v brew &> /dev/null; then
                brew install git
            fi
            ;;
        "linux")
            if command -v apt-get &> /dev/null; then
                sudo apt-get install -y git
            elif command -v yum &> /dev/null; then
                sudo yum install -y git
            elif command -v pacman &> /dev/null; then
                sudo pacman -S git
            fi
            ;;
    esac

    success "Git installed"
}

# Configure Git
configure_git() {
    info "Configuring Git..."

    local git_name=$(git config --global user.name 2>/dev/null || echo "")
    local git_email=$(git config --global user.email 2>/dev/null || echo "")

    if [ -z "$git_name" ]; then
        git_name=$(ask_input "Enter your full name for Git commits")
        git config --global user.name "$git_name"
    fi

    if [ -z "$git_email" ]; then
        git_email=$(ask_input "Enter your email for Git commits")
        git config --global user.email "$git_email"
    fi

    # Set up Git defaults
    git config --global init.defaultBranch main
    git config --global pull.rebase false
    git config --global core.autocrlf false

    # Set up Git aliases
    git config --global alias.co checkout
    git config --global alias.br branch
    git config --global alias.ci commit
    git config --global alias.st status
    git config --global alias.unstage 'reset HEAD --'
    git config --global alias.last 'log -1 HEAD'
    git config --global alias.visual '!gitk'

    success "Git configured for $git_name <$git_email>"
}

# Install development tools
install_dev_tools() {
    info "Installing development tools..."

    # Install essential tools
    local tools_to_install=()

    # Check for VS Code
    if ! command -v code &> /dev/null; then
        if ask_yes_no "Install Visual Studio Code?"; then
            case $PLATFORM in
                "macos")
                    if command -v brew &> /dev/null; then
                        brew install --cask visual-studio-code
                    fi
                    ;;
                "linux")
                    # Install VS Code repository key
                    wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
                    sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
                    sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
                    sudo apt update
                    sudo apt install code
                    ;;
            esac
            success "VS Code installed"
        fi
    else
        success "VS Code already installed"
    fi

    # Install Docker
    if ! command -v docker &> /dev/null; then
        if ask_yes_no "Install Docker?"; then
            case $PLATFORM in
                "macos")
                    if command -v brew &> /dev/null; then
                        brew install --cask docker
                    fi
                    ;;
                "linux")
                    curl -fsSL https://get.docker.com -o get-docker.sh
                    sudo sh get-docker.sh
                    sudo usermod -aG docker $USER
                    rm get-docker.sh
                    ;;
            esac
            success "Docker installed"
        fi
    else
        success "Docker already installed"
    fi

    # Install additional tools
    local additional_tools=("jq" "curl" "wget")

    for tool in "${additional_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            case $PLATFORM in
                "macos")
                    if command -v brew &> /dev/null; then
                        brew install "$tool"
                    fi
                    ;;
                "linux")
                    if command -v apt-get &> /dev/null; then
                        sudo apt-get install -y "$tool"
                    elif command -v yum &> /dev/null; then
                        sudo yum install -y "$tool"
                    fi
                    ;;
            esac
            success "$tool installed"
        else
            success "$tool already installed"
        fi
    done
}

# Install project dependencies
install_project_dependencies() {
    info "Installing project dependencies..."

    cd "$PROJECT_ROOT"

    # Install npm dependencies
    npm ci --include=dev || npm install

    # Install global tools
    local global_tools=("turbo" "vercel" "firebase-tools" "@storybook/cli" "lighthouse")

    for tool in "${global_tools[@]}"; do
        if ! npm list -g "$tool" &> /dev/null; then
            if ask_yes_no "Install $tool globally?"; then
                npm install -g "$tool"
                success "$tool installed globally"
            fi
        else
            success "$tool already installed globally"
        fi
    done

    success "Project dependencies installed"
}

# Setup environment files
setup_environment_files() {
    info "Setting up environment files..."

    cd "$PROJECT_ROOT"

    # Create .env.local from .env.example
    if [ -f ".env.example" ] && [ ! -f ".env.local" ]; then
        cp ".env.example" ".env.local"
        warning "Created .env.local from .env.example"
        warning "Please update .env.local with your actual environment variables"
    fi

    # Setup app-specific environment files
    local apps=("web" "admin" "master" "landing")

    for app in "${apps[@]}"; do
        if [ -d "apps/$app" ]; then
            if [ -f "apps/$app/.env.example" ] && [ ! -f "apps/$app/.env.local" ]; then
                cp "apps/$app/.env.example" "apps/$app/.env.local"
                info "Created .env.local for $app"
            fi
        fi
    done

    success "Environment files created"
}

# Setup VS Code workspace
setup_vscode_workspace() {
    if ! command -v code &> /dev/null; then
        return 0
    fi

    if ask_yes_no "Setup VS Code workspace and extensions?"; then
        info "Setting up VS Code workspace..."

        # Create workspace file
        cat > "${PROJECT_ROOT}/eatech.code-workspace" << EOF
{
    "folders": [
        {
            "name": "🍴 EATECH Root",
            "path": "."
        },
        {
            "name": "📱 Customer PWA",
            "path": "./apps/web"
        },
        {
            "name": "🎛️ Admin Dashboard",
            "path": "./apps/admin"
        },
        {
            "name": "🎯 Master Control",
            "path": "./apps/master"
        },
        {
            "name": "🌐 Landing Page",
            "path": "./apps/landing"
        },
        {
            "name": "📦 Packages",
            "path": "./packages"
        },
        {
            "name": "⚡ Functions",
            "path": "./functions"
        }
    ],
    "settings": {
        "typescript.preferences.includePackageJsonAutoImports": "on",
        "typescript.suggest.autoImports": true,
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.fixAll.eslint": true,
            "source.organizeImports": true
        },
        "eslint.workingDirectories": [
            "./apps/web",
            "./apps/admin",
            "./apps/master",
            "./apps/landing",
            "./packages/core",
            "./packages/ui",
            "./functions"
        ],
        "search.exclude": {
            "**/node_modules": true,
            "**/.next": true,
            "**/dist": true,
            "**/.turbo": true
        },
        "emmet.includeLanguages": {
            "typescript": "javascriptreact",
            "javascript": "javascriptreact"
        }
    },
    "extensions": {
        "recommendations": [
            "bradlc.vscode-tailwindcss",
            "dbaeumer.vscode-eslint",
            "esbenp.prettier-vscode",
            "ms-vscode.vscode-typescript-next",
            "bradlc.vscode-tailwindcss",
            "ms-vscode.vscode-json",
            "firefox-devtools.vscode-firefox-debug",
            "ms-vscode.vscode-js-debug",
            "formulahendry.auto-rename-tag",
            "christian-kohler.path-intellisense",
            "ms-vscode.vscode-eslint",
            "streetsidesoftware.code-spell-checker",
            "gruntfuggly.todo-tree",
            "wayou.vscode-todo-highlight"
        ]
    }
}
EOF

        # Install recommended extensions
        local extensions=(
            "bradlc.vscode-tailwindcss"
            "dbaeumer.vscode-eslint"
            "esbenp.prettier-vscode"
            "ms-vscode.vscode-typescript-next"
            "formulahendry.auto-rename-tag"
            "christian-kohler.path-intellisense"
            "streetsidesoftware.code-spell-checker"
            "gruntfuggly.todo-tree"
        )

        for extension in "${extensions[@]}"; do
            code --install-extension "$extension" &> /dev/null || warning "Failed to install $extension"
        done

        success "VS Code workspace configured"
    fi
}

# Setup Git hooks
setup_git_hooks() {
    if ask_yes_no "Setup Git hooks for code quality?"; then
        info "Setting up Git hooks..."

        cd "$PROJECT_ROOT"

        # Install husky if not already installed
        if ! npm list husky &> /dev/null; then
            npm install --save-dev husky
        fi

        # Initialize husky
        npx husky install

        # Create pre-commit hook
        cat > ".husky/pre-commit" << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run linter
npm run lint:check || {
    echo "❌ Linting failed. Please fix the issues before committing."
    exit 1
}

# Run type check
npm run type-check || {
    echo "❌ Type check failed. Please fix the type errors before committing."
    exit 1
}

# Run tests
npm run test:quick || {
    echo "❌ Tests failed. Please fix the failing tests before committing."
    exit 1
}

echo "✅ Pre-commit checks passed!"
EOF

        # Create commit-msg hook
        cat > ".husky/commit-msg" << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Check commit message format
if ! grep -qE "^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{1,50}" "$1"; then
    echo "❌ Invalid commit message format!"
    echo "Format: <type>(<scope>): <subject>"
    echo "Example: feat(orders): add voice ordering support"
    echo "Types: feat, fix, docs, style, refactor, test, chore"
    exit 1
fi

echo "✅ Commit message format is valid!"
EOF

        chmod +x .husky/pre-commit
        chmod +x .husky/commit-msg

        success "Git hooks configured"
    fi
}

# Setup Firebase
setup_firebase() {
    if ask_yes_no "Configure Firebase for local development?"; then
        info "Setting up Firebase..."

        if ! command -v firebase &> /dev/null; then
            npm install -g firebase-tools
        fi

        # Login to Firebase
        if ask_yes_no "Login to Firebase?"; then
            firebase login
        fi

        # Initialize Firebase project
        cd "$PROJECT_ROOT"

        if [ ! -f "firebase.json" ]; then
            warning "firebase.json not found. Please run 'firebase init' manually"
        else
            info "Firebase configuration found"
        fi

        # Start Firebase emulators
        if ask_yes_no "Start Firebase emulators for local development?"; then
            firebase emulators:start --only firestore,functions,auth &
            success "Firebase emulators started"
        fi
    fi
}

# Setup development aliases
setup_dev_aliases() {
    if ask_yes_no "Setup development aliases?"; then
        info "Setting up development aliases..."

        # Create aliases for easier development
        cat >> "$SHELL_RC" << 'EOF'

# EATECH Development Aliases
alias eatech-start="npm run dev"
alias eatech-build="npm run build"
alias eatech-test="npm run test"
alias eatech-lint="npm run lint"
alias eatech-deploy-staging="npm run deploy:staging"
alias eatech-logs="tail -f logs/*.log"

# Turbo shortcuts
alias tb="turbo build"
alias td="turbo dev"
alias tt="turbo test"
alias tl="turbo lint"

# Git shortcuts for EATECH
alias gp="git pull origin main"
alias gps="git push origin"
alias gc="git commit -m"
alias gs="git status"
alias gco="git checkout"

EOF

        success "Development aliases added to $SHELL_RC"
        info "Run 'source $SHELL_RC' or restart your terminal to use aliases"
    fi
}

# Create development documentation
create_dev_docs() {
    info "Creating development documentation..."

    cat > "${PROJECT_ROOT}/DEV_SETUP.md" << EOF
# EATECH Development Setup

This document contains important information for developers working on EATECH.

## Quick Start

1. Clone the repository
2. Run \`./tools/scripts/setup-dev.sh\`
3. Copy \`.env.example\` to \`.env.local\` and fill in your values
4. Run \`npm run dev\` to start development servers

## Available Scripts

- \`npm run dev\` - Start all development servers
- \`npm run build\` - Build all applications
- \`npm run test\` - Run all tests
- \`npm run lint\` - Run linting
- \`npm run type-check\` - Run TypeScript type checking

## Project Structure

- \`apps/web/\` - Customer PWA (Next.js)
- \`apps/admin/\` - Admin Dashboard
- \`apps/master/\` - Master Control System
- \`packages/\` - Shared packages
- \`functions/\` - Firebase Cloud Functions

## Development Workflow

1. Create a feature branch: \`git checkout -b feature/your-feature\`
2. Make your changes
3. Run tests: \`npm run test\`
4. Commit with conventional format: \`feat(scope): description\`
5. Push and create a pull request

## Environment Variables

Check \`.env.example\` for required environment variables.

## Troubleshooting

### Common Issues

1. **Node modules issues**: Delete \`node_modules\` and run \`npm install\`
2. **Build issues**: Run \`npm run clean\` then \`npm run build\`
3. **TypeScript errors**: Run \`npm run type-check\`

### Getting Help

- Check the main README.md
- Ask in the team chat
- Create an issue on GitHub

## Resources

- [Project Documentation](./README.md)
- [API Documentation](./docs/api/)
- [Component Library](./packages/ui/README.md)

---
Generated by setup-dev.sh on $(date)
EOF

    success "Development documentation created"
}

# Final verification
verify_setup() {
    info "Verifying development setup..."

    local errors=0

    # Check Node.js
    if ! command -v node &> /dev/null; then
        warning "Node.js not found"
        ((errors++))
    else
        success "Node.js $(node --version)"
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        warning "npm not found"
        ((errors++))
    else
        success "npm $(npm --version)"
    fi

    # Check Git
    if ! command -v git &> /dev/null; then
        warning "Git not found"
        ((errors++))
    else
        success "Git $(git --version | cut -d' ' -f3)"
    fi

    # Check project dependencies
    cd "$PROJECT_ROOT"
    if [ ! -d "node_modules" ]; then
        warning "Project dependencies not installed"
        ((errors++))
    else
        success "Project dependencies installed"
    fi

    # Check environment files
    if [ ! -f ".env.local" ]; then
        warning ".env.local not found - please configure environment variables"
        ((errors++))
    else
        success "Environment configuration found"
    fi

    if [ $errors -eq 0 ]; then
        success "🎉 Development environment setup completed successfully!"
        info "You can now run 'npm run dev' to start development"
    else
        warning "Setup completed with $errors issues. Please resolve them before starting development."
    fi
}

# Show welcome message
show_welcome() {
    cat << EOF

${PURPLE}🍴 Welcome to EATECH Development!${NC}

${CYAN}What's Next?${NC}

1. ${GREEN}Configure Environment Variables${NC}
   - Edit .env.local with your API keys and configuration
   - Check each app's .env.local file

2. ${GREEN}Start Development${NC}
   - Run: ${YELLOW}npm run dev${NC}
   - This starts all development servers

3. ${GREEN}Open in Browser${NC}
   - Customer App: http://localhost:3000
   - Admin Dashboard: http://localhost:3001
   - Master Control: http://localhost:3002

4. ${GREEN}VS Code Integration${NC}
   - Open: ${YELLOW}code eatech.code-workspace${NC}
   - Install recommended extensions

5. ${GREEN}Development Workflow${NC}
   - Create feature branches
   - Use conventional commit messages
   - Run tests before pushing

${CYAN}Useful Commands:${NC}
- ${YELLOW}npm run dev${NC}        - Start development servers
- ${YELLOW}npm run build${NC}      - Build all applications
- ${YELLOW}npm run test${NC}       - Run tests
- ${YELLOW}npm run lint${NC}       - Run linting

${CYAN}Documentation:${NC}
- Main README: ${YELLOW}./README.md${NC}
- Dev Guide: ${YELLOW}./DEV_SETUP.md${NC}
- API Docs: ${YELLOW}./docs/api/${NC}

${GREEN}Happy coding! 🚀${NC}

EOF
}

# Main setup function
main() {
    local start_time=$(date +%s)

    info "Starting EATECH development environment setup..."

    check_system_requirements
    install_package_manager
    install_git
    configure_git
    install_nodejs
    install_dev_tools
    install_project_dependencies
    setup_environment_files
    setup_vscode_workspace
    setup_git_hooks
    setup_firebase
    setup_dev_aliases
    create_dev_docs
    verify_setup

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    show_welcome

    info "Setup completed in ${duration} seconds"
    info "Setup log saved to: ${SETUP_LOG}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            cat << EOF
EATECH Development Environment Setup

Usage: $0 [OPTIONS]

This script sets up a complete development environment for EATECH including:
- Node.js and npm
- Git configuration
- Development tools (VS Code, Docker, etc.)
- Project dependencies
- Environment files
- Git hooks
- Firebase configuration

Options:
  --help, -h    Show this help message

The script is interactive and will prompt you for choices during setup.

EOF
            exit 0
            ;;
        *)
            warning "Unknown option: $1"
            shift
            ;;
    esac
done

# Run main setup
main
