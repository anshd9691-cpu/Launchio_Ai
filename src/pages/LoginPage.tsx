import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rocket, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#f5f3ff 0%,#ede9fe 45%,#f5f3ff 100%)' }}>
      <div className="hero-glow-top" />
      <div className="hero-glow-br" />

      <motion.div initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        <div className="card-glass" style={{ borderRadius: 28, padding: '40px 36px', boxShadow: '0 12px 48px rgba(139,92,246,0.18)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }} className="btn-gradient">
              <Rocket size={22} color="#fff" />
            </div>
            <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 24, color: '#1e1b4b', marginBottom: 4 }}>Welcome back</h1>
            <p style={{ color: '#4c4879', fontSize: 14 }}>Sign in to your Launchio account</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 20 }}
            >
              <AlertCircle size={15} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="input-field" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required className="input-field" style={{ paddingRight: 46 }} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#8b5cf6', padding: 4, display: 'flex' }}
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
              className="btn-gradient" style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 700, marginTop: 4, opacity: loading ? 0.75 : 1 }}
            >
              {loading ? <span style={{ display: 'inline-block', width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.35)', borderTop: '2.5px solid #fff', borderRadius: '50%' }} className="spin" /> : 'Sign In'}
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#4c4879', marginTop: 22 }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ fontWeight: 700, color: '#8b5cf6' }}>Sign up free</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
