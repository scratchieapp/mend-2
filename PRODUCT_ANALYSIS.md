# Mend-2 Product Analysis

## Project Overview
Mend-2 is a comprehensive workplace safety and incident management platform built with modern web technologies. It provides tools for tracking workplace incidents, managing safety compliance, and generating analytical reports for various stakeholders.

## Technology Stack

### Frontend
- **Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite 5.4
- **UI Components**: 
  - shadcn/ui (Radix UI primitives)
  - Tailwind CSS for styling
  - Lucide React for icons
- **State Management**: 
  - React Context API for auth
  - TanStack Query (React Query) for server state
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase real-time subscriptions
- **File Storage**: Supabase Storage (implied)

### Development Tools
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **MCP Servers**: Playwright, Supabase, Vercel, Clerk, GitHub integrations

## Core Features

### 1. Multi-Role Authentication System
- **Role-Based Access Control (RBAC)** with multiple user roles:
  - Administrator
  - Builder Admin
  - Employer Admin
  - Site Admin/Manager
  - Medical Professional
  - Employee/Contractor
  - Vendor
  - Guest/Public User
  - Mend-specific roles (Super Admin, Account Manager, Analyst, Data Entry)
- **Protected Routes** with role-specific access
- **Session Management** with auto-refresh tokens

### 2. Dashboard System
- **Executive Dashboard**: Strategic KPIs and performance metrics
- **Medical Professional Dashboard**: Case management and patient tracking
- **Builder Senior Dashboard**: Construction-specific safety metrics
- **Employer Dashboard**: Company-wide incident tracking
- **Role-specific dashboards** for each user type

### 3. Incident Management
- **Incident Reporting**: Comprehensive incident recording system
- **Injury Details**: 
  - Body part mapping
  - Injury type classification
  - Severity assessment
- **Treatment Tracking**: Medical professional assignments and follow-ups
- **Notification System**: Automated alerts to relevant parties

### 4. Safety Analytics
- **Metrics Cards**: Real-time safety KPIs
- **LTI (Lost Time Injury) Tracking**: Industry comparison charts
- **Performance Overview**: Trend analysis and predictions
- **Time Series Analysis**: Historical incident patterns
- **Regional Analysis**: Geographic incident distribution

### 5. Data Management
- **Hours Management**: Track worked hours for accurate rate calculations
- **Site Management**: Multi-site support with location tracking
- **Employer Management**: Multi-employer platform
- **Reference Tables**: Configurable lookup tables for standardized data entry

### 6. Reporting System
- **Monthly Reports**: Automated monthly safety reports
- **Export Capabilities**: Data export for external analysis
- **Custom Report Generation**: Flexible reporting tools

### 7. Administrative Tools
- **User Management**: Create, update, delete users with role assignments
- **Data Import Admin**: Bulk data import capabilities
- **System Logs**: Audit trail and system monitoring
- **Search & Verify**: Data validation tools

## Database Schema Highlights

### Key Tables
- **users**: User accounts with role assignments
- **user_roles**: Role definitions and permissions
- **incidents**: Core incident records
- **injuries**: Detailed injury information
- **employers**: Company/organization records
- **sites**: Work location management
- **workers**: Employee/contractor records
- **medical_professionals**: Healthcare provider registry
- **hours_worked**: Time tracking for rate calculations
- **corrective_actions**: Safety improvement tracking

### Reference Tables
- **body_parts**: Anatomical classification
- **bodily_location_codes**: Standardized injury location codes
- **agency_of_injury_codes**: Cause classification
- **nature_of_injury_codes**: Injury type classification
- **mechanism_of_injury_codes**: How injury occurred

## Security Features
- Row-level security via Supabase
- Environment-based configuration
- Secure session management
- Role-based data access
- Audit logging capabilities

## Integration Points
- **Supabase**: Primary backend and database
- **Vercel**: Deployment platform (via MCP)
- **Clerk**: Additional auth capabilities (via MCP)
- **GitHub**: Version control and CI/CD (via MCP)
- **Playwright**: Testing automation (via MCP)

## Key User Workflows

1. **Incident Reporting Flow**
   - Worker/supervisor reports incident
   - System captures detailed injury information
   - Notifications sent to relevant parties
   - Medical professional assigned if needed
   - Follow-up and corrective actions tracked

2. **Dashboard Analysis Flow**
   - Users log in and are routed to role-specific dashboard
   - Real-time metrics displayed
   - Drill-down capabilities for detailed analysis
   - Export options for reporting

3. **Administrative Flow**
   - Admins manage users and permissions
   - Configure reference tables
   - Import bulk data
   - Monitor system usage and logs

## Development Patterns
- Component-based architecture with reusable UI components
- Custom hooks for data fetching and state management
- Separation of concerns with dedicated service files
- Type-safe development with TypeScript
- Responsive design with mobile support

## Performance Optimizations
- React Query for efficient data caching
- Lazy loading of routes and components
- Optimistic UI updates
- Debounced search and filter operations

## Future Enhancement Opportunities
- Enhanced real-time collaboration features
- Advanced predictive analytics
- Mobile application development
- API for third-party integrations
- Advanced reporting and visualization tools
- Machine learning for incident prediction
- Integration with wearable safety devices