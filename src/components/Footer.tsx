import { Link } from 'react-router-dom'
import { Rocket } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{ background: '#f5f3ff', borderTop: '1px solid rgba(139,92,246,0.12)', padding: '64px 24px 32px', marginTop: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 48 }}>
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="btn-gradient">
                <Rocket size={15} color="white" />
              </div>
              <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 17, color: '#1e1b4b' }}>
                Laun<span className="gradient-text">chio</span>
              </span>
            </Link>
            <p style={{ fontSize: 13, color: '#4c4879', lineHeight: 1.7, maxWidth: 220 }}>
              The premium marketplace for AI-powered digital products. Launch in 60 seconds.
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 13, color: '#1e1b4b', marginBottom: 16 }}>Product</p>
            {['Explore', 'Create', 'Dashboard'].map(item => (
              <Link key={item} to={`/${item.toLowerCase()}`} style={{ display: 'block', fontSize: 13, color: '#4c4879', marginBottom: 10, transition: 'color 0.2s' }}>{item}</Link>
            ))}
          </div>
          <div>
            <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 13, color: '#1e1b4b', marginBottom: 16 }}>Company</p>
            {['About', 'Blog', 'Terms', 'Privacy'].map(item => (
              <a key={item} href="#" style={{ display: 'block', fontSize: 13, color: '#4c4879', marginBottom: 10 }}>{item}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(139,92,246,0.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12, color: '#4c4879' }}>© 2026 Launchio. All rights reserved.</p>
          <p style={{ fontSize: 12, color: '#4c4879' }}>Creators keep <span style={{ color: '#8b5cf6', fontWeight: 700 }}>70%</span> of every sale.</p>
        </div>
      </div>
    </footer>
  )
}
