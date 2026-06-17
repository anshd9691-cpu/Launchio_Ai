import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ProductCard from '@/components/ProductCard'
import SkeletonCard from '@/components/SkeletonCard'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/lib/supabase'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'ebook', label: 'Ebook' },
  { id: 'course', label: 'Course' },
  { id: 'template', label: 'Template' },
  { id: 'prompt_pack', label: 'Prompt Pack' },
]

export default function ExplorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('products').select('*').eq('status', 'published').order('created_at', { ascending: false })
    if (filter !== 'all') query = query.eq('type', filter)
    if (search.trim()) query = query.ilike('title', `%${search.trim()}%`)
    const { data } = await query
    setProducts(data ?? [])
    setLoading(false)
  }, [filter, search])

  useEffect(() => {
    const t = setTimeout(fetchProducts, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [fetchProducts, search])

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <Navbar />

      {/* Header */}
      <div style={{ background: '#f5f3ff', borderBottom: '1px solid rgba(139,92,246,0.1)', padding: '96px 24px 40px', position: 'relative', overflow: 'hidden' }}>
        <div className="hero-glow-top" />
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 'clamp(28px,5vw,48px)', color: '#1e1b4b', letterSpacing: '-1px', marginBottom: 12 }}
          >
            Explore Digital Products
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            style={{ color: '#4c4879', fontSize: 17, marginBottom: 28 }}
          >
            Discover ebooks, courses, templates, and prompt packs from top creators.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            style={{ position: 'relative', maxWidth: 540, margin: '0 auto' }}
          >
            <Search size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#8b5cf6' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…" className="input-field"
              style={{ paddingLeft: 46, borderRadius: 16, boxShadow: '0 4px 24px rgba(139,92,246,0.1)' }}
            />
          </motion.div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 80px' }}>
        {/* Filter pills */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}
        >
          {FILTERS.map(f => (
            <motion.button key={f.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setFilter(f.id)}
              style={{
                padding: '8px 20px', borderRadius: 40, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                ...(filter === f.id
                  ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }
                  : { background: '#f5f3ff', color: '#8b5cf6', border: '1.5px solid rgba(139,92,246,0.2)' })
              }}
            >
              {f.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 22 }}>
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Search size={32} color="#c4b5fd" />
            </div>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 20, color: '#1e1b4b', marginBottom: 8 }}>No products found</h3>
            <p style={{ color: '#4c4879' }}>Try a different search term or filter.</p>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 22 }}>
            {products.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
