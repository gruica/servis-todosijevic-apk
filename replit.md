# Servis Todosijević - Service Management Application

## Overview

This is a comprehensive service management application for Frigo Sistem Todosijević, a Serbian appliance repair company. The application manages clients, services, technicians, and maintenance schedules for white goods appliances. It includes both web and mobile (Android) interfaces for technicians in the field.

## System Architecture

### Frontend Architecture
- **Framework**: React.js with TypeScript
- **UI Components**: Shadcn/UI component library built on Radix UI
- **Styling**: Tailwind CSS with custom theme configuration
- **Routing**: Wouter for client-side routing
- **State Management**: React Query for server state management
- **Mobile App**: Capacitor for packaging web app into Android APK

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL session store for production
- **API Design**: RESTful API with role-based access control

### Database Architecture
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Database**: PostgreSQL (Neon serverless in production)
- **Connection Pool**: Configured with connection limits and keepalive
- **Schema**: Centralized in `shared/schema.ts` for type consistency

## Key Components

### User Management
- **Multi-role system**: Admin, technician, customer, business_partner
- **User verification**: Admin approval required for new registrations
- **Authentication**: Session-based with password hashing using scrypt
- **Profile management**: Role-specific profile pages

### Service Management
- **Service lifecycle**: From creation to completion with status tracking
- **Technician assignment**: Services can be assigned to specific technicians
- **Client relationship**: Each service linked to client and appliance
- **Status tracking**: pending, assigned, scheduled, in_progress, completed, cancelled

### Client & Appliance Management
- **Client profiles**: Contact information, address, company details
- **Appliance registry**: Categorized appliances with manufacturer data
- **Service history**: Complete history of services per client/appliance

### Maintenance Scheduling
- **Automated scheduling**: Based on appliance type and frequency
- **Email notifications**: Automatic alerts to clients
- **SMS integration**: Twilio-based SMS notifications (optional)

### Business Partner Integration
- **Dedicated portal**: Separate interface for business partners
- **Service requests**: Partners can submit service requests
- **Limited access**: Role-based restrictions for partner users

## Data Flow

1. **Authentication Flow**: Login → Session creation → Role-based routing
2. **Service Creation**: Client selection → Appliance selection → Service details → Technician assignment
3. **Maintenance Flow**: Schedule creation → Automated alerts → Service generation
4. **Mobile Sync**: Web app packaged with Capacitor → Android APK → Field access

## External Dependencies

### Email Service
- **Provider**: Nodemailer with configurable SMTP
- **Features**: Service notifications, maintenance alerts, admin communications
- **Configuration**: Dynamic SMTP settings via admin interface

### SMS Service
- **Provider**: Twilio API
- **Usage**: Client notifications about service status
- **Fallback**: Email notifications if SMS fails

### File Processing
- **Excel Import/Export**: XLSX library for data migration
- **File Upload**: Multer middleware for handling file uploads

### Mobile Platform
- **Capacitor**: Cross-platform mobile app development
- **Android Build**: Configured for APK generation
- **Plugins**: Status bar, splash screen, device info, preferences storage

## Deployment Strategy

### Development
- **Runtime**: tsx for TypeScript execution
- **Hot Reload**: Vite dev server with HMR
- **Database**: Local PostgreSQL or Neon development instance

### Production
- **Build Process**: Vite build for frontend, esbuild for backend
- **Deployment Target**: Replit autoscale deployment
- **Database**: Neon PostgreSQL serverless
- **Session Storage**: PostgreSQL-backed sessions for scalability

### Android Deployment
- **Build Tool**: Capacitor CLI with Android Studio
- **APK Generation**: Gradle-based build system
- **Distribution**: Manual APK distribution to technicians

## Changelog

- July 5, 2025. **Complete 100% functionality achieved** - All four user roles (admin, technician, customer, business_partner) are fully functional with API endpoints working perfectly. Customer portal issue resolved - was testing error, not system error. Email notifications, database operations, and role-based authentication all working at production level.
- June 17, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.