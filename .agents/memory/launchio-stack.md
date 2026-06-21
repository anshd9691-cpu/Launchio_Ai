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

## AI provider: Groq (not Gemini)
The chat agent (`/api/agent`) uses Groq's API (`https://api.groq.com/openai/v1/chat/completions`) with model `llama-3.3-70b-versatile`. Switched from Gemini because free-tier quota was exhausted.

**Why:** Groq is OpenAI-compatible (same message format), much faster, generous free tier.
**How to apply:** Use `GROQ_API_KEY` env var. No fallback chain needed — single model, no 429 retries required. Gemini key (`GEMINI_API_KEY`) is still in secrets but no longer used by the agent.

## Supabase table schema
The existing products table may have fewer columns than the app expects (missing: type, slug, creator_email, status, file_url). The `supabase-setup.sql` file adds these via ALTER TABLE IF NOT EXISTS. RLS blocks anon inserts so demo seeding must be done via SQL Editor.

**Why:** Table was partially created in a previous session with different schema.
**How to apply:** Always run supabase-setup.sql after database changes. The app gracefully handles empty product arrays.

## PDF generation (pdf-lib) — text encoding
pdf-lib's StandardFonts (Helvetica, HelveticaBold) only support Latin-1 characters. Any non-ASCII unicode (smart quotes, em dashes, ellipsis, bullet U+2022, non-breaking spaces) will throw a "WinAnsi cannot encode…" error at runtime.

**Why:** pdf-lib embeds standard fonts without subsetting; they only cover WinAnsiEncoding.
**How to apply:** Always run content through a `cleanText()` function that maps smart quotes → straight quotes, em/en dashes → hyphens, ellipsis → ..., bullet → -, and strips remaining non-ASCII before calling any `page.drawText()`.

## PPTX generation (pptxgenjs)
pptxgenjs works in ESM server.js via `import pptxgen from 'pptxgenjs'`. Use `pptx.write({ outputType: 'nodebuffer' })` to get a Buffer for upload. Courses generate .pptx; all other types (ebook, template, prompt_pack) generate PDF.

**Why:** pptxgenjs is the only Node-native PPTX library that works without a headless browser.
**How to apply:** In /api/generate-file, branch on `type === 'course'` for PPTX vs PDF.

## Supabase Storage upload (service key)
Use POST to `{SUPABASE_URL}/storage/v1/object/{bucket}/{path}` with `x-upsert: true` header. Generate signed URLs via POST to `/storage/v1/object/sign/{bucket}/{path}` with `{ expiresIn: 3600 }`. Bucket must be created first; ignore 409 conflicts.

**Why:** Storage API requires service key; anon key is blocked for private buckets.
**How to apply:** Always use SUPABASE_SERVICE_KEY for all storage operations in server.js.

## Download auth flow
Client passes Supabase session JWT as `Authorization: Bearer {token}`. Server verifies via GET `{SUPABASE_URL}/auth/v1/user` with that token. Then checks purchases table for buyer_email match OR creator_id match before issuing a signed URL.

**Why:** Signed URLs must only be issued to verified purchasers — no public download links.
**How to apply:** /api/download/:productId always requires Authorization header; returns 401 without it.

## tsconfig.app.json needs vite/client types
Without `"types": ["vite/client"]` in compilerOptions, TypeScript throws "Property 'env' does not exist on type 'ImportMeta'" on any `import.meta.env` access.

**Why:** Vite's ImportMeta augmentation lives in the `vite/client` type package.
**How to apply:** Ensure tsconfig.app.json compilerOptions includes `"types": ["vite/client"]`.
