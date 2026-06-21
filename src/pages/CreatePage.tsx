import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, BookOpen, GraduationCap, Layout, Zap, CheckCircle,
  ArrowRight, ArrowLeft, DollarSign, Send, Rocket, RefreshCw,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import type { ProductType } from '@/lib/supabase'
import confetti from 'canvas-confetti'

type Step = 1 | 2 | 3 | 4

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const TYPES = [
  { id: 'ebook' as ProductType, label: 'Ebook', icon: <BookOpen size={28} />, desc: 'A digital book your audience can download instantly.', color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { id: 'course' as ProductType, label: 'Course', icon: <GraduationCap size={28} />, desc: 'Structured lessons, video links, or a study guide.', color: '#8b5cf6', gradient: 'linear-gradient(135deg,#8b5cf6,#a855f7)' },
  { id: 'template' as ProductType, label: 'Template', icon: <Layout size={28} />, desc: 'Notion, Figma, or document templates for others.', color: '#a855f7', gradient: 'linear-gradient(135deg,#a855f7,#ec4899)' },
  { id: 'prompt_pack' as ProductType, label: 'Prompt Pack', icon: <Zap size={28} />, desc: 'AI prompt collections for ChatGPT, Midjourney, and more.', color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#06b6d4)' },
]

const PRICE_SUGGESTIONS = [9, 19, 29, 49, 79, 97, 147, 197]

const LOADING_STATUSES = [
  'Reading your request…',
  'Building the outline…',
  'Writing the content…',
  'Refining the tone…',
  'Adding examples…',
  'Polishing the draft…',
]

const typeLabels: Record<string, string> = {
  ebook: 'ebook', course: 'course', template: 'template', prompt_pack: 'prompt pack',
}

export default function CreatePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [type, setType] = useState<ProductType>('ebook')

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(0)
  const [chatError, setChatError] = useState<string | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // AI-generated content
  const [aiTitle, setAiTitle] = useState('')
  const [aiDescription, setAiDescription] = useState('')
  const [aiContent, setAiContent] = useState('')
  const [hasContent, setHasContent] = useState(false)

  // Publish step
  const [price, setPrice] = useState(29)
  const [status, setStatus] = useState<'published' | 'draft'>('published')
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [createdId, setCreatedId] = useState('')

  const selectedType = TYPES.find(t => t.id === type)!

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate('/login')
      else setUser({ id: data.user.id, email: data.user.email ?? '' })
    })
  }, [navigate])

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Loading status rotation
  useEffect(() => {
    if (isLoading) {
      setLoadingStatus(0)
      loadingIntervalRef.current = setInterval(() => {
        setLoadingStatus(p => (p + 1) % LOADING_STATUSES.length)
      }, 1800)
    } else {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current)
    }
    return () => { if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current) }
  }, [isLoading])

  // Initialize chat when entering step 2
  const enterChatStep = () => {
    setMessages([{
      role: 'assistant',
      content: `What's your ${typeLabels[type]} about? Tell me the topic, your target audience, and any specific angle or style you want — and I'll build it out for you.`,
    }])
    setAiTitle('')
    setAiDescription('')
    setAiContent('')
    setHasContent(false)
    setChatError(null)
    setStep(2)
  }

  const sendMessage = async (userText?: string) => {
    const text = (userText ?? inputValue).trim()
    if (!text || isLoading) return

    setChatError(null)
    setInputValue('')

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          productType: type,
          currentContent: aiContent,
          currentTitle: aiTitle,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'AI request failed')
      }

      setMessages(prev => [...prev, { role: 'assistant', content: json.reply }])
      if (json.title) setAiTitle(json.title)
      if (json.description) setAiDescription(json.description)
      if (json.content) { setAiContent(json.content); setHasContent(true) }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setChatError(msg)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${msg}`,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handlePublish = async () => {
    if (!user) return
    if (!aiTitle.trim()) { setPublishError('AI needs to generate a title first.'); return }
    setPublishing(true)
    setPublishError('')

    try {
      const slug = aiTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)

      const { data, error: dbErr } = await supabase.from('products').insert({
        title: aiTitle.trim(),
        description: aiDescription.trim(),
        type,
        price,
        creator_id: user.id,
        creator_email: user.email,
        status,
        slug,
      }).select().single()

      if (dbErr) throw new Error(dbErr.message)

      // Generate file only on publish
      const genRes = await fetch('/api/generate-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: data.id,
          title: aiTitle,
          description: aiDescription,
          content: aiContent,
          type,
        }),
      })

      if (!genRes.ok) {
        const genErr = await genRes.json()
        // Rollback the product insert
        await supabase.from('products').delete().eq('id', data.id)
        throw new Error(genErr.error || 'File generation failed')
      }

      setCreatedId(data.id)
      setStep(4)
      setTimeout(() => {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#8b5cf6', '#6366f1', '#a855f7', '#c4b5fd', '#e9d5ff'] })
      }, 300)
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : 'Publishing failed. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <Navbar />
      <div style={{ paddingTop: 64 }}>

        {/* Progress bar */}
        <div style={{ maxWidth: step === 2 ? '100%' : 660, margin: '0 auto', padding: step === 2 ? '24px 24px 0' : '32px 16px 0' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: step === 2 ? 0 : 40, maxWidth: step === 2 ? 660 : undefined, margin: '0 auto' }}>
            {([1, 2, 3, 4] as const).map(s => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: s <= step ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : '#ede9fe', transition: 'background 0.5s ease' }} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: Choose type ─────────────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}
              style={{ maxWidth: 660, margin: '0 auto', padding: '0 16px 80px' }}
            >
              <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(24px,4vw,36px)', color: '#1e1b4b', letterSpacing: '-0.5px', marginBottom: 10, marginTop: 40 }}>
                What are you creating?
              </h1>
              <p style={{ color: '#4c4879', fontSize: 16, marginBottom: 32 }}>Choose the type of digital product you want to build and sell.</p>

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
                    {type === t.id && (
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 5, color: t.color, fontSize: 12, fontWeight: 700 }}>
                        <CheckCircle size={14} /> Selected
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={enterChatStep}
                className="btn-gradient" style={{ width: '100%', padding: '15px', borderRadius: 16, fontSize: 15, fontWeight: 700 }}
              >
                Continue — Build with AI <ArrowRight size={17} style={{ display: 'inline', marginLeft: 4 }} />
              </motion.button>
            </motion.div>
          )}

          {/* ── Step 2: AI Chat + Live Preview ─────────────────────────────── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              style={{ display: 'flex', height: 'calc(100vh - 100px)', overflow: 'hidden' }}
            >
              {/* Left — Chat panel */}
              <div style={{ flex: '0 0 420px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(139,92,246,0.12)', background: '#fafaf9' }}>
                {/* Chat header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', gap: 10, background: '#fff' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="btn-gradient">
                    <Rocket size={16} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 14, color: '#1e1b4b' }}>AI Content Builder</p>
                    <p style={{ fontSize: 11, color: '#8b5cf6' }}>Building your {typeLabels[type]}</p>
                  </div>
                  <button onClick={() => setStep(1)} style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 8, fontSize: 12, color: '#4c4879', background: '#f5f3ff', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowLeft size={12} /> Back
                  </button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                      {msg.role === 'assistant' && (
                        <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} className="btn-gradient">
                          <Rocket size={13} color="#fff" />
                        </div>
                      )}
                      <div style={{
                        maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#fff',
                        color: msg.role === 'user' ? '#fff' : '#1e1b4b',
                        fontSize: 13, lineHeight: 1.6,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        border: msg.role === 'assistant' ? '1px solid rgba(139,92,246,0.12)' : 'none',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} className="btn-gradient">
                        <Rocket size={13} color="#fff" />
                      </div>
                      <div style={{ padding: '10px 16px', borderRadius: '16px 16px 16px 4px', background: '#fff', border: '1px solid rgba(139,92,246,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {[0, 1, 2].map(d => (
                            <motion.div key={d} animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.2 }}
                              style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6' }}
                            />
                          ))}
                        </div>
                        <motion.p key={loadingStatus} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          {LOADING_STATUSES[loadingStatus]}
                        </motion.p>
                      </div>
                    </div>
                  )}

                  {/* Error retry */}
                  {chatError && !isLoading && (
                    <div style={{ textAlign: 'center' }}>
                      <button onClick={() => sendMessage(messages[messages.length - 2]?.content)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer' }}
                      >
                        <RefreshCw size={12} /> Retry
                      </button>
                    </div>
                  )}

                  {/* Use this version button */}
                  {hasContent && !isLoading && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ paddingTop: 4 }}>
                      <button onClick={() => setStep(3)}
                        className="btn-gradient"
                        style={{ width: '100%', padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', cursor: 'pointer' }}
                      >
                        <CheckCircle size={16} /> Use this version → Set price
                      </button>
                    </motion.div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(139,92,246,0.1)', background: '#fff' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <textarea
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={hasContent ? 'Make it funnier, add a chapter about X, simplify for beginners…' : `Describe your ${typeLabels[type]} idea…`}
                      disabled={isLoading}
                      rows={2}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 12, fontSize: 13,
                        border: '1.5px solid rgba(139,92,246,0.2)', outline: 'none', resize: 'none',
                        background: isLoading ? '#f5f3ff' : '#fff', color: '#1e1b4b', lineHeight: 1.5,
                        fontFamily: 'inherit',
                      }}
                    />
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => sendMessage()}
                      disabled={isLoading || !inputValue.trim()}
                      className="btn-gradient"
                      style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (isLoading || !inputValue.trim()) ? 0.5 : 1, border: 'none', cursor: 'pointer' }}
                    >
                      <Send size={16} color="#fff" />
                    </motion.button>
                  </div>
                  <p style={{ fontSize: 10, color: '#a5a3c0', marginTop: 6, textAlign: 'center' }}>Enter to send · Shift+Enter for new line</p>
                </div>
              </div>

              {/* Right — Live Preview */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 14, color: '#1e1b4b' }}>Live Preview</p>
                    <p style={{ fontSize: 11, color: '#4c4879' }}>Updates after each AI response</p>
                  </div>
                  {hasContent && (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setStep(3)}
                      className="btn-gradient"
                      style={{ padding: '8px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <CheckCircle size={14} /> Use this version
                    </motion.button>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                  {!hasContent ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#a5a3c0' }}>
                      <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Sparkles size={28} color="#c4b5fd" />
                      </div>
                      <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 16, color: '#1e1b4b', marginBottom: 8 }}>Your content will appear here</p>
                      <p style={{ fontSize: 13, maxWidth: 300 }}>Tell the AI what your {typeLabels[type]} is about to generate a complete first draft.</p>
                    </div>
                  ) : (
                    <div>
                      {/* Title */}
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Title</p>
                        <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 22, color: '#1e1b4b', lineHeight: 1.3 }}>{aiTitle || '—'}</h2>
                      </div>

                      {/* Description */}
                      {aiDescription && (
                        <div style={{ marginBottom: 20, padding: '14px', background: '#f5f3ff', borderRadius: 12, border: '1px solid rgba(139,92,246,0.12)' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Description</p>
                          <p style={{ fontSize: 14, color: '#4c4879', lineHeight: 1.7 }}>{aiDescription}</p>
                        </div>
                      )}

                      {/* Divider */}
                      <div style={{ height: 1, background: 'rgba(139,92,246,0.1)', margin: '20px 0' }} />

                      {/* Content preview */}
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Content Preview</p>
                        <div style={{ fontSize: 13, color: '#1e1b4b', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {aiContent.split('\n').map((line, i) => {
                            if (line.startsWith('# ') || line.startsWith('## ')) {
                              const lvl = line.startsWith('## ') ? 2 : 1
                              const text = line.replace(/^#{1,2}\s+/, '')
                              return (
                                <p key={i} style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: lvl === 1 ? 17 : 15, color: '#1e1b4b', margin: `${lvl === 1 ? 20 : 14}px 0 6px`, borderLeft: '3px solid #8b5cf6', paddingLeft: 10 }}>
                                  {text}
                                </p>
                              )
                            }
                            if (line.startsWith('### ')) {
                              return <p key={i} style={{ fontWeight: 700, fontSize: 13, color: '#4c4879', margin: '10px 0 4px' }}>{line.replace(/^###\s+/, '')}</p>
                            }
                            if (line.startsWith('- ') || line.startsWith('* ')) {
                              return <p key={i} style={{ margin: '2px 0', paddingLeft: 14 }}>• {line.slice(2)}</p>
                            }
                            if (!line.trim()) return <div key={i} style={{ height: 8 }} />
                            return <p key={i} style={{ margin: '4px 0', color: '#4c4879' }}>{line}</p>
                          })}
                        </div>
                      </div>

                      <div style={{ height: 40 }} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Price + Publish ─────────────────────────────────────── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}
              style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px 80px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 48, height: 48, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: selectedType.gradient, flexShrink: 0 }}>
                  {selectedType.icon}
                </div>
                <div>
                  <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 22, color: '#1e1b4b' }}>Set your price</h1>
                  <p style={{ color: '#4c4879', fontSize: 13 }}>{aiTitle || `Your ${selectedType.label}`}</p>
                </div>
              </div>

              {/* Summary card */}
              <div style={{ background: '#f5f3ff', borderRadius: 16, padding: '16px 18px', marginBottom: 24, border: '1px solid rgba(139,92,246,0.15)' }}>
                <p style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 700, marginBottom: 4 }}>CONTENT READY ✓</p>
                <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#1e1b4b', marginBottom: 4 }}>{aiTitle}</p>
                <p style={{ fontSize: 13, color: '#4c4879', lineHeight: 1.5 }}>{aiDescription?.slice(0, 120)}{aiDescription?.length > 120 ? '…' : ''}</p>
                <p style={{ fontSize: 11, color: '#a5a3c0', marginTop: 8 }}>{aiContent.split(' ').length.toLocaleString()} words generated</p>
              </div>

              {publishError && (
                <div style={{ padding: '12px 16px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
                  {publishError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Price */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>
                    <DollarSign size={13} style={{ display: 'inline', color: '#8b5cf6' }} /> Price (USD)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: '#8b5cf6', fontWeight: 700, fontSize: 16 }}>$</span>
                    <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} min={1} max={9999} className="input-field" style={{ paddingLeft: 30 }} />
                  </div>
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

                {/* Status */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 10 }}>Publish status</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['published', 'draft'] as const).map(s => (
                      <button key={s} onClick={() => setStatus(s)} style={{
                        flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                        background: status === s ? (s === 'published' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f5f3ff') : '#f5f3ff',
                        color: status === s ? (s === 'published' ? '#fff' : '#8b5cf6') : '#4c4879',
                      }}>
                        {s === 'published' ? '● Publish Now' : '○ Save as Draft'}
                      </button>
                    ))}
                  </div>
                  {status === 'draft' && (
                    <p style={{ fontSize: 12, color: '#a5a3c0', marginTop: 8 }}>⚠ Drafts are not publicly accessible. You can publish later from your dashboard.</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
                <button onClick={() => setStep(2)} className="btn-outline" style={{ flex: 1, padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700 }}>
                  <ArrowLeft size={16} style={{ display: 'inline', marginRight: 4 }} /> Back
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handlePublish} disabled={publishing}
                  className="btn-gradient" style={{ flex: 2, padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700, opacity: publishing ? 0.75 : 1 }}
                >
                  {publishing ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-block', width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} className="spin" />
                      Generating file…
                    </span>
                  ) : `${status === 'published' ? 'Launch Product' : 'Save Draft'} 🚀`}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Success ─────────────────────────────────────────────── */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: 'spring' }}
              style={{ textAlign: 'center', paddingTop: 40, maxWidth: 480, margin: '0 auto', padding: '40px 16px 80px' }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 160, delay: 0.15 }}
                style={{ width: 88, height: 88, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }} className="btn-gradient"
              >
                <CheckCircle size={40} color="#fff" />
              </motion.div>

              <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(26px,5vw,40px)', color: '#1e1b4b', letterSpacing: '-0.5px', marginBottom: 14 }}>
                Product launched! 🎉
              </h1>
              <p style={{ color: '#4c4879', fontSize: 16, lineHeight: 1.7, maxWidth: 400, margin: '0 auto 32px' }}>
                Your {typeLabels[type]} is live with a downloadable file ready for buyers. Share your link to start earning!
              </p>

              <div style={{ background: '#f5f3ff', border: '1.5px solid rgba(139,92,246,0.25)', borderRadius: 16, padding: '14px 18px', fontFamily: 'monospace', fontSize: 13, color: '#8b5cf6', fontWeight: 600, marginBottom: 28, wordBreak: 'break-all' }}>
                {window.location.origin}/p/{createdId}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/p/${createdId}`).catch(() => {})}
                  className="btn-gradient" style={{ width: '100%', padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  Copy Product Link
                </motion.button>
                <button onClick={() => { setStep(1); setAiTitle(''); setAiDescription(''); setAiContent(''); setCreatedId(''); setMessages([]) }}
                  className="btn-outline" style={{ width: '100%', padding: '14px', borderRadius: 16, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                >
                  Create Another Product
                </button>
                <button onClick={() => navigate('/dashboard')} style={{ padding: '13px', fontSize: 14, color: '#4c4879', fontWeight: 600, borderRadius: 14, border: 'none', background: 'none', cursor: 'pointer' }}>
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
