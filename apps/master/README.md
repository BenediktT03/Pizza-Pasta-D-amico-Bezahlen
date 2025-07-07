# EATECH Master Control System

> **Ultimate admin panel for multi-tenant foodtruck management**

## 🎯 Overview

The EATECH Master Control System is a powerful administrative interface designed for platform-wide management of the EATECH ecosystem. It provides comprehensive tools for monitoring, managing, and optimizing all aspects of the multi-tenant foodtruck platform.

## 🚀 Features

### Core Capabilities
- 📊 **Real-time Dashboard** - System-wide metrics and analytics
- 👥 **Tenant Management** - Complete control over all foodtruck tenants
- 💰 **Billing & Revenue** - Financial oversight and invoice management
- 🔒 **Security Center** - Advanced security monitoring and controls
- ⚡ **Feature Flags** - Dynamic feature management across tenants
- 🤖 **AI/ML Tools** - Model training and deployment interface
- 📈 **Advanced Analytics** - Deep insights into platform performance
- 🔧 **System Settings** - Global configuration management

### Technical Features
- 🌐 **PWA Support** - Works offline with service workers
- 🎨 **Dark/Light Theme** - Customizable UI preferences
- 🔐 **Role-based Access** - Granular permission system
- 📱 **Responsive Design** - Desktop and mobile optimized
- 🚀 **Real-time Updates** - WebSocket-based live data
- 🌍 **Multi-language** - DE, FR, IT, EN support

## 🛠️ Tech Stack

- **Framework**: React 18.2 with Vite
- **Routing**: React Router v6
- **State Management**: Zustand + React Query
- **UI Components**: Custom components with CSS Modules
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Animations**: Framer Motion
- **PWA**: Vite PWA Plugin

## 📦 Installation

```bash
# Navigate to master app directory
cd apps/master

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

## 🔧 Configuration

### Environment Variables

```env
# API Configuration
VITE_API_URL=https://api.eatech.ch
VITE_MASTER_API_KEY=your_master_api_key

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_ADVANCED_ANALYTICS=true

# Security
VITE_SESSION_TIMEOUT=1800000  # 30 minutes
VITE_MAX_LOGIN_ATTEMPTS=3
```

## 📁 Project Structure

```
apps/master/
├── src/
│   ├── pages/              # Page components
│   │   ├── Dashboard/      # Main dashboard
│   │   ├── TenantControl/  # Tenant management
│   │   ├── SystemAnalytics/# Analytics pages
│   │   ├── BillingManager/ # Billing features
│   │   ├── SecurityAudit/  # Security center
│   │   └── ...
│   ├── components/         # Reusable components
│   │   ├── common/         # Generic components
│   │   ├── Dashboard/      # Dashboard widgets
│   │   └── ...
│   ├── layouts/           # Layout components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   ├── styles/            # Global styles
│   └── App.jsx            # Root component
├── public/                # Static assets
├── vite.config.js         # Vite configuration
└── package.json          # Dependencies
```

## 🚀 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Check test coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Analyze bundle size
npm run analyze
```

### Code Style Guide

1. **Component Structure**
   ```jsx
   // Use functional components with hooks
   const ComponentName = ({ props }) => {
     // Hooks at the top
     const [state, setState] = useState();
     
     // Event handlers
     const handleClick = () => {};
     
     // Render
     return <div>...</div>;
   };
   ```

2. **CSS Modules**
   ```css
   /* ComponentName.module.css */
   .container {
     /* Component-scoped styles */
   }
   ```

3. **File Naming**
   - Components: `PascalCase.jsx`
   - Styles: `PascalCase.module.css`
   - Utilities: `camelCase.js`
   - Services: `serviceName.service.js`

## 🔒 Security

### Authentication Flow
1. Master admin login with email/password
2. Optional 2FA verification
3. JWT token generation
4. Session management with auto-refresh
5. Activity logging and monitoring

### Permission Levels
- **Super Admin**: Full system access
- **Admin**: Tenant and billing management
- **Support**: Read-only access with support tools
- **Viewer**: Analytics and reporting only

## 📊 Key Features

### 1. Dashboard
- Real-time system metrics
- Switzerland map with tenant locations
- Revenue tracking
- Alert notifications

### 2. Tenant Management
- Create/edit/delete tenants
- Subscription management
- Feature toggle per tenant
- Performance monitoring

### 3. Analytics
- Platform-wide statistics
- Revenue analysis
- User behavior insights
- Custom report generation

### 4. Security Center
- Login attempt monitoring
- IP blocking/whitelisting
- Security event logs
- Compliance reporting

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test -- --watch
```

### Test Structure
```
src/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   └── utils/
```

## 📦 Building & Deployment

### Production Build
```bash
# Create optimized build
npm run build

# Test production build locally
npm run preview
```

### Build Output
```
dist/
├── index.html
├── assets/
│   ├── js/
│   ├── css/
│   └── images/
└── service-worker.js
```

### Deployment Checklist
- [ ] Update version in package.json
- [ ] Run tests and ensure passing
- [ ] Build production bundle
- [ ] Test PWA functionality
- [ ] Verify environment variables
- [ ] Deploy to staging first
- [ ] Monitor error tracking
- [ ] Update documentation

## 🐛 Troubleshooting

### Common Issues

1. **Build Errors**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules dist
   npm install
   npm run build
   ```

2. **API Connection Issues**
   - Check VITE_API_URL in .env
   - Verify CORS settings
   - Check network tab for errors

3. **PWA Not Working**
   - Ensure HTTPS in production
   - Check service worker registration
   - Verify manifest.json

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## 📝 License

Copyright © 2025 EATECH. All rights reserved.

---

**Built with ❤️ by the EATECH Development Team**