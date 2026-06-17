---
name: Launchio Stack Decisions
description: Key technical decisions for the Launchio project and their reasons
---

# Launchio Stack Decisions

## Next.js is blocked
Next.js is blocked by the Replit security policy (E403 on all versions). The app uses Vite + React instead.

**Why:** npm package firewall blocks next package tarballs with 403.
**How to apply:** Always use Vite for this project, never suggest migrating to Next.js.

## Supabase SDK vs REST (Node.js server)
The Supabase JS SDK crashes on Node.js 20 unless you pass the `ws` package as the realtime transport. To avoid this in `server.js`, use plain fetch() against the Supabase REST API directly instead of the SDK.

**Why:** `@supabase/realtime-js` throws "Node.js 20 detected without native WebSocket support" on startup.
**How to apply:** In server.js, use fetch() with apikey + Authorization headers against /rest/v1/ endpoints. The SDK is fine in the browser (Vite handles it).

## Env var prefix mismatch
Existing env vars use NEXT_PUBLIC_ prefix (set by previous work). Vite requires VITE_ prefix. Solution: `vite.config.ts` uses `loadEnv` and `define` to bridge NEXT_PUBLIC_ → VITE_ so both work.

**Why:** Env vars were set before the switch from Next.js to Vite.
**How to apply:** When reading env in server.js, check NEXT_PUBLIC_ first. In vite.config.ts, always bridge both prefixes.

## Supabase table schema
The existing products table may have fewer columns than the app expects (missing: type, slug, creator_email, status). The `supabase-setup.sql` file adds these via ALTER TABLE IF NOT EXISTS. RLS blocks anon inserts so demo seeding must be done via SQL Editor.

**Why:** Table was partially created in a previous session with different schema.
**How to apply:** Always run supabase-setup.sql after database changes. The app gracefully handles empty product arrays.
