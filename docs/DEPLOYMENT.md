# 🚀 EATECH Deployment Guide

## Overview

This guide covers deploying EATECH to various environments including development, staging, and production. EATECH uses a multi-cloud approach with Firebase, Cloudflare, and optional Kubernetes deployment.

## Prerequisites

### Required Tools
- Node.js 20.x LTS
- npm 10.x or higher
- Firebase CLI (`npm install -g firebase-tools`)
- Docker & Docker Compose
- Git
- Terraform (for infrastructure deployment)
- kubectl (for Kubernetes deployment)

### Required Accounts
- Firebase/Google Cloud account
- Cloudflare account
- Stripe account (for payments)
- TWINT merchant account
- Domain names configured

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/eatech/eatech-v3.git
cd eatech-v3
```

### 2. Install Dependencies
```bash
npm install
npm run bootstrap # Lerna bootstrap for monorepo
```

### 3. Environment Variables

Create environment files for each environment:

#### Development (.env.local)
```env
# Firebase
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# API
VITE_API_URL=http://localhost:5001
VITE_WEBSOCKET_URL=ws://localhost:5001

# Features
VITE_ENABLE_VOICE=true
VITE_ENABLE_PWA=true

# Payments
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_TWINT_MERCHANT_ID=your-merchant-id
```

#### Production (.env.production)
```env
# Firebase
VITE_FIREBASE_API_KEY=prod-api-key
VITE_FIREBASE_AUTH_DOMAIN=prod.eatech.ch
VITE_FIREBASE_PROJECT_ID=eatech-prod
VITE_FIREBASE_STORAGE_BUCKET=eatech-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321
VITE_FIREBASE_APP_ID=prod-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-YYYYYYYYYY

# API
VITE_API_URL=https://api.eatech.ch
VITE_WEBSOCKET_URL=wss://api.eatech.ch

# Features
VITE_ENABLE_VOICE=true
VITE_ENABLE_PWA=true

# Payments
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_TWINT_MERCHANT_ID=prod-merchant-id
```

## Deployment Strategies

### Option 1: Firebase Hosting (Recommended)

#### Deploy Web App
```bash
# Build the application
npm run build:web

# Deploy to Firebase
firebase deploy --only hosting:web
```

#### Deploy Admin Dashboard
```bash
# Build admin app
npm run build:admin

# Deploy to Firebase
firebase deploy --only hosting:admin
```

#### Deploy Cloud Functions
```bash
# Build functions
npm run build:functions

# Deploy functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:processOrder
```

### Option 2: Docker Deployment

#### Build Docker Images
```bash
# Build all images
make docker-build-all

# Or build individually
docker build -f infrastructure/docker/Dockerfile.web -t eatech/web:latest .
docker build -f infrastructure/docker/Dockerfile.admin -t eatech/admin:latest .
docker build -f infrastructure/docker/Dockerfile.functions -t eatech/functions:latest .
```

#### Run with Docker Compose
```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Kubernetes Deployment

#### Apply Kubernetes Manifests
```bash
# Create namespace
kubectl apply -f infrastructure/k8s/namespace.yaml

# Apply configurations
kubectl apply -f infrastructure/k8s/configmaps/
kubectl apply -f infrastructure/k8s/secrets/

# Deploy applications
kubectl apply -f infrastructure/k8s/deployments/
kubectl apply -f infrastructure/k8s/services/

# Setup ingress
kubectl apply -f infrastructure/k8s/ingress.yaml
```

#### Verify Deployment
```bash
# Check pods
kubectl get pods -n eatech

# Check services
kubectl get services -n eatech

# Check ingress
kubectl get ingress -n eatech
```

### Option 4: Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option 5: Netlify Deployment

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

## Cloudflare Workers Deployment

### Deploy Image Optimization Worker
```bash
cd services/workers
npm run deploy:image-optimization
```

### Deploy Cache Handler Worker
```bash
npm run deploy:cache-handler
```

## Database Migration

### Firestore Indexes
```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy security rules
firebase deploy --only firestore:rules
```

### Initial Data Seeding
```bash
# Run seed script
npm run seed:production

# Or use Firebase Admin SDK
node scripts/seed-database.js --env=production
```

## CI/CD Pipeline

### GitHub Actions Workflow

The project includes automated deployment pipelines:

#### On Push to Main (Production)
```yaml
name: Deploy Production
on:
  push:
    branches: [main]
    
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: firebase deploy --token ${{ secrets.FIREBASE_TOKEN }}
```

#### On Push to Develop (Staging)
```yaml
name: Deploy Staging
on:
  push:
    branches: [develop]
```

## Infrastructure as Code

### Terraform Deployment

#### Initialize Terraform
```bash
cd infrastructure/terraform
terraform init
```

#### Plan Changes
```bash
terraform plan -var-file=production.tfvars
```

#### Apply Changes
```bash
terraform apply -var-file=production.tfvars
```

## Monitoring Setup

### 1. Error Tracking (Sentry)
```javascript
// Already configured in the app
Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 2. Analytics (Plausible)
```html
<!-- Added to index.html -->
<script defer data-domain="eatech.ch" src="https://plausible.io/js/script.js"></script>
```

### 3. Uptime Monitoring
Configure monitoring in your preferred service:
- Pingdom
- UptimeRobot
- Better Uptime

## SSL/TLS Configuration

### Cloudflare SSL
1. Add domain to Cloudflare
2. Enable "Full (strict)" SSL mode
3. Enable "Always Use HTTPS"
4. Configure Page Rules for security headers

### Custom Domain Setup
```bash
# Firebase Hosting
firebase hosting:sites:create eatech-web
firebase hosting:channel:deploy production --site eatech-web

# Add custom domain
firebase hosting:sites:adddomain eatech-web app.eatech.ch
```

## Performance Optimization

### 1. Enable Caching
```javascript
// Cloudflare Page Rules
/*.js -> Cache Level: Standard, Edge Cache TTL: 1 month
/*.css -> Cache Level: Standard, Edge Cache TTL: 1 month
/api/* -> Cache Level: Bypass
```

### 2. Enable Compression
```nginx
# Nginx configuration
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### 3. Image Optimization
```bash
# Images are automatically optimized by Cloudflare Workers
# No additional configuration needed
```

## Security Checklist

- [ ] Environment variables are properly set
- [ ] Firebase security rules are configured
- [ ] API rate limiting is enabled
- [ ] CORS is properly configured
- [ ] CSP headers are set
- [ ] SSL certificates are valid
- [ ] Secrets are stored securely
- [ ] Backup procedures are in place

## Rollback Procedures

### Quick Rollback
```bash
# Using deployment script
./infrastructure/scripts/rollback.sh

# Or manually with Firebase
firebase hosting:rollback
```

### Database Rollback
```bash
# Restore from backup
gsutil cp gs://eatech-backups/firestore/backup-2024-01-20.tar .
firebase firestore:delete --all-collections
firebase firestore:import backup-2024-01-20.tar
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
npm run clean
rm -rf node_modules
npm install
npm run build
```

#### Function Deployment Errors
```bash
# Check function logs
firebase functions:log

# Test locally
npm run serve:functions
```

#### Database Connection Issues
```bash
# Verify Firebase config
firebase projects:list
firebase use --add
```

## Production Checklist

### Pre-deployment
- [ ] All tests pass
- [ ] Build succeeds without warnings
- [ ] Environment variables are set
- [ ] Database migrations are ready
- [ ] Backup current production

### Deployment
- [ ] Deploy during low-traffic period
- [ ] Monitor error rates
- [ ] Check all critical paths
- [ ] Verify payment processing
- [ ] Test voice ordering

### Post-deployment
- [ ] Smoke tests pass
- [ ] Monitor performance metrics
- [ ] Check error tracking
- [ ] Verify analytics
- [ ] Update status page

## Maintenance Mode

### Enable Maintenance Mode
```bash
# Set maintenance flag in Firestore
firebase firestore:write system/config maintenance true

# Or use the script
npm run maintenance:enable
```

### Disable Maintenance Mode
```bash
npm run maintenance:disable
```

## Scaling Considerations

### Horizontal Scaling
- Cloud Functions auto-scale by default
- Firestore handles scaling automatically
- Use Cloud Run for custom services

### Vertical Scaling
- Increase function memory/timeout as needed
- Upgrade Firestore limits if necessary
- Monitor and adjust Cloudflare Workers limits

## Cost Optimization

### Monitor Usage
- Set up budget alerts in Google Cloud
- Monitor Cloudflare analytics
- Track Stripe processing fees

### Optimize Resources
- Use Cloud Scheduler for batch jobs
- Implement proper caching strategies
- Clean up unused resources regularly

---

For detailed infrastructure documentation, see [Infrastructure Guide](../infrastructure/README.md).
