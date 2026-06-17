const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const DEMO_PRODUCTS = [
  { title: "The AI Creator's Complete Handbook", description: 'A comprehensive guide to leveraging AI tools for content creation, monetization, and building your digital empire from scratch.', type: 'ebook', price: 29, status: 'published' },
  { title: 'Prompt Engineering Mastery Course', description: 'Master the art of AI prompts for ChatGPT, Claude, and Midjourney. Get 10x more done with proven frameworks.', type: 'course', price: 97, status: 'published' },
  { title: 'Ultimate Notion Creator OS', description: 'A complete Notion workspace for digital creators: content calendar, client tracker, project manager, revenue dashboard.', type: 'template', price: 49, status: 'published' },
  { title: '500 ChatGPT Prompts for Business', description: 'Battle-tested ChatGPT prompts for marketing, copywriting, sales, and business strategy. Ready to use instantly.', type: 'prompt_pack', price: 19, status: 'published' },
  { title: 'Side Income with Digital Products', description: 'Step-by-step playbook to go from zero to $5K/month selling digital products. Real strategies from real creators.', type: 'ebook', price: 39, status: 'published' },
  { title: 'Figma Design System Starter Kit', description: 'Professional design system with 200+ components, 8 color themes, and complete documentation.', type: 'template', price: 79, status: 'published' },
  { title: 'YouTube AI Content Workflow', description: 'The exact AI-powered workflow top YouTubers use to research, script, and publish 5x faster without burnout.', type: 'course', price: 127, status: 'published' },
  { title: 'Midjourney Prompt Bible', description: '1,000+ tested Midjourney prompts for logos, illustrations, product mockups, and social media.', type: 'prompt_pack', price: 29, status: 'published' },
]

async function seed() {
  const baseUrl = `${SUPABASE_URL}/rest/v1/products`
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }

  // Try to discover columns by sending the full payload and removing fields on error
  const fields = Object.keys(DEMO_PRODUCTS[0])
  const extraCandidates = [
    { creator_id: '00000000-0000-0000-0000-000000000001', slug: 'test-slug' },
    { creator_id: '00000000-0000-0000-0000-000000000001' },
    { creator_id: 'demo-user' },
    {},
  ]

  console.log('=== Discovering schema ===')
  for (const extras of extraCandidates) {
    const payload = { title: '__schema_test', type: 'ebook', price: 1, status: 'draft', ...extras }
    const res = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(payload) })
    const text = await res.text()
    const json = JSON.parse(text)
    console.log(`Extras ${JSON.stringify(extras)}: ${res.status} — ${json?.message ?? JSON.stringify(json).slice(0, 100)}`)
    if (res.ok) {
      // Found working combo — delete the test row
      const id = Array.isArray(json) ? json[0]?.id : json?.id
      if (id) await fetch(`${baseUrl}?id=eq.${id}`, { method: 'DELETE', headers })
      console.log('\nWorking payload extras:', extras)
      
      // Now seed real data
      console.log('\n=== Seeding demo products ===')
      for (const p of DEMO_PRODUCTS) {
        const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-demo'
        const pPayload = { ...p, slug: extras.slug !== undefined ? slug : undefined, ...extras }
        if (pPayload.slug === undefined) delete pPayload.slug
        
        const r = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(pPayload) })
        const rj = await r.json()
        if (!r.ok) {
          console.log(`❌ "${p.title}": ${rj?.message ?? JSON.stringify(rj).slice(0,80)}`)
        } else {
          const rid = Array.isArray(rj) ? rj[0]?.id : rj?.id
          console.log(`✓ "${p.title}" — id: ${rid}`)
        }
      }
      return
    }
  }
  
  console.log('\n⚠️  Could not insert via anon key (RLS blocks it). Need service role key or SQL Editor.')
  console.log('Please run supabase-setup.sql in your Supabase dashboard.')
}

seed().catch(console.error)
