# Mend-2 Monorepo

A comprehensive workplace safety management platform built with React, TypeScript, and Supabase, structured as a monorepo with separate operations and marketing applications.

## Quick Start

```bash
# Install dependencies
npm install

# Start all applications
npm run dev

# Start specific application
npm run dev:ops          # Operations platform (port 5173)
npm run dev:marketing    # Marketing website (port 5174)
```

## Project Structure

```
mend-2/
├── apps/
│   ├── operations/      # Workplace safety management platform
│   └── marketing/       # Public-facing marketing website
├── packages/            # Shared components and utilities
├── docs/               # Documentation
├── supabase/           # Database migrations and configuration
└── scripts/            # Build and deployment scripts
```

## Applications

### 🏗️ Operations Platform (`/apps/operations`)
- **Purpose**: Authenticated workplace safety management system
- **Features**: Incident reporting, dashboards, compliance tracking
- **Tech Stack**: React, TypeScript, Supabase, Clerk Auth
- **Access**: Requires authentication via Clerk
- **URL**: `http://localhost:5173/operations` (dev)

### 🌐 Marketing Website (`/apps/marketing`)
- **Purpose**: Public marketing site and lead generation
- **Features**: Landing page, ROI calculator, case studies
- **Tech Stack**: React, TypeScript, Tailwind CSS
- **Access**: Public (no authentication required)
- **URL**: `http://localhost:5174` (dev)

## Architecture

This monorepo is designed with future microservices architecture in mind:

- **Clear Separation**: Operations and marketing are completely separate apps
- **Independent Deployment**: Each app can be deployed independently
- **Shared Resources**: Common utilities in shared packages
- **Authentication Boundaries**: Public marketing vs. authenticated operations

See [MONOREPO_ARCHITECTURE.md](./MONOREPO_ARCHITECTURE.md) for detailed architecture documentation.

## Key Features

### Operations Platform ✅
- Multi-role user management (9 distinct roles)
- Comprehensive incident reporting system
- File upload with Supabase Storage integration
- Real-time dashboards and analytics
- Mobile-responsive design
- Automated compliance tracking

### Marketing Website 🆕
- Modern landing page design
- Lead generation forms
- ROI calculator
- Case studies and testimonials
- SEO optimized
- Mobile-first responsive design

## Development Commands

```bash
# Development
npm run dev                 # Start all apps
npm run dev:ops            # Operations platform only
npm run dev:marketing      # Marketing website only

# Building
npm run build              # Build all apps
npm run build:ops          # Build operations platform
npm run build:marketing    # Build marketing website

# Utilities
npm run lint               # Lint all workspaces
npm run preview           # Preview built apps
```

## Deployment

### Vercel (Recommended)
The project is configured for Vercel deployment with automatic routing:
- Marketing website serves from root domain
- Operations platform serves from `/operations/*`
- Independent builds and deployments supported

### Environment Variables

#### Operations Platform
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
```

#### Marketing Website
```env
# Analytics and marketing tools (optional)
```

## Database

- **Platform**: Supabase (PostgreSQL)
- **Migrations**: Located in `/supabase/migrations/`
- **Setup**: Run migrations in Supabase dashboard or CLI

Key tables:
- `incidents` - Core incident records
- `users` - User accounts with role-based access
- `employers`, `workers`, `sites` - Entity relationships

## Security

- **Operations**: Full authentication required (Clerk)
- **Marketing**: Public access with optional login redirects
- **Data Isolation**: No shared sensitive data between apps
- **RBAC**: 9-role hierarchy in operations platform

## Performance

- **Operations**: ~1.1MB bundle (feature-rich platform)
- **Marketing**: <500KB bundle (optimized for speed)
- **Loading**: Independent loading strategies per app

## Contributing

1. **Operations Features**: Work in `apps/operations/`
2. **Marketing Content**: Work in `apps/marketing/`
3. **Shared Components**: Add to `packages/shared-*`
4. **Testing**: Each app maintains its own test strategy

## Tech Stack

### Shared
- React 18.3 + TypeScript
- Vite (build tool)
- Tailwind CSS
- NPM Workspaces

### Operations Specific
- Supabase (database, auth, storage)
- Clerk (authentication)
- TanStack Query (state management)
- React Hook Form + Zod (forms)
- Recharts (analytics)
- Mapbox (mapping)

### Marketing Specific
- Minimal dependencies
- Focus on performance and SEO
- Optimized for conversion

## Project Status

- **Operations Platform**: ✅ Production ready (see CLAUDE.md for details)
- **Marketing Website**: 🆕 Newly implemented structure
- **Monorepo Setup**: ✅ Complete and tested

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Detailed project status and technical details
- [MONOREPO_ARCHITECTURE.md](./MONOREPO_ARCHITECTURE.md) - Architecture documentation
- [Migration Instructions](./MIGRATION_INSTRUCTIONS.md) - Database setup
- [API Documentation](./docs/) - Additional technical docs

## Support

For technical issues:
1. Check the relevant app's documentation
2. Review environment variable configuration
3. Ensure database migrations are current
4. Verify authentication setup (for operations app)

---

**Note**: This monorepo structure supports both current operational needs and future microservices architecture. Each application can be extracted into its own repository when ready for independent scaling.
