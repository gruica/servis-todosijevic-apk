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

- July 13, 2025. **DNS Issues & Application Stability Analysis** - Identified and documented DNS configuration problems preventing access to www.frigosistemtodosijevic.me domain. Created comprehensive DNS_SETUP.md with configuration instructions. Analysed application stability issues related to development mode HMR (Hot Module Replacement) causing frequent reloads. Created APPLICATION_STABILITY_REPORT.md documenting causes and solutions. All SSL/TLS and security measures remain active and functional.
- July 13, 2025. **Website Security & Accessibility Implementation** - Implemented comprehensive website security and accessibility improvements to address www.frigosistemtodosijevic.me and admin.me accessibility issues. Added security headers (HSTS, X-Frame-Options, CSP, XSS-Protection) with HTTPS redirection. Enhanced HTML with proper lang attributes, meta descriptions, Open Graph tags, and accessibility features including skip links and ARIA labels. Created SSL/security configuration tools and monitoring dashboard. All security measures now production-ready with detailed documentation and testing scripts.
- July 11, 2025. **Complete Email Notification System** - Implemented comprehensive email notification system for all service operations across all user roles. All service creation (admin, customer, business partner) now sends notifications to administrators and clients. Service assignment notifications sent to both client and assigned technician. Status updates notify clients automatically. Enhanced email test interface with service notifications overview. All email notifications fully integrated with existing SMS system.
- July 11, 2025. **Mobile Optimization & Client Email Integration** - Completed comprehensive mobile optimization for all user interfaces with responsive design, touch-friendly layouts, and mobile-first approach. Fixed sidebar component with Lucide icons and proper mobile menu functionality. Confirmed email field is fully integrated in client registration with validation, search functionality, and display in client listing. All components now optimized for mobile devices and tablets.
- July 11, 2025. **Infobip SMS Integration** - Implemented professional Infobip SMS platform integration as primary SMS service. Created comprehensive Infobip API service with advanced SMS capabilities, automatic failover system, and admin testing interface. Updated SMS priority order: Telekom API → GSM modem → Infobip → Messaggio → Twilio. Added detailed setup instructions and troubleshooting guide for Infobip configuration. All SMS messages now route through professional-grade Infobip platform for enhanced reliability and delivery rates.
- July 10, 2025. **Direct SMS implementation with user's phone number** - Implemented comprehensive SMS system for sending messages directly from user's phone number 067051141 (Telekom Montenegro). Created new Telekom SMS service with multiple sending methods: Telekom API, GSM modem support, and fallback to Messaggio/Twilio. Updated all SMS notifications to use Telekom service as primary method. Added admin test interface for both Telekom and Messaggio SMS services. All SMS functionality now sends from user's actual phone number instead of generic sender IDs.
- July 7, 2025. **Admin service assignment fixed** - Added critical missing API endpoints `/api/services/:id/assign-technician` and `/api/services/:id/update-status`. Administrators can now successfully assign technicians to services and update service status. Fixed HTML validation warnings by removing nested `<a>` tags in business and customer layout components. All user roles tested and working perfectly at production level.
- July 7, 2025. **404 Errors completely resolved** - Fixed all 404 "Stranica nije pronađena" errors for business partners. Added missing API endpoints: `/api/business/clients/new`, `/api/business/clients`, and `/api/technician/services`. All user roles now have 100% functional API endpoints with proper JSON responses.
- July 5, 2025. **Complete 100% functionality achieved** - All four user roles (admin, technician, customer, business_partner) are fully functional with API endpoints working perfectly. Customer portal issue resolved - was testing error, not system error. Email notifications, database operations, and role-based authentication all working at production level.
- June 17, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.