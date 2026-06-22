import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Rocket, AlertCircle, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const baseUrl = window.location.origin
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/reset-password`,
    })
    if (err) { setError(err.message); setLoading(false) }
    else { setSent(true); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#f5f3ff 0%,#ede9fe 45%,#f5f3ff 100%)' }}>
      <div className="hero-glow-top" />
      <div className="hero-glow-br" />

      <motion.div initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        <div className="card-glass" style={{ borderRadius: 28, padding: '40px 36px', boxShadow: '0 12px 48px rgba(139,92,246,0.18)' }}>
          {!sent ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }} className="btn-gradient">
                  <Rocket size={22} color="#fff" />
                </div>
                <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 24, color: '#1e1b4b', marginBottom: 4 }}>Reset password</h1>
                <p style={{ color: '#4c4879', fontSize: 14, textAlign: 'center' }}>Enter your email and we'll send you a reset link</p>
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
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="input-field" autoComplete="email" />
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                  className="btn-gradient" style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 700, marginTop: 4, opacity: loading ? 0.75 : 1 }}
                >
                  {loading ? <span style={{ display: 'inline-block', width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.35)', borderTop: '2.5px solid #fff', borderRadius: '50%' }} className="spin" /> : 'Send Reset Link'}
                </motion.button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: '#4c4879', marginTop: 22 }}>
                Remembered it?{' '}
                <Link to="/login" style={{ fontWeight: 700, color: '#8b5cf6' }}>Sign in</Link>
              </p>
            </>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: 22, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 24px rgba(139,92,246,0.15)' }}>
                <Mail size={32} color="#8b5cf6" />
              </div>
              <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 22, color: '#1e1b4b', marginBottom: 12 }}>Check your inbox!</h2>
              <p style={{ color: '#4c4879', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                We sent a reset link to{' '}
                <strong style={{ color: '#8b5cf6' }}>{email}</strong>.
                {' '}Click the link in the email to set a new password.
              </p>
              <p style={{ fontSize: 12, color: '#a5a3c0' }}>Didn't receive it? Check your spam folder or{' '}
                <button onClick={() => setSent(false)} style={{ color: '#8b5cf6', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0 }}>try again</button>.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
