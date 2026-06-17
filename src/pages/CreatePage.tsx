import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, BookOpen, GraduationCap, Layout, Zap, CheckCircle, ArrowRight, ArrowLeft, DollarSign } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import type { ProductType } from '@/lib/supabase'
import confetti from 'canvas-confetti'

type Step = 1 | 2 | 3

const TYPES: { id: ProductType; label: string; icon: React.ReactNode; desc: string; color: string; gradient: string }[] = [
  { id: 'ebook', label: 'Ebook', icon: <BookOpen size={28} />, desc: 'A digital book your audience can download instantly.', color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { id: 'course', label: 'Course', icon: <GraduationCap size={28} />, desc: 'Structured lessons, video links, or a study guide.', color: '#8b5cf6', gradient: 'linear-gradient(135deg,#8b5cf6,#a855f7)' },
  { id: 'template', label: 'Template', icon: <Layout size={28} />, desc: 'Notion, Figma, or document templates for others.', color: '#a855f7', gradient: 'linear-gradient(135deg,#a855f7,#ec4899)' },
  { id: 'prompt_pack', label: 'Prompt Pack', icon: <Zap size={28} />, desc: 'AI prompt collections for ChatGPT, Midjourney, and more.', color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#06b6d4)' },
]

const PRICE_SUGGESTIONS = [9, 19, 29, 49, 79, 97, 147, 197]

export default function CreatePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [type, setType] = useState<ProductType>('ebook')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number>(29)
  const [status, setStatus] = useState<'published' | 'draft'>('published')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdId, setCreatedId] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate('/login')
      else setUser({ id: data.user.id, email: data.user.email ?? '' })
    })
  }, [navigate])

  const handleAIGenerate = async () => {
    if (!type) return
    setGenerating(true); setError('')
    try {
      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (res.ok) {
        const json = await res.json()
        setTitle(json.title ?? '')
        setDescription(json.description ?? '')
        setPrice(json.price ?? 29)
      } else {
        const suggestions: Record<ProductType, { title: string; description: string; price: number }> = {
          ebook: { title: "The AI Creator's Handbook", description: 'A comprehensive guide to leveraging AI tools for content creation, monetization, and building your digital empire.', price: 29 },
          course: { title: 'Prompt Engineering Mastery', description: 'Learn to craft perfect prompts for ChatGPT, Claude, and Midjourney. Get more done in less time with AI.', price: 97 },
          template: { title: 'Ultimate Notion Creator OS', description: 'A complete Notion system for digital creators: content calendar, client tracker, project manager, and more.', price: 49 },
          prompt_pack: { title: '500 ChatGPT Prompts for Business', description: 'The ultimate collection of ChatGPT prompts for marketing, copywriting, sales, and business strategy.', price: 19 },
        }
        const s = suggestions[type]
        setTitle(s.title); setDescription(s.description); setPrice(s.price)
      }
    } catch {
      setError('AI generation unavailable. Try manually or use suggestions below.')
    }
    setGenerating(false)
  }

  const handleSubmit = async () => {
    if (!user) return
    if (!title.trim()) { setError('Title is required.'); return }
    if (price <= 0) { setError('Price must be greater than 0.'); return }
    setLoading(true); setError('')

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)

    const { data, error: dbErr } = await supabase.from('products').insert({
      title: title.trim(),
      description: description.trim(),
      type,
      price,
      creator_id: user.id,
      creator_email: user.email,
      status,
      slug,
    }).select().single()

    if (dbErr) { setError(dbErr.message); setLoading(false); return }

    setCreatedId(data.id)
    setStep(3)
    setLoading(false)
    setTimeout(() => {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors: ['#8b5cf6', '#6366f1', '#a855f7', '#c4b5fd', '#e9d5ff'] })
    }, 300)
  }

  const selectedType = TYPES.find(t => t.id === type)!

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <Navbar />
      <div style={{ maxWidth: 660, margin: '0 auto', padding: '96px 16px 80px' }}>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
          {([1, 2, 3] as const).map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: s <= step ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : '#ede9fe', transition: 'background 0.5s ease' }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Type */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}>
              <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(24px,4vw,36px)', color: '#1e1b4b', letterSpacing: '-0.5px', marginBottom: 10 }}>
                What are you creating?
              </h1>
              <p style={{ color: '#4c4879', fontSize: 16, marginBottom: 32 }}>Choose the type of digital product you want to sell.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginBottom: 32 }}>
                {TYPES.map(t => (
                  <motion.button key={t.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setType(t.id)}
                    style={{
                      border: type === t.id ? `2px solid ${t.color}` : '2px solid rgba(139,92,246,0.15)',
                      borderRadius: 20, padding: '22px 20px', textAlign: 'left', cursor: 'pointer',
                      background: type === t.id ? '#f5f3ff' : '#fff', transition: 'all 0.2s',
                      boxShadow: type === t.id ? `0 4px 20px ${t.color}28` : 'none',
                    }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, background: type === t.id ? t.gradient : '#f5f3ff', color: type === t.id ? '#fff' : t.color, transition: 'all 0.2s' }}>
                      {t.icon}
                    </div>
                    <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 16, color: '#1e1b4b', marginBottom: 6 }}>{t.label}</p>
                    <p style={{ fontSize: 13, color: '#4c4879', lineHeight: 1.5 }}>{t.desc}</p>
                    {type === t.id && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 5, color: t.color, fontSize: 12, fontWeight: 700 }}>
                      <CheckCircle size={14} /> Selected
                    </div>}
                  </motion.button>
                ))}
              </div>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setStep(2)}
                className="btn-gradient" style={{ width: '100%', padding: '15px', borderRadius: 16, fontSize: 15, fontWeight: 700 }}
              >
                Continue <ArrowRight size={17} style={{ display: 'inline', marginLeft: 4 }} />
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 48, height: 48, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: selectedType.gradient, flexShrink: 0 }}>
                  {selectedType.icon}
                </div>
                <div>
                  <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 24, color: '#1e1b4b' }}>Product details</h1>
                  <p style={{ color: '#4c4879', fontSize: 14 }}>Creating a {selectedType.label}</p>
                </div>
              </div>

              {/* AI Generate */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleAIGenerate} disabled={generating}
                style={{ width: '100%', padding: '13px', borderRadius: 14, marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, border: '2px solid rgba(139,92,246,0.25)', background: '#f5f3ff', color: '#8b5cf6', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', opacity: generating ? 0.8 : 1 }}
              >
                {generating
                  ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(139,92,246,0.35)', borderTopColor: '#8b5cf6', borderRadius: '50%' }} className="spin" /> Generating with AI…</>
                  : <><Sparkles size={16} /> Auto-fill with AI</>
                }
              </motion.button>

              {error && <p style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>{error}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>Title <span style={{ color: '#dc2626' }}>*</span></label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder={`e.g. The Ultimate ${selectedType.label} for Creators`} className="input-field" maxLength={100} />
                  <p style={{ fontSize: 11, color: '#a5a3c0', marginTop: 4 }}>{title.length}/100 characters</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what buyers get and why they need it…"
                    className="input-field" style={{ minHeight: 110, resize: 'vertical' }} maxLength={600}
                  />
                  <p style={{ fontSize: 11, color: '#a5a3c0', marginTop: 4 }}>{description.length}/600 characters</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>
                    <DollarSign size={13} style={{ display: 'inline', color: '#8b5cf6' }} /> Price (USD) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: '#8b5cf6', fontWeight: 700, fontSize: 16 }}>$</span>
                    <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={1} max={9999} className="input-field" style={{ paddingLeft: 30 }} />
                  </div>
                  {/* Price suggestions */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {PRICE_SUGGESTIONS.map(p => (
                      <button key={p} onClick={() => setPrice(p)} style={{
                        padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                        background: price === p ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f5f3ff',
                        color: price === p ? '#fff' : '#8b5cf6',
                      }}>
                        ${p}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600, marginTop: 8 }}>
                    You receive: <strong>${(price * 0.7).toFixed(2)}</strong> <span style={{ color: '#4c4879', fontWeight: 400 }}>(70% payout)</span>
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 10 }}>Publish status</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['published', 'draft'] as const).map(s => (
                      <button key={s} onClick={() => setStatus(s)} style={{
                        flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                        background: status === s ? (s === 'published' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f5f3ff') : '#f5f3ff',
                        color: status === s ? (s === 'published' ? '#fff' : '#8b5cf6') : '#4c4879',
                        boxShadow: status === s && s === 'published' ? '0 4px 16px rgba(139,92,246,0.3)' : 'none',
                      }}>
                        {s === 'published' ? '● Publish Now' : '○ Save as Draft'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button onClick={() => setStep(1)} className="btn-outline" style={{ flex: 1, padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700 }}>
                  <ArrowLeft size={16} style={{ display: 'inline', marginRight: 4 }} /> Back
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={loading}
                  className="btn-gradient" style={{ flex: 2, padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700, opacity: loading ? 0.75 : 1 }}
                >
                  {loading
                    ? <span style={{ display: 'inline-block', width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} className="spin" />
                    : `${status === 'published' ? 'Launch Product' : 'Save Draft'} 🚀`
                  }
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: 'spring' }}
              style={{ textAlign: 'center', paddingTop: 20 }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 160, delay: 0.15 }}
                style={{ width: 88, height: 88, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }} className="btn-gradient"
              >
                <CheckCircle size={40} color="#fff" />
              </motion.div>

              <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(26px,5vw,40px)', color: '#1e1b4b', letterSpacing: '-0.5px', marginBottom: 14 }}>
                Product launched! 🎉
              </h1>
              <p style={{ color: '#4c4879', fontSize: 16, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 32px' }}>
                Your product is live. Share your link to start collecting sales instantly.
              </p>

              <div style={{ background: '#f5f3ff', border: '1.5px solid rgba(139,92,246,0.25)', borderRadius: 16, padding: '14px 18px', fontFamily: 'monospace', fontSize: 13, color: '#8b5cf6', fontWeight: 600, marginBottom: 28, wordBreak: 'break-all' }}>
                {window.location.origin}/p/{createdId}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/p/${createdId}`).catch(() => {}) }}
                  className="btn-gradient" style={{ width: '100%', padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700 }}
                >
                  Copy Product Link
                </motion.button>
                <button onClick={() => { setStep(1); setTitle(''); setDescription(''); setPrice(29); setCreatedId('') }}
                  className="btn-outline" style={{ width: '100%', padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700 }}
                >
                  Create Another Product
                </button>
                <button onClick={() => navigate('/dashboard')} style={{ padding: '13px', fontSize: 14, color: '#4c4879', fontWeight: 600, borderRadius: 14 }}>
                  Go to Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
