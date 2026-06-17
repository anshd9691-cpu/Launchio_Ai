# Launchio — AI-Powered Digital Products Marketplace

## Project Overview
A premium full-stack digital product marketplace built with React + Vite, Supabase auth + database, Lemon Squeezy payments, and Gemini AI. White/purple design theme with Framer Motion animations.

## Architecture
- **Frontend**: React 18 + Vite + TypeScript + React Router v6 + Framer Motion + Lucide React
- **Backend**: Express.js API server on port 3001 (proxied through Vite at `/api`)
- **Auth + Database**: Supabase (project: vvpucasvyifmxqcavktg)
- **Payments**: Lemon Squeezy (API key in secrets, store ID in env)
- **AI**: Gemini 1.5 Flash (API key in secrets) — generates product descriptions

## Running the App
The workflow command `npm run dev` starts both:
1. Express API server on port 3001 (`node server.js &`)
2. Vite dev server on port 5000 (`vite --host 0.0.0.0 --port 5000`)

## Database Setup (REQUIRED)
Run `supabase-setup.sql` in the Supabase SQL Editor:
https://supabase.com/dashboard/project/vvpucasvyifmxqcavktg/sql/new

This adds required columns (`type`, `slug`, `creator_email`, `creator_id`, `status`, `price`, `description`) and seeds 8 demo products.

## Environment Variables
Set in Replit Secrets tab:
- `NEXT_PUBLIC_SUPABASE_URL` — already set
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — already set
- `NEXT_PUBLIC_BASE_URL` — already set
- `LEMONSQUEEZY_STORE_ID` — already set
- `GEMINI_API_KEY` — secret, already set
- `LEMONSQUEEZY_API_KEY` — secret, already set

## Pages
- `/` — Hero landing page with animated stats, features, how-it-works
- `/explore` — Product marketplace with search + filter by type
- `/create` — 3-step product creation wizard with AI auto-fill
- `/dashboard` — Creator dashboard (products + earnings tabs)
- `/p/:id` — Individual product page with buy button
- `/login` — Auth page
- `/signup` — Auth page with success animation

## Key Files
- `src/lib/supabase.ts` — Supabase client (reads NEXT_PUBLIC_ or VITE_ env vars)
- `src/App.tsx` — Router
- `server.js` — Express API (checkout, AI generate, webhooks)
- `vite.config.ts` — Vite config with NEXT_PUBLIC_ → VITE_ env mapping and /api proxy
- `supabase-setup.sql` — Database migration + seed script

## User Preferences
- Premium design: white + #f5f3ff bg, #1e1b4b headings, #8b5cf6 brand purple
- Framer Motion animations throughout
- "Launch in 60 seconds" positioning
- 70/30 creator/platform revenue split
