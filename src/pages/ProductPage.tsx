import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, Shield, Download, Clock, ArrowLeft, BookOpen, GraduationCap, Layout, Sparkles, Lock, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/lib/supabase'

const TYPE_GRADIENTS: Record<string, string> = {
  ebook: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  course: 'linear-gradient(135deg,#8b5cf6,#a855f7)',
  template: 'linear-gradient(135deg,#a855f7,#ec4899)',
  prompt_pack: 'linear-gradient(135deg,#6366f1,#06b6d4)',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  ebook: <BookOpen size={18} color="rgba(255,255,255,0.85)" />,
  course: <GraduationCap size={18} color="rgba(255,255,255,0.85)" />,
  template: <Layout size={18} color="rgba(255,255,255,0.85)" />,
  prompt_pack: <Sparkles size={18} color="rgba(255,255,255,0.85)" />,
}

const TYPE_LABELS: Record<string, string> = { ebook: 'Ebook', course: 'Course', template: 'Template', prompt_pack: 'Prompt Pack' }

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const init = async () => {
      // Get product
      const { data } = await supabase.from('products').select('*').eq('id', id).single()

      // Only show published products to the public
      if (!data || data.status !== 'published') {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProduct(data)

      // Check for success param
      if (window.location.search.includes('success=true')) setSuccess(true)

      // Get current user session
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session
      if (session?.user?.email) {
        setUserEmail(session.user.email)
        setUserToken(session.access_token)

        // Check if user has purchased this product
        const { data: purchases } = await supabase
          .from('purchases')
          .select('id')
          .eq('product_id', id)
          .eq('buyer_email', session.user.email)
          .limit(1)

        if (purchases && purchases.length > 0) {
          setHasPurchased(true)
        }
      }

      setLoading(false)
    }

    init()
  }, [id])

  const handleBuy = async () => {
    if (!product) return
    setCheckoutLoading(true); setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Checkout failed.'); setCheckoutLoading(false); return }
      if (json.checkout_url) window.location.href = json.checkout_url
      else { setError('Could not create checkout.'); setCheckoutLoading(false) }
    } catch {
      setError('Network error. Please try again.')
      setCheckoutLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!userToken || !id) return
    setDownloadLoading(true)
    setDownloadError('')
    try {
      const res = await fetch(`/api/download/${id}`, {
        headers: { 'Authorization': `Bearer ${userToken}` },
      })
      const json = await res.json()
      if (!res.ok) {
        setDownloadError(json.error || 'Download failed.')
        setDownloadLoading(false)
        return
      }
      // Trigger download
      const a = document.createElement('a')
      a.href = json.url
      a.download = json.filename || `product.${json.ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      setDownloadError('Download failed. Please try again.')
    } finally {
      setDownloadLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e9d5ff', borderTopColor: '#8b5cf6', borderRadius: '50%' }} className="spin" />
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 20px rgba(139,92,246,0.1)' }}>
          <Lock size={30} color="#c4b5fd" />
        </div>
        <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 26, color: '#1e1b4b', marginBottom: 12 }}>Product not found</h2>
        <p style={{ color: '#4c4879', marginBottom: 24 }}>This product may have been removed, is not yet published, or the link is incorrect.</p>
        <Link to="/explore" style={{ padding: '12px 24px', borderRadius: 14, fontWeight: 700, display: 'inline-flex' }} className="btn-gradient">Browse Products</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div className="hero-glow-top" />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 16px 80px', position: 'relative', zIndex: 1 }}>
        <Link to="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#8b5cf6', fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          <ArrowLeft size={15} /> Browse more products
        </Link>

        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '14px 18px', borderRadius: 14, background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', fontSize: 14, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <CheckCircle size={16} /> Payment successful! Your download is now unlocked below.
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="card-glass" style={{ borderRadius: 28, overflow: 'hidden', boxShadow: '0 12px 48px rgba(139,92,246,0.16)' }}
        >
          {/* Cover */}
          <div style={{ height: 220, background: TYPE_GRADIENTS[product.type] ?? TYPE_GRADIENTS.ebook, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%,rgba(255,255,255,0.22) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 28, color: 'rgba(255,255,255,0.85)' }}>{product.title[0]?.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, position: 'relative' }}>
              {TYPE_ICONS[product.type]} {TYPE_LABELS[product.type] ?? product.type}
            </div>
          </div>

          <div style={{ padding: '28px 28px 32px' }}>
            <span className={`badge-${product.type}`} style={{ marginBottom: 16, display: 'inline-block' }}>{TYPE_LABELS[product.type] ?? product.type}</span>

            <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(22px,5vw,30px)', color: '#1e1b4b', lineHeight: 1.2, marginBottom: 14 }}>
              {product.title}
            </h1>

            {product.description && (
              <p style={{ color: '#4c4879', lineHeight: 1.75, fontSize: 15, marginBottom: 16 }}>{product.description}</p>
            )}

            {product.creator_email && (
              <p style={{ fontSize: 13, color: '#8b5cf6', fontWeight: 600, marginBottom: 20 }}>By {product.creator_email}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 22 }}>
              <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 42, color: '#1e1b4b', lineHeight: 1 }}>${product.price}</span>
              <span style={{ color: '#4c4879', fontSize: 14, marginBottom: 6 }}>one-time</span>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>{error}</p>}
            {downloadError && <p style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>{downloadError}</p>}

            {hasPurchased ? (
              /* Already purchased — show download button */
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} color="#15803d" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>You own this product</span>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDownload} disabled={downloadLoading}
                  style={{ width: '100%', padding: '16px', borderRadius: 16, fontSize: 16, fontWeight: 700, opacity: downloadLoading ? 0.75 : 1, marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  {downloadLoading
                    ? <span style={{ display: 'inline-block', width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} className="spin" />
                    : <><Download size={18} /> Download {TYPE_LABELS[product.type]}</>
                  }
                </motion.button>
              </motion.div>
            ) : (
              /* Not purchased — show buy button */
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleBuy} disabled={checkoutLoading}
                className="btn-gradient" style={{ width: '100%', padding: '16px', borderRadius: 16, fontSize: 16, fontWeight: 700, opacity: checkoutLoading ? 0.75 : 1, marginBottom: 22, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {checkoutLoading
                  ? <span style={{ display: 'inline-block', width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} className="spin" />
                  : <><ShoppingCart size={18} style={{ display: 'inline', marginRight: 8 }} />Buy Now — ${product.price}</>
                }
              </motion.button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, borderTop: '1px solid rgba(139,92,246,0.1)', paddingTop: 20 }}>
              {[
                { icon: <Shield size={14} />, text: '30-day money-back guarantee' },
                { icon: <Download size={14} />, text: `Instant ${product.type === 'course' ? 'PPTX' : 'PDF'} delivery after purchase` },
                { icon: <Clock size={14} />, text: 'Lifetime access included' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#4c4879' }}>
                  <span style={{ color: '#8b5cf6' }}>{item.icon}</span> {item.text}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ textAlign: 'center', fontSize: 13, color: '#4c4879', marginTop: 28 }}
        >
          Want to sell your own?{' '}
          <Link to="/signup" style={{ fontWeight: 700, color: '#8b5cf6' }}>Join Launchio free</Link>
        </motion.p>
      </div>
    </div>
  )
}
