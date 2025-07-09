# EATECH V3.0 Makefile
# Simplifies common development and deployment tasks

.PHONY: help install dev build test deploy clean

# Default target
.DEFAULT_GOAL := help

# Variables
NODE_VERSION := 18.19.0
PROJECT_NAME := eatech
DOCKER_REGISTRY := registry.eatech.ch
VERSION := $(shell node -p "require('./package.json').version")

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Help target
help: ## Show this help message
	@echo "$(BLUE)EATECH V3.0 - Development Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make install    - Install all dependencies"
	@echo "  make dev        - Start development environment"
	@echo "  make test       - Run all tests"

# Installation
install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

install-clean: ## Clean install (removes node_modules)
	@echo "$(YELLOW)Cleaning node_modules...$(NC)"
	npm run clean
	@echo "$(BLUE)Installing fresh dependencies...$(NC)"
	npm install
	@echo "$(GREEN)✓ Clean install complete$(NC)"

# Development
dev: ## Start development environment
	@echo "$(BLUE)Starting development environment...$(NC)"
	npm run dev

dev-docker: ## Start development with Docker
	@echo "$(BLUE)Starting Docker development environment...$(NC)"
	docker-compose up

dev-web: ## Start only web app
	@echo "$(BLUE)Starting web app...$(NC)"
	npm run dev --workspace=@eatech/web

dev-admin: ## Start only admin dashboard
	@echo "$(BLUE)Starting admin dashboard...$(NC)"
	npm run dev --workspace=@eatech/admin

dev-master: ## Start only master control
	@echo "$(BLUE)Starting master control...$(NC)"
	npm run dev --workspace=@eatech/master

# Firebase
firebase-emulator: ## Start Firebase emulator
	@echo "$(BLUE)Starting Firebase emulator...$(NC)"
	firebase emulators:start

firebase-deploy: ## Deploy to Firebase
	@echo "$(BLUE)Deploying to Firebase...$(NC)"
	firebase deploy

# Building
build: ## Build all applications
	@echo "$(BLUE)Building all applications...$(NC)"
	npm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

build-web: ## Build web app
	@echo "$(BLUE)Building web app...$(NC)"
	npm run build --workspace=@eatech/web

build-admin: ## Build admin dashboard
	@echo "$(BLUE)Building admin dashboard...$(NC)"
	npm run build --workspace=@eatech/admin

build-docker: ## Build Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose build
	@echo "$(GREEN)✓ Docker build complete$(NC)"

# Testing
test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	npm run test

test-unit: ## Run unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	npm run test:unit

test-e2e: ## Run E2E tests
	@echo "$(BLUE)Running E2E tests...$(NC)"
	npm run test:e2e

test-coverage: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	npm run test:coverage

# Code Quality
lint: ## Run linting
	@echo "$(BLUE)Running linter...$(NC)"
	npm run lint

lint-fix: ## Fix linting issues
	@echo "$(BLUE)Fixing linting issues...$(NC)"
	npm run lint:fix

format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Checking TypeScript types...$(NC)"
	npm run type-check

# Security
security-check: ## Run security audit
	@echo "$(BLUE)Running security audit...$(NC)"
	npm audit
	@echo "$(GREEN)✓ Security check complete$(NC)"

security-fix: ## Fix security vulnerabilities
	@echo "$(YELLOW)Fixing security vulnerabilities...$(NC)"
	npm audit fix

# Docker Commands
docker-up: ## Start Docker containers
	docker-compose up -d

docker-down: ## Stop Docker containers
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f

docker-clean: ## Clean Docker volumes
	docker-compose down -v

# Deployment
deploy-staging: ## Deploy to staging
	@echo "$(BLUE)Deploying to staging...$(NC)"
	./infrastructure/scripts/deploy.sh staging

deploy-production: ## Deploy to production
	@echo "$(RED)Deploying to PRODUCTION...$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		./infrastructure/scripts/deploy.sh production; \
	fi

# Database
db-backup: ## Backup database
	@echo "$(BLUE)Backing up database...$(NC)"
	./infrastructure/scripts/backup.sh

db-seed: ## Seed database with test data
	@echo "$(BLUE)Seeding database...$(NC)"
	npm run db:seed

# Utilities
clean: ## Clean build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	npm run clean
	@echo "$(GREEN)✓ Clean complete$(NC)"

reset: ## Reset project (clean + install)
	@echo "$(RED)Resetting project...$(NC)"
	make clean
	make install

analyze-bundle: ## Analyze bundle size
	@echo "$(BLUE)Analyzing bundle size...$(NC)"
	npm run analyze

check-deps: ## Check for outdated dependencies
	@echo "$(BLUE)Checking dependencies...$(NC)"
	npm outdated

update-deps: ## Update dependencies
	@echo "$(BLUE)Updating dependencies...$(NC)"
	npm update

# Git Hooks
setup-hooks: ## Setup git hooks
	@echo "$(BLUE)Setting up git hooks...$(NC)"
	npx husky install

# Performance
lighthouse: ## Run Lighthouse performance test
	@echo "$(BLUE)Running Lighthouse test...$(NC)"
	npm run lighthouse

# Documentation
docs: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(NC)"
	npm run docs:generate

docs-serve: ## Serve documentation locally
	@echo "$(BLUE)Serving documentation...$(NC)"
	npm run docs:serve

# Release
release: ## Create a new release
	@echo "$(BLUE)Creating new release...$(NC)"
	npm run release

release-patch: ## Create patch release (x.x.X)
	npm version patch

release-minor: ## Create minor release (x.X.x)
	npm version minor

release-major: ## Create major release (X.x.x)
	npm version major

# Environment
env-check: ## Check environment variables
	@echo "$(BLUE)Checking environment variables...$(NC)"
	@test -f .env.local || (echo "$(RED)✗ .env.local not found$(NC)" && exit 1)
	@echo "$(GREEN)✓ Environment configured$(NC)"

env-create: ## Create .env.local from example
	@echo "$(BLUE)Creating .env.local...$(NC)"
	cp .env.local.example .env.local
	@echo "$(GREEN)✓ .env.local created$(NC)"

# System Info
info: ## Show system information
	@echo "$(BLUE)System Information:$(NC)"
	@echo "Node Version: $$(node -v)"
	@echo "NPM Version: $$(npm -v)"
	@echo "Project Version: $(VERSION)"
	@echo "Docker Version: $$(docker -v)"

# Shortcuts
d: dev ## Shortcut for dev
b: build ## Shortcut for build
t: test ## Shortcut for test
