import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import type { Product } from '@/lib/supabase'

const TYPE_COLORS: Record<string, string> = {
  ebook: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  course: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
  template: 'linear-gradient(135deg, #a855f7, #ec4899)',
  prompt_pack: 'linear-gradient(135deg, #6366f1, #06b6d4)',
}

export default function ProductCard({ product, index = 0, avgRating, reviewCount }: { product: Product; index?: number; avgRating?: number; reviewCount?: number }) {
  const badgeClass = `badge-${product.type}`
  const typeLabel = { ebook: 'Ebook', course: 'Course', template: 'Template', prompt_pack: 'Prompt Pack' }[product.type] ?? product.type

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: 'easeOut' }}
      whileHover={{ scale: 1.025, y: -5 }}
      className="card-glass"
      style={{ borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      {/* Cover */}
      <div style={{ height: 156, background: TYPE_COLORS[product.type] ?? TYPE_COLORS.ebook, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 26, color: 'rgba(255,255,255,0.85)' }}>{product.title[0]?.toUpperCase()}</span>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <span className={badgeClass}>{typeLabel}</span>
        <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#1e1b4b', lineHeight: 1.35, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.title}
        </h3>
        {product.description && (
          <p style={{ fontSize: 13, color: '#4c4879', lineHeight: 1.6, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
            {product.description}
          </p>
        )}
        {product.creator_email && (
          <p style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>{product.creator_email.split('@')[0]}</p>
        )}

        {/* Average rating */}
        {avgRating !== undefined && reviewCount !== undefined && reviewCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 13, color: '#f59e0b' }}>{'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}</span>
            <span style={{ fontSize: 11, color: '#4c4879', fontWeight: 600 }}>{avgRating.toFixed(1)} ({reviewCount})</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(139,92,246,0.1)', marginTop: 'auto' }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 900, fontSize: 22, color: '#1e1b4b' }}>${product.price}</span>
          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
            <Link to={`/p/${product.id}`} style={{ padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, gap: 6 }} className="btn-gradient">
              <ShoppingCart size={13} style={{ display: 'inline', marginRight: 5 }} />Buy Now
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
