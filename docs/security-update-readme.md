# 🔒 EATECH Security Update: Environment Variables

## Overview
This update migrates all hardcoded Firebase configuration and sensitive keys to environment variables, improving security and making the application production-ready.

## 🚨 Critical Changes

### Before (INSECURE)
```javascript
// ❌ NEVER DO THIS
const firebaseConfig = {
  apiKey: "AIzaSyD...",  // Exposed in source code!
  authDomain: "eatech.firebaseapp.com",
  // ... other config
};
```

### After (SECURE)
```javascript
// ✅ Secure approach
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // ... other config from env vars
};
```

## 📁 Updated Files

### 1. Firebase Configurations
- ✅ `/apps/admin/src/services/firebase/firebaseConfig.js`
- ✅ `/apps/master/src/services/firebase/config.js`
- ✅ `/apps/web/src/lib/firebase.ts`

### 2. Environment Files Created
- `/apps/admin/.env.example`
- `/apps/master/.env.example`
- `/apps/web/.env.example`
- `/functions/.env.example`

### 3. Security Scripts
- `/scripts/migrate-env-vars.js` - Automated migration tool
- `/scripts/security-audit.js` - Find hardcoded secrets

## 🚀 Quick Start

### 1. Run Migration Script
```bash
# From project root
node scripts/migrate-env-vars.js
```

This will:
- Extract existing Firebase config
- Create `.env.local` files for each app
- Backup original files
- Update `.gitignore`

### 2. Manual Setup (if needed)
```bash
# Copy example files
cp apps/admin/.env.example apps/admin/.env.local
cp apps/master/.env.example apps/master/.env.local
cp apps/web/.env.example apps/web/.env.local

# Edit each file and add your values
nano apps/admin/.env.local
```

### 3. Security Audit
```bash
# Check for any remaining hardcoded secrets
node scripts/security-audit.js
```

## 🔑 Environment Variable Reference

### Admin App (Vite)
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Web App (Next.js)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# ... etc
```

### Master App (Vite + Special Access)
```env
# Standard Firebase config
VITE_FIREBASE_API_KEY=your-api-key
# ... etc

# Master-specific
VITE_MASTER_API_KEY=generated-master-key
VITE_MASTER_SECRET=base64-encoded-secret
```

## 🛡️ Security Best Practices

### 1. Never Commit Secrets
```bash
# Ensure .gitignore includes
.env
.env.local
.env.production
*.env
```

### 2. Use Different Values for Each Environment
```
.env.local          # Development
.env.production     # Production
.env.staging        # Staging
```

### 3. Rotate Keys Regularly
- Change API keys every 90 days
- Update passwords monthly
- Rotate webhook secrets after any potential exposure

### 4. Use Secret Management in Production
- **Vercel**: Environment Variables UI
- **Firebase**: Cloud Secret Manager
- **Docker**: Docker Secrets
- **K8s**: Kubernetes Secrets

## 🔍 Validation

### Check Environment Loading
```javascript
// Add to your app initialization
console.log('Environment check:', {
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  environment: import.meta.env.MODE
});
```

### Firebase Connection Test
```javascript
// The updated configs include connection validation
try {
  const app = initializeApp(firebaseConfig);
  console.log('✅ Firebase connected successfully');
} catch (error) {
  console.error('❌ Firebase connection failed:', error);
}
```

## 🚨 Troubleshooting

### Issue: "Missing Firebase configuration"
**Solution**: Ensure `.env.local` exists and contains all required values

### Issue: "Permission denied" in production
**Solution**: Check that production environment variables are set in your hosting platform

### Issue: Different variable names in Next.js
**Solution**: Next.js requires `NEXT_PUBLIC_` prefix for client-side variables

## 📝 Migration Checklist

- [ ] Run migration script
- [ ] Review generated `.env.local` files
- [ ] Add any missing values
- [ ] Test each app locally
- [ ] Run security audit
- [ ] Update CI/CD with env vars
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Rotate any exposed keys

## 🔄 CI/CD Updates

### GitHub Actions
```yaml
env:
  VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
  VITE_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
  # ... other vars
```

### Vercel
1. Go to Project Settings > Environment Variables
2. Add each variable for Production/Preview/Development
3. Redeploy

### Docker
```dockerfile
# Use build args
ARG VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
```

## 🎯 Next Steps

1. **Immediate**: Update all local `.env.local` files
2. **Today**: Run security audit and fix any findings
3. **This Week**: Update all deployment environments
4. **This Month**: Implement secret rotation policy

## 📞 Support

If you encounter any issues:
1. Check this README first
2. Run the security audit tool
3. Contact: benedikt@thomma.ch

---

**Remember**: Security is everyone's responsibility. Never commit secrets! 🔐
