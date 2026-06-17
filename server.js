import express from 'express'
import cors from 'cors'
import { Resend } from 'resend'

const app = express()
app.use(cors())
app.use(express.json())

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

// Simple Supabase REST helper (no SDK — avoids ws dependency)
async function dbQuery(table, params = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { data: null, error: 'DB not configured' }
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept': 'application/json',
    },
  })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data?.message || 'DB error' }
  return { data, error: null }
}

async function dbInsert(table, payload) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { data: null, error: 'DB not configured' }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data?.message || 'Insert error' }
  return { data: Array.isArray(data) ? data[0] : data, error: null }
}

const resend = new Resend(process.env.RESEND_API_KEY)

// Build branded confirmation email HTML
function buildConfirmationEmail(confirmationUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirm your Launchio account</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f3ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(139,92,246,0.14);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%);padding:36px 40px 32px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.22);display:inline-flex;align-items:center;justify-content:center;font-size:20px;vertical-align:middle;">🚀</div>
                <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;vertical-align:middle;">Launchio</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:44px 40px 36px;">
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#1e1b4b;line-height:1.2;letter-spacing:-0.5px;text-align:center;">
                Confirm your Launchio account
              </h1>
              <div style="width:48px;height:3px;background:linear-gradient(90deg,#6366f1,#a855f7);border-radius:4px;margin:0 auto 24px;"></div>
              <p style="margin:0 0 10px;font-size:16px;color:#4c4879;line-height:1.7;text-align:center;">
                Hey there, welcome to Launchio! 👋
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#4c4879;line-height:1.75;text-align:center;">
                You're one step away from launching your first digital product.<br/>
                Click below to confirm your email and activate your account.
              </p>
              <div style="text-align:center;margin-bottom:36px;">
                <a href="${confirmationUrl}"
                   style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:14px;box-shadow:0 4px 20px rgba(139,92,246,0.45);letter-spacing:0.2px;">
                  Confirm Email &rarr;
                </a>
              </div>
              <div style="background:#f5f3ff;border-radius:12px;padding:16px 20px;border:1px solid rgba(139,92,246,0.15);margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#4c4879;line-height:1.6;text-align:center;">
                  🔒 This link expires in <strong style="color:#1e1b4b;">24 hours</strong>. If you didn't create a Launchio account, you can safely ignore this email.
                </p>
              </div>
              <p style="margin:0;font-size:12px;color:#a5a3c0;text-align:center;line-height:1.7;">
                Button not working? Copy and paste this link into your browser:<br/>
                <a href="${confirmationUrl}" style="color:#8b5cf6;word-break:break-all;">${confirmationUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f5f3ff;padding:24px 40px;border-top:1px solid rgba(139,92,246,0.1);text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1e1b4b;">🚀 Launchio</p>
              <p style="margin:0;font-size:12px;color:#4c4879;line-height:1.6;">
                Launch your digital product in 60 seconds.<br/>
                Creators keep <strong style="color:#8b5cf6;">70%</strong> of every sale.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;color:#a5a3c0;text-align:center;">
          You're receiving this because someone signed up at launchio.com with this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// POST /api/send-confirmation — generate a Supabase confirmation link and send via Resend
app.post('/api/send-confirmation', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })

  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!serviceKey) return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY not configured' })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return res.status(503).json({ error: 'RESEND_API_KEY not configured' })

  try {
    // Generate a sign-in link using the Supabase Admin API
    const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'signup', email }),
    })

    const adminJson = await adminRes.json()
    if (!adminRes.ok) {
      console.error('Supabase generate_link error:', adminJson)
      return res.status(502).json({ error: adminJson?.message || 'Failed to generate confirmation link' })
    }

    const confirmationUrl = adminJson?.action_link
    if (!confirmationUrl) {
      return res.status(502).json({ error: 'No confirmation URL returned from Supabase' })
    }

    // Send the branded email via Resend
    const { error: sendError } = await resend.emails.send({
      from: 'Launchio <onboarding@resend.dev>',
      to: email,
      subject: 'Confirm your Launchio account 🚀',
      html: buildConfirmationEmail(confirmationUrl),
    })

    if (sendError) {
      console.error('Resend error:', sendError)
      return res.status(502).json({ error: 'Failed to send email', details: sendError })
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('send-confirmation error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// POST /api/checkout
app.post('/api/checkout', async (req, res) => {
  const { product_id } = req.body
  if (!product_id) return res.status(400).json({ error: 'product_id required' })

  const { data: products, error } = await dbQuery('products', { 'id': `eq.${product_id}`, 'limit': '1' })
  if (error || !products?.length) return res.status(404).json({ error: 'Product not found' })
  const product = products[0]

  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  const storeId = process.env.LEMONSQUEEZY_STORE_ID

  if (!apiKey || !storeId) {
    return res.status(503).json({ error: 'Payment system not configured. Please set LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID in your environment.' })
  }

  try {
    const baseUrl = process.env.VITE_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'
    const lsRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: { product_id: product.id, creator_id: product.creator_id },
            },
            product_options: {
              name: product.title,
              description: product.description || '',
              redirect_url: `${baseUrl}/p/${product.id}?success=true`,
            },
          },
          relationships: {
            store: { data: { type: 'stores', id: String(storeId) } },
            variant: { data: { type: 'variants', id: String(process.env.LEMONSQUEEZY_VARIANT_ID || '1') } },
          },
        },
      }),
    })

    const lsJson = await lsRes.json()
    if (!lsRes.ok) {
      console.error('LemonSqueezy error:', JSON.stringify(lsJson))
      return res.status(502).json({ error: 'Payment gateway error', details: lsJson })
    }

    const checkoutUrl = lsJson?.data?.attributes?.url
    if (!checkoutUrl) return res.status(502).json({ error: 'No checkout URL returned' })

    return res.json({ checkout_url: checkoutUrl })
  } catch (err) {
    console.error('Checkout error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/webhooks/lemonsqueezy
app.post('/api/webhooks/lemonsqueezy', async (req, res) => {
  const event = req.headers['x-event-name']
  const body = req.body

  if (event === 'order_created') {
    const productId = body?.meta?.custom_data?.product_id
    const buyerEmail = body?.data?.attributes?.user_email
    const amount = (body?.data?.attributes?.total ?? 0) / 100

    if (productId && buyerEmail && amount) {
      await dbInsert('purchases', {
        product_id: productId,
        buyer_email: buyerEmail,
        amount,
        creator_payout: parseFloat((amount * 0.7).toFixed(2)),
        platform_fee: parseFloat((amount * 0.3).toFixed(2)),
      })
    }
  }

  return res.status(200).json({ received: true })
})

// POST /api/ai-generate
app.post('/api/ai-generate', async (req, res) => {
  const { type } = req.body
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) return res.status(503).json({ error: 'AI not configured' })

  const typeDescriptions = {
    ebook: 'a digital ebook (guide or book)',
    course: 'an online course (video-based or text lessons)',
    template: 'a digital template (Notion, Figma, or document)',
    prompt_pack: 'an AI prompt pack for ChatGPT, Midjourney, or Claude',
  }

  const prompt = `Generate a compelling product listing for ${typeDescriptions[type] ?? 'a digital product'} that a creator could sell online.

Return ONLY valid JSON (no markdown, no backticks, no extra text):
{"title":"Catchy product title (max 80 chars)","description":"Persuasive 2-3 sentence description explaining what buyers get and why they need it (max 280 chars)","price":29}`

  try {
    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 256 },
        }),
      }
    )

    const gemJson = await gemRes.json()
    const text = gemJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return res.json(parsed)
  } catch (err) {
    console.error('AI generate error:', err)
    return res.status(500).json({ error: 'AI generation failed' })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`✓ Launchio API server running on port ${PORT}`)
  if (!SUPABASE_URL) console.warn('⚠ SUPABASE_URL not set')
  else console.log(`✓ Supabase: ${SUPABASE_URL}`)
})
