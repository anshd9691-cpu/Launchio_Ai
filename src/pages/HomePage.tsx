import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Sparkles, BookOpen, GraduationCap, Layout, Shield, Zap, TrendingUp } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CountUp from '@/components/CountUp'

const fadeInUp = { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } }
const stagger = { animate: { transition: { staggerChildren: 0.1 } } }
const wordAnim = { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } } }

const heroWords = [
  { text: 'Launch', gradient: false },
  { text: 'Your', gradient: false },
  { text: 'Digital', gradient: false },
  { text: 'Product', gradient: false },
  { text: 'in', gradient: false },
  { text: '60', gradient: true },
  { text: 'Seconds', gradient: true },
]

const floatingCards = [
  { title: 'AI Prompt Bible', type: 'Prompt Pack', price: '$29', gradient: 'linear-gradient(135deg,#6366f1,#06b6d4)', delay: 0 },
  { title: 'Notion Creator Kit', type: 'Template', price: '$49', gradient: 'linear-gradient(135deg,#a855f7,#ec4899)', delay: 1 },
  { title: 'ChatGPT Mastery', type: 'Course', price: '$97', gradient: 'linear-gradient(135deg,#8b5cf6,#6366f1)', delay: 0.5 },
]

function StatsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  return (
    <section ref={ref} style={{ background: '#f5f3ff', borderTop: '1px solid rgba(139,92,246,0.1)', borderBottom: '1px solid rgba(139,92,246,0.1)', padding: '56px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 32, textAlign: 'center' }}>
        {[
          { end: 1000, suffix: '+', label: 'Active Creators' },
          { end: 5000, suffix: '+', label: 'Products Sold' },
          { end: 500, prefix: '$', suffix: 'K+', label: 'Paid to Creators' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: i * 0.12 }}>
            <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(36px,5vw,52px)', color: '#1e1b4b', lineHeight: 1, marginBottom: 8 }}>
              <CountUp end={s.end} prefix={s.prefix ?? ''} suffix={s.suffix} trigger={inView} />
            </p>
            <p style={{ color: '#4c4879', fontWeight: 500, fontSize: 15 }}>{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div className="hero-glow-top" />
        <div className="hero-glow-br" />
        <div style={{ maxWidth: 860, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 16px', borderRadius: 40, background: '#f5f3ff', border: '1px solid rgba(139,92,246,0.25)', color: '#8b5cf6', fontSize: 13, fontWeight: 600, marginBottom: 36 }}
          >
            <Sparkles size={13} /> AI-powered digital product marketplace
          </motion.div>

          {/* Staggered headline */}
          <motion.div variants={stagger} initial="initial" animate="animate" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 14px', marginBottom: 28 }}>
            {heroWords.map((word, i) => (
              <motion.span key={i} variants={wordAnim}
                style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(36px,7vw,72px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}
                className={word.gradient ? 'gradient-text' : ''}
              >
                {word.text}
              </motion.span>
            ))}
          </motion.div>

          {/* Sub */}
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.85 }}
            style={{ fontSize: 'clamp(16px,2.2vw,20px)', color: '#4c4879', lineHeight: 1.7, maxWidth: 600, margin: '0 auto 40px' }}
          >
            Create, sell, and profit from ebooks, courses, templates, and prompt packs.
            Keep <span style={{ color: '#8b5cf6', fontWeight: 700 }}>70%</span> of every sale — zero upfront cost.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.05 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 64 }}
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/signup" style={{ padding: '14px 32px', borderRadius: 16, fontSize: 16, fontWeight: 700, gap: 8 }} className="btn-gradient">
                Start for Free <ArrowRight size={18} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/explore" className="btn-outline" style={{ padding: '14px 32px', borderRadius: 16, fontSize: 16, fontWeight: 700 }}>
                Explore Products
              </Link>
            </motion.div>
          </motion.div>

          {/* Floating product card mockups */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1.2 }}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16, height: 220 }}
          >
            {floatingCards.map((card, i) => (
              <motion.div key={i}
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: card.delay, ease: 'easeInOut' }}
                className="card-glass"
                style={{ borderRadius: 18, overflow: 'hidden', width: i === 1 ? 180 : 150, opacity: i === 1 ? 1 : 0.82, flexShrink: 0 }}
              >
                <div style={{ height: i === 1 ? 96 : 80, background: card.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 18, color: 'rgba(255,255,255,0.85)' }}>{card.title[0]}</span>
                  </div>
                </div>
                <div style={{ padding: '10px 12px', background: '#fff' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', marginBottom: 3 }}>{card.type}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1e1b4b', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.title}</p>
                  <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 16, color: '#1e1b4b' }}>{card.price}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <StatsSection />

      {/* Features */}
      <section style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>Why Launchio</p>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(28px,5vw,48px)', color: '#1e1b4b', letterSpacing: '-1px', marginBottom: 14 }}>Built for modern creators</h2>
            <p style={{ color: '#4c4879', fontSize: 17, maxWidth: 500, margin: '0 auto' }}>Everything you need to launch, sell, and scale your digital products.</p>
          </motion.div>

          <motion.div variants={stagger} initial="initial" whileInView="animate" viewport={{ once: true }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}
          >
            {[
              { icon: <Zap size={26} color="#8b5cf6" />, title: 'Create with AI', desc: 'Use AI to generate ebooks, course outlines, templates, and prompt packs in minutes — no expertise needed.', bg: 'linear-gradient(135deg,#f0eeff,#e8e0ff)' },
              { icon: <TrendingUp size={26} color="#8b5cf6" />, title: 'Share Your Link', desc: 'Every product gets a stunning, mobile-first page. Share anywhere — social, email, bio link.', bg: 'linear-gradient(135deg,#f5e8ff,#ede0ff)' },
              { icon: <Shield size={26} color="#8b5cf6" />, title: 'Keep 70%', desc: 'We take 30% to cover payments, hosting, and support. You keep everything else — deposited directly.', bg: 'linear-gradient(135deg,#e8eeff,#eee8ff)' },
            ].map((feat, i) => (
              <motion.div key={i} variants={fadeInUp} transition={{ duration: 0.55, ease: 'easeOut' }} whileHover={{ scale: 1.025, y: -4 }}
                className="card-glass" style={{ borderRadius: 24, padding: '32px 28px', background: feat.bg }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fff', boxShadow: '0 4px 16px rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
                  {feat.icon}
                </div>
                <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 20, color: '#1e1b4b', marginBottom: 10 }}>{feat.title}</h3>
                <p style={{ color: '#4c4879', lineHeight: 1.7, fontSize: 15 }}>{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 24px', background: '#f5f3ff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>How It Works</p>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(28px,5vw,48px)', color: '#1e1b4b', letterSpacing: '-1px' }}>Three steps to your first sale</h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 32 }}>
            {[
              { num: '01', icon: <BookOpen size={22} color="#fff" />, title: 'Choose your format', desc: 'Pick from ebook, course, template, or prompt pack. Each has its own optimized creator flow.' },
              { num: '02', icon: <Layout size={22} color="#fff" />, title: 'Fill in details & price', desc: 'Add title, description, and your price. A beautiful product page is auto-generated instantly.' },
              { num: '03', icon: <GraduationCap size={22} color="#fff" />, title: 'Share & earn', desc: 'Share your link. Buyers purchase on their phone. 70% lands in your account automatically.' },
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: i * 0.14 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
              >
                <div style={{ position: 'relative', marginBottom: 22 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(139,92,246,0.38)' }} className="btn-gradient">
                    {step.icon}
                  </div>
                  <span style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: '#fff', border: '2px solid rgba(139,92,246,0.3)', fontSize: 10, fontWeight: 800, color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{step.num}</span>
                </div>
                <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 17, color: '#1e1b4b', marginBottom: 10 }}>{step.title}</h3>
                <p style={{ color: '#4c4879', fontSize: 14, lineHeight: 1.7 }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
            style={{ borderRadius: 32, padding: 'clamp(48px,8vw,80px)', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%)' }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%,rgba(255,255,255,0.25) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(26px,5vw,46px)', color: '#fff', letterSpacing: '-1px', marginBottom: 16 }}>
                Ready to launch your first product?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 17, marginBottom: 36, maxWidth: 500, margin: '0 auto 36px' }}>
                Join thousands of creators already earning on Launchio. It takes 60 seconds to get started.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} style={{ display: 'inline-block' }}>
                <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 36px', borderRadius: 16, background: '#fff', color: '#8b5cf6', fontWeight: 700, fontSize: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
                  Get Started Free <ArrowRight size={18} />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
