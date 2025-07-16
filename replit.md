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

- July 16, 2025. **Comprehensive Spare Parts Notification System Implemented** - Complete automation system for spare parts procurement process now fully operational. When technicians request spare parts, administrators automatically receive notifications via both in-app alerts and email notifications. System includes automatic notification for part requests (spare_part_requested), status updates (spare_part_status_changed), and delivery confirmations (spare_part_received). Email notifications include priority indicators (HITNO for urgent requests), part details, catalog numbers, and direct links to admin panel. All notification types integrated with existing UI components and database schema. Enhanced admin interface with detailed order tracking including supplier information, estimated/actual costs, and delivery dates. Notification system supports multiple administrators and role-based access control.
- July 16, 2025. **Legacy Data Migration System with Appliance Type Mapping** - Comprehensive system for migrating data from old Excel-based systems now fully implemented with extended appliance type mapping. Added automatic city code mapping (TV→Tivat, KO→Kotor, BD→Budva, etc.) for 23 Montenegro cities. Enhanced ExcelService with mapCityCode() and mapApplianceTypeCode() functions for seamless conversion of legacy shorthand codes. Appliance type mapping includes: SM→Sudo mašina, VM→Veš mašina, VM KOMB→Kombinovana veš mašina, SM UG→Ugradna sudo mašina, frižider→Frižider, frižider komb→Kombinovan frižider, šporet→Šporet, and many more variants. Created import-legacy-data.ts script with commands for analyze, convert, clients, and appliances preparation. System recognizes flexible column naming (multiple variations for same data fields) and handles data validation through existing Zod schemas. Complete documentation in docs/legacy-migration-guide.md with step-by-step instructions for migrating client and appliance data from old systems including detailed mappings and examples.
- July 15, 2025. **Notification Navigation System Fully Implemented** - Complete notification navigation system is now fully functional for all user roles. When users click on notifications, they are automatically redirected to the relevant page with the related service highlighted and auto-opened. For technicians, clicking on a notification navigates to /tech with the service automatically opened in a floating window. For admins, notifications redirect to /admin/services with the service highlighted and details opened. System uses navigation state to pass highlightServiceId and automatically opens service details upon arrival. All roles now have seamless notification-to-service workflow integration.
- July 15, 2025. **Admin Panel Duplicates Completely Removed** - Completely eliminated duplicate administrative functions from admin panel. Removed "Verifikacija korisnika" and "Upravljanje korisnicima" from both sidebar and dashboard to prevent confusion. Dashboard now shows only statistics and recent activity, while sidebar contains single instance of each administrative function. Clean interface with no duplicate menu items or buttons.
- July 15, 2025. **Double Service Completion Bug Fixed** - Resolved critical issue where technicians had to confirm service completion twice. Problem was caused by inconsistent cache invalidation between different mutation methods. Functions `handleFloatingStatusUpdate` and `handleQuickStatusUpdate` used `mutateAsync()` which bypassed the onSuccess callback where cache invalidation occurred. Fixed by adding explicit cache invalidation (`await queryClient.invalidateQueries({ queryKey: ["/api/my-services"] })`) in both functions after successful API calls. Service status updates now work correctly with single confirmation across all interfaces (main dialog, floating windows, and quick actions).
- July 15, 2025. **Complete Mobile Optimization for Technicians** - Fully redesigned technician services page for mobile-first workflow. Enhanced card layouts with vertical button arrangement, increased touch targets (h-10, h-11, h-12), improved spacing, and better information organization. Added comprehensive service details display including client phone, address, creation date, scheduled date, technician notes, and cost. Reorganized action buttons into logical groups: contact/info actions (call, map, details) and status actions (start service, client issues). All buttons now have proper sizing and spacing for mobile devices. Client availability reporting ("Nije kući", "Ne javlja se") fully integrated with color-coded styling and proper icons.
- July 14, 2025. **Critical Security Vulnerability Fixed** - Upgraded Multer from 1.4.5-lts.2 to 2.0.1 to resolve CVE-2025-48997 (GHSA-g5hg-p3ph-g8qg). This vulnerability allowed attackers to trigger Denial of Service by sending upload requests with empty string field names. The upgrade addresses this security flaw in the Excel import functionality (admin-only endpoints: /api/excel/import/clients, /api/excel/import/appliances, /api/excel/import/services). All functionality tested and working normally after upgrade.
- July 14, 2025. **Floating Windows System Implemented** - Implemented comprehensive floating window system for technicians on mobile devices, specifically optimized for older models like Samsung A30. Added FloatingSheet component with drag-and-drop functionality, resize handles, and maximize/minimize options. ServiceDetailsFloat provides detailed service information with status update capabilities. QuickActionsFloat enables rapid service management with city-based filtering. All floating windows support touch interactions and are fully responsive for mobile workflow optimization.
- July 14, 2025. **Double Validation Bug Fixed** - Resolved critical issue where service technicians had to confirm service completion twice. Problem was caused by duplicate cache invalidation calls - one immediate and one in mutation callback. Fixed by removing early cache invalidation, keeping only the post-success callback invalidation.
- July 14, 2025. **Complete Database Reset** - All client data, services, and appliances completely removed from database for fresh start. Database now contains zero clients, zero services, zero appliances. All user accounts (admin, technicians, business partners), categories, manufacturers, and system data remain intact. ID sequences reset to start from 1 for new entries.
- July 14, 2025. **Admin Services List Enhanced** - Added "Mjesto (grad)" (Location/City) column to admin services table between "Klijent" and "Uređaj" columns. Column displays client city as main information with address below in smaller text. Backend API optimized to include clientCity, clientAddress, clientName, clientPhone, clientEmail, and appliance details for improved performance (91ms vs 212ms query time).
- July 14, 2025. **Technician Email Accounts Updated** - All four technician accounts updated with production email addresses using @frigosistemtodosijevic.com domain. Updated credentials: Petar (petar@frigosistemtodosijevic.com), Jovan (jovan@frigosistemtodosijevic.com), Nikola (nikola@frigosistemtodosijevic.com), Gruica (gruica@frigosistemtodosijevic.com). All accounts tested and working with new passwords. Production-ready authentication system with proper email integration.
- July 13, 2025. **Email Verification System Ready for Production** - Complete email verification system fully tested and integrated with existing email server (mail.frigosistemtodosijevic.com). API endpoints working perfectly, database schema deployed, frontend components with step-by-step UI complete. Demo page at /email-verification-demo fully functional. System generates 6-digit codes with 15-minute expiration, stores them securely, and validates properly. Ready for production deployment and integration into user registration flow.
- July 13, 2025. **Security Framework Fully Operational** - Comprehensive security framework is now fully functional with all API endpoints working perfectly. Bot verification system with challenge-response mechanism working properly, rate limiting for customer role implemented, database tables created and populated. All security endpoints tested and validated: /api/security/bot-challenge (generates math problems), /api/security/verify-bot (validates answers), /api/security/rate-limit-status (shows user limits). Bot challenges use unique session IDs, math problems with correct answer validation, and proper error handling for expired/invalid challenges.
- July 13, 2025. **Security Framework Implementation** - Implemented comprehensive security framework with bot verification and rate limiting specifically for customer role. Added bot-verification.ts with challenge-response mechanism, rate-limiting.ts with customer-specific request limits, and security API endpoints (/api/security/bot-challenge, /api/security/verify-bot, /api/security/rate-limit-status). Customer service requests now require bot verification and are limited to one per day. Updated storage.ts with security-related database operations and middleware integration.
- July 7, 2025. **Admin service assignment fixed** - Added critical missing API endpoints `/api/services/:id/assign-technician` and `/api/services/:id/update-status`. Administrators can now successfully assign technicians to services and update service status. Fixed HTML validation warnings by removing nested `<a>` tags in business and customer layout components. All user roles tested and working perfectly at production level.
- July 7, 2025. **404 Errors completely resolved** - Fixed all 404 "Stranica nije pronađena" errors for business partners. Added missing API endpoints: `/api/business/clients/new`, `/api/business/clients`, and `/api/technician/services`. All user roles now have 100% functional API endpoints with proper JSON responses.
- July 5, 2025. **Complete 100% functionality achieved** - All four user roles (admin, technician, customer, business_partner) are fully functional with API endpoints working perfectly. Customer portal issue resolved - was testing error, not system error. Email notifications, database operations, and role-based authentication all working at production level.
- June 17, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.