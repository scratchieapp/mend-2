# Mend-2 Monorepo Architecture

## Overview

This document describes the monorepo architecture for the Mend-2 platform, which separates the operations platform from the marketing website while maintaining shared resources and enabling future microservices migration.

## Project Structure

```
mend-2/
├── apps/
│   ├── operations/          # Operations platform (React/TypeScript)
│   │   ├── src/            # All existing platform code
│   │   ├── index.html      # Operations platform entry
│   │   ├── vite.config.ts  # Operations-specific Vite config
│   │   └── package.json    # Operations dependencies
│   │
│   └── marketing/          # Marketing website (React/TypeScript)
│       ├── src/
│       │   ├── pages/      # Marketing pages
│       │   └── components/ # Marketing-specific components
│       ├── index.html      # Marketing website entry
│       ├── vite.config.ts  # Marketing-specific Vite config
│       └── package.json    # Marketing dependencies
│
├── packages/               # Shared packages
│   ├── shared-ui/         # Common UI components
│   ├── shared-utils/      # Shared utilities
│   └── shared-types/      # TypeScript type definitions
│
├── docs/                  # Project documentation
├── scripts/               # Build and deployment scripts
├── supabase/             # Database migrations and config
└── package.json          # Root workspace configuration
```

## Architecture Principles

### 1. Clear Separation of Concerns
- **Operations App**: Authenticated workplace safety management platform
- **Marketing App**: Public-facing marketing website
- **Shared Packages**: Reusable components and utilities

### 2. Independent Deployment
- Each app can be built and deployed independently
- Separate build outputs: `dist/operations` and `dist/marketing`
- Different ports for development: Operations (5173), Marketing (5174)

### 3. Authentication Boundaries
- **Operations**: Full Clerk authentication required
- **Marketing**: Public access with optional login redirect to operations
- Clear routing separation prevents authentication conflicts

### 4. Future-Proof Design
- Apps are structured to support extraction into separate repositories
- Minimal coupling between operations and marketing
- Shared dependencies are explicitly managed

## Development Workflow

### Starting Development

```bash
# Start both apps
npm run dev

# Start specific app
npm run dev:ops          # Operations platform on port 5173
npm run dev:marketing    # Marketing website on port 5174
```

### Building Applications

```bash
# Build all apps
npm run build

# Build specific app
npm run build:ops        # Operations platform
npm run build:marketing  # Marketing website
```

### Installing Dependencies

```bash
# Install workspace dependencies
npm install

# Install in specific workspace
npm install <package> --workspace=@mend/operations
npm install <package> --workspace=@mend/marketing
```

## Routing Configuration

### Development Routes
- **Marketing**: `http://localhost:5174/` (primary site)
- **Operations**: `http://localhost:5173/` (authenticated platform)

### Production Routes
- **Marketing**: `https://yourdomain.com/` (root domain)
- **Operations**: `https://yourdomain.com/operations` (authenticated platform)

### Route Handling
The marketing website includes navigation to the operations platform:
- Login buttons redirect to `/operations`
- Marketing footer includes operations platform links
- Operations platform remains isolated at `/operations/*`

## Shared Dependencies Strategy

### Current Shared Dependencies
- React & React DOM
- TypeScript
- Tailwind CSS
- Vite
- ESLint

### App-Specific Dependencies
- **Operations**: Supabase, Clerk, complex form libraries, charts
- **Marketing**: Minimal dependencies focused on landing pages

### Future Shared Packages
- `@mend/shared-ui`: Common buttons, forms, layouts
- `@mend/shared-utils`: Date formatting, validation, API helpers
- `@mend/shared-types`: TypeScript interfaces for data models

## Deployment Strategy

### Vercel Configuration
The `vercel.json` configuration supports:
- Independent builds for each app
- Route-based routing to correct app
- Security headers for both applications

### Build Outputs
- Operations: `dist/operations/`
- Marketing: `dist/marketing/`
- Each contains a complete SPA build

### Environment Variables
Each app can have its own environment configuration:
- Operations: Supabase, Clerk, Mapbox tokens
- Marketing: Analytics, forms, CRM integrations

## Migration Path to Microservices

### Phase 1: Current Monorepo (✅ Complete)
- Separate apps in single repository
- Shared build pipeline
- Independent deployment capability

### Phase 2: Service Extraction (Future)
- Move operations to `mend-operations` repository
- Move marketing to `mend-marketing` repository
- Publish shared packages to private npm registry

### Phase 3: Microservices (Future)
- API Gateway for routing
- Independent databases per service
- Service-to-service communication via APIs

## Security Considerations

### Authentication Boundaries
- Marketing app never handles sensitive data
- Operations app remains behind authentication
- No shared authentication state between apps

### Asset Isolation
- Each app manages its own assets
- No cross-app asset dependencies
- Independent security headers and policies

## Development Guidelines

### Adding New Features

#### To Operations Platform
1. Work in `apps/operations/src/`
2. Use existing authentication and database patterns
3. Follow established component structure

#### To Marketing Website
1. Work in `apps/marketing/src/`
2. Focus on public-facing content
3. Use minimal dependencies
4. Ensure mobile responsiveness

#### Shared Components
1. Evaluate if truly shared across both apps
2. Create in appropriate `packages/` directory
3. Export from package index
4. Import in consuming apps

### Code Quality
- Each app maintains its own linting rules
- Shared TypeScript configuration in root
- Independent testing strategies per app

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure apps use different ports (5173, 5174)
2. **Build Path Issues**: Check `outDir` in `vite.config.ts`
3. **Dependency Conflicts**: Use workspace-specific installation
4. **Routing Issues**: Verify Vercel routes configuration

### Development Commands

```bash
# Reset all dependencies
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install

# Clean build outputs
rm -rf dist apps/*/dist packages/*/dist
npm run build

# Check workspace structure
npm list --workspaces
```

## Performance Considerations

### Bundle Size
- Operations: ~1.1MB (complex platform with many features)
- Marketing: <500KB (minimal, optimized for speed)

### Loading Strategy
- Marketing loads instantly (public cache)
- Operations lazy-loads after authentication
- Shared assets cached across apps

### SEO & Analytics
- Marketing optimized for search engines
- Operations focused on application performance
- Independent analytics tracking per app

## Next Steps

1. **Complete Setup**: Ensure all dependencies installed correctly
2. **Test Routing**: Verify both apps start independently
3. **Deploy**: Test deployment to staging environment
4. **Monitoring**: Set up separate monitoring for each app
5. **Documentation**: Add app-specific README files

This architecture provides a solid foundation for the current needs while maintaining flexibility for future growth and potential service separation.