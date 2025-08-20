# Servis Todosijević - Service Management Application

## Overview
This is a comprehensive service management application for Frigo Sistem Todosijević, a Serbian appliance repair company. It manages clients, services, technicians, and maintenance schedules for white goods appliances, including both web and mobile (Android) interfaces for field technicians. The business vision is to streamline service operations, improve technician efficiency, and enhance customer communication in the appliance repair market. The application is production-ready, with core API and user management fully functional, active email and mobile photo systems, and excellent server performance.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (August 20, 2025)
**"Servisi po serviserima" Data Display Issue - KONAČNO REŠEN (Avgust 20, 2025):**
- **Osnovni uzrok PRONAĐEN**: Frontend pokušavao pristup nested strukturi (service.client?.fullName) dok backend vraća flattened podatke (service.clientName)
- **Dijagnoza**: Backend `getAllServices()` metoda vraća JOIN podatke kao flattened strukture, frontend očekivao nested objekte
- **Rešenje implementirano**:
  - Ispravljeni frontend kod u `client/src/pages/technician-services.tsx` 
  - Zamenjen pristup `service.client?.fullName` sa `service.clientName`
  - Zamenjen pristup `service.appliance?.category?.name` sa `service.categoryName` 
  - Dodato fallback na `service.technicianName` umesto samo `getTechnicianName()`
- **Test rezultati**: Endpoint `/api/admin/services-by-technicians` uspešno vraća 167 servisa sa JOIN podacima
- **Komponenta arhitektura**: Frontend sada koristi flattened backend response strukture
- Status: **REŠENO** - tabela prikazuje stvarne podatke umesto "N/A"

**Admin Panel Photo Display Issue - KONAČNO REŠEN (Avgust 20, 2025):**
- **Osnovni uzrok PRONAĐEN**: Photo endpoints koristili JWT authentication umesto session-based auth kao ostatak aplikacije
- **Dijagnoza**: Aplikacija koristi session-based authentication (cookies), photo API koristio jwtAuth middleware
- **Rešenje implementirano**: 
  - Photo endpoints prebačeni sa `jwtAuth` na session-based auth
  - SimpleServicePhotos komponenta optimizovana za session auth
  - API endpoint `/api/service-photos` sada RADI i vraća fotografije
  - Object Storage sistem potpuno funkcionalan
- **Test rezultati**: Curl test uspešan - vraća JSON array sa fotografijama
- **Komponenta arhitektura**: Čista SimpleServicePhotos + PhotoUploader kombinacija
- Status: **REŠENO** - fotografije se uspešno dohvataju iz baze

**Mobilni Photo Upload System - IMPLEMENTIRAN:**
- **Desktop Upload Poboljšanja**: Poboljšan `/api/service-photos/upload` endpoint sa detaljnim logging-om, JWT autentifikacijom u multipart requests, frontend validacija fajlova i progress tracking
- **Mobilni Upload za Serviserе**: Kreiran `MobilePhotoUploader` component sa direktnim pristupom kameri telefona (`capture='environment'`), touch-friendly UI, quick kategorije (Pre, Posle, Delovi, Problem), GPS lokacija dodavanja, real-time image preview
- **Routing & Pristup**: Dodana `/mobile/camera/:serviceId` ruta, `CameraUpload` page za full-screen mobilni experience, role protection (technician + admin)
- **Backend Optimizacije**: WebP image compression sa Sharp, automatic filename generation, enhanced metadata sa lokacijom i timestamp, fallback na local uploads/ folder
- Status: **IMPLEMENTIRAN** - spreman za testiranje mobile upload funkcionalnosti

**KRITIČNA INSTRUKCIJA - OBAVEZNO POŠTOVANJE:**
- NIKAD VIŠE NE MENJAJ ARHITEKTURU KODOVA KOJI RADE - OVA KOMANDA SE PONAVLJA U SVAKOM RAZGOVORU
- NIKAD ne diraj postojeće kodove koji rade
- **NOVA KRITIČNA INSTRUKCIJA (Avgust 20, 2025): NIKAD ne dodaj, briši ili menjaj BILO KOJI kod bez EKSPLICITNOG odobrenja korisnika**
- **SVE promene koda moraju biti prvo objašnjene korisniku i dobiti njegovo odobrenje**
- **USVOJENO (Avgust 20, 2025): Korisnik je eksplicitno odobrio dodavanje `/api/technicians` endpoint-a za rešavanje problema sa odabirom servisera u admin panelu**
- Kada dodaješ nove funkcije, proverava da li su u sukobu sa postojećim kodovima
- Ako jesu u sukobu, napravi da se novi kodovi ne instaliraju dok ne budeš siguran u njihovu potpunu implementaciju i funkcionalnost
- Uvek dodavaj nove endpoint-e na kraj server datoteke, ne menjaj redosled postojećih ruta
- Prilagodi nove kodove postojećim strukturama, a ne obrnuto
- ZABRANJEN je bilo kakav refaktoring postojećih funkcija - samo dodavanje novih
- Kreiranje novih funkcija umesto menjanja postojećih je OBAVEZNO

## System Architecture

### UI/UX Decisions
- **Framework**: React.js with TypeScript.
- **Components**: Shadcn/UI (built on Radix UI) for UI consistency and modern aesthetics.
- **Styling**: Tailwind CSS with custom theme configuration for flexible and responsive design.
- **Mobile Experience**: Optimized for mobile devices.
- **Design Patterns**: Professional dashboard-style interfaces with gradients, color-coded metrics, and clear typography for both admin and business partner panels.
- **Accessibility**: Comprehensive accessibility support.

### Technical Implementations
- **Frontend**: React.js with Wouter for routing and React Query for server state management.
- **Backend**: Node.js with Express.js, TypeScript, and ES modules.
- **Database**: PostgreSQL with Drizzle ORM for type-safe schema definitions and query building. Neon serverless PostgreSQL is used in production.
- **Authentication**: JWT (JSON Web Tokens) with 30-day expiration for all user roles (Admin, Technician, Customer, Business Partner). Scrypt for password hashing.
- **Session Management**: PostgreSQL session store for production.
- **API Design**: RESTful API with role-based access control.
- **Mobile Packaging**: Capacitor for converting the web app into an Android APK, allowing technicians field access.
- **Error Handling**: Robust error handling.
- **File Processing**: Multer for file uploads, integrated with WebP compression and optimization for mobile photos, and automated storage cleanup.
- **Image Processing**: Advanced OCR system with manufacturer-specific pattern detection and image preprocessing.
- **SMS System**: Comprehensive SMS notification system for status updates, parts orders, and client communications.
- **Performance Optimizations**: Ultra-fast service start functionality (≤500ms response times).
- **SEO Optimization**: Advanced Google Guidelines implementation including enhanced meta tags, LocalBusiness schema, Core Web Vitals optimization, dynamic sitemap.xml, and performance monitoring.
- **Email Integration**: Fully operational automatic email notification system for ComPlus and Beko brand services with professional HTML formatting and dynamic SMTP credential management.
- **Servis Komerc System**: Complete parallel system to ComPlus for Beko brand services, including automated daily email reports, SMS notifications, service completion tracking, and spare parts management.
- **Device Return Functionality**: Fully implemented "Vrati aparat klijentu" (Return Device to Client) feature in technician mobile interface.
- **Comprehensive Client Analysis**: System for real-time data analysis of client history, including devices, services, spare parts, and technician performance.
- **Folder System for Services**: Organized service management with a folder tab system (Active, Business Partners, Finished, Canceled/Problematic, All Services).

### Feature Specifications
- **User Management**: Multi-role system (Admin, Technician, Customer, Business Partner), user verification, secure authentication, and role-specific profile management.
- **Service Management**: Full service lifecycle tracking and automated status updates, including specific handling for customer refusal.
- **Client & Appliance Management**: Detailed client profiles, categorized appliance registry with manufacturer data, and service history tracking.
- **Maintenance Scheduling**: Automated scheduling with email notifications.
- **Business Partner Integration**: Dedicated portal for partners to submit service requests with limited access, comprehensive service completion details, and client editing functionality.
- **Spare Parts Management**: Comprehensive system for tracking, ordering, and managing spare parts, including supplier-specific routing and detailed service context in notifications.
- **Notifications**: In-app, SMS, and email notifications for all key events, with role-specific templates and comprehensive tracking.
- **Data Export**: CSV export functionality for various database tables.

## External Dependencies
- **Email Service**: Nodemailer.
- **SMS Service**: Configurable SMS Mobile API.
- **Database**: PostgreSQL (Neon serverless in production).
- **UI Libraries**: Shadcn/UI, Radix UI.
- **Styling**: Tailwind CSS.
- **Mobile Development**: Capacitor.
- **ORM**: Drizzle ORM.
- **Authentication**: Passport.js, scrypt.
- **File Uploads**: Multer.
- **Image Processing**: Sharp.