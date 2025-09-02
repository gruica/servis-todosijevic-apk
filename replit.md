# Servis Todosijević - Service Management Application

## Overview
This is a comprehensive service management application for Frigo Sistem Todosijević, an appliance repair company. Its purpose is to streamline service operations, improve technician efficiency, and enhance customer communication. The application manages clients, services, technicians, and maintenance schedules for white goods appliances, offering both web and mobile (Android) interfaces for field technicians. The core API and user management are fully functional, with active email and mobile photo systems, and excellent server performance.

## User Preferences
Preferred communication style: Simple, everyday language.
The existing codebase and logic must not be changed.
Existing endpoints must remain untouched.
Changes must not affect the functionality of the application.
Focus on implementing and delivering functional solutions.
Always ask for permission before making any changes.
Only add new functionalities; do not change existing ones.
Test that existing functions work before and after changes.
Add new endpoints at the end of the server file.
Adapt new code to existing structures.
Never change the architecture of working code.
Never touch existing working code.
Never add, delete, or change any code without explicit user approval.
All code changes must first be explained to the user and receive their approval.
When adding new functions, check if they conflict with existing code.
If there is a conflict, ensure new code is not installed until its full implementation and functionality are confirmed.
Always add new endpoints to the end of the server file; do not change the order of existing routes.
Adapt new code to existing structures, not the other way around.
Refactoring existing functions is forbidden; only add new ones.
Creating new functions instead of changing existing ones is mandatory.

## System Architecture

### UI/UX Decisions
- **Framework**: React.js with TypeScript.
- **Components**: Shadcn/UI (built on Radix UI).
- **Styling**: Tailwind CSS with custom theme configuration.
- **Mobile Experience**: Optimized for mobile devices.
- **Design Patterns**: Professional dashboard-style interfaces with gradients, color-coded metrics, and clear typography.
- **Accessibility**: Comprehensive accessibility support.

### Technical Implementations
- **Frontend**: React.js, Wouter for routing, React Query for server state management.
- **Backend**: Node.js with Express.js, TypeScript, and ES modules.
- **Database**: PostgreSQL with Drizzle ORM. Neon serverless PostgreSQL for production.
- **Authentication**: JWT (JSON Web Tokens) with 30-day expiration for all user roles. Scrypt for password hashing.
- **Session Management**: PostgreSQL session store for production.
- **API Design**: RESTful API with role-based access control.
- **Mobile Packaging**: Capacitor for Android APK conversion.
- **Error Handling**: Robust error handling.
- **File Processing**: Multer for file uploads, WebP compression, and automated storage cleanup.
- **Image Processing**: Advanced OCR system with manufacturer-specific pattern detection.
- **SMS System**: Comprehensive SMS notification system.
- **Performance Optimizations**: Ultra-fast service start functionality (≤500ms response times).
- **SEO Optimization**: Advanced Google Guidelines implementation (meta tags, LocalBusiness schema, Core Web Vitals, dynamic sitemap.xml).
- **Email Integration**: Automatic email notification system for ComPlus and Beko brand services.
- **Servis Komerc System**: Parallel system for Beko brand services including automated daily reports, SMS, service completion tracking, and spare parts.
- **Device Return Functionality**: "Vrati aparat klijentu" feature in technician mobile interface.
- **Comprehensive Client Analysis**: Real-time data analysis of client history.
- **Folder System for Services**: Organized service management with folder tabs (Active, Business Partners, Finished, Canceled/Problematic, All Services).

### Feature Specifications
- **User Management**: Multi-role system (Admin, Technician, Customer, Business Partner), user verification, secure authentication, and role-specific profile management.
- **Service Management**: Full service lifecycle tracking, automated status updates, and handling for customer refusal.
- **Client & Appliance Management**: Detailed client profiles, categorized appliance registry, and service history.
- **Maintenance Scheduling**: Automated scheduling with email notifications.
- **Business Partner Integration**: Dedicated portal for partners to submit service requests, view completion details, and edit client information.
- **Spare Parts Management**: Comprehensive system for tracking, ordering, and managing spare parts.
- **Notifications**: In-app, SMS, and email notifications for all key events, with role-specific templates.
- **Data Export**: CSV export functionality for various database tables.

## External Dependencies
- **Email Service**: Nodemailer.
- **SMS Service**: Configurable SMS Mobile API.
- **Database**: PostgreSQL (Neon).
- **UI Libraries**: Shadcn/UI, Radix UI.
- **Styling**: Tailwind CSS.
- **Mobile Development**: Capacitor.
- **ORM**: Drizzle ORM.
- **Authentication**: Passport.js, scrypt.
- **File Uploads**: Multer.
- **Image Processing**: Sharp.