import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, BookOpen, GraduationCap, Layout, Zap, CheckCircle,
  ArrowRight, ArrowLeft, DollarSign, Send, Rocket, RefreshCw,
  Paperclip, X, FileText, Image,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import type { ProductType } from '@/lib/supabase'
import confetti from 'canvas-confetti'

type Step = 1 | 2 | 3 | 4

interface ChatMessage { role: 'user' | 'assistant'; content: string }
interface UploadedFile { name: string; content: string; fileType: 'text' | 'image' | 'binary' }

const TYPES = [
  { id: 'ebook' as ProductType, label: 'Ebook', icon: <BookOpen size={28} />, desc: 'A digital book your audience can download instantly.', color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { id: 'course' as ProductType, label: 'Course', icon: <GraduationCap size={28} />, desc: 'Structured lessons, video links, or a study guide.', color: '#8b5cf6', gradient: 'linear-gradient(135deg,#8b5cf6,#a855f7)' },
  { id: 'template' as ProductType, label: 'Template', icon: <Layout size={28} />, desc: 'Notion, Figma, or document templates for others.', color: '#a855f7', gradient: 'linear-gradient(135deg,#a855f7,#ec4899)' },
  { id: 'prompt_pack' as ProductType, label: 'Prompt Pack', icon: <Zap size={28} />, desc: 'AI prompt collections for ChatGPT, Midjourney, and more.', color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#06b6d4)' },
]

const TEMPLATES: Record<ProductType, { title: string; idea: string }[]> = {
  ebook: [
    { title: 'Productivity for Busy Parents', idea: 'Create an ebook about productivity for busy parents — managing time, setting boundaries, and still pursuing goals while raising kids.' },
    { title: "Beginner's Guide to Investing", idea: "Create a beginner's investing ebook covering stocks, ETFs, and compound interest — written simply without jargon for total beginners." },
    { title: 'Master LinkedIn for Career Growth', idea: 'Create an ebook about using LinkedIn to grow your career: optimizing your profile, building content, growing an audience, and landing opportunities.' },
    { title: '90-Day Freelancer Fast-Start', idea: 'Create an ebook with a 90-day action plan for going from employed to full-time freelancer: finding clients, pricing, and managing workload.' },
  ],
  course: [
    { title: 'Build a No-Code SaaS in 30 Days', idea: 'Create a course about building a real SaaS product using no-code tools in 30 days, covering idea validation, building, pricing, and launching.' },
    { title: 'Instagram Growth Masterclass', idea: 'Create a course on growing an Instagram following from 0 to 10K: content strategy, reels hooks, and converting followers to buyers.' },
    { title: 'Freelance Writing from Scratch', idea: 'Create a course for aspiring freelance writers covering niche selection, finding clients, pitching, and scaling to $5K/month.' },
    { title: 'The YouTube Creator Blueprint', idea: 'Create a course on starting and growing a YouTube channel: niche selection, scripting, recording, SEO, thumbnails, and monetization.' },
  ],
  template: [
    { title: 'Annual Marketing Plan', idea: 'Create a comprehensive annual marketing plan template with market analysis, goals, channels, budget, calendar, and KPI tracking sections.' },
    { title: 'Client Onboarding Kit', idea: 'Create a client onboarding template pack for freelancers: welcome letter, project brief, communication guidelines, and milestone tracker.' },
    { title: '90-Day Social Media Calendar', idea: 'Create a 90-day social media content calendar template with content pillars, post formats, captions, and performance tracking columns.' },
    { title: 'Freelancer OS (Notion Style)', idea: 'Create a Notion-style workspace template for freelancers: project tracker, client CRM, invoice log, revenue dashboard, and task manager.' },
  ],
  prompt_pack: [
    { title: 'ChatGPT for Content Creators', idea: 'Create a prompt pack of 40+ ChatGPT prompts for content creators: blog ideas, social captions, email newsletters, YouTube scripts, and repurposing.' },
    { title: 'Midjourney for Designers', idea: 'Create a prompt pack of 40+ Midjourney prompts for graphic designers: logos, brand identity, product mockups, UI inspiration, and illustration styles.' },
    { title: 'AI for Sales & Marketing', idea: 'Create a prompt pack of 40+ AI prompts for sales and marketing: cold outreach, follow-ups, pitch decks, objection handling, and case studies.' },
    { title: 'Developer Productivity AI Prompts', idea: 'Create a prompt pack of 40+ AI prompts for software developers: code review, debugging, documentation, architecture planning, and unit test generation.' },
  ],
}

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
  const [showTemplates, setShowTemplates] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesRef = useRef<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(0)
  const [chatError, setChatError] = useState<string | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // File uploads (Part 5)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const [schemaReady, setSchemaReady] = useState<boolean | null>(null)

  const selectedType = TYPES.find(t => t.id === type)!

  // Keep messagesRef in sync
  useEffect(() => { messagesRef.current = messages }, [messages])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate('/login')
      else setUser({ id: data.user.id, email: data.user.email ?? '' })
    })
    fetch('/api/schema-check').then(r => r.json()).then(j => setSchemaReady(j.ready)).catch(() => setSchemaReady(null))
  }, [navigate])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

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

  // Reset template flag when type changes
  useEffect(() => { setShowTemplates(false) }, [type])

  const enterChatStep = (starterMessage?: string) => {
    const greeting: ChatMessage = {
      role: 'assistant',
      content: `What's your ${typeLabels[type]} about? Tell me the topic, your target audience, and any specific angle or style — and I'll build it out for you.`,
    }
    setMessages([greeting])
    setAiTitle(''); setAiDescription(''); setAiContent(''); setHasContent(false)
    setChatError(null)
    setShowTemplates(false)
    setStep(2)

    // If a starter message was provided, send it automatically after a brief delay
    if (starterMessage) {
      setTimeout(() => {
        sendMessageWith([greeting], starterMessage)
      }, 300)
    }
  }

  // File upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    Array.from(files).forEach(file => {
      const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.name.endsWith('.txt')
      const isImage = file.type.startsWith('image/')
      if (isText) {
        const reader = new FileReader()
        reader.readAsText(file)
        reader.onload = ev => {
          const content = (ev.target?.result as string).slice(0, 3000)
          setUploadedFiles(prev => [...prev, { name: file.name, content, fileType: 'text' }])
        }
      } else {
        setUploadedFiles(prev => [...prev, { name: file.name, content: '', fileType: isImage ? 'image' : 'binary' }])
      }
    })
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Core message sender — uses a passed messages array to avoid stale closure issues
  const sendMessageWith = async (currentMessages: ChatMessage[], text: string) => {
    if (!text.trim() || isLoading) return
    setChatError(null)

    const newMessages: ChatMessage[] = [...currentMessages, { role: 'user', content: text }]
    setMessages(newMessages)
    messagesRef.current = newMessages
    setIsLoading(true)

    // Filter out the initial UI greeting from API history (it's not real conversation history)
    const apiMessages = newMessages.filter((m, i) => !(i === 0 && m.role === 'assistant'))

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          productType: type,
          currentContent: aiContent,
          currentTitle: aiTitle,
          attachments: uploadedFiles.map(f => ({ name: f.name, content: f.content, fileType: f.fileType })),
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'AI request failed')

      const updated = [...newMessages, { role: 'assistant' as const, content: json.reply }]
      setMessages(updated)
      messagesRef.current = updated
      if (json.title) setAiTitle(json.title)
      if (json.description) setAiDescription(json.description)
      if (json.content) { setAiContent(json.content); setHasContent(true) }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setChatError(msg)
      const withError = [...newMessages, { role: 'assistant' as const, content: `⚠️ ${msg}` }]
      setMessages(withError)
      messagesRef.current = withError
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = (userText?: string) => {
    const text = (userText ?? inputValue).trim()
    if (!text) return
    setInputValue('')
    sendMessageWith(messagesRef.current, text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handlePublish = async () => {
    if (!user) return
    if (!aiTitle.trim()) { setPublishError('AI needs to generate a title first.'); return }
    setPublishing(true); setPublishError('')

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

      const genRes = await fetch('/api/generate-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: data.id, title: aiTitle, description: aiDescription, content: aiContent, type }),
      })

      if (!genRes.ok) {
        const genErr = await genRes.json()
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

        {schemaReady === false && (
          <div style={{ background: '#fef3c7', borderBottom: '1px solid #fcd34d', padding: '12px 24px', textAlign: 'center' }}>
            <span style={{ color: '#92400e', fontWeight: 600, fontSize: 14 }}>
              ⚠️ Database setup required before you can publish.{' '}
              <a href="https://supabase.com/dashboard/project/vvpucasvyifmxqcavktg/sql/new" target="_blank" rel="noreferrer"
                style={{ color: '#6366f1', textDecoration: 'underline' }}>Open Supabase SQL Editor</a>
              {' '}and run <code style={{ background: '#fde68a', borderRadius: 4, padding: '1px 5px' }}>supabase-setup.sql</code>.
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div style={{ maxWidth: step === 2 ? '100%' : 660, margin: '0 auto', padding: step === 2 ? '24px 24px 0' : '32px 16px 0' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: step === 2 ? 0 : 40, maxWidth: step === 2 ? 660 : undefined, margin: '0 auto' }}>
            {([1, 2, 3, 4] as const).map(s => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: s <= step ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : '#ede9fe', transition: 'background 0.5s ease' }} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Step 1: Choose type ──────────────────────────────────────────── */}
          {step === 1 && !showTemplates && (
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

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowTemplates(true)}
                className="btn-gradient" style={{ width: '100%', padding: '15px', borderRadius: 16, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                Continue — Build with AI <ArrowRight size={17} style={{ display: 'inline', marginLeft: 4 }} />
              </motion.button>
            </motion.div>
          )}

          {/* ── Step 1.5: Template Cards ─────────────────────────────────────── */}
          {step === 1 && showTemplates && (
            <motion.div key="templates" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}
              style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px 80px' }}
            >
              <button onClick={() => setShowTemplates(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8b5cf6', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginTop: 32, marginBottom: 24 }}>
                <ArrowLeft size={14} /> Back to type selection
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedType.gradient, color: '#fff' }}>
                  {selectedType.icon}
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 24, color: '#1e1b4b', lineHeight: 1.2 }}>Choose a starting point</h2>
                  <p style={{ color: '#4c4879', fontSize: 14 }}>Pick a trending template or start fresh</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28 }}>
                {/* Start from scratch */}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => enterChatStep()}
                  style={{ border: '2px dashed rgba(139,92,246,0.3)', borderRadius: 18, padding: '18px 22px', textAlign: 'left', cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Sparkles size={20} color="#8b5cf6" />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#1e1b4b', marginBottom: 3 }}>Start from scratch</p>
                    <p style={{ fontSize: 13, color: '#4c4879' }}>Describe your idea and the AI will build it from your vision</p>
                  </div>
                  <ArrowRight size={16} color="#8b5cf6" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                </motion.button>

                {/* Trending templates */}
                <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '8px 0 4px' }}>
                  🔥 Trending templates
                </p>

                {(TEMPLATES[type] ?? []).map((tmpl, i) => (
                  <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => enterChatStep(tmpl.idea)}
                    style={{ border: '2px solid rgba(139,92,246,0.15)', borderRadius: 18, padding: '18px 22px', textAlign: 'left', cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s' }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: selectedType.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' }}>
                      <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 18 }}>{(i + 1)}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#1e1b4b', marginBottom: 3 }}>{tmpl.title}</p>
                      <p style={{ fontSize: 12, color: '#4c4879', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tmpl.idea.slice(0, 80)}…</p>
                    </div>
                    <ArrowRight size={16} color="#8b5cf6" style={{ flexShrink: 0 }} />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Step 2: AI Chat + Live Preview ──────────────────────────────── */}
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
                  <button onClick={() => { setStep(1); setShowTemplates(false) }} style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 8, fontSize: 12, color: '#4c4879', background: '#f5f3ff', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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

                  {chatError && !isLoading && (
                    <div style={{ textAlign: 'center' }}>
                      <button onClick={() => {
                        const lastUser = [...messagesRef.current].reverse().find(m => m.role === 'user')
                        if (lastUser) sendMessage(lastUser.content)
                      }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer' }}
                      >
                        <RefreshCw size={12} /> Retry
                      </button>
                    </div>
                  )}

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

                {/* Uploaded file chips */}
                {uploadedFiles.length > 0 && (
                  <div style={{ padding: '8px 16px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {uploadedFiles.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#f5f3ff', border: '1px solid rgba(139,92,246,0.2)', fontSize: 11, fontWeight: 600, color: '#6366f1' }}>
                        {f.fileType === 'text' ? <FileText size={11} /> : <Image size={11} />}
                        {f.name.length > 18 ? f.name.slice(0, 15) + '…' : f.name}
                        <button onClick={() => removeFile(i)} style={{ color: '#8b5cf6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(139,92,246,0.1)', background: '#fff' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    {/* File upload button */}
                    <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.csv,.pdf,image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                    <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach reference files"
                      style={{ width: 40, height: 40, borderRadius: 12, background: '#f5f3ff', border: '1.5px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#8b5cf6' }}
                    >
                      <Paperclip size={16} />
                    </motion.button>

                    <textarea
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={hasContent ? 'Make it funnier, add a chapter about X, simplify…' : `Describe your ${typeLabels[type]} idea…`}
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
                  <p style={{ fontSize: 10, color: '#a5a3c0', marginTop: 6, textAlign: 'center' }}>Enter to send · Shift+Enter for new line · 📎 attach reference files</p>
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
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Title</p>
                        <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 22, color: '#1e1b4b', lineHeight: 1.3 }}>{aiTitle || '—'}</h2>
                      </div>
                      {aiDescription && (
                        <div style={{ marginBottom: 20, padding: '14px', background: '#f5f3ff', borderRadius: 12, border: '1px solid rgba(139,92,246,0.12)' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Description</p>
                          <p style={{ fontSize: 14, color: '#4c4879', lineHeight: 1.7 }}>{aiDescription}</p>
                        </div>
                      )}
                      <div style={{ height: 1, background: 'rgba(139,92,246,0.1)', margin: '20px 0' }} />
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Content Preview</p>
                        <div style={{ fontSize: 13, color: '#1e1b4b', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {aiContent.slice(0, 2000)}{aiContent.length > 2000 ? '\n\n…[content continues in your download]' : ''}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Set Price ───────────────────────────────────────────── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.35 }}
              style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 80px' }}
            >
              <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8b5cf6', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginTop: 32, marginBottom: 28 }}>
                <ArrowLeft size={14} /> Back to editor
              </button>
              <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(24px,4vw,34px)', color: '#1e1b4b', letterSpacing: '-0.5px', marginBottom: 10 }}>
                Set your price
              </h1>
              <p style={{ color: '#4c4879', fontSize: 15, marginBottom: 32 }}>You keep 70% of every sale. Choose a price that reflects your value.</p>

              {/* Product summary card */}
              <div className="card-glass" style={{ borderRadius: 20, padding: '20px 22px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: selectedType.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                  {selectedType.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aiTitle}</p>
                  <p style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600, marginTop: 3 }}>{selectedType.label}</p>
                </div>
              </div>

              {/* Price suggestions */}
              <div style={{ marginBottom: 22 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 12 }}>Quick select:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {PRICE_SUGGESTIONS.map(p => (
                    <motion.button key={p} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} onClick={() => setPrice(p)}
                      style={{
                        padding: '8px 18px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        ...(price === p
                          ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }
                          : { background: '#f5f3ff', color: '#8b5cf6', border: '1.5px solid rgba(139,92,246,0.2)' })
                      }}
                    >
                      ${p}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Custom price input */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 8 }}>Custom price</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8b5cf6' }} />
                  <input type="number" min={1} max={9999} value={price} onChange={e => setPrice(Number(e.target.value) || 1)}
                    className="input-field" style={{ paddingLeft: 38, fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 20 }}
                  />
                </div>
              </div>

              {/* Payout breakdown */}
              <div style={{ background: '#f5f3ff', borderRadius: 16, padding: '16px 20px', marginBottom: 28 }}>
                {[
                  { label: 'Buyer pays', value: `$${price}` },
                  { label: 'Your payout (70%)', value: `$${(price * 0.7).toFixed(2)}`, highlight: true },
                  { label: 'Platform fee (30%)', value: `$${(price * 0.3).toFixed(2)}` },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i < 2 ? 8 : 0 }}>
                    <span style={{ fontSize: 13, color: '#4c4879' }}>{row.label}</span>
                    <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: row.highlight ? 800 : 600, fontSize: row.highlight ? 16 : 14, color: row.highlight ? '#8b5cf6' : '#1e1b4b' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Publish/Draft toggle */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                {(['published', 'draft'] as const).map(s => (
                  <motion.button key={s} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStatus(s)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                      ...(status === s
                        ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }
                        : { background: '#f5f3ff', color: '#4c4879', border: '1.5px solid rgba(139,92,246,0.15)' })
                    }}
                  >
                    {s === 'published' ? '🚀 Publish Now' : '📝 Save as Draft'}
                  </motion.button>
                ))}
              </div>

              {publishError && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                  {publishError}
                </div>
              )}

              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handlePublish} disabled={publishing}
                className="btn-gradient" style={{ width: '100%', padding: '16px', borderRadius: 16, fontSize: 16, fontWeight: 700, opacity: publishing ? 0.75 : 1, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {publishing
                  ? <><span style={{ display: 'inline-block', width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} className="spin" /> Generating your product…</>
                  : <><Rocket size={18} /> {status === 'published' ? 'Publish & Generate Product' : 'Save as Draft'}</>}
              </motion.button>
            </motion.div>
          )}

          {/* ── Step 4: Success ─────────────────────────────────────────────── */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
              style={{ maxWidth: 500, margin: '80px auto 0', padding: '0 16px', textAlign: 'center' }}
            >
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                style={{ width: 88, height: 88, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}
                className="btn-gradient"
              >
                <CheckCircle size={42} color="#fff" />
              </motion.div>

              <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 34, color: '#1e1b4b', letterSpacing: '-1px', marginBottom: 14 }}>
                You're live! 🎉
              </h1>
              <p style={{ color: '#4c4879', fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
                Your {typeLabels[type]} has been generated and is ready to sell.
                Share the link and start earning!
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <motion.a whileHover={{ scale: 1.03 }} href={`/p/${createdId}`}
                  className="btn-gradient"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 24px', borderRadius: 16, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
                >
                  <Rocket size={18} /> View Product Page
                </motion.a>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate('/dashboard')}
                  style={{ padding: '14px 24px', borderRadius: 16, fontSize: 15, fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', border: 'none', cursor: 'pointer' }}
                >
                  Go to Dashboard
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setStep(1); setShowTemplates(false); setAiTitle(''); setAiDescription(''); setAiContent(''); setHasContent(false); setMessages([]); setUploadedFiles([]) }}
                  style={{ padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#4c4879', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Create another product
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
