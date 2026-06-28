import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp, Package, DollarSign, Eye, Trash2, ExternalLink, BarChart3, Download, Edit, ShoppingBag, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/lib/supabase'

type TabType = 'products' | 'earnings' | 'purchases' | 'payout'

interface Purchase {
  id: string
  product_id: string
  buyer_email: string
  amount: number
  creator_payout: number
  created_at: string
  product?: { title: string; type: string }
}

interface MyPurchase {
  id: string
  product_id: string
  amount: number
  created_at: string
  productTitle: string
  productType: string
}

const typeLabels: Record<string, string> = { ebook: 'Ebook', course: 'Course', template: 'Template', prompt_pack: 'Prompt Pack' }

export default function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabType>('products')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalSales, setTotalSales] = useState(0)
  const [myPurchases, setMyPurchases] = useState<MyPurchase[]>([])
  const [purchasesLoading, setPurchasesLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [hasPayout, setHasPayout] = useState<boolean | null>(null)
  const [payoutMasked, setPayoutMasked] = useState<string | null>(null)
  const [payoutCurrency, setPayoutCurrency] = useState<string>('USD')
  const [payoutType, setPayoutType] = useState<string | null>(null)

  const checkPayoutStatus = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/payout/status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setHasPayout(json.has_payout ?? false)
      if (json.has_payout) {
        setPayoutMasked(json.masked ?? null)
        setPayoutCurrency(json.currency ?? 'USD')
        setPayoutType(json.payout_type ?? null)
      }
    } catch {
      setHasPayout(false)
    }
  }, [])

  const fetchData = useCallback(async (uid: string, email: string) => {
    const [productsRes, salesRes] = await Promise.all([
      supabase.from('products').select('*').eq('creator_id', uid).order('created_at', { ascending: false }),
      supabase.from('purchases').select('creator_payout,product_id').in(
        'product_id',
        // We'll refetch after products load
        ['00000000-0000-0000-0000-000000000000']
      ),
    ])
    setProducts(productsRes.data ?? [])
    setLoading(false)

    // Fetch actual sales for creator's products
    if (productsRes.data?.length) {
      const productIds = productsRes.data.map(p => p.id)
      const { data: purchases } = await supabase
        .from('purchases')
        .select('creator_payout')
        .in('product_id', productIds)
      const allPurchases = purchases ?? []
      setTotalSales(allPurchases.length)
      setTotalRevenue(allPurchases.reduce((sum, p) => sum + (p.creator_payout ?? 0), 0))
    }
  }, [])

  const fetchMyPurchases = useCallback(async (token: string) => {
    setPurchasesLoading(true)
    try {
      const res = await fetch('/api/user/purchases', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load purchases')
      setMyPurchases(json.purchases ?? [])
    } catch {
      setMyPurchases([])
    } finally {
      setPurchasesLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session
      if (!session?.user) { navigate('/login'); return }
      setUser({ email: session.user.email, id: session.user.id })
      setUserToken(session.access_token)
      fetchData(session.user.id, session.user.email ?? '')
      fetchMyPurchases(session.access_token)
      checkPayoutStatus(session.access_token)
    })
  }, [navigate, fetchData, fetchMyPurchases, checkPayoutStatus])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setDeletingId(id)
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
  }

  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === 'published' ? 'draft' : 'published'
    if (newStatus === 'published' && !hasPayout) {
      navigate('/payout-setup')
      return
    }
    await supabase.from('products').update({ status: newStatus }).eq('id', product.id)
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p))
  }

  const handleCopyLink = (productId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/p/${productId}`).catch(() => {})
    setCopiedId(productId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDownload = async (productId: string) => {
    if (!userToken) return
    setDownloadingId(productId)
    try {
      const res = await fetch(`/api/download/${productId}`, {
        headers: { 'Authorization': `Bearer ${userToken}` },
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error || 'Download failed'); setDownloadingId(null); return }
      const a = document.createElement('a')
      a.href = json.url
      a.download = json.filename || `product.${json.ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      alert('Download failed. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const statCards = [
    { icon: <Package size={22} color="#8b5cf6" />, label: 'Products', value: products.length.toString(), sub: `${products.filter(p => p.status === 'published').length} published` },
    { icon: <TrendingUp size={22} color="#8b5cf6" />, label: 'Total Sales', value: totalSales.toString(), sub: 'all time' },
    { icon: <DollarSign size={22} color="#8b5cf6" />, label: 'Revenue', value: `$${totalRevenue.toFixed(0)}`, sub: '70% payout rate' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <Navbar />
      <div style={{ paddingTop: 64 }}>
        {/* Header */}
        <div style={{ background: '#f5f3ff', borderBottom: '1px solid rgba(139,92,246,0.1)', padding: '36px 24px 0', position: 'relative', overflow: 'hidden' }}>
          <div className="hero-glow-top" style={{ width: 600, height: 400, opacity: 0.5 }} />
          <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p style={{ fontSize: 13, color: '#8b5cf6', fontWeight: 600, marginBottom: 4 }}>Welcome back,</p>
              <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(22px,4vw,34px)', color: '#1e1b4b', letterSpacing: '-0.5px', marginBottom: 24 }}>
                {user?.email?.split('@')[0] ?? 'Creator'}'s Dashboard
              </h1>
            </motion.div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 0 }}>
              {statCards.map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="card-glass" style={{ borderRadius: 18, padding: '20px', display: 'flex', gap: 16, alignItems: 'center' }}
                >
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {stat.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 24, fontFamily: 'Plus Jakarta Sans', fontWeight: 800, color: '#1e1b4b', lineHeight: 1 }}>{stat.value}</p>
                    <p style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, marginTop: 2 }}>{stat.label}</p>
                    <p style={{ fontSize: 11, color: '#4c4879', marginTop: 1 }}>{stat.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginTop: 28, borderBottom: '2px solid rgba(139,92,246,0.1)', flexWrap: 'wrap' }}>
              {([
                ['products', 'My Products', <Package size={15} />],
                ['earnings', 'Earnings', <BarChart3 size={15} />],
                ['purchases', 'My Purchases', <ShoppingBag size={15} />],
                ['payout', 'Payout Details', <CreditCard size={15} />],
              ] as const).map(([t, label, icon]) => (
                <button key={t} onClick={() => setTab(t as TabType)} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', fontSize: 14, fontWeight: 700,
                  color: tab === t ? '#8b5cf6' : '#4c4879',
                  borderBottom: tab === t ? '2px solid #8b5cf6' : '2px solid transparent',
                  marginBottom: -2, background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 80px' }}>
          <AnimatePresence mode="wait">

            {/* ── My Products tab ─────────────────────────────────────────── */}
            {tab === 'products' && (
              <motion.div key="products" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>

                {/* Payout warning banner */}
                {hasPayout === false && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', borderRadius: 16, background: '#fffbeb', border: '1.5px solid #fcd34d', marginBottom: 24, flexWrap: 'wrap' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle size={18} color="#d97706" />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>Payout details required to publish</p>
                        <p style={{ fontSize: 12, color: '#a16207' }}>Add your PayPal or bank info to start earning from sales.</p>
                      </div>
                    </div>
                    <Link to="/payout-setup"
                      style={{ padding: '8px 16px', borderRadius: 10, background: '#d97706', color: '#fff', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      Add Payout Info
                    </Link>
                  </motion.div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                  <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 18, color: '#1e1b4b' }}>Your Products</h2>
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                    <Link to="/create" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 14, fontSize: 14, fontWeight: 700 }} className="btn-gradient">
                      <Plus size={16} /> New Product
                    </Link>
                  </motion.div>
                </div>

                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <div style={{ width: 36, height: 36, border: '3px solid #e9d5ff', borderTopColor: '#8b5cf6', borderRadius: '50%' }} className="spin" />
                  </div>
                ) : products.length === 0 ? (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', padding: '64px 24px', background: '#f5f3ff', borderRadius: 24, border: '2px dashed rgba(139,92,246,0.2)' }}
                  >
                    <div style={{ width: 70, height: 70, borderRadius: 22, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 4px 20px rgba(139,92,246,0.1)' }}>
                      <Package size={30} color="#c4b5fd" />
                    </div>
                    <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 20, color: '#1e1b4b', marginBottom: 8 }}>No products yet</h3>
                    <p style={{ color: '#4c4879', marginBottom: 24 }}>Create your first digital product and start earning.</p>
                    <Link to="/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 700 }} className="btn-gradient">
                      <Plus size={16} /> Create First Product
                    </Link>
                  </motion.div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {products.map((product, i) => (
                      <motion.div key={product.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.35, delay: i * 0.06 }}
                        className="card-glass" style={{ borderRadius: 18, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
                      >
                        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 20, color: 'rgba(255,255,255,0.85)' }}>{product.title[0]?.toUpperCase()}</span>
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                            <span className={`badge-${product.type}`}>{typeLabels[product.type] ?? product.type}</span>
                            <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 15, color: '#1e1b4b' }}>${product.price}</span>
                            {product.status === 'draft' && (
                              <span style={{ fontSize: 11, color: '#a5a3c0', fontWeight: 600 }}>· Not visible to public</span>
                            )}
                          </div>
                        </div>

                        {/* Status toggle */}
                        <button onClick={() => handleToggleStatus(product)} style={{
                          padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                          background: product.status === 'published' ? '#dcfce7' : '#f5f3ff',
                          color: product.status === 'published' ? '#15803d' : '#8b5cf6',
                        }}>
                          {product.status === 'published' ? '● Live' : '○ Draft'}
                        </button>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {product.status === 'published' ? (
                            /* Published: View, Copy link */
                            <>
                              <Link to={`/p/${product.id}`} target="_blank" title="View public page"
                                style={{ width: 34, height: 34, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}
                              >
                                <Eye size={15} />
                              </Link>
                              <button onClick={() => handleCopyLink(product.id)} title="Copy share link"
                                style={{ padding: '0 12px', height: 34, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', gap: 5, color: '#8b5cf6', cursor: 'pointer', border: 'none', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}
                              >
                                <ExternalLink size={13} /> {copiedId === product.id ? 'Copied!' : 'Share'}
                              </button>
                            </>
                          ) : (
                            /* Draft: Continue editing + Preview */
                            <>
                              <Link to="/create" title="Continue editing"
                                style={{ padding: '0 14px', height: 34, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', gap: 5, color: '#8b5cf6', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}
                              >
                                <Edit size={13} /> Continue Editing
                              </Link>
                              <Link to={`/p/${product.id}`} target="_blank" title="Preview as buyer sees it"
                                style={{ width: 34, height: 34, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}
                              >
                                <Eye size={15} />
                              </Link>
                            </>
                          )}

                          <button onClick={() => handleDelete(product.id)} disabled={deletingId === product.id} title="Delete"
                            style={{ width: 34, height: 34, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', cursor: 'pointer', border: 'none' }}
                          >
                            {deletingId === product.id ? <span style={{ width: 14, height: 14, border: '2px solid #fca5a5', borderTopColor: '#dc2626', borderRadius: '50%', display: 'inline-block' }} className="spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Earnings tab ─────────────────────────────────────────────── */}
            {tab === 'earnings' && (
              <motion.div key="earnings" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18, marginBottom: 32 }}>
                  {[
                    { label: 'Total Earned', value: `$${totalRevenue.toFixed(2)}`, sub: '70% of all sales' },
                    { label: 'Platform Fee', value: `$${(totalRevenue * 0.3 / 0.7).toFixed(2)}`, sub: '30% retained' },
                    { label: 'Total Sales', value: totalSales.toString(), sub: 'all time' },
                  ].map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      className="card-glass" style={{ borderRadius: 20, padding: '24px' }}
                    >
                      <p style={{ fontSize: 13, color: '#4c4879', fontWeight: 600, marginBottom: 8 }}>{item.label}</p>
                      <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 32, color: '#1e1b4b', marginBottom: 4 }}>{item.value}</p>
                      <p style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>{item.sub}</p>
                    </motion.div>
                  ))}
                </div>
                <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f5f3ff', borderRadius: 24, border: '1px solid rgba(139,92,246,0.12)' }}>
                  <BarChart3 size={32} color="#c4b5fd" style={{ margin: '0 auto 14px', display: 'block' }} />
                  <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 17, color: '#1e1b4b', marginBottom: 8 }}>Detailed earnings coming soon</p>
                  <p style={{ color: '#4c4879', fontSize: 14 }}>Your purchase history and payout details will appear here once you make your first sale.</p>
                </div>
              </motion.div>
            )}

            {/* ── My Purchases tab ─────────────────────────────────────────── */}
            {tab === 'purchases' && (
              <motion.div key="purchases" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 18, color: '#1e1b4b', marginBottom: 24 }}>Products You've Bought</h2>

                {purchasesLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <div style={{ width: 36, height: 36, border: '3px solid #e9d5ff', borderTopColor: '#8b5cf6', borderRadius: '50%' }} className="spin" />
                  </div>
                ) : myPurchases.length === 0 ? (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', padding: '64px 24px', background: '#f5f3ff', borderRadius: 24, border: '2px dashed rgba(139,92,246,0.2)' }}
                  >
                    <div style={{ width: 70, height: 70, borderRadius: 22, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 4px 20px rgba(139,92,246,0.1)' }}>
                      <ShoppingBag size={30} color="#c4b5fd" />
                    </div>
                    <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 20, color: '#1e1b4b', marginBottom: 8 }}>No purchases yet</h3>
                    <p style={{ color: '#4c4879', marginBottom: 24 }}>Browse the marketplace and find your next digital product.</p>
                    <Link to="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 700 }} className="btn-gradient">
                      Explore Products
                    </Link>
                  </motion.div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {myPurchases.map((purchase, i) => (
                      <motion.div key={purchase.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.06 }}
                        className="card-glass" style={{ borderRadius: 18, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
                      >
                        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Download size={20} color="rgba(255,255,255,0.9)" />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{purchase.productTitle}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                            <span className={`badge-${purchase.productType}`}>{typeLabels[purchase.productType] ?? purchase.productType}</span>
                            <span style={{ fontSize: 12, color: '#4c4879' }}>Paid ${purchase.amount.toFixed(2)}</span>
                            <span style={{ fontSize: 12, color: '#a5a3c0' }}>· {new Date(purchase.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link to={`/p/${purchase.product_id}`}
                            style={{ height: 34, padding: '0 12px', borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', color: '#8b5cf6', fontSize: 12, fontWeight: 700, gap: 5 }}
                          >
                            <Eye size={13} /> View
                          </Link>
                          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                            onClick={() => handleDownload(purchase.product_id)}
                            disabled={downloadingId === purchase.product_id}
                            style={{ height: 34, padding: '0 16px', borderRadius: 10, background: 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: downloadingId === purchase.product_id ? 0.7 : 1 }}
                          >
                            {downloadingId === purchase.product_id
                              ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} className="spin" />
                              : <Download size={14} />
                            }
                            Download
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Payout Details tab ───────────────────────────────────────── */}
            {tab === 'payout' && (
              <motion.div key="payout" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <div style={{ maxWidth: 560 }}>
                  <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 18, color: '#1e1b4b', marginBottom: 8 }}>Payout Details</h2>
                  <p style={{ color: '#4c4879', fontSize: 14, marginBottom: 28 }}>Your payout info is encrypted and stored securely. Only you can manage it.</p>

                  {hasPayout === null && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                      <div style={{ width: 32, height: 32, border: '3px solid #e9d5ff', borderTopColor: '#8b5cf6', borderRadius: '50%' }} className="spin" />
                    </div>
                  )}

                  {hasPayout === true && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      className="card-glass" style={{ borderRadius: 20, padding: '28px 28px', marginBottom: 20 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 14, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircle size={24} color="#16a34a" />
                        </div>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>Payout Method Active</p>
                          <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 16, color: '#1e1b4b' }}>{payoutMasked}</p>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div style={{ padding: '14px', borderRadius: 14, background: '#f5f3ff' }}>
                          <p style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, marginBottom: 4 }}>Currency</p>
                          <p style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b' }}>{payoutCurrency === 'USD' ? '$ USD' : '€ EUR'}</p>
                        </div>
                        <div style={{ padding: '14px', borderRadius: 14, background: '#f5f3ff' }}>
                          <p style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, marginBottom: 4 }}>Payout Rate</p>
                          <p style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b' }}>70% of sales</p>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: '#a5a3c0', marginTop: 16 }}>
                        Full account details are encrypted and never shown here for security.
                      </p>
                    </motion.div>
                  )}

                  {hasPayout === false && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      style={{ textAlign: 'center', padding: '48px 24px', background: '#fffbeb', borderRadius: 24, border: '2px dashed #fcd34d', marginBottom: 20 }}
                    >
                      <AlertTriangle size={36} color="#d97706" style={{ margin: '0 auto 14px', display: 'block' }} />
                      <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 18, color: '#92400e', marginBottom: 8 }}>No payout details added</h3>
                      <p style={{ color: '#a16207', fontSize: 14, marginBottom: 24 }}>You must add payout details before you can publish any product.</p>
                    </motion.div>
                  )}

                  <Link to="/payout-setup"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 14, fontSize: 14, fontWeight: 700 }}
                    className="btn-gradient"
                  >
                    <CreditCard size={16} />
                    {hasPayout ? 'Update Payout Details' : 'Add Payout Details'}
                  </Link>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </div>
  )
}
