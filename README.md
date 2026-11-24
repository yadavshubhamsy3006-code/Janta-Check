# Janta Check

**Your Voice. Your City. Your Change.**

Janta Check is an AI-powered civic engagement and smart infrastructure monitoring platform that enables citizens to photograph public infrastructure defects, verify automated triage suggestions, detect nearby duplicate reports, track transparent repair progress on live maps, and confirm completed work.

---

## Core Capabilities

- **6-Step Guided Issue Reporting (`/report`)**:
  1. **Photo Evidence**: Camera capture, drag-and-drop upload, remove/replace controls, and sample civic photographs for rapid evaluation.
  2. **Server-Side Gemini Vision Triage**: Identifies the issue across 6 infrastructure categories (`pothole`, `garbage`, `streetlight`, `water_leakage`, `drainage`, `other`), suggests severity (`low` / `medium` / `high` / `critical`), and explains visual reasoning with honest fallback when unclear.
  3. **Geospatial Pinning**: Interactive OpenStreetMap / Leaflet coordinate picker, browser geolocation lookup, and Nominatim address search / reverse geocoding.
  4. **Details & Smart Complaint Assistant**: Citizen title/description editor, optional voice guidance (`speechSynthesis`), and opt-in AI wording suggestions requiring explicit user approval before applying.
  5. **Duplicate Detection 2.0**: Haversine distance + text/category similarity screening so citizens can upvote/support an existing unresolved complaint (`+15` Civic Points) or proceed with a distinct report.
  6. **Review & Submit**: Final confirmation summary generating a unique Tracking ID (`JC-XXXX`) and awarding `+20` Civic Points.
- **Offline Draft Resilience (IndexedDB)**: Unfinished reports and network-interrupted submissions auto-save in browser IndexedDB (`janta_check_drafts`) and recover cleanly upon reload.
- **Multilingual & Accessibility Support**: Live switching across **English**, **हिन्दी (Hindi)**, and **ಕನ್ನಡ (Kannada)** plus **Normal / Large / Extra Large** root text sizing.
- **Transparent Priority & Escalation Engine**:
  - Priority Score (`0–100`): `30% Severity + 30% Community Support + 20% Duplicate Frequency + 20% Waiting Time`.
  - Configurable smart escalation indicators (`Recently Submitted`, `Waiting for Review`, `On Track`, `Delayed`, `Requires Attention`, `Resolved`).
- **Before / After Verification & Community Closing**: Officers must attach a repair inspection photograph when marking a complaint `Resolved - Awaiting Verification`; citizens inspect the interactive Before/After slider to confirm closure or reopen unresolved work.
- **Interactive Live Map & List View (`/map`)**: Category-colored OpenStreetMap markers, spatial density clustering, density heatmap toggle, category/status/priority filters, and permission-gated **Nearby Unresolved Issues** feed.
- **Analytics & Ward Insights (`/analytics`)**: 5 Recharts visualizations, Ward/Locality breakdown table, and data-backed recurring pattern insights.
- **Role-Based Workbenches**:
  - **Citizen**: Dashboard, My Reports, Leaderboard & Badges, Notifications, Profile & Account Deletion.
  - **Officer**: Assigned Queue Workbench with overdue filter, inline complaint location map, and required repair photo verification.
  - **Administrator**: User/Role Management, Officer Dispatch, Duplicate Link Review, Comment Moderation, Verified Infrastructure Projects, Configurable Thresholds, and Immutable Audit Trail.

---

## Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Lucide React, Motion, Recharts, Leaflet + OpenStreetMap
- **Backend**: Node.js + Express (`server.ts`), Multer image upload validation, server-side Gemini SDK (`@google/genai`) with retry handling and rate limiting
- **Database & Auth**: Supabase PostgreSQL + Supabase Auth + Supabase Storage schema (`supabase/migrations/001_initial_schema.sql` & `002_enhancements.sql`), plus a persistent local Demonstration Mode store (`data/janta-check-store.json`) when Supabase credentials are not configured

---

## Prerequisites

- **Node.js** `20+` and `npm`
- **Google Gemini API Key** (`GEMINI_API_KEY`) for AI vision classification and Smart Complaint Assistant
- **Supabase Project** *(optional — runs in Demonstration Mode without external DB keys)*

---

## Local Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Fill in `.env` (never commit `.env` to version control).

3. **Start the full-stack server (port `3000`)**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Exposure | Purpose |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Server-only | Enables server-side Gemini image triage and complaint assistant |
| `APP_URL` | Server-only | Public URL of the deployed application |
| `VITE_SUPABASE_URL` | Client + Server | Supabase project URL (optional for Demo Mode) |
| `VITE_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous public key (optional for Demo Mode) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Supabase service role key for privileged server routes |
| `SESSION_SECRET` | Server-only | HMAC signing secret for demo session tokens |

> **Security Note**: Never place `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `SESSION_SECRET` in `VITE_*` variables.

---

## Supabase Database Setup (Optional Production Mode)

Run the SQL migrations in order inside the **Supabase SQL Editor**:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_enhancements.sql`

Create a public storage bucket named `report-images` (or configure your matching bucket policies) for uploaded citizen and officer photographs.

---

## Verification & Scripts

```bash
# Run pure logic unit tests (priority, duplicates, escalation, ward stats, insights, nearby filter)
npx --yes tsx --test src/lib/civicLogic.test.ts

# Type-check TypeScript
npm run lint

# Build production client bundle
npm run build

# Start production Express + static server
npm start
```

---

## Deployment Notes

- **Node.js / Cloud Run / Render / Railway**:
  - Build command: `npm run build`
  - Start command: `npm start` (`NODE_ENV=production tsx server.ts` listening on `0.0.0.0:3000` or `PORT`)
- **Vercel**:
  - `vercel.json` is included for static SPA output (`dist/`). Ensure `/api/*` backend routes are hosted via an Express-compatible runtime or Vercel Node functions alongside your Supabase and Gemini server environment variables.

---

## Initialize & Push to GitHub

```bash
git init
git add .
git commit -m "feat: Janta Check civic engagement platform"
git branch -M main
git remote add origin https://github.com/<your-username>/janta-check.git
git push -u origin main
```
