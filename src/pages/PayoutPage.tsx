import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, CreditCard, Building2, AlertCircle, CheckCircle, ChevronRight, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type PayoutMethod = 'paypal' | 'bank' | null

export default function PayoutPage() {
  const navigate = useNavigate()
  const [method, setMethod] = useState<PayoutMethod>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [existingMasked, setExistingMasked] = useState<string | null>(null)

  const [paypalEmail, setPaypalEmail] = useState('')
  const [bankHolder, setBankHolder] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankRouting, setBankRouting] = useState('')
  const [bankName, setBankName] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data?.session
      if (!session?.user) { navigate('/login'); return }
      setToken(session.access_token)
      setLoading(true)
      try {
        const res = await fetch('/api/payout/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = await res.json()
        if (json.has_payout) {
          setExistingMasked(json.masked)
          setMethod(json.payout_type as PayoutMethod)
        }
      } catch { /* ignore */ }
      setLoading(false)
    })
  }, [navigate])

  const handleSave = async () => {
    setError('')
    if (method === 'paypal') {
      if (!paypalEmail.trim() || !paypalEmail.includes('@')) {
        setError('Please enter a valid PayPal email address.'); return
      }
    } else if (method === 'bank') {
      if (!bankHolder.trim()) { setError('Account holder name is required.'); return }
      if (!bankAccount.trim()) { setError('Account number / IBAN is required.'); return }
      if (!bankName.trim()) { setError('Bank name is required.'); return }
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = { type: method, currency }
      if (method === 'paypal') body.paypal_email = paypalEmail.trim()
      if (method === 'bank') {
        body.bank_holder = bankHolder.trim()
        body.bank_account = bankAccount.trim()
        body.bank_routing = bankRouting.trim()
        body.bank_name = bankName.trim()
      }

      const res = await fetch('/api/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save payout details')
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f5f3ff,#ede9fe,#f5f3ff)' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #e9d5ff', borderTopColor: '#8b5cf6', borderRadius: '50%' }} className="spin" />
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f5f3ff,#ede9fe,#f5f3ff)' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <CheckCircle size={36} color="#16a34a" />
          </div>
          <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 22, color: '#1e1b4b', marginBottom: 8 }}>Payout details saved!</h2>
          <p style={{ color: '#4c4879', fontSize: 14 }}>Redirecting you to the dashboard…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#f5f3ff 0%,#ede9fe 45%,#f5f3ff 100%)' }}>
      <div className="hero-glow-top" />
      <div className="hero-glow-br" />

      <motion.div initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}
      >
        <div className="card-glass" style={{ borderRadius: 28, padding: '40px 36px', boxShadow: '0 12px 48px rgba(139,92,246,0.18)' }}>

          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <div className="btn-gradient" style={{ width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}>
              <Rocket size={22} color="#fff" />
            </div>
            <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 22, color: '#1e1b4b', marginBottom: 6, textAlign: 'center' }}>
              {existingMasked ? 'Update Payout Details' : 'Add Payout Details'}
            </h1>
            <p style={{ color: '#4c4879', fontSize: 14, textAlign: 'center', lineHeight: 1.5 }}>
              Required to publish products and receive your 70% creator payout in USD or EUR.
            </p>
          </div>

          {/* Existing masked display */}
          {existingMasked && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 24 }}
            >
              <CheckCircle size={16} color="#16a34a" />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>Current payout method</p>
                <p style={{ fontSize: 13, color: '#1e1b4b', fontWeight: 600 }}>{existingMasked}</p>
              </div>
            </motion.div>
          )}

          {/* Security badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: '#f5f3ff', border: '1px solid rgba(139,92,246,0.15)', marginBottom: 24 }}>
            <Lock size={14} color="#8b5cf6" />
            <span style={{ fontSize: 12, color: '#4c4879', fontWeight: 600 }}>Encrypted & stored securely. Never visible to buyers or third parties.</span>
          </div>

          {/* Method selection */}
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1e1b4b', marginBottom: 12 }}>Choose payout method</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {([
              { id: 'paypal', label: 'PayPal', sub: 'Email transfer', icon: <CreditCard size={20} color={method === 'paypal' ? '#8b5cf6' : '#a5a3c0'} /> },
              { id: 'bank', label: 'Bank Transfer', sub: 'USD / EUR wire', icon: <Building2 size={20} color={method === 'bank' ? '#8b5cf6' : '#a5a3c0'} /> },
            ] as const).map(opt => (
              <motion.button key={opt.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setMethod(opt.id)}
                style={{
                  padding: '16px 12px', borderRadius: 16, border: method === opt.id ? '2px solid #8b5cf6' : '2px solid rgba(139,92,246,0.2)',
                  background: method === opt.id ? '#f5f3ff' : '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                  boxShadow: method === opt.id ? '0 4px 16px rgba(139,92,246,0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{opt.icon}</div>
                <p style={{ fontWeight: 700, fontSize: 14, color: method === opt.id ? '#1e1b4b' : '#4c4879', marginBottom: 2 }}>{opt.label}</p>
                <p style={{ fontSize: 11, color: '#a5a3c0' }}>{opt.sub}</p>
              </motion.button>
            ))}
          </div>

          {/* PayPal form */}
          <AnimatePresence mode="wait">
            {method === 'paypal' && (
              <motion.div key="paypal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>PayPal Email Address</label>
                  <input type="email" value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)}
                    placeholder="your@paypal.com" className="input-field" autoComplete="email" />
                  <p style={{ fontSize: 11, color: '#a5a3c0', marginTop: 5 }}>Payouts arrive within 2–5 business days after a sale.</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>Payout Currency</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['USD', 'EUR'] as const).map(c => (
                      <button key={c} type="button" onClick={() => setCurrency(c)}
                        style={{ flex: 1, padding: '10px', borderRadius: 12, border: currency === c ? '2px solid #8b5cf6' : '2px solid rgba(139,92,246,0.2)', background: currency === c ? '#f5f3ff' : '#fff', fontWeight: 700, fontSize: 14, color: currency === c ? '#8b5cf6' : '#4c4879', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        {c === 'USD' ? '$ USD' : '€ EUR'}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {method === 'bank' && (
              <motion.div key="bank" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>Account Holder Name</label>
                  <input type="text" value={bankHolder} onChange={e => setBankHolder(e.target.value)}
                    placeholder="Full name as on bank account" className="input-field" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>Account Number / IBAN</label>
                  <input type="text" value={bankAccount} onChange={e => setBankAccount(e.target.value)}
                    placeholder="US: 123456789 · EU: DE89370400440532013000" className="input-field" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>Routing Number <span style={{ color: '#a5a3c0', fontWeight: 400 }}>(US only, optional for EU)</span></label>
                  <input type="text" value={bankRouting} onChange={e => setBankRouting(e.target.value)}
                    placeholder="9-digit routing number" className="input-field" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>Bank Name</label>
                  <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. Chase, Bank of America, Deutsche Bank" className="input-field" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e1b4b', marginBottom: 6 }}>Payout Currency</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['USD', 'EUR'] as const).map(c => (
                      <button key={c} type="button" onClick={() => setCurrency(c)}
                        style={{ flex: 1, padding: '10px', borderRadius: 12, border: currency === c ? '2px solid #8b5cf6' : '2px solid rgba(139,92,246,0.2)', background: currency === c ? '#f5f3ff' : '#fff', fontWeight: 700, fontSize: 14, color: currency === c ? '#8b5cf6' : '#4c4879', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        {c === 'USD' ? '$ USD' : '€ EUR'}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 16 }}
            >
              <AlertCircle size={15} /> {error}
            </motion.div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {method && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
                className="btn-gradient" style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.75 : 1 }}
              >
                {saving
                  ? <span style={{ display: 'inline-block', width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.35)', borderTop: '2.5px solid #fff', borderRadius: '50%' }} className="spin" />
                  : <><Lock size={15} /> Save Payout Details</>
                }
              </motion.button>
            )}

            <button onClick={() => navigate('/dashboard')}
              style={{ width: '100%', padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 600, color: '#a5a3c0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {existingMasked ? 'Cancel' : 'Skip for now — add later'} <ChevronRight size={14} />
            </button>

            {!existingMasked && (
              <p style={{ textAlign: 'center', fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                ⚠️ You must add payout details before publishing any product.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
