---
name: Launchio admin route
description: Admin dashboard at /control-x7k9 — access control, env var requirement, server middleware
---

The admin dashboard lives at `/control-x7k9` (AdminPage.tsx) and is protected server-side by `requireAdmin` middleware in server.js.

**How it works:**
- `requireAdmin` verifies the JWT with `verifySupabaseJWT(token)` then checks `userData.user.email === process.env.ADMIN_EMAIL`
- If `ADMIN_EMAIL` is not set in environment, returns 503
- AdminPage.tsx hits `/api/admin/stats` first; 401/403 response renders an "Access Denied" screen

**Why:** Obscure URL + server-side email check = no exposed admin panel without the env var being set.

**To activate:** Add `ADMIN_EMAIL` to Replit Secrets matching the Supabase account email you want as admin.
