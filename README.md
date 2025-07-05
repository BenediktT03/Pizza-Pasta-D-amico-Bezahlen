# EATECH V26.0 - Multi-Tenant Foodtruck Management System

## 🚀 Quick Start

1. **Install pnpm**
   ```bash
   npm install -g pnpm@10.12.4
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Firebase**
   - Copy `.env.example` to `.env.local`
   - Add your Firebase configuration

4. **Start development**
   ```bash
   pnpm dev
   ```

## 📁 Project Structure

```
EATECH/
├── apps/
│   ├── admin/     # Main admin dashboard
│   ├── web/       # Customer PWA
│   ├── master/    # Master admin
│   └── mobile/    # React Native app
├── packages/
│   ├── core/      # Shared business logic
│   └── ui/        # Shared UI components
├── functions/     # Firebase Cloud Functions
└── database/      # Database schema & rules
```

## 🛠️ Available Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps for production
- `pnpm dev:admin` - Start only admin app
- `pnpm dev:web` - Start only web app

## 🔥 Firebase Setup

1. Create a Firebase project
2. Enable Authentication, Realtime Database, Storage, and Functions
3. Copy configuration to `.env.local`
4. Deploy rules: `firebase deploy --only database:rules,storage:rules`

## 📱 Apps

- **Admin Dashboard** - http://localhost:3000
- **Customer Web** - http://localhost:3001
- **Master Admin** - http://localhost:3002

## 🚀 Deployment

```bash
pnpm build
firebase deploy
```
