import express from 'express'
import cors from 'cors'
import { Resend } from 'resend'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import pptxgen from 'pptxgenjs'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

// ─── Supabase REST helpers ────────────────────────────────────────────────────

async function dbQuery(table, params = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { data: null, error: 'DB not configured' }
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Accept': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data?.message || 'DB error' }
  return { data, error: null }
}

async function dbInsert(table, payload) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { data: null, error: 'DB not configured' }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data?.message || 'Insert error' }
  return { data: Array.isArray(data) ? data[0] : data, error: null }
}

async function dbUpdate(table, payload, filters = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { data: null, error: 'DB not configured' }
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`)
  Object.entries(filters).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data?.message || 'Update error' }
  return { data, error: null }
}

// ─── Supabase Storage helpers ─────────────────────────────────────────────────

async function ensureStorageBucket() {
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'products', name: 'products', public: false }),
    })
  } catch { /* bucket may already exist */ }
}

async function uploadToStorage(path, buffer, mimeType) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/products/${path}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': mimeType, 'x-upsert': 'true' },
    body: buffer,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Storage upload failed: ${err}`)
  }
  return `products/${path}`
}

async function getSignedUrl(storagePath) {
  const [bucket, ...rest] = storagePath.split('/')
  const objectPath = rest.join('/')
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 3600 }),
  })
  const json = await res.json()
  if (!res.ok || !json.signedURL) throw new Error('Could not generate signed URL')
  return `${SUPABASE_URL}/storage/v1${json.signedURL}`
}

async function verifySupabaseJWT(token) {
  if (!token) return null
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

// ─── Resend ───────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY)

function buildConfirmationEmail(confirmationUrl) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Confirm your Launchio account</title></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(139,92,246,.14);">
      <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7);padding:36px 40px 32px;text-align:center;">
        <span style="font-size:22px;font-weight:800;color:#fff;">🚀 Launchio</span>
      </td></tr>
      <tr><td style="padding:44px 40px 36px;">
        <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#1e1b4b;text-align:center;">Confirm your account</h1>
        <p style="margin:0 0 32px;font-size:15px;color:#4c4879;text-align:center;">You're one step away from launching your first digital product.</p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${confirmationUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:16px;font-weight:700;text-decoration:none;border-radius:14px;">Confirm Email &rarr;</a>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    try {
      const width = font.widthOfTextAtSize(testLine, fontSize)
      if (width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    } catch {
      lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

function cleanText(text) {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x00-\x7F]/g, (c) => {
      const map = { '•': '-', '—': '-', '–': '-', '…': '...', '\u00a0': ' ' }
      return map[c] || ' '
    })
}

async function generatePDF({ title, description, content, type }) {
  const pdfDoc = await PDFDocument.create()
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const W = 595.28   // A4 width in points
  const H = 841.89   // A4 height in points
  const margin = 56
  const contentWidth = W - margin * 2
  const purple = rgb(0.545, 0.361, 0.965)
  const darkPurple = rgb(0.118, 0.106, 0.294)
  const gray = rgb(0.298, 0.282, 0.471)
  const lightGray = rgb(0.647, 0.639, 0.753)
  const white = rgb(1, 1, 1)

  // ── Cover page ──────────────────────────────────────────────────────────────
  const cover = pdfDoc.addPage([W, H])

  // Header gradient rectangle
  cover.drawRectangle({ x: 0, y: H - 200, width: W, height: 200, color: purple })
  cover.drawRectangle({ x: 0, y: H - 200, width: W, height: 200, color: rgb(0.388, 0.227, 0.729), opacity: 0.5 })

  // Launchio wordmark
  cover.drawText('Launchio', { x: margin, y: H - 60, size: 28, font: boldFont, color: white })
  cover.drawText('rocket', { x: margin - 32, y: H - 60, size: 28, font: boldFont, color: white }) // placeholder

  // Type badge
  const typeLabel = { ebook: 'Ebook', course: 'Course', template: 'Template', prompt_pack: 'Prompt Pack' }[type] || 'Digital Product'
  cover.drawRectangle({ x: margin, y: H - 120, width: 80, height: 22, color: rgb(1, 1, 1), opacity: 0.2, borderRadius: 6 })
  cover.drawText(typeLabel.toUpperCase(), { x: margin + 8, y: H - 113, size: 9, font: boldFont, color: white })

  // Title
  const cleanTitle = cleanText(title || 'Untitled')
  const titleLines = wrapText(cleanTitle, boldFont, 30, contentWidth)
  let titleY = H - 260
  for (const line of titleLines.slice(0, 3)) {
    cover.drawText(line, { x: margin, y: titleY, size: 30, font: boldFont, color: darkPurple })
    titleY -= 38
  }

  // Description
  if (description) {
    const cleanDesc = cleanText(description)
    const descLines = wrapText(cleanDesc, regularFont, 14, contentWidth)
    let descY = titleY - 20
    for (const line of descLines.slice(0, 4)) {
      cover.drawText(line, { x: margin, y: descY, size: 14, font: regularFont, color: gray })
      descY -= 22
    }
  }

  // Divider
  cover.drawLine({ start: { x: margin, y: 120 }, end: { x: W - margin, y: 120 }, thickness: 1, color: rgb(0.878, 0.859, 0.996) })

  // Footer
  cover.drawText('Created with Launchio', { x: margin, y: 96, size: 11, font: boldFont, color: purple })
  cover.drawText('launchio.com  •  Launch your digital product in 60 seconds', { x: margin, y: 80, size: 10, font: regularFont, color: lightGray })

  // ── Content pages ────────────────────────────────────────────────────────────
  const cleanContent = cleanText(content || '')
  const lines = cleanContent.split('\n')

  let page = pdfDoc.addPage([W, H])
  let y = H - margin
  let pageNum = 2

  const addFooter = (pg, num) => {
    pg.drawLine({ start: { x: margin, y: 40 }, end: { x: W - margin, y: 40 }, thickness: 0.5, color: rgb(0.878, 0.859, 0.996) })
    pg.drawText('Created with Launchio', { x: margin, y: 24, size: 9, font: regularFont, color: lightGray })
    pg.drawText(`${num}`, { x: W - margin - 10, y: 24, size: 9, font: regularFont, color: lightGray })
  }

  const ensureSpace = (needed) => {
    if (y < margin + needed + 50) {
      addFooter(page, pageNum)
      pageNum++
      page = pdfDoc.addPage([W, H])
      y = H - margin
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) { y -= 10; continue }

    // H1 heading (# or ##)
    if (line.startsWith('## ') || line.startsWith('# ')) {
      const headText = line.replace(/^#{1,2}\s+/, '')
      ensureSpace(50)
      y -= 20
      page.drawRectangle({ x: margin - 4, y: y - 4, width: contentWidth + 8, height: 28, color: rgb(0.957, 0.941, 0.996), borderRadius: 4 })
      page.drawText(headText.slice(0, 80), { x: margin, y, size: 16, font: boldFont, color: purple })
      y -= 32

    // H3 heading (###)
    } else if (line.startsWith('### ')) {
      const headText = line.replace(/^###\s+/, '')
      ensureSpace(36)
      y -= 12
      page.drawText(headText.slice(0, 90), { x: margin, y, size: 13, font: boldFont, color: darkPurple })
      y -= 22

    // Bold text (**text**)
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      const boldText = line.slice(2, -2)
      ensureSpace(22)
      page.drawText(boldText.slice(0, 100), { x: margin, y, size: 12, font: boldFont, color: darkPurple })
      y -= 20

    // Bullet point
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const bulletText = line.slice(2)
      const wrappedBullet = wrapText(bulletText, regularFont, 11, contentWidth - 16)
      ensureSpace(wrappedBullet.length * 16 + 4)
      page.drawCircle({ x: margin + 4, y: y + 3, size: 2.5, color: purple })
      for (const bl of wrappedBullet) {
        ensureSpace(16)
        page.drawText(bl, { x: margin + 14, y, size: 11, font: regularFont, color: gray })
        y -= 16
      }
      y -= 2

    // Numbered list
    } else if (/^\d+\.\s/.test(line)) {
      const numMatch = line.match(/^(\d+)\.\s(.*)/)
      if (numMatch) {
        const [, num, text] = numMatch
        const wrappedNum = wrapText(text, regularFont, 11, contentWidth - 20)
        ensureSpace(wrappedNum.length * 16 + 4)
        page.drawText(`${num}.`, { x: margin, y, size: 11, font: boldFont, color: purple })
        for (const nl of wrappedNum) {
          ensureSpace(16)
          page.drawText(nl, { x: margin + 20, y, size: 11, font: regularFont, color: gray })
          y -= 16
        }
        y -= 2
      }

    // Normal paragraph
    } else {
      const wrapped = wrapText(line, regularFont, 11, contentWidth)
      ensureSpace(wrapped.length * 17 + 8)
      for (const wl of wrapped) {
        ensureSpace(17)
        page.drawText(wl, { x: margin, y, size: 11, font: regularFont, color: gray })
        y -= 17
      }
      y -= 6
    }
  }

  addFooter(page, pageNum)
  return Buffer.from(await pdfDoc.save())
}

// ─── PPTX Generation ──────────────────────────────────────────────────────────

async function generatePPTX({ title, description, content }) {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial' }

  const PURPLE = '7C3AED'
  const DARK = '1E1B4B'
  const WHITE = 'FFFFFF'
  const LIGHT_BG = 'F5F3FF'
  const GRAY = '4C4879'

  const addSlideBackground = (slide) => {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: WHITE } })
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: PURPLE } })
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: '93%', w: '100%', h: '7%', fill: { color: LIGHT_BG } })
    slide.addText('Created with Launchio', { x: 0.3, y: '94%', w: 3, h: 0.3, fontSize: 10, color: PURPLE, bold: true })
  }

  // Title slide
  const titleSlide = pptx.addSlide()
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { type: 'solid', color: PURPLE } })
  titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: '60%', w: '100%', h: '40%', fill: { color: '5B21B6' } })
  titleSlide.addText('🚀 Launchio', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 16, color: 'FFFFFF', bold: true, transparency: 30 })
  titleSlide.addText(title || 'Untitled Course', {
    x: 0.5, y: 1.2, w: 12, h: 2, fontSize: 36, color: WHITE, bold: true,
    align: 'left', valign: 'middle', wrap: true,
  })
  if (description) {
    titleSlide.addText(description, {
      x: 0.5, y: 3.4, w: 11, h: 1.2, fontSize: 16, color: 'E0D9FF',
      align: 'left', valign: 'top', wrap: true,
    })
  }
  titleSlide.addText('Created with Launchio', { x: 0.5, y: 5.6, w: 5, h: 0.35, fontSize: 12, color: 'C4B5FD', bold: true })

  // Parse modules from content
  const cleanContent = cleanText(content || '')
  const moduleBlocks = cleanContent.split(/\n(?=##?\s+(?:Module|Lesson|Chapter)\s*\d)/i).filter(Boolean)

  // If no explicit module markers, split by ## headings
  const blocks = moduleBlocks.length > 1 ? moduleBlocks : cleanContent.split(/\n(?=##\s)/).filter(Boolean)

  for (const block of blocks.slice(0, 10)) {
    const blockLines = block.trim().split('\n')
    const headLine = blockLines[0].replace(/^#{1,3}\s+/, '').trim()
    const bodyText = blockLines.slice(1).join('\n').trim().slice(0, 600)

    const slide = pptx.addSlide()
    addSlideBackground(slide)

    // Module title bar
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.08, w: '100%', h: 1.0, fill: { color: LIGHT_BG } })
    slide.addText(headLine, {
      x: 0.4, y: 0.12, w: 12, h: 0.92, fontSize: 22, color: DARK, bold: true,
      align: 'left', valign: 'middle',
    })

    // Purple accent line
    slide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.15, w: 0.06, h: 3.5, fill: { color: PURPLE } })

    // Body content
    slide.addText(bodyText, {
      x: 0.65, y: 1.2, w: 12, h: 3.8, fontSize: 13, color: GRAY,
      align: 'left', valign: 'top', wrap: true, paraSpaceAfter: 6,
    })
  }

  // Closing slide
  const closingSlide = pptx.addSlide()
  closingSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: PURPLE } })
  closingSlide.addShape(pptx.ShapeType.rect, { x: 0, y: '55%', w: '100%', h: '45%', fill: { color: '5B21B6' } })
  closingSlide.addText('Thank You!', { x: 1, y: 1.2, w: 11, h: 1.4, fontSize: 44, color: WHITE, bold: true, align: 'center' })
  closingSlide.addText('You now have everything you need to take action.\nGo implement what you\'ve learned — and share your results.', {
    x: 1, y: 2.8, w: 11, h: 1.4, fontSize: 18, color: 'E0D9FF', align: 'center', wrap: true,
  })
  closingSlide.addText('🚀 Created with Launchio', { x: 1, y: 4.8, w: 11, h: 0.5, fontSize: 14, color: 'C4B5FD', align: 'center', bold: true })

  return Buffer.from(await pptx.write({ outputType: 'nodebuffer' }))
}

// ─── API Routes ───────────────────────────────────────────────────────────────

const resendClient = new Resend(process.env.RESEND_API_KEY)

app.post('/api/send-confirmation', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email required' })
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  const resendKey = process.env.RESEND_API_KEY
  if (!serviceKey) return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY not configured' })
  if (!resendKey) return res.status(503).json({ error: 'RESEND_API_KEY not configured' })
  try {
    const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'signup', email }),
    })
    const adminJson = await adminRes.json()
    if (!adminRes.ok) return res.status(502).json({ error: adminJson?.message || 'Failed to generate confirmation link' })
    const confirmationUrl = adminJson?.action_link
    if (!confirmationUrl) return res.status(502).json({ error: 'No confirmation URL returned from Supabase' })
    const { error: sendError } = await resendClient.emails.send({
      from: 'Launchio <onboarding@resend.dev>',
      to: email,
      subject: 'Confirm your Launchio account 🚀',
      html: buildConfirmationEmail(confirmationUrl),
    })
    if (sendError) return res.status(502).json({ error: 'Failed to send email', details: sendError })
    return res.json({ ok: true })
  } catch (err) {
    console.error('send-confirmation error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// GET /api/schema-check — tells the frontend if the DB migration has been run
app.get('/api/schema-check', async (_req, res) => {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/products?select=type,status,creator_id,slug,file_url&limit=0`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    })
    if (r.ok) return res.json({ ready: true })
    const body = await r.json()
    return res.json({ ready: false, hint: body?.message || 'Schema not migrated' })
  } catch (e) {
    return res.json({ ready: false, hint: e.message })
  }
})

// POST /api/agent — AI content agent
app.post('/api/agent', async (req, res) => {
  const { messages = [], productType = 'ebook', currentContent = '' } = req.body
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' })

  const contentRules = {
    ebook: `You are creating a complete, sellable EBOOK. When generating content:
- Write full chapters with rich narrative, real-world examples, and personal stories
- Minimum 2500 words total across all chapters
- Use warm, conversational prose — avoid bullet-list-heavy, generic AI-sounding text
- Structure: Hook intro → 5-8 full chapters → Strong conclusion with action steps
- Each chapter: 300-500 words minimum with a compelling heading
- Format with # Chapter Title for each chapter, then prose paragraphs`,

    course: `You are creating a complete, sellable ONLINE COURSE. When generating content:
- Create 5-8 modules, each taught like a real, engaging instructor would teach it
- Each module: title, clear learning objective, 300-500 word lesson content
- Write as if speaking directly to the student — use "you", examples, and stories
- Format: ## Module N: Title, then **Objective:**, then full lesson content`,

    template: `You are creating a complete, ready-to-use DIGITAL TEMPLATE. When generating content:
- Create a structured, professional document with clearly labeled sections
- Use [PLACEHOLDER] format for fields the user will fill in
- Include instructions at the top for how to use the template
- Make it immediately usable — someone should be able to start using it today`,

    prompt_pack: `You are creating a PROMPT PACK of 30-50 ready-to-use AI prompts. When generating content:
- Group prompts into logical categories (4-6 categories)
- Each prompt: bold label + the actual prompt text + one-line explanation of when to use it
- Write prompts that actually work — specific, clear, and immediately usable
- Format: ## Category Name, then **Prompt Name:** [prompt text] — [when to use]`,
  }

  const systemInstruction = `${contentRules[productType] || contentRules.ebook}

RESPONSE RULES:
- Return ONLY valid JSON, no markdown blocks, no extra text
- When the user describes their topic/idea, generate a complete first draft immediately
- When refining, only modify what was asked — don't restart from scratch
- Keep a warm, human, non-robotic tone throughout
- If a request is too vague to act on well, ask ONE focused clarifying question
- Never refuse a legitimate creative request regardless of niche

ALWAYS return this exact JSON structure:
{"reply":"your brief conversational response to the user (1-3 sentences, natural tone)","title":"Product title (max 80 chars)","description":"Compelling 2-3 sentence product description","content":"The full product content (all chapters/modules/sections)"}`

  // Build Gemini contents from message history
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  // Add context about current state if available
  if (currentContent) {
    const lastUserIdx = [...contents].reverse().findIndex(c => c.role === 'user')
    if (lastUserIdx !== -1) {
      const idx = contents.length - 1 - lastUserIdx
      contents[idx].parts[0].text = `[Current content state:\nTitle: ${req.body.currentTitle || ''}\n${currentContent.slice(0, 1000)}...]\n\n${contents[idx].parts[0].text}`
    }
  }

  // Fallback model chain — tried in order, skips on 429 quota errors
  const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-flash-lite-latest',
  ]

  const geminiPayload = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: { temperature: 0.85, maxOutputTokens: 8192 },
  }

  let lastError = 'AI service error. Please try again.'

  for (const model of GEMINI_MODELS) {
    let gemRes, gemJson
    try {
      gemRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiPayload) }
      )
      gemJson = await gemRes.json()
    } catch (err) {
      lastError = 'Network error reaching AI. Please try again.'
      continue
    }

    if (!gemRes.ok) {
      const code = gemJson?.error?.code
      const status = gemJson?.error?.status
      console.warn(`Gemini ${model}: ${code} ${status}`)
      // 429 quota exhausted — try next model
      if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
        lastError = 'AI is busy — trying backup model…'
        continue
      }
      // 404 model not found — try next model
      if (code === 404 || status === 'NOT_FOUND') {
        continue
      }
      // Other errors are terminal
      lastError = gemJson?.error?.message || 'AI service error. Please try again.'
      break
    }

    // Success — parse response
    const rawText = gemJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = rawText.replace(/```json\n?|```\n?/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]) } catch { /* fall through */ }
      }
    }

    if (!parsed) {
      return res.status(500).json({ error: 'AI returned unexpected format. Please try again.' })
    }

    return res.json({
      reply: parsed.reply || "Here's your content! Let me know if you'd like any changes.",
      title: parsed.title || '',
      description: parsed.description || '',
      content: parsed.content || '',
    })
  }

  // All models failed
  console.error('All Gemini models exhausted. Last error:', lastError)
  return res.status(503).json({
    error: lastError.includes('busy') || lastError.includes('quota')
      ? 'AI quota exhausted on all models. Please wait a few minutes and try again, or check your Gemini API plan.'
      : lastError,
  })
})

// POST /api/ai-generate — Legacy simple generate (kept for backward compat)
app.post('/api/ai-generate', async (req, res) => {
  const { type } = req.body
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' })
  const typeDescriptions = { ebook: 'a digital ebook', course: 'an online course', template: 'a digital template', prompt_pack: 'an AI prompt pack' }
  const prompt = `Generate a compelling product listing for ${typeDescriptions[type] ?? 'a digital product'} that a creator could sell online.\nReturn ONLY valid JSON: {"title":"Catchy product title (max 80 chars)","description":"Persuasive 2-3 sentence description","price":29}`
  const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 256 } }
  for (const model of ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash-lite']) {
    try {
      const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const gemJson = await gemRes.json()
      if (!gemRes.ok) { if (gemJson?.error?.code === 429 || gemJson?.error?.code === 404) continue; break }
      const text = gemJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      return res.json(parsed)
    } catch { continue }
  }
  return res.status(500).json({ error: 'AI generation failed' })
})

// GET /api/product/:id/is-purchased — Server-side purchase check (uses service key, bypasses RLS)
app.get('/api/product/:id/is-purchased', async (req, res) => {
  const { id } = req.params
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.json({ purchased: false, reason: 'not_authenticated' })

  try {
    const userData = await verifySupabaseJWT(token)
    if (!userData?.user) return res.json({ purchased: false, reason: 'invalid_token' })

    const userEmail = userData.user.email
    const userId = userData.user.id

    // Check if creator (creators can always download their own published products)
    const { data: products } = await dbQuery('products', { 'id': `eq.${id}`, 'limit': '1' })
    const product = products?.[0]
    if (product?.creator_id === userId) {
      return res.json({ purchased: true, isCreator: true })
    }

    // Check purchase record using service key (bypasses RLS)
    const { data: purchases } = await dbQuery('purchases', {
      'product_id': `eq.${id}`,
      'buyer_email': `eq.${userEmail}`,
      'limit': '1',
    })

    return res.json({ purchased: purchases?.length > 0, isCreator: false })
  } catch (err) {
    console.error('is-purchased error:', err)
    return res.json({ purchased: false, reason: 'error' })
  }
})

// GET /api/user/purchases — All purchases for the logged-in user (service key, bypasses RLS)
app.get('/api/user/purchases', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const userData = await verifySupabaseJWT(token)
    if (!userData?.user) return res.status(401).json({ error: 'Invalid token' })

    const userEmail = userData.user.email

    // Fetch purchases using service key (bypasses RLS)
    const { data: purchases } = await dbQuery('purchases', {
      'buyer_email': `eq.${userEmail}`,
      'order': 'created_at.desc',
      'limit': '50',
    })

    if (!purchases?.length) return res.json({ purchases: [] })

    // Fetch product details for each purchase
    const productIds = [...new Set(purchases.map(p => p.product_id))].filter(Boolean)
    let prodMap = {}
    if (productIds.length) {
      const { data: prods } = await dbQuery('products', {
        'id': `in.(${productIds.join(',')})`,
        'select': 'id,title,type,status',
      })
      prods?.forEach(p => { prodMap[p.id] = p })
    }

    const enriched = purchases.map(p => ({
      id: p.id,
      product_id: p.product_id,
      amount: p.amount,
      created_at: p.created_at,
      productTitle: prodMap[p.product_id]?.title ?? 'Unknown Product',
      productType: prodMap[p.product_id]?.type ?? 'ebook',
      productStatus: prodMap[p.product_id]?.status ?? 'published',
    }))

    return res.json({ purchases: enriched })
  } catch (err) {
    console.error('user/purchases error:', err)
    return res.status(500).json({ error: 'Failed to fetch purchases' })
  }
})

// POST /api/checkout
app.post('/api/checkout', async (req, res) => {
  const { product_id } = req.body
  if (!product_id) return res.status(400).json({ error: 'product_id required' })
  const { data: products, error } = await dbQuery('products', { 'id': `eq.${product_id}`, 'limit': '1' })
  if (error || !products?.length) return res.status(404).json({ error: 'Product not found' })
  const product = products[0]
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  const storeId = process.env.LEMONSQUEEZY_STORE_ID
  if (!apiKey || !storeId) return res.status(503).json({ error: 'Payment system not configured.' })
  try {
    const baseUrl = process.env.VITE_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'
    const lsRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/vnd.api+json', 'Accept': 'application/vnd.api+json' },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: { custom: { product_id: product.id, creator_id: product.creator_id } },
            product_options: { name: product.title, description: product.description || '', redirect_url: `${baseUrl}/p/${product.id}?success=true` },
          },
          relationships: {
            store: { data: { type: 'stores', id: String(storeId) } },
            variant: { data: { type: 'variants', id: String(process.env.LEMONSQUEEZY_VARIANT_ID || '1') } },
          },
        },
      }),
    })
    const lsJson = await lsRes.json()
    if (!lsRes.ok) return res.status(502).json({ error: 'Payment gateway error', details: lsJson })
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

// POST /api/generate-file — Generate PDF or PPTX and store in Supabase Storage
app.post('/api/generate-file', async (req, res) => {
  const { productId, title, description, content, type } = req.body
  if (!productId || !content) return res.status(400).json({ error: 'productId and content are required' })

  try {
    await ensureStorageBucket()

    let fileBuffer, ext, mimeType

    if (type === 'course') {
      fileBuffer = await generatePPTX({ title, description, content })
      ext = 'pptx'
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    } else {
      fileBuffer = await generatePDF({ title, description, content, type })
      ext = 'pdf'
      mimeType = 'application/pdf'
    }

    const storagePath = await uploadToStorage(`${productId}.${ext}`, fileBuffer, mimeType)

    // Try to save file_url to DB (column may not exist yet — handled gracefully)
    try {
      await dbUpdate('products', { file_url: storagePath }, { 'id': `eq.${productId}` })
    } catch {
      // file_url column may not exist — download still works via predictable path
    }

    return res.json({ ok: true, file_url: storagePath, ext })
  } catch (err) {
    console.error('File generation error:', err)
    return res.status(500).json({ error: `File generation failed: ${err.message}` })
  }
})

// GET /api/download/:productId — Verified download with signed URL
app.get('/api/download/:productId', async (req, res) => {
  const { productId } = req.params
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  try {
    // Verify user
    const userData = await verifySupabaseJWT(token)
    if (!userData?.user) return res.status(401).json({ error: 'Unauthorized' })

    const userEmail = userData.user.email
    const userId = userData.user.id

    // Fetch the product
    const { data: products } = await dbQuery('products', { 'id': `eq.${productId}`, 'limit': '1' })
    const product = products?.[0]
    if (!product) return res.status(404).json({ error: 'Product not found' })
    if (product.status !== 'published') return res.status(403).json({ error: 'Product not published' })

    // Check if user is the creator OR has a purchase record
    const isCreator = product.creator_id === userId
    if (!isCreator) {
      const { data: purchases } = await dbQuery('purchases', {
        'product_id': `eq.${productId}`,
        'buyer_email': `eq.${userEmail}`,
        'limit': '1',
      })
      if (!purchases?.length) return res.status(403).json({ error: 'Purchase required to download' })
    }

    // Determine file path — use stored file_url or derive from productId
    const ext = product.type === 'course' ? 'pptx' : 'pdf'
    const storagePath = product.file_url || `products/${productId}.${ext}`

    const signedUrl = await getSignedUrl(storagePath)
    return res.json({ url: signedUrl, ext, filename: `${product.title || 'product'}.${ext}` })
  } catch (err) {
    console.error('Download error:', err)
    return res.status(500).json({ error: 'Download failed' })
  }
})

const PORT = 3001
app.listen(PORT, async () => {
  console.log(`✓ Launchio API server running on port ${PORT}`)
  await ensureStorageBucket()
  if (!SUPABASE_URL) console.warn('⚠ SUPABASE_URL not set')
  else console.log(`✓ Supabase: ${SUPABASE_URL}`)
})
