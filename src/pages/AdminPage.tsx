import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Package, Users, DollarSign, TrendingUp, Trash2, EyeOff, BarChart3, RefreshCw, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AdminStats { totalProducts: number; publishedProducts: number; totalUsers: number; totalRevenue: number; totalSales: number }
interface AdminProduct { id: string; title: string; type: string; status: string; price: number; creator_email: string; created_at: string }
interface AdminTransaction { id: string; product_id: string; buyer_email: string; amount: number; creator_payout: number; platform_fee: number; created_at: string; productTitle?: string }

type AdminTab = 'overview' | 'products' | 'transactions'

export default function AdminPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tab, setTab] = useState<AdminTab>('overview')

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data?.session
      if (!session?.access_token) { navigate('/login'); return }
      setToken(session.access_token)
      // Verify admin access
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (res.status === 401 || res.status === 403) { setUnauthorized(true); setLoading(false); return }
      const json = await res.json()
      if (json.error) { setUnauthorized(true); setLoading(false); return }
      setStats(json)
      setLoading(false)
      loadProducts(session.access_token)
      loadTransactions(session.access_token)
    })
  }, [navigate])

  const loadProducts = async (tok: string) => {
    const res = await fetch('/api/admin/products', { headers: { 'Authorization': `Bearer ${tok}` } })
    const json = await res.json()
    if (!json.error) setProducts(json.products ?? [])
  }

  const loadTransactions = async (tok: string) => {
    const res = await fetch('/api/admin/transactions', { headers: { 'Authorization': `Bearer ${tok}` } })
    const json = await res.json()
    if (!json.error) setTransactions(json.transactions ?? [])
  }

  const handleUnpublish = async (productId: string) => {
    if (!token) return
    setActionLoading(productId); setError('')
    const res = await fetch(`/api/admin/products/${productId}/unpublish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.error) { setError(json.error) }
    else { setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'draft' } : p)) }
    setActionLoading(null)
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!token || !confirm('Delete this product permanently? This cannot be undone.')) return
    setActionLoading(productId); setError('')
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.error) { setError(json.error) }
    else { setProducts(prev => prev.filter(p => p.id !== productId)) }
    setActionLoading(null)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e9d5ff', borderTopColor: '#8b5cf6', borderRadius: '50%' }} className="spin" />
      </div>
    )
  }

  if (unauthorized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f3ff', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Shield size={32} color="#dc2626" />
        </div>
        <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 26, color: '#1e1b4b', marginBottom: 12 }}>Access Denied</h2>
        <p style={{ color: '#4c4879', marginBottom: 24 }}>You are not authorized to access the admin dashboard.</p>
        <button onClick={() => navigate('/')} style={{ padding: '12px 24px', borderRadius: 14, fontWeight: 700, cursor: 'pointer', border: 'none' }} className="btn-gradient">
          Go Home
        </button>
      </div>
    )
  }

  const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={15} /> },
    { id: 'products', label: 'Products', icon: <Package size={15} /> },
    { id: 'transactions', label: 'Transactions', icon: <DollarSign size={15} /> },
  ]

  const typeLabels: Record<string, string> = { ebook: 'Ebook', course: 'Course', template: 'Template', prompt_pack: 'Prompt Pack' }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={18} color="#c4b5fd" />
          <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 16, color: '#fff' }}>Launchio Admin</span>
          <span style={{ fontSize: 11, color: '#c4b5fd', background: 'rgba(139,92,246,0.3)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>RESTRICTED</span>
        </div>
        <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c4b5fd', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '2px solid rgba(139,92,246,0.12)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', fontSize: 14, fontWeight: 700,
              color: tab === t.id ? '#8b5cf6' : '#4c4879',
              borderBottom: tab === t.id ? '2px solid #8b5cf6' : '2px solid transparent',
              marginBottom: -2, background: 'none', border: 'none', cursor: 'pointer',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
          <button onClick={() => { if (token) { loadProducts(token); loadTransactions(token) } }}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#8b5cf6', background: '#f5f3ff', border: 'none', cursor: 'pointer' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Overview Tab */}
        {tab === 'overview' && stats && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 22, color: '#1e1b4b', marginBottom: 24 }}>Platform Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 18, marginBottom: 36 }}>
              {[
                { icon: <Package size={22} color="#8b5cf6" />, label: 'Total Products', value: stats.totalProducts, sub: `${stats.publishedProducts} published` },
                { icon: <TrendingUp size={22} color="#8b5cf6" />, label: 'Total Sales', value: stats.totalSales, sub: 'all time' },
                { icon: <DollarSign size={22} color="#8b5cf6" />, label: 'Gross Revenue', value: `$${stats.totalRevenue.toFixed(0)}`, sub: '100% of sales' },
                { icon: <Users size={22} color="#8b5cf6" />, label: 'Est. Creators', value: stats.totalUsers, sub: 'unique sellers' },
              ].map((card, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="card-glass" style={{ borderRadius: 18, padding: '22px', display: 'flex', gap: 16, alignItems: 'center' }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {card.icon}
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 28, color: '#1e1b4b', lineHeight: 1 }}>{card.value}</p>
                    <p style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 700, marginTop: 3 }}>{card.label}</p>
                    <p style={{ fontSize: 11, color: '#4c4879' }}>{card.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="card-glass" style={{ borderRadius: 18, padding: 24 }}>
                <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#1e1b4b', marginBottom: 12 }}>Revenue Split</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Creator Payouts (70%)', value: `$${(stats.totalRevenue * 0.7).toFixed(2)}`, color: '#059669' },
                    { label: 'Platform Revenue (30%)', value: `$${(stats.totalRevenue * 0.3).toFixed(2)}`, color: '#8b5cf6' },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#4c4879' }}>{row.label}</span>
                      <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 16, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-glass" style={{ borderRadius: 18, padding: 24 }}>
                <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#1e1b4b', marginBottom: 12 }}>Product Types</p>
                {['ebook', 'course', 'template', 'prompt_pack'].map(t => {
                  const count = products.filter(p => p.type === t).length
                  return (
                    <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: '#4c4879' }}>{typeLabels[t]}</span>
                      <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 14, color: '#1e1b4b' }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Products Tab */}
        {tab === 'products' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 22, color: '#1e1b4b', marginBottom: 24 }}>
              All Products <span style={{ fontSize: 15, fontWeight: 400, color: '#4c4879' }}>({products.length})</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {products.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="card-glass" style={{ borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 18, color: 'rgba(255,255,255,0.85)' }}>{product.title[0]?.toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 14, color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.title}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span className={`badge-${product.type}`}>{typeLabels[product.type] ?? product.type}</span>
                      <span style={{ fontSize: 11, color: '#4c4879' }}>${product.price} · {product.creator_email}</span>
                      <span style={{ fontSize: 11, color: '#a5a3c0' }}>{new Date(product.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                    background: product.status === 'published' ? '#dcfce7' : '#f5f3ff',
                    color: product.status === 'published' ? '#15803d' : '#8b5cf6',
                  }}>
                    {product.status === 'published' ? '● Live' : '○ Draft'}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {product.status === 'published' && (
                      <button onClick={() => handleUnpublish(product.id)} disabled={actionLoading === product.id}
                        title="Unpublish" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e', border: 'none', cursor: 'pointer' }}
                      >
                        <EyeOff size={12} /> Unpublish
                      </button>
                    )}
                    <button onClick={() => handleDeleteProduct(product.id)} disabled={actionLoading === product.id}
                      title="Delete" style={{ width: 32, height: 32, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', border: 'none', cursor: 'pointer' }}
                    >
                      {actionLoading === product.id
                        ? <span style={{ width: 12, height: 12, border: '2px solid #fca5a5', borderTopColor: '#dc2626', borderRadius: '50%', display: 'inline-block' }} className="spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Transactions Tab */}
        {tab === 'transactions' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 22, color: '#1e1b4b', marginBottom: 24 }}>
              All Transactions <span style={{ fontSize: 15, fontWeight: 400, color: '#4c4879' }}>({transactions.length})</span>
            </h2>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f5f3ff', borderRadius: 20 }}>
                <DollarSign size={32} color="#c4b5fd" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ color: '#4c4879' }}>No transactions yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {transactions.map((tx, i) => (
                  <motion.div key={tx.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="card-glass" style={{ borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 13, color: '#1e1b4b' }}>
                        {tx.productTitle ?? tx.product_id?.slice(0, 8) + '…'}
                      </p>
                      <p style={{ fontSize: 11, color: '#4c4879', marginTop: 3 }}>{tx.buyer_email} · {new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 16, color: '#1e1b4b' }}>${tx.amount.toFixed(2)}</p>
                      <p style={{ fontSize: 10, color: '#4c4879' }}>Creator: ${tx.creator_payout?.toFixed(2) ?? '—'} · Fee: ${tx.platform_fee?.toFixed(2) ?? '—'}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
