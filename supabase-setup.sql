-- ============================================================
-- Launchio Database Migration
-- Run this ONCE in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vvpucasvyifmxqcavktg/sql/new
-- ============================================================

-- ── 1. Add missing columns to products table ─────────────────
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description   text        DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type          text        DEFAULT 'ebook';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price         numeric(10,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS creator_id    text        DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS creator_email text        DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status        text        DEFAULT 'draft';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug          text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS file_url      text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at    timestamptz DEFAULT now();

-- Add slug unique constraint (safe to run even if it exists)
DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- Add CHECK constraints (safe)
DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_type_check
    CHECK (type IN ('ebook','course','template','prompt_pack'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_status_check
    CHECK (status IN ('draft','published'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Create products table from scratch (only if it doesn't exist) ──
CREATE TABLE IF NOT EXISTS public.products (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text        NOT NULL DEFAULT '',
  description   text        DEFAULT '',
  type          text        DEFAULT 'ebook'  CHECK (type   IN ('ebook','course','template','prompt_pack')),
  price         numeric(10,2) DEFAULT 0,
  creator_id    text        DEFAULT '',
  creator_email text        DEFAULT '',
  status        text        DEFAULT 'draft'  CHECK (status IN ('draft','published')),
  slug          text        UNIQUE,
  file_url      text,
  created_at    timestamptz DEFAULT now()
);

-- ── 3. Enable RLS on products ─────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published products" ON public.products;
DROP POLICY IF EXISTS "Creators can read own products"     ON public.products;
DROP POLICY IF EXISTS "Creators can insert products"       ON public.products;
DROP POLICY IF EXISTS "Creators can update own products"   ON public.products;
DROP POLICY IF EXISTS "Creators can delete own products"   ON public.products;

-- Anyone (including unauthenticated) can read published products
CREATE POLICY "Public can read published products"
  ON public.products FOR SELECT USING (status = 'published');

-- Authenticated creators can read all their own products (any status)
CREATE POLICY "Creators can read own products"
  ON public.products FOR SELECT USING (auth.uid()::text = creator_id);

-- Creators can insert their own products
CREATE POLICY "Creators can insert products"
  ON public.products FOR INSERT WITH CHECK (auth.uid()::text = creator_id);

-- Creators can update their own products
CREATE POLICY "Creators can update own products"
  ON public.products FOR UPDATE USING (auth.uid()::text = creator_id);

-- Creators can delete their own products
CREATE POLICY "Creators can delete own products"
  ON public.products FOR DELETE USING (auth.uid()::text = creator_id);

-- ── 4. Purchases table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchases (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid        REFERENCES public.products(id) ON DELETE SET NULL,
  buyer_email    text        DEFAULT '',
  amount         numeric(10,2) DEFAULT 0,
  creator_payout numeric(10,2) DEFAULT 0,
  platform_fee   numeric(10,2) DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can read own purchases"      ON public.purchases;
DROP POLICY IF EXISTS "Buyers can read own purchases"        ON public.purchases;
DROP POLICY IF EXISTS "Service role inserts"                 ON public.purchases;
DROP POLICY IF EXISTS "Service role can insert purchases"    ON public.purchases;

-- Creators see purchases on their products
CREATE POLICY "Creators can read own purchases"
  ON public.purchases FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products p
            WHERE p.id = product_id AND p.creator_id = auth.uid()::text)
  );

-- Buyers can see their own purchases
CREATE POLICY "Buyers can read own purchases"
  ON public.purchases FOR SELECT USING (buyer_email = auth.email());

-- Server-side webhook handler inserts (uses service key, bypasses RLS)
CREATE POLICY "Service role can insert purchases"
  ON public.purchases FOR INSERT WITH CHECK (true);

-- ── 5. Seed demo products (safe / idempotent) ─────────────────
INSERT INTO public.products (title, description, type, price, creator_id, creator_email, status, slug)
VALUES
  ('The AI Creator''s Complete Handbook',
   'A comprehensive guide to leveraging AI tools for content creation, monetization, and building your digital empire from scratch.',
   'ebook', 29, 'demo-seed', 'alex@launchio.com', 'published', 'ai-creators-handbook-demo'),

  ('Prompt Engineering Mastery Course',
   'Master the art of AI prompts for ChatGPT, Claude, and Midjourney. Get 10x more done with proven frameworks.',
   'course', 97, 'demo-seed', 'alex@launchio.com', 'published', 'prompt-engineering-mastery-demo'),

  ('Ultimate Notion Creator OS',
   'A complete Notion workspace for digital creators: content calendar, client tracker, project manager, revenue dashboard.',
   'template', 49, 'demo-seed', 'sara@launchio.com', 'published', 'notion-creator-os-demo'),

  ('500 ChatGPT Prompts for Business',
   'Battle-tested ChatGPT prompts for marketing, copywriting, sales, and business strategy. Ready to use instantly.',
   'prompt_pack', 19, 'demo-seed', 'sara@launchio.com', 'published', 'chatgpt-prompts-business-demo'),

  ('Side Income with Digital Products',
   'Step-by-step playbook to go from zero to $5K/month selling digital products. Real strategies from real creators.',
   'ebook', 39, 'demo-seed', 'mike@launchio.com', 'published', 'side-income-digital-demo'),

  ('Figma Design System Starter Kit',
   'Professional design system with 200+ components, 8 color themes, and complete documentation. Ship products faster.',
   'template', 79, 'demo-seed', 'mike@launchio.com', 'published', 'figma-design-system-demo'),

  ('YouTube AI Content Workflow',
   'The exact AI-powered workflow top YouTubers use to research, script, and publish 5x faster without burnout.',
   'course', 127, 'demo-seed', 'jess@launchio.com', 'published', 'youtube-ai-workflow-demo'),

  ('Midjourney Prompt Bible',
   '1,000+ tested Midjourney prompts for logos, illustrations, product mockups, and social media. Every style covered.',
   'prompt_pack', 29, 'demo-seed', 'jess@launchio.com', 'published', 'midjourney-prompt-bible-demo')

ON CONFLICT (slug) DO NOTHING;

-- ── Done! ─────────────────────────────────────────────────────
SELECT 'Setup complete! Products in table: ' || count(*)::text AS result
FROM public.products;
