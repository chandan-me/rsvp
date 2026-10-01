# RSVP Pro — Enterprise Event Management & Gate Operations Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3.8-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![Security](https://img.shields.io/badge/Security-Hardened%20OWASP-emerald)](#security--hardening-architecture)

A modular, enterprise-grade RSVP and Event Operations Platform engineered with a clean architecture, dynamic form builder, multi-staff gate station authorization, branded QR codes with embedded center logos, real-time camera scanning, and zero-trust security controls.

---

## 🚀 Key Architectural Pillars

### 1. Multi-Staff Gate Station Authorization & Database Persistence
- **Host Station Management**: Event hosts can provision unlimited gatekeeper accounts with custom Staff User IDs & Passcodes or use 1-click **Random Generate** (`GATE-NORTH-3`, `GP-482910`).
- **Database Persistence**: All credentials are stored in `gate_credentials` with assigned checkpoints (*Main Gate*, *VIP Lounge*, *Conference Hall A*), active status toggles, and notes.
- **Operator Audit Attribution**: Every scan recorded in `checkins` stamps the operator's `gate_user_id`. The host dashboard displays live audit counts of attendees checked in by each staff member, total logins, and last active timestamp.
- **Dedicated Tokenized Station URL (`/checkin/[accessKey]`)**: Protects the gate station from open access. Scanning stations start in a locked state requiring Staff User ID and Passcode verification before activating the camera scanner.

### 2. Branded QR Codes with Embedded Center Image/Logo
- **High Error Correction (Level "H" — 30% redundancy)**: Allows center coverage by logos or badges without losing scanner decodability.
- **Crisp SVG Composition**: Generates high-density vector QR passes with embedded center badges:
  - 🎟️ **Ticket Pass** badge
  - 🛡️ **Verified Security Shield**
  - ✨ **RSVP Pro Brand Star**
  - 📅 **Event Calendar**
  - 🖼️ **Custom Logo Image Upload**: Attendees and organizers can upload custom corporate or sponsor logos to embed directly in the center of their QR code.
- **Instant SVG/PNG Download**: 1-click export of digital passes.

### 3. Dynamic Custom Form Builder (Google Forms-Style)
- **Custom Question Types**: Text, long textarea, single choice (radio), multiple choice (checkbox), boolean toggles, and document/image upload specifications.
- **Required / Optional Rules**: Centralized validation with order indexing and per-option persistence.
- **Transactional RSVP**: Atomic registration, auto-allocation of tickets with unique cryptographic tokens, and automated email confirmation dispatch.

### 4. Real-Time Camera Scanner & Dual Mode Check-in
- **In-Browser Machine Vision (`jsqr`)**: Zero external dependencies; decodes camera video feeds in real-time.
- **Hardware Agnostic**: Seamless toggle between rear (`environment`) and front (`user`) cameras.
- **Duplicate Prevention**: Instant visual and acoustic feedback (synthesized Web Audio beeps) preventing re-use of checked-in tickets.
- **Manual Fallback**: Quick ticket code search and attendee name lookup.

---

## 🛡️ Security & Hardening Architecture

| Security Domain | Mitigation / Architecture | Standard / RFC |
|---|---|---|
| **Gate PIN Brute-Force** | Sliding-window in-memory rate limiter (8 attempts / 60s with `Retry-After` header) | RFC 6585 (429) |
| **CSV Formula Injection** | Prepends single quote (`'`) to any cell beginning with `=`, `+`, `-`, `@`, `\t`, `\r` | OWASP CWE-1236 |
| **Clickjacking** | `X-Frame-Options: SAMEORIGIN` across all routes | OWASP Top 10 |
| **MIME Sniffing** | `X-Content-Type-Options: nosniff` | RFC 7231 |
| **Hardware Permissions** | `Permissions-Policy: camera=*, microphone=(), geolocation=()` | W3C Permissions |
| **Station Session Tokens** | Session-scoped local tokens (`gate_session_[id]`) with instant lock & switch | Zero Trust |

---

## 🏗️ Technology Stack

- **Core Engine**: Next.js 16.3.8 (App Router, Turbopack, Server Actions, Route Handlers)
- **Runtime**: Node.js v18.18+ / v20+ LTS
- **UI & Design**: Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **QR Engine**: `qrcode` (SVG with composite defs & high error correction), `jsqr`
- **Validation**: Zod (strict schema typing and coercion)
- **Database & Auth**: Supabase PostgreSQL + Resilient In-Memory Singleton Fallback

---

## 📁 Repository Structure

```text
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── checkin/                 # Check-in processing & operator attribution
│   │   │   ├── events/                  # Event CRUD, settings, questions, guests
│   │   │   │   └── [id]/gate-credentials # Multi-staff credential provisioning
│   │   │   │   └── [id]/gate-auth       # Rate-limited gatekeeper verification
│   │   │   ├── qr/                      # Branded QR generation with center logos
│   │   │   └── rsvp/                    # Public RSVP submission & resend logic
│   │   ├── checkin/
│   │   │   ├── route.ts                 # AccessKey redirect resolver
│   │   │   └── [accessKey]/page.tsx     # Tokenized gate station lock & scanner
│   │   ├── e/[slug]/                    # Public event invitation page
│   │   │   └── confirmation/page.tsx    # Digital pass with interactive QR logo picker
│   │   ├── events/                      # Host console & event management
│   │   └── login/page.tsx               # Multi-role portal (Google, Host, Admin, Gate)
│   ├── components/
│   │   ├── CheckinScanner.tsx           # Real-time QR camera scanner & audio feedback
│   │   ├── GateStationsTab.tsx          # Multi-staff management, audit table & QR modal
│   │   └── Navbar.tsx                   # Responsive navigation
│   ├── lib/
│   │   ├── notifications/               # Email templating & dispatch logger
│   │   ├── services/                    # Domain logic (dbProvider, event, checkin, rsvp, qrHelper, rateLimiter)
│   │   └── validations/                 # Zod validation schemas
│   └── types/database.ts                # TypeScript interfaces & database models
├── requirements.txt                     # System & runtime dependency specification
├── next.config.ts                       # Next.js security headers & allowed origins
└── .gitignore                           # Comprehensive environment & build ignore rules
```

---

## ⚡ Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.18.0 or v20.x LTS installed (`node -v`)
- **npm**: v9.x or higher

### 2. Installation
```bash
git clone <repository-url>
cd "rsvp project"
npm install
```

### 3. Environment Configuration
Create your `.env.local` file based on `.env.example`:
```bash
cp .env.example .env.local
```

Configure your parameters:
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
APP_URL="http://localhost:3000"
```
*(Note: If Supabase credentials are not provided, RSVP Pro automatically switches to the built-in resilient In-Memory Store, allowing full development without external databases).*

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Running Production Build
```bash
npm run build
npm run start
```

### 6. Automated Feature Verification
Run the comprehensive integration test suite verifying gate authorization, operator attribution, and branded QR generation:
```bash
node scripts/test-gate-features.mjs
```

---

## 📡 Key REST API Endpoints

### Gate Station Authorization
- `GET /api/events/:id/gate-credentials`: List all staff credentials and check-in counts.
- `POST /api/events/:id/gate-credentials`: Create a custom or random gate login (`user_id`, `station_name`, `passcode`, `notes`).
- `PATCH /api/events/:id/gate-credentials/:credId`: Toggle active/disabled status.
- `DELETE /api/events/:id/gate-credentials/:credId`: Revoke and remove credential.
- `POST /api/events/:id/gate-auth`: Authenticate gate station staff (Rate-limited: 8 req/min).

### Check-in Operations
- `POST /api/checkin`: Validate ticket and attribute scan to `gate_user_id`. Payload:
  ```json
  {
    "event_id": "...",
    "code_or_token": "TOKEN-EL-37017",
    "gate_user_id": "GATE-NORTH-3",
    "method": "qr_scan"
  }
  ```

### Branded QR Generation
- `GET /api/qr?text=...&logo=ticket|shield|brand|calendar|custom|none&custom_logo_url=...`: Returns SVG or data URL with embedded center logo.

---

## 📱 Mobile & Remote Device Access

To test camera scanning and gate check-in on real iPhones, Androids, or iPads over local WiFi or remote tunnels:
```bash
# Cloudflare Tunnel (HTTPS with auto-camera permissions)
npx -y cloudflared tunnel --url http://localhost:3000
```
Open the generated HTTPS URL on any mobile device to immediately activate the camera.

---

## 📄 License
This project is proprietary and confidential. Built for high-volume, secure event gate operations.
