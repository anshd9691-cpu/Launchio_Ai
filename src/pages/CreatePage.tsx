import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, BookOpen, GraduationCap, Layout, Zap, CheckCircle,
  ArrowRight, ArrowLeft, DollarSign, Send, Rocket, RefreshCw,
  Paperclip, X, FileText, Image, Type, Palette, LayoutTemplate, Music,
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

interface PreviewSettings {
  fontFamily: string
  fontSize: number
  theme: 'light' | 'dark' | 'purple' | 'sepia' | 'custom'
  bgColor: string
  textColor: string
  headingColor: string
  accentColor: string
  layout: 'document' | 'magazine' | 'minimal' | 'bold'
}

const THEME_PRESETS: Record<string, Partial<PreviewSettings>> = {
  light:  { theme: 'light',  bgColor: '#ffffff', textColor: '#1e1b4b', headingColor: '#1e1b4b', accentColor: '#8b5cf6' },
  dark:   { theme: 'dark',   bgColor: '#0f0f17', textColor: '#c4b5fd', headingColor: '#e8e6f8', accentColor: '#a78bfa' },
  purple: { theme: 'purple', bgColor: '#f5f3ff', textColor: '#4c4879', headingColor: '#1e1b4b', accentColor: '#8b5cf6' },
  sepia:  { theme: 'sepia',  bgColor: '#fdf6e3', textColor: '#5c4a2a', headingColor: '#3d2f1a', accentColor: '#c77d3a' },
}

const FONT_OPTIONS = [
  { label: 'Georgia (Serif)',    value: 'Georgia, serif' },
  { label: 'Inter (Modern)',     value: 'Inter, system-ui, sans-serif' },
  { label: 'Merriweather',       value: '"Merriweather", Georgia, serif' },
  { label: 'Playfair Display',   value: '"Playfair Display", Georgia, serif' },
  { label: 'Open Sans',          value: '"Open Sans", system-ui, sans-serif' },
  { label: 'Courier New (Mono)', value: '"Courier New", Courier, monospace' },
]

const LAYOUT_OPTIONS = [
  { id: 'document', label: 'Document', icon: '📄' },
  { id: 'magazine', label: 'Magazine', icon: '📰' },
  { id: 'minimal',  label: 'Minimal',  icon: '⬜' },
  { id: 'bold',     label: 'Bold',     icon: '🔲' },
]

const DEFAULT_SETTINGS: PreviewSettings = {
  fontFamily: 'Georgia, serif',
  fontSize: 14,
  theme: 'light',
  bgColor: '#ffffff',
  textColor: '#1e1b4b',
  headingColor: '#1e1b4b',
  accentColor: '#8b5cf6',
  layout: 'document',
}

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
  const [userToken, setUserToken] = useState<string | null>(null)
  const [hasPayout, setHasPayout] = useState<boolean | null>(null)
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

  // Preview editor
  const [previewSettings, setPreviewSettings] = useState<PreviewSettings>(DEFAULT_SETTINGS)
  const [activeToolTab, setActiveToolTab] = useState<'font' | 'colors' | 'layout' | 'media' | null>(null)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [previewVideos, setPreviewVideos] = useState<string[]>([])
  const [previewAudio, setPreviewAudio] = useState<string>('')
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [videoUrlInput, setVideoUrlInput] = useState('')
  const audioFileRef = useRef<HTMLInputElement>(null)

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
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data?.session
      if (!session?.user) { navigate('/login'); return }
      setUser({ id: session.user.id, email: session.user.email ?? '' })
      setUserToken(session.access_token)
      try {
        const res = await fetch('/api/payout/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = await res.json()
        setHasPayout(json.has_payout ?? false)
      } catch { setHasPayout(false) }
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
      if (json.settings && typeof json.settings === 'object' && Object.keys(json.settings).length > 0) {
        setPreviewSettings(prev => {
          const themeKey = json.settings.theme
          const themeBase = themeKey && THEME_PRESETS[themeKey] ? THEME_PRESETS[themeKey] : {}
          return { ...prev, ...themeBase, ...json.settings }
        })
      }
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
    applySettingsFromChat(text)
    sendMessageWith(messagesRef.current, text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const updateSettings = (updates: Partial<PreviewSettings>) => {
    setPreviewSettings(prev => ({ ...prev, ...updates }))
  }

  const applySettingsFromChat = (text: string) => {
    const t = text.toLowerCase()
    const u: Partial<PreviewSettings> = {}
    if (t.includes('dark mode') || t.includes('dark theme') || t.includes('dark background'))
      Object.assign(u, THEME_PRESETS.dark)
    else if (t.includes('light mode') || t.includes('light theme') || t.includes('white background'))
      Object.assign(u, THEME_PRESETS.light)
    else if (t.includes('purple theme') || t.includes('purple background'))
      Object.assign(u, THEME_PRESETS.purple)
    else if (t.includes('sepia') || t.includes('warm background'))
      Object.assign(u, THEME_PRESETS.sepia)
    if (t.includes('bigger font') || t.includes('larger font') || t.includes('increase font') || t.includes('larger text'))
      u.fontSize = Math.min(24, (previewSettings.fontSize + 2))
    if (t.includes('smaller font') || t.includes('decrease font') || t.includes('smaller text'))
      u.fontSize = Math.max(10, (previewSettings.fontSize - 2))
    if (t.includes('serif font') && !t.includes('sans')) u.fontFamily = 'Georgia, serif'
    if (t.includes('sans-serif') || t.includes('sans serif') || t.includes('modern font')) u.fontFamily = 'Inter, system-ui, sans-serif'
    if (t.includes('monospace') || t.includes('mono font') || t.includes('courier')) u.fontFamily = '"Courier New", Courier, monospace'
    if (t.includes('playfair')) u.fontFamily = '"Playfair Display", Georgia, serif'
    if (t.includes('magazine layout') || t.includes('magazine style')) u.layout = 'magazine'
    if (t.includes('minimal layout') || t.includes('minimal style') || t.includes('minimalist')) u.layout = 'minimal'
    if (t.includes('bold layout') || t.includes('bold style')) u.layout = 'bold'
    if (t.includes('document layout') || t.includes('document style') || t.includes('standard layout')) u.layout = 'document'
    if (Object.keys(u).length > 0) setPreviewSettings(prev => ({ ...prev, ...u }))
  }

  const getYouTubeEmbedUrl = (url: string): string | null => {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return m ? `https://www.youtube.com/embed/${m[1]}` : null
  }

  const addImage = () => {
    if (imageUrlInput.trim()) { setPreviewImages(prev => [...prev, imageUrlInput.trim()]); setImageUrlInput('') }
  }

  const addVideo = () => {
    if (videoUrlInput.trim()) { setPreviewVideos(prev => [...prev, videoUrlInput.trim()]); setVideoUrlInput('') }
  }

  const renderContentLines = (content: string) => {
    const s = previewSettings
    const isBold = s.layout === 'bold'
    const isMagazine = s.layout === 'magazine'
    const lines = content.split('\n')
    const elements: React.ReactNode[] = []
    let i = 0
    for (const line of lines) {
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} style={{ fontFamily: s.fontFamily, fontSize: isBold ? s.fontSize * 2.4 : isMagazine ? s.fontSize * 2 : s.fontSize * 1.8, color: s.headingColor, fontWeight: 800, lineHeight: 1.2, margin: '24px 0 12px', borderBottom: isMagazine ? `3px solid ${s.accentColor}` : 'none', paddingBottom: isMagazine ? 8 : 0 }}>
            {line.slice(2)}
          </h1>
        )
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} style={{ fontFamily: s.fontFamily, fontSize: isBold ? s.fontSize * 1.7 : s.fontSize * 1.4, color: s.headingColor, fontWeight: 700, lineHeight: 1.3, margin: '20px 0 8px' }}>
            {line.slice(3)}
          </h2>
        )
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} style={{ fontFamily: s.fontFamily, fontSize: isBold ? s.fontSize * 1.3 : s.fontSize * 1.15, color: s.headingColor, fontWeight: 700, lineHeight: 1.4, margin: '16px 0 6px' }}>
            {line.slice(4)}
          </h3>
        )
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <div key={i} style={{ display: 'flex', gap: 8, margin: '3px 0', paddingLeft: 8 }}>
            <span style={{ color: s.accentColor, fontWeight: 700, flexShrink: 0 }}>•</span>
            <p style={{ fontFamily: s.fontFamily, fontSize: s.fontSize, color: s.textColor, lineHeight: 1.75, margin: 0 }}>{line.slice(2)}</p>
          </div>
        )
      } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
        elements.push(
          <p key={i} style={{ fontFamily: s.fontFamily, fontSize: s.fontSize, color: s.headingColor, fontWeight: 700, lineHeight: 1.75, margin: '4px 0' }}>{line.slice(2, -2)}</p>
        )
      } else if (line === '') {
        elements.push(<div key={i} style={{ height: 10 }} />)
      } else {
        elements.push(
          <p key={i} style={{ fontFamily: s.fontFamily, fontSize: s.fontSize, color: s.textColor, lineHeight: s.layout === 'minimal' ? 2 : 1.75, margin: '3px 0' }}>{line}</p>
        )
      }
      i++
    }
    return elements
  }

  const handlePublish = async () => {
    if (!user) return
    if (!aiTitle.trim()) { setPublishError('AI needs to generate a title first.'); return }
    if (hasPayout === false) {
      navigate('/payout-setup')
      return
    }
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

                {/* Header */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div>
                    <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 14, color: '#1e1b4b' }}>Live Preview</p>
                    <p style={{ fontSize: 11, color: '#a5a3c0' }}>Type "dark mode", "bigger font", "magazine layout" in chat to style</p>
                  </div>
                  {hasContent && (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setStep(3)} className="btn-gradient"
                      style={{ padding: '8px 18px', borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={14} /> Use this version
                    </motion.button>
                  )}
                </div>

                {/* Editor Toolbar */}
                <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', gap: 6, background: '#fafaf9', flexShrink: 0, flexWrap: 'wrap' }}>
                  {([
                    { id: 'font',   icon: <Type size={13} />,           label: 'Font'   },
                    { id: 'colors', icon: <Palette size={13} />,        label: 'Colors' },
                    { id: 'layout', icon: <LayoutTemplate size={13} />, label: 'Layout' },
                    { id: 'media',  icon: <Music size={13} />,          label: 'Media'  },
                  ] as const).map(tab => (
                    <button key={tab.id}
                      onClick={() => setActiveToolTab(prev => prev === tab.id ? null : tab.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                        background: activeToolTab === tab.id ? '#8b5cf6' : '#fff',
                        color: activeToolTab === tab.id ? '#fff' : '#4c4879',
                        boxShadow: activeToolTab === tab.id ? 'none' : '0 0 0 1.5px rgba(139,92,246,0.2)',
                      }}
                    >{tab.icon}{tab.label}</button>
                  ))}
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 11, color: '#a5a3c0', fontWeight: 600, marginRight: 2 }}>Aa</span>
                    <button onClick={() => updateSettings({ fontSize: Math.max(10, previewSettings.fontSize - 1) })}
                      style={{ width: 26, height: 26, borderRadius: 6, border: '1.5px solid rgba(139,92,246,0.2)', background: '#fff', cursor: 'pointer', color: '#4c4879', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 12, color: '#1e1b4b', fontWeight: 700, minWidth: 22, textAlign: 'center' }}>{previewSettings.fontSize}</span>
                    <button onClick={() => updateSettings({ fontSize: Math.min(24, previewSettings.fontSize + 1) })}
                      style={{ width: 26, height: 26, borderRadius: 6, border: '1.5px solid rgba(139,92,246,0.2)', background: '#fff', cursor: 'pointer', color: '#4c4879', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>

                {/* Controls Panel */}
                <AnimatePresence>
                  {activeToolTab && (
                    <motion.div key={activeToolTab}
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{ overflow: 'hidden', borderBottom: '1px solid rgba(139,92,246,0.1)', background: '#fafaf9', flexShrink: 0 }}
                    >
                      <div style={{ padding: '12px 16px' }}>

                        {/* Font tab */}
                        {activeToolTab === 'font' && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {FONT_OPTIONS.map(f => (
                              <button key={f.value} onClick={() => updateSettings({ fontFamily: f.value })}
                                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: f.value, fontWeight: 600, border: 'none', transition: 'all 0.15s',
                                  background: previewSettings.fontFamily === f.value ? '#8b5cf6' : '#fff',
                                  color: previewSettings.fontFamily === f.value ? '#fff' : '#4c4879',
                                  boxShadow: previewSettings.fontFamily === f.value ? 'none' : '0 0 0 1.5px rgba(139,92,246,0.2)',
                                }}
                              >{f.label}</button>
                            ))}
                          </div>
                        )}

                        {/* Colors tab */}
                        {activeToolTab === 'colors' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {(Object.entries(THEME_PRESETS) as [string, Partial<PreviewSettings>][]).map(([key, preset]) => (
                                <button key={key} onClick={() => updateSettings({ ...preset, theme: key as PreviewSettings['theme'] })}
                                  style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s',
                                    background: preset.bgColor, color: preset.textColor,
                                    outline: previewSettings.theme === key ? `2px solid ${preset.accentColor}` : '2px solid transparent',
                                    outlineOffset: 2,
                                  }}
                                >{key.charAt(0).toUpperCase() + key.slice(1)}</button>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                              {([
                                { label: 'Background', key: 'bgColor' as const },
                                { label: 'Text',       key: 'textColor' as const },
                                { label: 'Headings',   key: 'headingColor' as const },
                                { label: 'Accent',     key: 'accentColor' as const },
                              ]).map(c => (
                                <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#4c4879', cursor: 'pointer' }}>
                                  <input type="color" value={previewSettings[c.key]} onChange={e => updateSettings({ [c.key]: e.target.value, theme: 'custom' })}
                                    style={{ width: 30, height: 22, borderRadius: 5, border: '1px solid rgba(139,92,246,0.2)', cursor: 'pointer', padding: 0 }} />
                                  {c.label}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Layout tab */}
                        {activeToolTab === 'layout' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            {LAYOUT_OPTIONS.map(l => (
                              <button key={l.id} onClick={() => updateSettings({ layout: l.id as PreviewSettings['layout'] })}
                                style={{ flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', border: 'none', transition: 'all 0.15s',
                                  background: previewSettings.layout === l.id ? '#f5f3ff' : '#fff',
                                  outline: previewSettings.layout === l.id ? '2px solid #8b5cf6' : '1.5px solid rgba(139,92,246,0.18)',
                                  outlineOffset: previewSettings.layout === l.id ? 1 : 0,
                                }}
                              >
                                <div style={{ fontSize: 20, marginBottom: 4 }}>{l.icon}</div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: previewSettings.layout === l.id ? '#8b5cf6' : '#4c4879', margin: 0 }}>{l.label}</p>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Media tab */}
                        {activeToolTab === 'media' && (
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {/* Images */}
                            <div style={{ flex: '1 1 180px' }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: '#4c4879', marginBottom: 6 }}>📷 Images</p>
                              <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                                <input value={imageUrlInput} onChange={e => setImageUrlInput(e.target.value)} placeholder="Paste image URL…"
                                  onKeyDown={e => e.key === 'Enter' && addImage()}
                                  style={{ flex: 1, padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(139,92,246,0.2)', fontSize: 12, outline: 'none', minWidth: 0 }} />
                                <button onClick={addImage} style={{ padding: '5px 10px', borderRadius: 7, background: '#8b5cf6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Add</button>
                              </div>
                              {previewImages.map((url, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                  <img src={url} alt="" style={{ width: 36, height: 28, objectFit: 'cover', borderRadius: 4 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                                  <span style={{ flex: 1, fontSize: 10, color: '#4c4879', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url.split('/').pop()}</span>
                                  <button onClick={() => setPreviewImages(prev => prev.filter((_, j) => j !== i))} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
                                </div>
                              ))}
                            </div>
                            {/* Videos */}
                            <div style={{ flex: '1 1 180px' }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: '#4c4879', marginBottom: 6 }}>🎥 YouTube</p>
                              <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
                                <input value={videoUrlInput} onChange={e => setVideoUrlInput(e.target.value)} placeholder="Paste YouTube URL…"
                                  onKeyDown={e => e.key === 'Enter' && addVideo()}
                                  style={{ flex: 1, padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(139,92,246,0.2)', fontSize: 12, outline: 'none', minWidth: 0 }} />
                                <button onClick={addVideo} style={{ padding: '5px 10px', borderRadius: 7, background: '#8b5cf6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Add</button>
                              </div>
                              {previewVideos.map((url, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                  <span style={{ flex: 1, fontSize: 10, color: '#4c4879', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
                                  <button onClick={() => setPreviewVideos(prev => prev.filter((_, j) => j !== i))} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
                                </div>
                              ))}
                            </div>
                            {/* Audio */}
                            <div style={{ flex: '1 1 140px' }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: '#4c4879', marginBottom: 6 }}>🎵 Audio</p>
                              <input ref={audioFileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) setPreviewAudio(URL.createObjectURL(file))
                              }} />
                              <button onClick={() => audioFileRef.current?.click()}
                                style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: '1.5px dashed rgba(139,92,246,0.3)', fontSize: 12, color: '#8b5cf6', background: '#f5f3ff', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s' }}>
                                {previewAudio ? '✓ Audio loaded' : '+ Upload audio'}
                              </button>
                              {previewAudio && (
                                <button onClick={() => setPreviewAudio('')} style={{ marginTop: 4, fontSize: 10, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Remove</button>
                              )}
                            </div>
                          </div>
                        )}

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Preview Content */}
                <div style={{ flex: 1, overflowY: 'auto', background: previewSettings.bgColor, transition: 'background 0.3s' }}>
                  {!hasContent ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                      <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Sparkles size={28} color="#c4b5fd" />
                      </div>
                      <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 16, color: '#1e1b4b', marginBottom: 8 }}>Your content will appear here</p>
                      <p style={{ fontSize: 13, color: '#a5a3c0', maxWidth: 300 }}>Tell the AI what your {typeLabels[type]} is about to generate a complete first draft.</p>
                    </div>
                  ) : (
                    <div style={{
                      maxWidth: previewSettings.layout === 'magazine' ? 900 : previewSettings.layout === 'minimal' ? 600 : 780,
                      margin: '0 auto',
                      padding: previewSettings.layout === 'minimal' ? '48px 40px' : previewSettings.layout === 'bold' ? '32px 28px' : '32px 36px',
                    }}>

                      {/* Magazine header strip */}
                      {previewSettings.layout === 'magazine' && (
                        <div style={{ background: `linear-gradient(135deg, ${previewSettings.accentColor}, ${previewSettings.accentColor}99)`, borderRadius: 12, padding: '20px 28px', marginBottom: 28 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>{typeLabels[type].toUpperCase()}</p>
                          <h1 style={{ fontFamily: previewSettings.fontFamily, fontSize: previewSettings.fontSize * 2.2, color: '#fff', fontWeight: 800, lineHeight: 1.2, margin: 0 }}>{aiTitle}</h1>
                        </div>
                      )}

                      {/* Standard title (non-magazine) */}
                      {previewSettings.layout !== 'magazine' && (
                        <div style={{ marginBottom: 20, paddingBottom: previewSettings.layout === 'bold' ? 16 : 0, borderBottom: previewSettings.layout === 'bold' ? `3px solid ${previewSettings.accentColor}` : 'none' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: previewSettings.accentColor, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{typeLabels[type]}</p>
                          <h1 style={{ fontFamily: previewSettings.fontFamily, fontSize: previewSettings.layout === 'bold' ? previewSettings.fontSize * 2.4 : previewSettings.fontSize * 2, color: previewSettings.headingColor, fontWeight: 800, lineHeight: 1.2, margin: 0 }}>
                            {aiTitle || '—'}
                          </h1>
                        </div>
                      )}

                      {/* Description */}
                      {aiDescription && (
                        <div style={{ marginBottom: 24, padding: '14px 18px', background: `${previewSettings.accentColor}14`, borderRadius: 10, borderLeft: `3px solid ${previewSettings.accentColor}` }}>
                          <p style={{ fontFamily: previewSettings.fontFamily, fontSize: previewSettings.fontSize, color: previewSettings.textColor, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>{aiDescription}</p>
                        </div>
                      )}

                      {/* Embedded Images */}
                      {previewImages.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: previewImages.length > 1 ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 24 }}>
                          {previewImages.map((url, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                              <img src={url} alt="" style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 240 }} onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none' }} />
                              <button onClick={() => setPreviewImages(prev => prev.filter((_, j) => j !== i))}
                                style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Embedded Videos */}
                      {previewVideos.length > 0 && (
                        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {previewVideos.map((url, i) => {
                            const embed = getYouTubeEmbedUrl(url)
                            return embed ? (
                              <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                                <iframe src={embed} style={{ width: '100%', height: 220, border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                                <button onClick={() => setPreviewVideos(prev => prev.filter((_, j) => j !== i))}
                                  style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                              </div>
                            ) : (
                              <div key={i} style={{ padding: '10px 14px', background: `${previewSettings.accentColor}14`, borderRadius: 10, fontSize: 12, color: previewSettings.textColor }}>
                                🎥 Invalid YouTube URL: {url}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Embedded Audio */}
                      {previewAudio && (
                        <div style={{ marginBottom: 24 }}>
                          <audio controls src={previewAudio} style={{ width: '100%', borderRadius: 8 }} />
                        </div>
                      )}

                      <div style={{ height: 1, background: `${previewSettings.accentColor}22`, margin: '20px 0' }} />

                      {/* Content */}
                      <div>
                        {renderContentLines(aiContent)}
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
