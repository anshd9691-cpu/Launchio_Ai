import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, Shield, Download, Clock, ArrowLeft, BookOpen, GraduationCap, Layout, Sparkles, Lock, CheckCircle, Star, Eye } from 'lucide-react'
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

interface Review {
  id: string
  product_id: string
  reviewer_id: string
  reviewer_email: string
  rating: number
  review_text: string
  created_at: string
}

function StarRow({ rating, size = 16, interactive = false, onRate }: { rating: number; size?: number; interactive?: boolean; onRate?: (r: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n}
          onClick={() => interactive && onRate?.(n)}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{ cursor: interactive ? 'pointer' : 'default', fontSize: size, color: n <= (hover || rating) ? '#f59e0b' : '#d1d5db', transition: 'color 0.15s' }}
        >★</span>
      ))}
    </div>
  )
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  useEffect(() => {
    if (!id) return
    const init = async () => {
      // Fetch product (any status — we'll handle visibility below)
      const { data } = await supabase.from('products').select('*').eq('id', id).single()

      // Get current user session first
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session

      if (session?.access_token) {
        setUserEmail(session.user?.email ?? null)
        setUserId(session.user?.id ?? null)
        setUserToken(session.access_token)
      }

      // Determine visibility
      if (!data) { setNotFound(true); setLoading(false); return }

      // Draft products are only visible to their creator
      if (data.status !== 'published') {
        const creatorId = data.creator_id
        const uid = session?.user?.id
        if (!uid || creatorId !== uid) { setNotFound(true); setLoading(false); return }
      }

      setProduct(data)

      if (window.location.search.includes('success=true')) setSuccess(true)

      // Check purchase / creator status
      if (session?.access_token) {
        try {
          const res = await fetch(`/api/product/${id}/is-purchased`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          })
          const json = await res.json()
          if (json.purchased) setHasPurchased(true)
          if (json.isCreator) setIsCreator(true)
        } catch { /* non-fatal */ }
      }

      // Fetch reviews
      setReviewsLoading(true)
      try {
        const { data: revData } = await supabase.from('reviews').select('*').eq('product_id', id).order('created_at', { ascending: false })
        setReviews(revData ?? [])
      } catch { /* reviews table may not exist yet */ }
      setReviewsLoading(false)

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
    setDownloadLoading(true); setDownloadError('')
    try {
      const res = await fetch(`/api/download/${id}`, { headers: { 'Authorization': `Bearer ${userToken}` } })
      const json = await res.json()
      if (!res.ok) { setDownloadError(json.error || 'Download failed.'); setDownloadLoading(false); return }
      const a = document.createElement('a')
      a.href = json.url; a.download = json.filename || `product.${json.ext}`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch {
      setDownloadError('Download failed. Please try again.')
    } finally { setDownloadLoading(false) }
  }

  const handleSubmitReview = async () => {
    if (!userId || !userEmail || !id || !product) return
    if (!reviewText.trim()) { setReviewError('Please write a review.'); return }
    setReviewSubmitting(true); setReviewError('')
    try {
      const { error: insertErr } = await supabase.from('reviews').insert({
        product_id: id,
        reviewer_id: userId,
        reviewer_email: userEmail,
        rating: newRating,
        review_text: reviewText.trim(),
      })
      if (insertErr) throw new Error(insertErr.message)
      setReviewSuccess(true)
      setReviewText(''); setNewRating(5)
      // Refresh reviews
      const { data: revData } = await supabase.from('reviews').select('*').eq('product_id', id).order('created_at', { ascending: false })
      setReviews(revData ?? [])
    } catch (e: unknown) {
      setReviewError(e instanceof Error ? e.message : 'Failed to submit review.')
    } finally { setReviewSubmitting(false) }
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
        <p style={{ color: '#4c4879', marginBottom: 24 }}>This product may not exist, is not yet published, or the link is incorrect.</p>
        <Link to="/explore" style={{ padding: '12px 24px', borderRadius: 14, fontWeight: 700, display: 'inline-flex' }} className="btn-gradient">Browse Products</Link>
      </div>
    )
  }

  const alreadyReviewed = reviews.some(r => r.reviewer_id === userId)

  return (
    <div style={{ minHeight: '100vh', background: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div className="hero-glow-top" />

      {/* Creator Preview Banner */}
      {isCreator && (
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '11px 24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Eye size={15} color="rgba(255,255,255,0.9)" />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
            You are viewing your own product — buyers see this page too
          </span>
        </div>
      )}

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
              <p style={{ fontSize: 13, color: '#8b5cf6', fontWeight: 600, marginBottom: 12 }}>By {product.creator_email}</p>
            )}

            {/* Rating summary */}
            {reviews.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <StarRow rating={Math.round(avgRating)} size={16} />
                <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 14, color: '#1e1b4b' }}>{avgRating.toFixed(1)}</span>
                <span style={{ fontSize: 13, color: '#4c4879' }}>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 22 }}>
              <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 42, color: '#1e1b4b', lineHeight: 1 }}>${product.price}</span>
              <span style={{ color: '#4c4879', fontSize: 14, marginBottom: 6 }}>one-time</span>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>{error}</p>}
            {downloadError && <p style={{ color: '#dc2626', fontSize: 13, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', marginBottom: 16 }}>{downloadError}</p>}

            {isCreator ? (
              /* Creator — show a neutral message, no buy/download */
              <div style={{ padding: '12px 16px', background: '#f5f3ff', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 14, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={16} color="#8b5cf6" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#6366f1' }}>Creator Preview — this is what buyers see</span>
              </div>
            ) : hasPurchased ? (
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
                    : <><Download size={18} /> Download {TYPE_LABELS[product.type]}</>}
                </motion.button>
              </motion.div>
            ) : (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleBuy} disabled={checkoutLoading}
                className="btn-gradient" style={{ width: '100%', padding: '16px', borderRadius: 16, fontSize: 16, fontWeight: 700, opacity: checkoutLoading ? 0.75 : 1, marginBottom: 22, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {checkoutLoading
                  ? <span style={{ display: 'inline-block', width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} className="spin" />
                  : <><ShoppingCart size={18} style={{ display: 'inline', marginRight: 8 }} />Buy Now — ${product.price}</>}
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

        {/* Reviews Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ marginTop: 32 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Star size={20} color="#f59e0b" fill="#f59e0b" />
            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 20, color: '#1e1b4b' }}>
              Reviews
              {reviews.length > 0 && <span style={{ fontWeight: 400, fontSize: 14, color: '#4c4879', marginLeft: 8 }}>({reviews.length})</span>}
            </h2>
            {reviews.length > 0 && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <StarRow rating={Math.round(avgRating)} size={15} />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1e1b4b' }}>{avgRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Review form — only for buyers who haven't reviewed yet */}
          {hasPurchased && !isCreator && !alreadyReviewed && !reviewSuccess && (
            <div style={{ background: '#f5f3ff', borderRadius: 20, padding: '20px', marginBottom: 24, border: '1px solid rgba(139,92,246,0.15)' }}>
              <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#1e1b4b', marginBottom: 14 }}>Leave a review</p>

              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: '#4c4879', fontWeight: 600, marginBottom: 6 }}>Rating</p>
                <StarRow rating={newRating} size={28} interactive onRate={setNewRating} />
              </div>

              <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience with this product…" rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13, border: '1.5px solid rgba(139,92,246,0.2)', outline: 'none', resize: 'vertical', background: '#fff', color: '#1e1b4b', lineHeight: 1.5, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }}
              />

              {reviewError && <p style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{reviewError}</p>}

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmitReview} disabled={reviewSubmitting}
                className="btn-gradient" style={{ padding: '10px 22px', borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: reviewSubmitting ? 0.75 : 1 }}
              >
                {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
              </motion.button>
            </div>
          )}

          {reviewSuccess && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              style={{ padding: '12px 16px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <CheckCircle size={15} color="#15803d" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Thank you! Your review was submitted.</span>
            </motion.div>
          )}

          {reviewsLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ width: 28, height: 28, border: '3px solid #e9d5ff', borderTopColor: '#8b5cf6', borderRadius: '50%', display: 'inline-block' }} className="spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 24px', background: '#f5f3ff', borderRadius: 20, border: '1px dashed rgba(139,92,246,0.2)' }}>
              <Star size={28} color="#c4b5fd" style={{ margin: '0 auto 10px', display: 'block' }} />
              <p style={{ color: '#4c4879', fontSize: 14 }}>No reviews yet. {hasPurchased && !isCreator ? 'Be the first to review!' : 'Purchase this product to leave a review.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {reviews.map(review => (
                <motion.div key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="card-glass" style={{ borderRadius: 16, padding: '16px 20px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#1e1b4b', marginBottom: 4 }}>
                        {review.reviewer_email.split('@')[0]}
                        <span style={{ color: '#a5a3c0', fontWeight: 400 }}>@{review.reviewer_email.split('@')[1]?.slice(0, 8)}…</span>
                      </p>
                      <StarRow rating={review.rating} size={13} />
                    </div>
                    <span style={{ fontSize: 11, color: '#a5a3c0' }}>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  {review.review_text && <p style={{ fontSize: 13, color: '#4c4879', lineHeight: 1.65, marginTop: 8 }}>{review.review_text}</p>}
                </motion.div>
              ))}
            </div>
          )}
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
